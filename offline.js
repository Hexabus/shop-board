(function () {
  "use strict";
  if (window.ShopBoardOfflineCache) return;
  const panel = document.createElement("div");
  panel.id = "shopOfflinePanel";
  panel.style.cssText = "padding:10px 16px;background:var(--card-bg);color:var(--text);border-bottom:1px solid var(--border);font-size:13px;";
  const label = document.createElement("p");
  label.id = "shopOfflineCacheStatus";
  label.setAttribute("role", "status");
  label.setAttribute("aria-live", "polite");
  label.textContent = "Checking offline app setup…";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Check for app updates";
  button.disabled = true;
  button.style.cssText = "margin-top:6px;padding:8px 12px;min-height:44px;border:1px solid var(--border-dark);border-radius:8px;background:var(--card-bg);color:var(--text);font:inherit;";
  panel.appendChild(label);
  panel.appendChild(button);
  const strip = document.querySelector(".sync-strip");
  if (strip) strip.insertAdjacentElement("afterend", panel);
  else document.body.appendChild(panel);
  let registration = null, started = false;
  const workerURL = new URL("./sw.js", document.baseURI);

  function queryWorker(worker) {
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const finish = value => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), 5000);
      channel.port1.onmessage = event => finish(event.data);
      try { worker.postMessage({type:"SHOP_BOARD_OFFLINE_STATUS"}, [channel.port2]); }
      catch (e) { finish(null); }
    });
  }

  async function refreshStatus() {
    if (!registration) return;
    const controller = navigator.serviceWorker.controller;
    if (!controller || controller.scriptURL !== workerURL.href) {
      label.textContent = "Offline worker is registered. Close and reopen Shop Board once while online, then check for the offline-ready message.";
      return;
    }
    const result = await queryWorker(controller);
    if (!result || !result.ready) {
      label.textContent = "Offline app cache could not be confirmed. Reconnect and reopen before testing offline. Do not clear site data.";
      return;
    }
    label.textContent = "Offline app files ready (" + result.version + "). Test by closing and reopening the app in Airplane Mode.";
    if (registration.waiting) label.textContent += " Update downloaded: finish saving, close ALL Shop Board windows/tabs, then reopen. No automatic reload will occur.";
  }

  function watchWorker(worker) {
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (["installed", "activated"].includes(worker.state)) setTimeout(refreshStatus, 0);
      if (worker.state === "redundant") label.textContent = "An offline-cache update did not install. Reconnect and check for updates again; this does not clear saved records.";
    });
  }

  async function start() {
    if (started) return;
    started = true;
    if (!("serviceWorker" in navigator) || !window.isSecureContext || location.protocol !== "https:") {
      label.textContent = "Offline caching needs the live HTTPS Shop Board site in a supported browser, not a downloaded HTML preview.";
      return;
    }
    try {
      registration = await navigator.serviceWorker.register(workerURL.href, {
        scope:new URL("./", workerURL).href, updateViaCache:"none"
      });
      button.disabled = false;
      watchWorker(registration.installing);
      registration.addEventListener("updatefound", () => watchWorker(registration.installing));
      navigator.serviceWorker.addEventListener("controllerchange", refreshStatus);
      await refreshStatus();
    } catch (error) {
      label.textContent = "Offline setup failed: " + error.message + ". Confirm sw.js is published beside index.html. Your saved records were not changed by this add-on.";
    }
  }

  button.addEventListener("click", async () => {
    if (!registration) return;
    button.disabled = true;
    label.textContent = "Checking for an app update…";
    try { await registration.update(); await refreshStatus(); }
    catch (error) { label.textContent = "Could not check for updates. Try while online; saved records were not cleared."; }
    finally { button.disabled = false; }
  });
  window.ShopBoardOfflineCache = {refreshStatus:refreshStatus};
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, {once:true});
})();
