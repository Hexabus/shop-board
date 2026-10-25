/* Shop Board core application. Add-on modules (addons/*.js) register themselves in window.ShopBoardAddOns and are run by this boot function after the core is ready. */
async function bootShopBoard(){
Object.defineProperty(window,"DATA",{configurable:true,get:()=>DATA,set:x=>{DATA=x;}});
Object.defineProperty(window,"CURRENT_VIEW",{configurable:true,get:()=>CURRENT_VIEW,set:x=>{CURRENT_VIEW=x;}});
Object.defineProperty(window,"ACTIVE_JOB_ID",{configurable:true,get:()=>ACTIVE_JOB_ID,set:x=>{ACTIVE_JOB_ID=x;}});
Object.defineProperty(window,"TEMP_PHOTO_DATA",{configurable:true,get:()=>TEMP_PHOTO_DATA,set:x=>{TEMP_PHOTO_DATA=x;}});
Object.defineProperty(window,"TEMP_DOC_DATA",{configurable:true,get:()=>TEMP_DOC_DATA,set:x=>{TEMP_DOC_DATA=x;}});
Object.defineProperty(window,"TEMP_DOC_NAME",{configurable:true,get:()=>TEMP_DOC_NAME,set:x=>{TEMP_DOC_NAME=x;}});
Object.defineProperty(window,"TEMP_DOC_TYPE",{configurable:true,get:()=>TEMP_DOC_TYPE,set:x=>{TEMP_DOC_TYPE=x;}});
Object.defineProperty(window,"TEMP_DOC_SIZE",{configurable:true,get:()=>TEMP_DOC_SIZE,set:x=>{TEMP_DOC_SIZE=x;}});
Object.defineProperty(window,"PENDING_CONFIRM_ACTION",{configurable:true,get:()=>PENDING_CONFIRM_ACTION,set:x=>{PENDING_CONFIRM_ACTION=x;}});
Object.defineProperty(window,"TEMP_RECEIPT_PHOTO",{configurable:true,get:()=>TEMP_RECEIPT_PHOTO,set:x=>{TEMP_RECEIPT_PHOTO=x;}});
Object.defineProperty(window,"loadData",{configurable:true,get:()=>loadData,set:v=>{loadData=v;}});
Object.defineProperty(window,"saveData",{configurable:true,get:()=>saveData,set:v=>{saveData=v;}});
Object.defineProperty(window,"showToast",{configurable:true,get:()=>showToast,set:v=>{showToast=v;}});
Object.defineProperty(window,"updateHeaderBadges",{configurable:true,get:()=>updateHeaderBadges,set:v=>{updateHeaderBadges=v;}});
Object.defineProperty(window,"switchUserRole",{configurable:true,get:()=>switchUserRole,set:v=>{switchUserRole=v;}});
Object.defineProperty(window,"toggleMoneyForCrew",{configurable:true,get:()=>toggleMoneyForCrew,set:v=>{toggleMoneyForCrew=v;}});
Object.defineProperty(window,"goHome",{configurable:true,get:()=>goHome,set:v=>{goHome=v;}});
Object.defineProperty(window,"openView",{configurable:true,get:()=>openView,set:v=>{openView=v;}});
Object.defineProperty(window,"openModal",{configurable:true,get:()=>openModal,set:v=>{openModal=v;}});
Object.defineProperty(window,"closeModal",{configurable:true,get:()=>closeModal,set:v=>{closeModal=v;}});
Object.defineProperty(window,"closeModalOnOutside",{configurable:true,get:()=>closeModalOnOutside,set:v=>{closeModalOnOutside=v;}});
Object.defineProperty(window,"formatMoney",{configurable:true,get:()=>formatMoney,set:v=>{formatMoney=v;}});
Object.defineProperty(window,"getMapLink",{configurable:true,get:()=>getMapLink,set:v=>{getMapLink=v;}});
Object.defineProperty(window,"openMap",{configurable:true,get:()=>openMap,set:v=>{openMap=v;}});
Object.defineProperty(window,"handleMissingMapAddress",{configurable:true,get:()=>handleMissingMapAddress,set:v=>{handleMissingMapAddress=v;}});
Object.defineProperty(window,"getJobMoney",{configurable:true,get:()=>getJobMoney,set:v=>{getJobMoney=v;}});
Object.defineProperty(window,"renderCurrentView",{configurable:true,get:()=>renderCurrentView,set:v=>{renderCurrentView=v;}});
Object.defineProperty(window,"renderHome",{configurable:true,get:()=>renderHome,set:v=>{renderHome=v;}});
Object.defineProperty(window,"renderToday",{configurable:true,get:()=>renderToday,set:v=>{renderToday=v;}});
Object.defineProperty(window,"renderJobs",{configurable:true,get:()=>renderJobs,set:v=>{renderJobs=v;}});
Object.defineProperty(window,"renderJobDetail",{configurable:true,get:()=>renderJobDetail,set:v=>{renderJobDetail=v;}});
Object.defineProperty(window,"scrollToSection",{configurable:true,get:()=>scrollToSection,set:v=>{scrollToSection=v;}});
Object.defineProperty(window,"renderPhotosView",{configurable:true,get:()=>renderPhotosView,set:v=>{renderPhotosView=v;}});
Object.defineProperty(window,"renderJobPhotosView",{configurable:true,get:()=>renderJobPhotosView,set:v=>{renderJobPhotosView=v;}});
Object.defineProperty(window,"renderMoneyView",{configurable:true,get:()=>renderMoneyView,set:v=>{renderMoneyView=v;}});
Object.defineProperty(window,"renderClientsView",{configurable:true,get:()=>renderClientsView,set:v=>{renderClientsView=v;}});
Object.defineProperty(window,"renderNotesView",{configurable:true,get:()=>renderNotesView,set:v=>{renderNotesView=v;}});
Object.defineProperty(window,"setJobStatus",{configurable:true,get:()=>setJobStatus,set:v=>{setJobStatus=v;}});
Object.defineProperty(window,"toggleBillPaid",{configurable:true,get:()=>toggleBillPaid,set:v=>{toggleBillPaid=v;}});
Object.defineProperty(window,"deleteNote",{configurable:true,get:()=>deleteNote,set:v=>{deleteNote=v;}});
Object.defineProperty(window,"openNewJobModal",{configurable:true,get:()=>openNewJobModal,set:v=>{openNewJobModal=v;}});
Object.defineProperty(window,"selectTradePill",{configurable:true,get:()=>selectTradePill,set:v=>{selectTradePill=v;}});
Object.defineProperty(window,"saveNewJob",{configurable:true,get:()=>saveNewJob,set:v=>{saveNewJob=v;}});
Object.defineProperty(window,"openAddNoteModal",{configurable:true,get:()=>openAddNoteModal,set:v=>{openAddNoteModal=v;}});
Object.defineProperty(window,"saveNote",{configurable:true,get:()=>saveNote,set:v=>{saveNote=v;}});
Object.defineProperty(window,"openAddPhotoModal",{configurable:true,get:()=>openAddPhotoModal,set:v=>{openAddPhotoModal=v;}});
Object.defineProperty(window,"handlePhotoPick",{configurable:true,get:()=>handlePhotoPick,set:v=>{handlePhotoPick=v;}});
Object.defineProperty(window,"savePhoto",{configurable:true,get:()=>savePhoto,set:v=>{savePhoto=v;}});
Object.defineProperty(window,"openPhotoViewer",{configurable:true,get:()=>openPhotoViewer,set:v=>{openPhotoViewer=v;}});
Object.defineProperty(window,"openAddBillModal",{configurable:true,get:()=>openAddBillModal,set:v=>{openAddBillModal=v;}});
Object.defineProperty(window,"saveBill",{configurable:true,get:()=>saveBill,set:v=>{saveBill=v;}});
Object.defineProperty(window,"openAddFileModal",{configurable:true,get:()=>openAddFileModal,set:v=>{openAddFileModal=v;}});
Object.defineProperty(window,"handleDocFilePick",{configurable:true,get:()=>handleDocFilePick,set:v=>{handleDocFilePick=v;}});
Object.defineProperty(window,"saveRealFile",{configurable:true,get:()=>saveRealFile,set:v=>{saveRealFile=v;}});
Object.defineProperty(window,"openDocViewerById",{configurable:true,get:()=>openDocViewerById,set:v=>{openDocViewerById=v;}});
Object.defineProperty(window,"openJobEmailModal",{configurable:true,get:()=>openJobEmailModal,set:v=>{openJobEmailModal=v;}});
Object.defineProperty(window,"openQuoteEmailModal",{configurable:true,get:()=>openQuoteEmailModal,set:v=>{openQuoteEmailModal=v;}});
Object.defineProperty(window,"openBillEmailModal",{configurable:true,get:()=>openBillEmailModal,set:v=>{openBillEmailModal=v;}});
Object.defineProperty(window,"openNewClientModal",{configurable:true,get:()=>openNewClientModal,set:v=>{openNewClientModal=v;}});
Object.defineProperty(window,"saveNewClient",{configurable:true,get:()=>saveNewClient,set:v=>{saveNewClient=v;}});
Object.defineProperty(window,"openEditClientModal",{configurable:true,get:()=>openEditClientModal,set:v=>{openEditClientModal=v;}});
Object.defineProperty(window,"saveClientEdits",{configurable:true,get:()=>saveClientEdits,set:v=>{saveClientEdits=v;}});
Object.defineProperty(window,"openEditJobMoneyModal",{configurable:true,get:()=>openEditJobMoneyModal,set:v=>{openEditJobMoneyModal=v;}});
Object.defineProperty(window,"saveJobMoney",{configurable:true,get:()=>saveJobMoney,set:v=>{saveJobMoney=v;}});
Object.defineProperty(window,"openNewCrewModal",{configurable:true,get:()=>openNewCrewModal,set:v=>{openNewCrewModal=v;}});
Object.defineProperty(window,"saveNewCrew",{configurable:true,get:()=>saveNewCrew,set:v=>{saveNewCrew=v;}});
Object.defineProperty(window,"showAppConfirm",{configurable:true,get:()=>showAppConfirm,set:v=>{showAppConfirm=v;}});
Object.defineProperty(window,"executeConfirmedAction",{configurable:true,get:()=>executeConfirmedAction,set:v=>{executeConfirmedAction=v;}});
Object.defineProperty(window,"deleteClient",{configurable:true,get:()=>deleteClient,set:v=>{deleteClient=v;}});
Object.defineProperty(window,"deleteCrewMember",{configurable:true,get:()=>deleteCrewMember,set:v=>{deleteCrewMember=v;}});
Object.defineProperty(window,"deleteJob",{configurable:true,get:()=>deleteJob,set:v=>{deleteJob=v;}});
Object.defineProperty(window,"deletePhoto",{configurable:true,get:()=>deletePhoto,set:v=>{deletePhoto=v;}});
Object.defineProperty(window,"deleteBill",{configurable:true,get:()=>deleteBill,set:v=>{deleteBill=v;}});
Object.defineProperty(window,"deleteExpense",{configurable:true,get:()=>deleteExpense,set:v=>{deleteExpense=v;}});
Object.defineProperty(window,"deleteFile",{configurable:true,get:()=>deleteFile,set:v=>{deleteFile=v;}});
Object.defineProperty(window,"compressImage",{configurable:true,get:()=>compressImage,set:v=>{compressImage=v;}});
Object.defineProperty(window,"openQuickReceiptModal",{configurable:true,get:()=>openQuickReceiptModal,set:v=>{openQuickReceiptModal=v;}});
Object.defineProperty(window,"handleReceiptPhotoPick",{configurable:true,get:()=>handleReceiptPhotoPick,set:v=>{handleReceiptPhotoPick=v;}});
Object.defineProperty(window,"saveQuickReceipt",{configurable:true,get:()=>saveQuickReceipt,set:v=>{saveQuickReceipt=v;}});
Object.defineProperty(window,"openReceiptViewerById",{configurable:true,get:()=>openReceiptViewerById,set:v=>{openReceiptViewerById=v;}});
Object.defineProperty(window,"openCompanySettings",{configurable:true,get:()=>openCompanySettings,set:v=>{openCompanySettings=v;}});
Object.defineProperty(window,"refreshCompanyLogoPreview",{configurable:true,get:()=>refreshCompanyLogoPreview,set:v=>{refreshCompanyLogoPreview=v;}});
Object.defineProperty(window,"cancelCompanySettings",{configurable:true,get:()=>cancelCompanySettings,set:v=>{cancelCompanySettings=v;}});
Object.defineProperty(window,"removeCompanyLogo",{configurable:true,get:()=>removeCompanyLogo,set:v=>{removeCompanyLogo=v;}});
Object.defineProperty(window,"pickCompanyLogo",{configurable:true,get:()=>pickCompanyLogo,set:v=>{pickCompanyLogo=v;}});
Object.defineProperty(window,"saveCompanyName",{configurable:true,get:()=>saveCompanyName,set:v=>{saveCompanyName=v;}});

    /* Safe Storage Helper for iOS Files / Sandbox environments */
    const Storage=window.ShopBoardDatabase;
    await Storage.initialize();

    const DEFAULT_DATA = {
      business: {
        name: "Field Trade Co.",
        owner: "Shop Owner",
        phone: "(207) 555-0192",
        crewSeeMoney: false
      },
      currentUser: {
        name: "Shop Owner",
        role: "Owner"
      },
      crewMembers: [
        { id: "c1", name: "Shop Owner", phone: "555-0192", email: "owner@example.com", role: "Owner" },
        { id: "c2", name: "Dave Miller", phone: "207-555-0144", email: "dave@example.com", role: "Crew" },
        { id: "c3", name: "Tyler Brooks", phone: "207-555-0188", email: "tyler@example.com", role: "Crew" }
      ],
      clients: [
        { id: "cl1", name: "Mark & Sarah Stevens", phone: "207-555-4321", email: "mark.stevens@example.com", address: "44 Harbor Rd, Cherryfield, ME", projectNotes: "" },
        { id: "cl2", name: "Bob Higgins", phone: "207-555-7766", email: "bob.higgins@example.com", address: "12 Ridge Lane, Ellsworth, ME", projectNotes: "" }
      ],
      jobs: [
        {
          id: "j1",
          name: "Stevens Covered Porch",
          trade: "Carpentry",
          clientId: "cl1",
          address: "44 Harbor Rd, Cherryfield, ME",
          status: "On site",
          startDate: new Date().toISOString().split('T')[0],
          crewAssigned: ["c1", "c2"],
          photos: [
            { id: "p1", url: "https://images.unsplash.com/photo-1541888946425-d0fbb18615f7?auto=format&fit=crop&w=400&q=80", tag: "Before", caption: "Framing starts today", author: "Kenyon Kores", timestamp: "Today, 8:15 AM" }
          ],
          files: [
            { id: "f1", name: "Town_Permit_Signed.pdf", author: "Kenyon Kores", date: "Oct 2" }
          ],
          notes: [
            { id: "n1", author: "Kenyon Kores", text: "Lumber delivery arrived 7:30 AM. Joists look straight.", tag: "", timestamp: "Today, 8:00 AM" },
            { id: "n2", author: "Dave Miller", text: "Need six more 8-inch Simpson ties for the ledger board.", tag: "Waiting on", timestamp: "Today, 11:20 AM" }
          ],
          quotes: [
            { id: "q1", items: [{ desc: "Framing lumber & fasteners", qty: 1, rate: 3200 }, { desc: "Labor (Framing & Decking)", qty: 40, rate: 65 }], status: "Sent" }
          ],
          bills: [
            { id: "b1", desc: "Deposit / Materials", amount: 3200, status: "Paid" },
            { id: "b2", desc: "Progress Billing #1", amount: 2600, status: "Unpaid" }
          ],
          expenses: [
            { id: "e1", desc: "Hardware store Simpson ties", amount: 78.50, date: "Today" }
          ]
        },
        {
          id: "j2",
          name: "Higgins Kitchen Trim & Casing",
          trade: "Remodel",
          clientId: "cl2",
          address: "12 Ridge Lane, Ellsworth, ME",
          status: "Scheduled",
          startDate: new Date().toISOString().split('T')[0],
          crewAssigned: ["c1", "c3"],
          photos: [],
          files: [],
          notes: [
            { id: "n3", author: "Kenyon Kores", text: "Stock pre-primed poplar delivered into garage yesterday.", tag: "", timestamp: "Yesterday, 4:10 PM" }
          ],
          quotes: [
            { id: "q2", items: [{ desc: "Trim installation & crown", qty: 1, rate: 1950 }], status: "Sent" }
          ],
          bills: [
            { id: "b3", desc: "Full Balance", amount: 1950, status: "Unpaid" }
          ],
          expenses: []
        }
      ]
    };

    async function loadData() {
      const stored = Storage.get("SHOP_BOARD_DATA");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          Storage.validate({SHOP_BOARD_DATA:stored});
          if (parsed.business && !parsed.business.companyNameCustomized && (parsed.business.name === "Generations Custom Homes" || !parsed.business.name)) {
            parsed.business.name = "Field Trade Co.";
          }
          if (parsed.business && parsed.business.owner === "Kenyon Kores") {
            parsed.business.owner = "Shop Owner";
          }
          if (parsed.currentUser && parsed.currentUser.name === "Kenyon Kores") {
            parsed.currentUser.name = "Shop Owner";
          }
          return parsed;
        } catch (e) { throw e; }
      }
      await Storage.set("SHOP_BOARD_DATA", JSON.stringify(DEFAULT_DATA));
      return DEFAULT_DATA;
    }

    let DATA = await loadData();
    // Backward-compatible fields for existing saved Shop Board data.
    DATA.clients.forEach(client => { if (typeof client.projectNotes !== "string") client.projectNotes = ""; });
    DATA.jobs.forEach(job => {
      if (!Array.isArray(job.photos)) job.photos = [];
      if (!Array.isArray(job.expenses)) job.expenses = [];
    });
    let CURRENT_VIEW = "HOME";
    let ACTIVE_JOB_ID = null;

    async function saveData() {
      await Storage.set("SHOP_BOARD_DATA", JSON.stringify(DATA));
      showToast("Saved on phone");
      updateHeaderBadges();
    }

    function showToast(msg) {
      const t = document.getElementById("toast");
      if (!t) return;
      t.innerText = msg;
      t.style.display = "block";
      setTimeout(() => { t.style.display = "none"; }, 1800);
    }

    function updateHeaderBadges() {
      const logo = document.getElementById("companyLogoHeader");
      if (logo) {
        const src = DATA.business.logoDataUrl || "";
        if (/^data:image\/(png|jpeg);base64,/.test(src)) {
          logo.src = src;
          logo.hidden = false;
        } else {
          logo.removeAttribute("src");
          logo.hidden = true;
        }
      }
      const bTag = document.getElementById("businessTag");
      if (bTag) bTag.innerText = DATA.business.name.toUpperCase();

      const badge = document.getElementById("roleBadge");
      const isOwner = DATA.currentUser.role === "Owner";
      if (badge) badge.innerText = isOwner ? `👑 ${DATA.currentUser.name} (OWNER)` : `🔨 ${DATA.currentUser.name} (CREW)`;

      const crewStatus = document.getElementById("crewVisibilityStatus");
      if (crewStatus) {
        if (isOwner) {
          crewStatus.style.display = "block";
          crewStatus.innerText = `Crew Money: ${DATA.business.crewSeeMoney ? "ON" : "OFF"}`;
        } else {
          crewStatus.style.display = "none";
        }
      }
    }

    async function switchUserRole() {
      if (DATA.currentUser.role === "Owner") {
        DATA.currentUser.name = "Dave Miller";
        DATA.currentUser.role = "Crew";
        showToast("Switched to Dave Miller (Crew View)");
      } else {
        DATA.currentUser.name = DATA.business.owner;
        DATA.currentUser.role = "Owner";
        showToast(`Switched to ${DATA.currentUser.name} (Owner View)`);
      }
      await saveData();
      renderCurrentView();
    }

    async function toggleMoneyForCrew() {
      if (DATA.currentUser.role !== "Owner") return;
      DATA.business.crewSeeMoney = !DATA.business.crewSeeMoney;
      await saveData();
      renderCurrentView();
      showToast(`Crew can see money: ${DATA.business.crewSeeMoney ? "YES" : "NO"}`);
    }

    function goHome() {
      CURRENT_VIEW = "HOME";
      ACTIVE_JOB_ID = null;
      renderCurrentView();
    }

    function openView(view, jobId = null) {
      CURRENT_VIEW = view;
      ACTIVE_JOB_ID = jobId;
      window.scrollTo(0, 0);
      renderCurrentView();
    }

    function openModal(html) {
      document.getElementById("modalSheet").innerHTML = html;
      document.getElementById("modalOverlay").style.display = "flex";
    }

    function closeModal() {
      document.getElementById("modalOverlay").style.display = "none";
    }

    function closeModalOnOutside(e) {
      if (e.target.id === "modalOverlay") closeModal();
    }

    function formatMoney(amount) {
      return `$${(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }


    function getMapLink(address) {
      const cleanAddress = typeof address === "string" ? address.trim() : "";
      if (!cleanAddress || /^(on site|no address saved)$/i.test(cleanAddress)) return "#";
      const query = encodeURIComponent(cleanAddress);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      return isIOS
        ? `https://maps.apple.com/?q=${query}`
        : `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    function openMap(address) {
      const link = getMapLink(address);
      if (link === "#") {
        showToast("Add a street address first");
        return;
      }
      window.location.href = link;
    }

    function handleMissingMapAddress(event) {
      const target = event.target;
      const link = target && target.closest ? target.closest('a[href="#"]') : null;
      if (!link) return;
      const isMapLink = link.classList.contains("map-address") ||
        (link.classList.contains("comm-btn") && link.textContent.trim() === "🗺️ Map");
      if (!isMapLink) return;
      event.preventDefault();
      event.stopPropagation();
      openMap("");
    }
    document.addEventListener("click", handleMissingMapAddress, true);

    function getJobMoney(job) {
      const legacyBilled = (job.bills || []).reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
      const legacyCollected = (job.bills || []).reduce((sum, bill) => sum + (bill.status === "Paid" ? (Number(bill.amount) || 0) : 0), 0);
      return {
        billed: Number.isFinite(Number(job.moneyBilled)) ? Number(job.moneyBilled) : legacyBilled,
        collected: Number.isFinite(Number(job.moneyCollected)) ? Number(job.moneyCollected) : legacyCollected,
        expenses: (job.expenses || []).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
      };
    }

    /* RENDER VIEWS */
    function renderCurrentView() {
      updateHeaderBadges();
      const container = document.getElementById("appContainer");
      if (!container) return;

      switch (CURRENT_VIEW) {
        case "HOME":
          container.innerHTML = renderHome();
          break;
        case "TODAY":
          container.innerHTML = renderToday();
          break;
        case "JOBS":
          container.innerHTML = renderJobs();
          break;
        case "JOB_DETAIL":
          container.innerHTML = renderJobDetail();
          break;
        case "PHOTOS":
          container.innerHTML = renderPhotosView();
          break;
        case "JOB_PHOTOS":
          container.innerHTML = renderJobPhotosView();
          break;
        case "MONEY":
          container.innerHTML = renderMoneyView();
          break;
        case "CLIENTS":
          container.innerHTML = renderClientsView();
          break;
        case "NOTES":
          container.innerHTML = renderNotesView();
          break;
      }
    }

    function renderHome() {
      const todayCount = DATA.jobs.filter(j => j.status === "On site" || j.startDate === new Date().toISOString().split('T')[0]).length;
      const totalJobs = DATA.jobs.length;
      let totalPhotos = 0;
      DATA.jobs.forEach(j => totalPhotos += (j.photos ? j.photos.length : 0));

      return `
        <div style="margin-bottom: 12px;">
          <h2 style="font-family: var(--font-display); font-size: 26px; font-weight: 900; text-transform: uppercase;">THE SHOP BOARD</h2>
          <div style="font-size: 14px; color: var(--text-muted); font-weight: 600;">Tap a tile with a thumb. Big marks, zero fluff.</div>
        </div>

        <div class="board-grid">
          <div class="tile" onclick="openView('TODAY')">
            ${todayCount > 0 ? `<div class="tile-badge">${todayCount}</div>` : ''}
            <div class="tile-icon">☀️</div>
            <div class="tile-label">TODAY</div>
            <div class="tile-sub">On site & scheduled</div>
          </div>

          <div class="tile" onclick="openView('JOBS')">
            <div class="tile-badge">${totalJobs}</div>
            <div class="tile-icon">📋</div>
            <div class="tile-label">JOBS</div>
            <div class="tile-sub">Every project</div>
          </div>

          <div class="tile" onclick="openView('PHOTOS')">
            <div class="tile-badge">${totalPhotos}</div>
            <div class="tile-icon">📷</div>
            <div class="tile-label">PHOTOS</div>
            <div class="tile-sub">Camera & job roll</div>
          </div>

          <div class="tile" onclick="openView('MONEY')">
            <div class="tile-icon">💵</div>
            <div class="tile-label">MONEY</div>
            <div class="tile-sub">Quotes, bills, paid</div>
          </div>

          <div class="tile" onclick="openView('CLIENTS')">
            <div class="tile-icon">👥</div>
            <div class="tile-label">CLIENTS</div>
            <div class="tile-sub">Client contacts & crew</div>
          </div>

          <div class="tile" onclick="openView('NOTES')">
            <div class="tile-icon">📝</div>
            <div class="tile-label">NOTES</div>
            <div class="tile-sub">Shared clipboard</div>
          </div>
        </div>

        <div style="margin-top: 24px; padding: 12px; background: #FFF; border: 2px solid var(--border-dark); border-radius: var(--radius); text-align: center; box-shadow: 2px 2px 0 var(--border-dark);">
          <div style="font-family: var(--font-display); font-size: 16px; font-weight: 800; text-transform: uppercase;">Quick New Job</div>
          <button class="big-btn" style="margin: 8px 0 10px 0; background: #2E7D32;" onclick="openQuickReceiptModal()">🧾 Snap Receipt to Job</button>
      <button class="big-btn secondary" style="margin: 0;" onclick="openNewJobModal()">+ Start a New Job</button>
        </div>
      `;
    }

    function renderToday() {
      const todayDate = new Date().toISOString().split('T')[0];
      const todayJobs = DATA.jobs.filter(j => j.status === "On site" || j.startDate === todayDate);

      let cardsHtml = '';
      if (todayJobs.length === 0) {
        cardsHtml = `
          <div class="empty-state">
            <div class="empty-text">Nothing on the board today</div>
            <button class="big-btn" onclick="openView('JOBS')">Check All Jobs</button>
          </div>
        `;
      } else {
        cardsHtml = todayJobs.map(job => {
          const client = DATA.clients.find(c => c.id === job.clientId) || { name: "Direct Client", phone: "" };
          return `
            <div class="card" onclick="openView('JOB_DETAIL', '${escJs(job.id)}')" style="cursor: pointer;">
              <div class="card-header-row">
                <div>
                  <div class="card-title">${esc(job.name)}</div>
                  <div class="card-sub">${esc(client.name)}</div>
                </div>
                <div style="background: var(--border-dark); color: #FFF; font-family: var(--font-display); font-size: 15px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 6px;">
                  ${esc(job.status)}
                </div>
              </div>
              <div class="card-meta"><a class="map-address" href="${esc(getMapLink(job.address))}" onclick="event.stopPropagation();">📍 ${esc(job.address)} • Map</a></div>
              <div class="card-meta">🔨 ${esc(job.trade || 'General')}</div>
              <div class="comm-row" onclick="event.stopPropagation();">
                ${client.phone ? `<a href="tel:${esc(client.phone)}" class="comm-btn" style="background: var(--highlight-soft);">📞 Call</a>` : ''}
                <button class="comm-btn" onclick="openJobEmailModal('${escJs(job.id)}')">✉️ Email Update</button>
              </div>
            </div>
          `;
        }).join('');
      }

      return `
        <div class="screen-header">
          <button class="back-btn" onclick="goHome()">←</button>
          <div class="screen-title">TODAY'S WORK</div>
        </div>
        <div style="font-size: 14px; color: var(--text-muted); font-weight: 600; margin-bottom: 12px;">
          Boots-on list before leaving the driveway.
        </div>
        ${cardsHtml}
      `;
    }

    function renderJobs() {
      let cardsHtml = '';
      if (DATA.jobs.length === 0) {
        cardsHtml = `
          <div class="empty-state">
            <div class="empty-text">No jobs on the board yet</div>
            <button class="big-btn" onclick="openNewJobModal()">+ New Job</button>
          </div>
        `;
      } else {
        cardsHtml = DATA.jobs.map(job => {
          const client = DATA.clients.find(c => c.id === job.clientId) || { name: "Client" };
          return `
            <div class="card" onclick="openView('JOB_DETAIL', '${escJs(job.id)}')" style="cursor: pointer;">
              <div class="card-header-row">
                <div>
                  <div class="card-title">${esc(job.name)}</div>
                  <div class="card-sub">${esc(client.name)} • ${esc(job.trade || 'General')}</div>
                </div>
                <div style="border: 2px solid var(--border-dark); font-family: var(--font-display); font-size: 15px; font-weight: 800; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; background: #FFF;">
                  ${esc(job.status)}
                </div>
              </div>
              <div class="card-meta"><a class="map-address" href="${esc(getMapLink(job.address))}" onclick="event.stopPropagation();">📍 ${esc(job.address)} • Map</a></div>
              <div class="card-meta" style="color: var(--text-muted);">
                📷 ${job.photos.length} photos • 📝 ${job.notes.length} notes
              </div>
            </div>
          `;
        }).join('');
      }

      return `
        <div class="screen-header">
          <button class="back-btn" onclick="goHome()">←</button>
          <div class="screen-title">ALL JOBS</div>
        </div>
        <button class="big-btn" onclick="openNewJobModal()">+ New Job</button>
        ${cardsHtml}
      `;
    }

    function renderJobDetail() {
      const job = DATA.jobs.find(j => j.id === ACTIVE_JOB_ID);
      if (!job) return `<div class="container"><button class="big-btn" onclick="goHome()">Back to Home</button></div>`;

      const client = DATA.clients.find(c => c.id === job.clientId) || { name: "Client", phone: "", email: "" };
      const isOwner = DATA.currentUser.role === "Owner";
      const canSeeMoney = isOwner || DATA.business.crewSeeMoney;

      const stages = ["Lead", "Quoted", "Scheduled", "On site", "Waiting", "Done", "Paid"];
      const statusPillsHtml = stages.map(st => `
        <div class="status-step ${job.status.toLowerCase() === st.toLowerCase() ? 'active' : ''}" onclick="setJobStatus('${escJs(job.id)}', '${escJs(st)}')">
          ${esc(st)}
        </div>
      `).join('');

      let photoStripHtml = '';
      if (job.photos && job.photos.length > 0) {
        photoStripHtml = `
          <div class="photo-strip">
            ${job.photos.map(p => `
              <img ${thumbAttrs('photo', job.id, p.id, p.url)} class="photo-thumb" onclick="openPhotoViewer('${escJs(job.id)}', '${escJs(p.id)}')">
            `).join('')}
          </div>
        `;
      } else {
        photoStripHtml = `<div style="font-size: 13px; color: var(--text-muted); font-weight: 600; padding: 6px 0;">No photos yet. Tap Add Photo below.</div>`;
      }

      let quotedTotal = 0;
      if (job.quotes && job.quotes[0]) {
        job.quotes[0].items.forEach(it => quotedTotal += (it.qty * it.rate));
      }
      const jobMoney = getJobMoney(job);
      const billedTotal = jobMoney.billed;
      const paidTotal = jobMoney.collected;

      return `
        <div class="screen-header">
          <button class="back-btn" onclick="openView('JOBS')">←</button>
          <div class="screen-title" style="font-size: 22px;">${esc(job.name)}</div>
        </div>

        <div class="card" style="margin-bottom: 10px;">
          <div class="card-sub">${esc(client.name)} • <a class="map-address" href="${esc(getMapLink(job.address))}">📍 ${esc(job.address)} • Map</a></div>
          <div style="font-family: var(--font-display); font-size: 17px; font-weight: 800; text-transform: uppercase; color: var(--brand); margin-top: 4px;">
            Trade: ${esc(job.trade || 'General Carpentry')}
          </div>

          <div class="comm-row">
            ${client.phone ? `<a href="tel:${esc(client.phone)}" class="comm-btn">📞 Call</a>` : ''}
            ${client.phone ? `<a href="sms:${esc(client.phone)}" class="comm-btn">💬 Text</a>` : ''}
            <a href="${esc(getMapLink(job.address))}" class="comm-btn" style="background: var(--highlight-soft); color: #176B3A;">🗺️ Map</a>
            <button class="comm-btn" onclick="openJobEmailModal('${escJs(job.id)}')">✉️ Email</button>
          </div>
        </div>

        <div style="font-family: var(--font-display); font-size: 16px; font-weight: 800; text-transform: uppercase;">
          Job Status (Tap to Change)
        </div>
        <div class="status-strip-wrapper">
          <div class="status-strip">
            ${statusPillsHtml}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <div style="font-family: var(--font-display); font-size: 18px; font-weight: 800; text-transform: uppercase;">Photos (${job.photos.length})</div>
          <button style="background: var(--board-header); color: #FFF; border: 2px solid var(--border-dark); border-radius: 6px; padding: 6px 12px; font-family: var(--font-display); font-size: 15px; font-weight: 800; text-transform: uppercase; cursor: pointer;" onclick="openAddPhotoModal('${escJs(job.id)}')">
            📷 + Add Photo
          </button>
        </div>
        ${photoStripHtml}

        <div class="fat-actions-grid">
          <div class="fat-btn active" onclick="scrollToSection('notesSection')">
            <span class="icon">📝</span>
            <span>Notes (${job.notes.length})</span>
          </div>
          <div class="fat-btn" onclick="scrollToSection('moneySection')">
            <span class="icon">💵</span>
            <span>Money</span>
          </div>
          <div class="fat-btn" onclick="scrollToSection('filesSection')">
            <span class="icon">📁</span>
            <span>Files (${job.files.length})</span>
          </div>
        </div>

        <!-- MONEY SECTION -->
        <div id="moneySection" style="margin-top: 14px;">
          <div style="font-family: var(--font-display); font-size: 20px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">
            Job Money
          </div>
          ${canSeeMoney ? `
            <div class="money-metrics">
              <div class="metric-box">
                <div class="metric-label">Quoted</div>
                <div class="metric-val">$${quotedTotal.toLocaleString()}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">Billed</div>
                <div class="metric-val">$${billedTotal.toLocaleString()}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" style="color: var(--highlight);">Paid</div>
                <div class="metric-val" style="color: var(--highlight);">$${paidTotal.toLocaleString()}</div>
              </div>
            </div>
            <button class="comm-btn" style="width:100%; margin-bottom:14px;" onclick="openEditJobMoneyModal('${escJs(job.id)}')">✏️ Edit Money Billed & Collected</button>

            <!-- Receipts & Material Expenses Card -->
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-family: var(--font-display); font-size: 17px; font-weight: 800; text-transform: uppercase;">🧾 Receipts & Expenses</div>
                <button class="comm-btn" style="min-height: 34px; padding: 4px 10px; background: #2E7D32; color: #FFF;" onclick="openQuickReceiptModal('${escJs(job.id)}')">📷 + Snap Receipt</button>
              </div>
              ${(!job.expenses || job.expenses.length === 0) ? `<div style="font-size: 13px; color: var(--text-muted);">No receipts logged for this job yet.</div>` : ''}
              ${(job.expenses || []).map(exp => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border);">
                  <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                    ${exp.photoUrl ? `<img ${thumbAttrs('receipt', job.id, exp.id, exp.photoUrl)} onclick="openReceiptViewerById('${escJs(job.id)}', '${escJs(exp.id)}')" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1.5px solid var(--border-dark); cursor: pointer;" title="Tap to view receipt photo">` : '<span style="font-size: 24px;">🧾</span>'}
                    <div style="min-width: 0;">
                      <div style="font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(exp.desc)}</div>
                      <div style="font-size: 12px; color: var(--text-muted);">${esc(exp.category || 'Materials')} • ${esc(exp.date || 'Today')}</div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="font-family: var(--font-display); font-size: 16px; font-weight: 800; color: var(--alert);">
                      $${(Number(exp.amount) || 0).toFixed(2)}
                    </div>
                    <button style="border: 2px solid var(--alert); background: #FFF; border-radius: 6px; padding: 4px 8px; font-family: var(--font-display); font-size: 13px; font-weight: 800; color: var(--alert); cursor: pointer;" onclick="event.stopPropagation(); deleteExpense('${escJs(job.id)}', '${escJs(exp.id)}')">DELETE</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Bills & Invoices Card with Delete Bill -->
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-family: var(--font-display); font-size: 17px; font-weight: 800; text-transform: uppercase;">Bills & Invoices</div>
                <button class="comm-btn" style="min-height: 34px; padding: 4px 10px;" onclick="openAddBillModal('${escJs(job.id)}')">+ Add Bill</button>
              </div>
              ${job.bills.length === 0 ? `<div style="font-size: 13px; color: var(--text-muted);">No bills yet.</div>` : ''}
              ${job.bills.map(b => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border);">
                  <div>
                    <div style="font-weight: 700; font-size: 15px;">${esc(b.desc)}</div>
                    <div style="font-size: 13px; color: var(--text-muted);">$${b.amount.toLocaleString()}</div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button style="border: 2px solid var(--border-dark); padding: 6px 12px; border-radius: 6px; font-family: var(--font-display); font-size: 14px; font-weight: 800; text-transform: uppercase; cursor: pointer; background: ${b.status === 'Paid' ? '#E8F5E9; color: #2E7D32;' : '#FFF;'}" onclick="toggleBillPaid('${escJs(job.id)}', '${escJs(b.id)}')">
                      ${b.status === 'Paid' ? '✓ PAID' : 'MARK PAID'}
                    </button>
                    <button style="border: 2px solid var(--alert); background: #FFF; border-radius: 6px; padding: 4px 8px; font-family: var(--font-display); font-size: 13px; font-weight: 800; color: var(--alert); cursor: pointer;" onclick="event.stopPropagation(); deleteBill('${escJs(job.id)}', '${escJs(b.id)}')">DELETE</button>
                  </div>
                </div>
              `).join('')}

              ${billedTotal > 0 && billedTotal === paidTotal && job.status === "Done" ? `
                <button class="big-btn" style="background: var(--highlight); margin-top: 12px;" onclick="setJobStatus('${escJs(job.id)}', 'Paid')">
                  ✓ Set Job Status to PAID
                </button>
              ` : ''}
            </div>

            <div class="comm-row" style="margin-bottom: 16px;">
              <button class="comm-btn" onclick="openQuoteEmailModal('${escJs(job.id)}')">✉️ Email Quote</button>
              <button class="comm-btn" onclick="openBillEmailModal('${escJs(job.id)}')">✉️ Email Bill</button>
            </div>
          ` : `
            <div class="card" style="text-align: center; color: var(--text-muted); padding: 20px;">
              🔒 Dollar amounts hidden for crew. Owner can enable visibility in top bar.
            </div>
          `}
        </div>

        <!-- NOTES BOARD SECTION -->
        <div id="notesSection" style="margin-top: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-family: var(--font-display); font-size: 20px; font-weight: 900; text-transform: uppercase;">
              Notes Board
            </div>
            <button style="background: var(--brand); color: #FFF; border: 2px solid var(--border-dark); border-radius: 6px; padding: 6px 12px; font-family: var(--font-display); font-size: 15px; font-weight: 800; text-transform: uppercase; cursor: pointer;" onclick="openAddNoteModal('${escJs(job.id)}')">
              + Post Note
            </button>
          </div>
          <div style="font-size: 13px; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">
            Shared clipboard for the crew. Name and timestamp on every mark.
          </div>

          <div class="notes-board">
            ${job.notes.length === 0 ? `<div style="text-align:center; color: var(--text-muted); padding: 12px;">Clipboard is empty. Post the first mark above.</div>` : ''}
            ${job.notes.map(n => {
              const tagClass = n.tag === 'Punch' ? 'tag-punch' : n.tag === 'Change' ? 'tag-change' : n.tag === 'Waiting on' ? 'tag-waiting' : '';
              const canDelete = (n.author === DATA.currentUser.name) || (DATA.currentUser.role === "Owner");
              return `
                <div class="note-item">
                  <div class="note-meta">
                    <span class="note-author">${esc(n.author)}</span>
                    <span>${esc(whenText(n))}</span>
                  </div>
                  <div class="note-body">
                    ${n.tag ? `<span class="note-tag ${tagClass}">${esc(n.tag)}</span>` : ''}
                    ${esc(n.text)}
                  </div>
                  ${canDelete ? `
                    <div style="text-align: right; margin-top: 4px;">
                      <button style="background: none; border: none; color: var(--alert); font-size: 11px; font-weight: 800; text-transform: uppercase; cursor: pointer;" onclick="deleteNote('${escJs(job.id)}', '${escJs(n.id)}')">Delete</button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- FILES SECTION -->
        <div id="filesSection" style="margin-top: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-family: var(--font-display); font-size: 20px; font-weight: 900; text-transform: uppercase;">Permits & Files</div>
            <button class="comm-btn" style="min-height: 34px; padding: 4px 10px;" onclick="openAddFileModal('${escJs(job.id)}')">+ Add File</button>
          </div>
          <div class="card">
            ${job.files.length === 0 ? `<div style="font-size: 13px; color: var(--text-muted);">No documents or permits attached yet.</div>` : ''}
            ${job.files.map(f => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border);">
                <div style="min-width: 0; flex: 1; margin-right: 8px;">
                  <div style="font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📄 ${esc(f.name)}</div>
                  <div style="font-size: 12px; color: var(--text-muted);">Added by ${esc(f.author)} • ${esc(f.date || 'Today')}${f.size ? ` • ${esc(f.size)}` : ''}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="comm-btn" style="min-height: 32px; padding: 2px 10px; font-size: 13px;" onclick="openDocViewerById('${escJs(job.id)}', '${escJs(f.id)}')">View</button>
                  <button style="border: 2px solid var(--alert); background: #FFF; border-radius: 6px; padding: 4px 8px; font-family: var(--font-display); font-size: 13px; font-weight: 800; color: var(--alert); cursor: pointer;" onclick="event.stopPropagation(); deleteFile('${escJs(job.id)}', '${escJs(f.id)}')">DELETE</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- DANGER ZONE: DELETE JOB -->
        <div style="margin-top: 32px; padding: 18px; background: #FFF; border: 2px dashed var(--alert); border-radius: var(--radius); text-align: center;">
          <div style="font-family: var(--font-display); font-size: 16px; font-weight: 800; text-transform: uppercase; color: var(--alert); margin-bottom: 6px;">
            Manage Job Record
          </div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
            Permanently remove this job, notes, photos, and records from the board.
          </div>
          <button class="big-btn" style="background: var(--alert); margin-bottom: 0;" onclick="deleteJob('${escJs(job.id)}')">
            🗑️ Delete Job from Board
          </button>
        </div>
      `;
    }

    function scrollToSection(id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    function renderPhotosView() {
      const jobsWithPhotos = DATA.jobs.filter(job => (job.photos || []).length > 0);
      return `
        <div class="screen-header">
          <button class="back-btn" onclick="goHome()">←</button>
          <div class="screen-title">JOB PHOTOS</div>
        </div>
        <div style="font-size: 14px; color: var(--text-muted); font-weight: 600; margin-bottom: 12px;">
          Choose a job to open its complete photo roll.
        </div>
        ${jobsWithPhotos.length === 0 ? `
          <div class="empty-state">
            <div class="empty-text">No photos snapped yet</div>
            <button class="big-btn" onclick="openView('JOBS')">Open a Job to Add Photos</button>
          </div>
        ` : jobsWithPhotos.map(job => {
          const cover = job.photos[0];
          const client = DATA.clients.find(c => c.id === job.clientId) || { name: 'Client' };
          return `
            <div class="card" onclick="openView('JOB_PHOTOS', '${escJs(job.id)}')" style="cursor:pointer; display:flex; gap:12px; align-items:center;">
              <img ${thumbAttrs('photo', job.id, cover.id, cover.url)} alt="${esc(job.name)}" style="width:92px; height:92px; object-fit:cover; border-radius:8px; border:2px solid var(--border-dark); flex-shrink:0;">
              <div style="min-width:0; flex:1;">
                <div class="card-title">${esc(job.name)}</div>
                <div class="card-sub">${esc(client.name)}</div>
                <div class="card-meta">📷 ${job.photos.length} ${job.photos.length === 1 ? 'photo' : 'photos'} • Tap to open</div>
              </div>
            </div>
          `;
        }).join('')}
      `;
    }

    function renderJobPhotosView() {
      const job = DATA.jobs.find(j => j.id === ACTIVE_JOB_ID);
      if (!job) { openView('PHOTOS'); return ''; }
      const client = DATA.clients.find(c => c.id === job.clientId) || { name: 'Client' };
      return `
        <div class="screen-header">
          <button class="back-btn" onclick="openView('PHOTOS')">←</button>
          <div class="screen-title">${esc(job.name)}</div>
        </div>
        <div style="font-size:14px; color:var(--text-muted); font-weight:600; margin-bottom:12px;">${esc(client.name)} • ${job.photos.length} ${job.photos.length === 1 ? 'photo' : 'photos'}</div>
        <button class="big-btn" onclick="openAddPhotoModal('${escJs(job.id)}')">📷 + Add Photo</button>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          ${job.photos.map(p => `
            <div class="card" style="padding:8px; cursor:pointer;" onclick="openPhotoViewer('${escJs(job.id)}', '${escJs(p.id)}')">
              <img ${thumbAttrs('photo', job.id, p.id, p.url)} alt="${esc(p.caption || 'Job photo')}" style="width:100%; height:145px; object-fit:cover; border-radius:6px; border:1px solid var(--border-dark);">
              <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">${p.tag ? `[${esc(p.tag)}] ` : ''}${esc(p.caption || 'Job photo')}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    function renderMoneyView() {
      const isOwner = DATA.currentUser.role === "Owner";
      const canSeeMoney = isOwner || DATA.business.crewSeeMoney;
      if (!canSeeMoney) return `<div class="screen-header"><button class="back-btn" onclick="goHome()">←</button><div class="screen-title">MONEY</div></div><div class="card" style="text-align:center; padding:30px;"><div style="font-family:var(--font-display); font-size:22px; font-weight:800;">RESTRICTED TO OWNER</div><div style="color:var(--text-muted); margin-top:8px;">Dollar tracking is turned off for crew logins.</div></div>`;

      let totalRevenue = 0, totalExpenses = 0;
      const rows = DATA.jobs.map(job => {
        const money = getJobMoney(job);
        const netProfit = money.collected - money.expenses;
        totalRevenue += money.collected;
        totalExpenses += money.expenses;
        return { job, ...money, netProfit };
      });
      const netProfit = totalRevenue - totalExpenses;
      return `
        <div class="screen-header"><button class="back-btn" onclick="goHome()">←</button><div class="screen-title">MONEY BOARD</div></div>
        <div style="font-size:14px; color:var(--text-muted); font-weight:600; margin-bottom:12px;">Revenue is collected money. Expenses come from each job’s expense entries.</div>
        <div class="money-metrics" style="margin-bottom:20px;">
          <div class="metric-box"><div class="metric-label">Total Revenue</div><div class="metric-val" style="color:var(--highlight);">${formatMoney(totalRevenue)}</div></div>
          <div class="metric-box"><div class="metric-label">Total Expenses</div><div class="metric-val" style="color:var(--alert);">${formatMoney(totalExpenses)}</div></div>
          <div class="metric-box"><div class="metric-label">Net Profit</div><div class="metric-val" style="color:${netProfit >= 0 ? 'var(--highlight)' : 'var(--alert)'};">${formatMoney(netProfit)}</div></div>
        </div>
        <div style="font-family:var(--font-display); font-size:20px; font-weight:900; text-transform:uppercase; margin-bottom:8px;">Profit by Job</div>
        ${rows.length ? rows.map(row => `
          <div class="card" onclick="openView('JOB_DETAIL', '${escJs(row.job.id)}')" style="cursor:pointer;">
            <div class="card-header-row"><div class="card-title">${esc(row.job.name)}</div><div style="font-family:var(--font-display); font-size:17px; font-weight:800; color:${row.netProfit >= 0 ? 'var(--highlight)' : 'var(--alert)'};">${formatMoney(row.netProfit)}</div></div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:13px; color:var(--text-muted);"><div>Billed: ${formatMoney(row.billed)}</div><div>Collected: ${formatMoney(row.collected)}</div><div>Expenses: ${formatMoney(row.expenses)}</div><div>Net profit: ${formatMoney(row.netProfit)}</div></div>
          </div>`).join('') : `<div class="empty-state"><div class="empty-text">No jobs on the money board</div></div>`}
      `;
    }

    function renderClientsView() {
      return `
        <div class="screen-header">
          <button class="back-btn" onclick="goHome()">←</button>
          <div class="screen-title">CLIENTS</div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-family: var(--font-display); font-size: 20px; font-weight: 900; text-transform: uppercase;">Clients</div>
          <button class="comm-btn" style="min-height: 36px; padding: 4px 12px;" onclick="openNewClientModal()">+ Add Client</button>
        </div>
        ${DATA.clients.map(cl => `
          <div class="card">
            <div class="card-header-row"><div class="card-title">${esc(cl.name)}</div><button class="comm-btn" style="min-height:34px; padding:4px 10px; flex:0 0 auto;" onclick="openEditClientModal('${escJs(cl.id)}')">✏️ Edit</button></div>
            <div class="card-sub">${cl.address ? `<a class="map-address" href="${esc(getMapLink(cl.address))}">📍 ${esc(cl.address)} • Map</a>` : '📍 No address saved'}</div>
            ${cl.projectNotes ? `<div style="font-size:13px; color:var(--text-muted); margin-top:6px; white-space:pre-wrap;">📝 ${esc(cl.projectNotes)}</div>` : ''}
            <div class="comm-row">
              ${cl.phone ? `<a href="tel:${esc(cl.phone)}" class="comm-btn">📞 Call</a>` : ''}
              ${cl.phone ? `<a href="sms:${esc(cl.phone)}" class="comm-btn">💬 Text</a>` : ''}
              ${cl.address ? `<a href="${esc(getMapLink(cl.address))}" class="comm-btn" style="background: var(--highlight-soft); color: #176B3A;">🗺️ Map</a>` : ''}
              ${cl.email ? `<a href="mailto:${esc(cl.email)}" class="comm-btn">✉️ Email</a>` : ''}
            </div>
          </div>
        `).join('')}

        <div style="display: flex; justify-content: space-between; align-items: center; margin: 24px 0 8px 0;">
          <div style="font-family: var(--font-display); font-size: 20px; font-weight: 900; text-transform: uppercase;">Crew Roster</div>
          ${DATA.currentUser.role === 'Owner' ? `<button class="comm-btn" style="min-height: 36px; padding: 4px 12px;" onclick="openNewCrewModal()">+ Add Crew</button>` : ''}
        </div>
        ${DATA.crewMembers.map(cr => `
          <div class="card">
            <div class="card-header-row">
              <div>
                <div class="card-title">${esc(cr.name)}</div>
                <div style="font-size: 13px; color: var(--text-muted); font-weight: 600;">${esc(cr.phone || 'No phone')}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="background: var(--border-dark); color: #FFF; font-family: var(--font-display); font-size: 13px; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 4px;">
                  ${esc(cr.role)}
                </div>
                ${(DATA.currentUser.role === 'Owner' && cr.role !== 'Owner') ? `
                  <button style="border: 2px solid var(--alert); background: #FFF; border-radius: 6px; padding: 4px 8px; font-family: var(--font-display); font-size: 13px; font-weight: 800; color: var(--alert); cursor: pointer;" onclick="event.stopPropagation(); deleteCrewMember('${escJs(cr.id)}')">REMOVE</button>
                ` : ''}
              </div>
            </div>
            <div class="comm-row">
              ${cr.phone ? `<a href="tel:${esc(cr.phone)}" class="comm-btn">📞 Call</a>` : ''}
              ${cr.phone ? `<a href="sms:${esc(cr.phone)}" class="comm-btn">💬 Text</a>` : ''}
            </div>
          </div>
        `).join('')}
      `;
    }

    function renderNotesView() {
      const allNotes = [];
      DATA.jobs.forEach(job => {
        if (job.notes) {
          job.notes.forEach(n => {
            allNotes.push({ ...n, jobName: job.name, jobId: job.id });
          });
        }
      });
      allNotes.reverse();

      return `
        <div class="screen-header">
          <button class="back-btn" onclick="goHome()">←</button>
          <div class="screen-title">SHOP CLIPBOARD</div>
        </div>
        <div style="font-size: 14px; color: var(--text-muted); font-weight: 600; margin-bottom: 12px;">
          Live feed of job notes, punches, and changes across all sites.
        </div>

        <div class="notes-board">
          ${allNotes.length === 0 ? `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No notes posted yet.</div>` : ''}
          ${allNotes.map(n => {
            const tagClass = n.tag === 'Punch' ? 'tag-punch' : n.tag === 'Change' ? 'tag-change' : n.tag === 'Waiting on' ? 'tag-waiting' : '';
            return `
              <div class="note-item" onclick="openView('JOB_DETAIL', '${escJs(n.jobId)}')" style="cursor: pointer;">
                <div class="note-meta">
                  <span class="note-author" style="color: var(--brand);">${esc(n.jobName)} • ${esc(n.author)}</span>
                  <span>${esc(whenText(n))}</span>
                </div>
                <div class="note-body">
                  ${n.tag ? `<span class="note-tag ${tagClass}">${esc(n.tag)}</span>` : ''}
                  ${esc(n.text)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    async function setJobStatus(jobId, status) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (job) {
        job.status = status;
        await saveData();
        renderCurrentView();
        showToast(`Job status set to ${status.toUpperCase()}`);
      }
    }

    async function toggleBillPaid(jobId, billId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (job && job.bills) {
        const bill = job.bills.find(b => b.id === billId);
        if (bill) {
          bill.status = bill.status === "Paid" ? "Unpaid" : "Paid";
          await saveData();
          renderCurrentView();
          showToast(`Bill marked as ${bill.status.toUpperCase()}`);
        }
      }
    }

    async function deleteNote(jobId, noteId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (job && job.notes) {
        job.notes = job.notes.filter(n => n.id !== noteId);
        await saveData();
        renderCurrentView();
        showToast("Note deleted");
      }
    }

    function openNewJobModal() {
      const clientsOptions = DATA.clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 12px;">New Job on Board</div>
        <div class="input-group">
          <label class="input-label">Job Name</label>
          <input type="text" id="newJobName" class="text-input" placeholder="e.g. Peterson Deck & Railing">
        </div>
        <div class="input-group">
          <label class="input-label">Trade / Type</label>
          <div class="trade-pills">
            <span class="trade-pill selected" onclick="selectTradePill(this)">Carpentry</span>
            <span class="trade-pill" onclick="selectTradePill(this)">Plumbing</span>
            <span class="trade-pill" onclick="selectTradePill(this)">Electrical</span>
            <span class="trade-pill" onclick="selectTradePill(this)">Painting</span>
            <span class="trade-pill" onclick="selectTradePill(this)">Remodel</span>
          </div>
          <input type="hidden" id="newJobTrade" value="Carpentry">
        </div>
        <div class="input-group">
          <label class="input-label">Client</label>
          <select id="newJobClientId" class="text-input">
            ${clientsOptions}
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Site Address</label>
          <input type="text" id="newJobAddress" class="text-input" placeholder="e.g. 104 Main St">
        </div>
        <button class="big-btn" onclick="saveNewJob()">Create Job</button>
      `;
      openModal(modalHtml);
    }

    function selectTradePill(el) {
      document.querySelectorAll('.trade-pill').forEach(p => p.classList.remove('selected'));
      el.classList.add('selected');
      document.getElementById('newJobTrade').value = el.innerText;
    }

    async function saveNewJob() {
      const name = document.getElementById("newJobName").value.trim();
      const trade = document.getElementById("newJobTrade").value;
      const clientId = document.getElementById("newJobClientId").value;
      const address = document.getElementById("newJobAddress").value.trim();

      if (!name) { alert("Please enter a job name."); return; }

      const newJob = {
        id: uid("j"),
        name: name,
        trade: trade,
        clientId: clientId,
        address: address || "On Site",
        status: "Lead",
        startDate: new Date().toISOString().split('T')[0],
        crewAssigned: ["c1"],
        photos: [],
        files: [],
        notes: [
          { id: uid("n"), author: DATA.currentUser.name, text: "Job opened on board.", tag: "", timestamp: "Just now", createdAt: new Date().toISOString() }
        ],
        quotes: [{ items: [{ desc: "Initial Scope", qty: 1, rate: 0 }], status: "Draft" }],
        bills: [],
        expenses: []
      };

      DATA.jobs.unshift(newJob);
      await saveData();
      closeModal();
      openView('JOB_DETAIL', newJob.id);
    }

    function openAddNoteModal(jobId) {
      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 12px;">Post Note to Board</div>
        <div class="input-group">
          <label class="input-label">Posting As</label>
          <input type="text" class="text-input" value="${esc(DATA.currentUser.name)}" readonly style="background:#EFECE6;">
        </div>
        <div class="input-group">
          <label class="input-label">Flag (Optional)</label>
          <select id="noteTag" class="text-input">
            <option value="">No Flag (General Note)</option>
            <option value="Punch">Punch List</option>
            <option value="Change">Change Order / Work</option>
            <option value="Waiting on">Waiting On Material/Decision</option>
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Note Message</label>
          <textarea id="noteText" class="text-input" placeholder="What's the status or item?"></textarea>
        </div>
        <button class="big-btn" onclick="saveNote('${escJs(jobId)}')">Post Note</button>
      `;
      openModal(modalHtml);
    }

    async function saveNote(jobId) {
      const text = document.getElementById("noteText").value.trim();
      const tag = document.getElementById("noteTag").value;
      if (!text) return;

      const job = DATA.jobs.find(j => j.id === jobId);
      if (job) {
        const now = new Date();
        const timeStr = "Today, " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        job.notes.push({
          id: uid("n"),
          author: DATA.currentUser.name,
          text: text,
          tag: tag,
          timestamp: timeStr,
          createdAt: now.toISOString()
        });
        await saveData();
        closeModal();
        renderCurrentView();
      }
    }

    function openAddPhotoModal(jobId) {
      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 12px;">Add Job Photo</div>
        <div class="input-group">
          <label class="input-label">Camera / Roll</label>
          <input type="file" id="photoInput" accept="image/*" class="text-input" onchange="handlePhotoPick(this)">
        </div>
        <div class="input-group">
          <label class="input-label">Tag</label>
          <select id="photoTag" class="text-input">
            <option value="During">During Work</option>
            <option value="Before">Before</option>
            <option value="After">After</option>
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Caption (Optional)</label>
          <input type="text" id="photoCaption" class="text-input" placeholder="e.g. Finished siding north wall">
        </div>
        <button class="big-btn" id="savePhotoBtn" onclick="savePhoto('${escJs(jobId)}')">Save Photo</button>
      `;
      openModal(modalHtml);
    }

    let TEMP_PHOTO_DATA = null;
    function handlePhotoPick(input) {
      if (input.files && input.files[0]) {
        const saveBtn = document.getElementById("savePhotoBtn");
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerText = "⏳ Compressing photo...";
          saveBtn.style.opacity = "0.7";
        }
        showToast("Compressing photo...");
        compressImage(input.files[0], 1000, 0.75, function(compressedUrl) {
          TEMP_PHOTO_DATA = compressedUrl;
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = "Save Photo";
            saveBtn.style.opacity = "1";
          }
          showToast("Photo ready");
        });
      }
    }

    async function savePhoto(jobId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (!job) return;

      const tag = document.getElementById("photoTag").value;
      const caption = document.getElementById("photoCaption").value.trim();
      const url = TEMP_PHOTO_DATA || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=400&q=80";

      const now = new Date();
      const timeStr = "Today";

      job.photos.unshift({
        id: uid("p"),
        url: url,
        tag: tag,
        caption: caption,
        author: DATA.currentUser.name,
        timestamp: timeStr,
        createdAt: now.toISOString()
      });

      TEMP_PHOTO_DATA = null;
      await saveData();
      closeModal();
      renderCurrentView();
    }

    function openPhotoViewer(jobId, photoId, caption, author, time) {
      const job = DATA.jobs.find(j => j.id === jobId);
      const photo = job && job.photos ? job.photos.find(p => p.id === photoId) : null;
      const photoUrl = photo ? photo.url : '';
      const photoCaption = photo ? (photo.caption || 'Job Photo') : (caption || 'Job Photo');
      const photoAuthor = photo ? photo.author : author;
      const photoTime = photo ? whenText(photo) : time;

      const modalHtml = `
        <div style="text-align: center;">
          <img src="${esc(photoUrl)}" style="width: 100%; max-height: 50vh; object-fit: contain; border-radius: 8px; border: 2px solid var(--border-dark); background: #000;">
          <div style="font-family: var(--font-display); font-size: 20px; font-weight: 800; text-transform: uppercase; margin-top: 10px;">${esc(photoCaption)}</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">Snapped by ${esc(photoAuthor)} • ${esc(photoTime)}</div>
          <button class="big-btn secondary" style="margin-bottom: 8px;" onclick="closeModal()">Close</button>
          <button class="big-btn" style="background: var(--alert);" onclick="deletePhoto('${escJs(jobId)}', '${escJs(photoId)}')">🗑️ Delete Photo</button>
        </div>
      `;
      openModal(modalHtml);
    }

    function openAddBillModal(jobId) {
      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 12px;">Add Bill / Invoice</div>
        <div class="input-group">
          <label class="input-label">Description</label>
          <input type="text" id="billDesc" class="text-input" placeholder="e.g. Framing draw #2">
        </div>
        <div class="input-group">
          <label class="input-label">Amount ($)</label>
          <input type="number" id="billAmount" class="text-input" placeholder="e.g. 2500">
        </div>
        <button class="big-btn" onclick="saveBill('${escJs(jobId)}')">Add Bill to Job</button>
      `;
      openModal(modalHtml);
    }

    async function saveBill(jobId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      const desc = document.getElementById("billDesc").value.trim();
      const amount = parseFloat(document.getElementById("billAmount").value) || 0;
      if (!desc || amount <= 0) { alert("Enter valid description and amount."); return; }

      if (!job.bills) job.bills = [];
      job.bills.push({
        id: uid("b"),
        desc: desc,
        amount: amount,
        status: "Unpaid"
      });
      await saveData();
      closeModal();
      renderCurrentView();
    }

    let TEMP_DOC_DATA = null;
    let TEMP_DOC_NAME = "";
    let TEMP_DOC_TYPE = "";
    let TEMP_DOC_SIZE = "";

    function openAddFileModal(jobId) {
      TEMP_DOC_DATA = null;
      TEMP_DOC_NAME = "";
      TEMP_DOC_TYPE = "";
      TEMP_DOC_SIZE = "";

      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">
          Attach Document / PDF
        </div>
        <div style="font-size: 13px; color: var(--text-muted); font-weight: 600; margin-bottom: 14px;">
          Upload town permits, signed proposals, specs, or inspection PDFs.
        </div>

        <div class="input-group">
          <label class="input-label">Select Document / PDF / Image</label>
          <input type="file" id="filePickerInput" accept=".pdf,image/*,.doc,.docx,.txt" class="text-input" onchange="handleDocFilePick(this)">
          <div id="docUploadStatus" style="font-size: 13px; font-weight: 700; color: #2E7D32; margin-top: 6px; display: none;"></div>
        </div>

        <div class="input-group">
          <label class="input-label">Document Name / Label</label>
          <input type="text" id="docNameInput" class="text-input" placeholder="e.g. Signed_Town_Permit.pdf">
        </div>

        <button class="big-btn" id="attachFileBtn" style="background: #2E7D32;" onclick="saveRealFile('${escJs(jobId)}')">
          ✓ Save Document to Job
        </button>
      `;
      openModal(modalHtml);
    }

    function handleDocFilePick(input) {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        TEMP_DOC_NAME = file.name;
        TEMP_DOC_TYPE = file.type || "application/pdf";

        const sizeKb = Math.round(file.size / 1024);
        TEMP_DOC_SIZE = sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + " MB" : sizeKb + " KB";

        const nameInput = document.getElementById("docNameInput");
        if (nameInput && !nameInput.value.trim()) {
          nameInput.value = file.name;
        }

        const statusEl = document.getElementById("docUploadStatus");
        if (statusEl) {
          statusEl.innerText = `Selected: ${file.name} (${TEMP_DOC_SIZE})`;
          statusEl.style.display = "block";
        }

        const attachBtn = document.getElementById("attachFileBtn");
        if (attachBtn) {
          attachBtn.disabled = true;
          attachBtn.innerText = "⏳ Loading file into phone...";
          attachBtn.style.opacity = "0.7";
        }

        const reader = new FileReader();
        reader.onload = function(e) {
          TEMP_DOC_DATA = e.target.result;
          if (attachBtn) {
            attachBtn.disabled = false;
            attachBtn.innerText = "✓ Save Document to Job";
            attachBtn.style.opacity = "1";
          }
          showToast("Document ready to attach");
        };
        reader.onerror = function() {
          alert("Error reading file.");
          if (attachBtn) { attachBtn.disabled = false; attachBtn.innerText = "✓ Save Document to Job"; }
        };
        reader.readAsDataURL(file);
      }
    }

    async function saveRealFile(jobId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (!job) return;

      const name = (document.getElementById("docNameInput").value || "").trim() || TEMP_DOC_NAME || "Attached_Document.pdf";

      if (!Array.isArray(job.files)) job.files = [];

      job.files.unshift({
        id: uid("f"),
        name: name,
        dataUrl: TEMP_DOC_DATA || null,
        type: TEMP_DOC_TYPE || "application/pdf",
        size: TEMP_DOC_SIZE || "Document",
        author: DATA.currentUser ? DATA.currentUser.name : "Owner",
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });

      TEMP_DOC_DATA = null;
      TEMP_DOC_NAME = "";
      TEMP_DOC_TYPE = "";
      TEMP_DOC_SIZE = "";

      await saveData();
      closeModal();
      renderCurrentView();
      showToast("Document saved to job");
    }

    function openDocViewerById(jobId, fileId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (!job || !job.files) return;
      const file = job.files.find(f => f.id === fileId);
      if (!file) return;

      const hasData = Boolean(file.dataUrl);
      const isImg = file.type && file.type.startsWith("image/");
      const isPdf = file.type && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

      let previewContent = "";
      if (!hasData) {
        previewContent = `
          <div style="background:#FFF; padding:24px 14px; border:2px dashed var(--border); border-radius:8px; margin: 12px 0;">
            <div style="font-size:36px; margin-bottom:8px;">📄</div>
            <div style="font-weight:700;">${esc(file.name)}</div>
            <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Sample record. Real uploaded documents can be viewed and opened directly.</div>
          </div>
        `;
      } else if (isImg) {
        previewContent = `
          <img src="${esc(file.dataUrl)}" style="width:100%; max-height:55vh; object-fit:contain; border-radius:8px; border:2px solid var(--border-dark); background:#111; margin:12px 0;">
        `;
      } else {
        previewContent = `
          <div style="background:#FFF; padding:20px; border:2px solid var(--border-dark); border-radius:8px; margin:12px 0; text-align:center;">
            <div style="font-size:44px; margin-bottom:8px;">📑</div>
            <div style="font-family:var(--font-display); font-size:18px; font-weight:800;">${esc(file.name)}</div>
            <div style="font-size:13px; color:var(--text-muted); margin:4px 0 16px 0;">${esc(file.size || 'PDF Document')}</div>
            <a href="${esc(file.dataUrl)}" download="${esc(file.name)}" target="_blank" class="big-btn" style="background:#2E7D32; margin-bottom:0; text-decoration:none;">
              📥 Open / Download PDF
            </a>
          </div>
        `;
      }

      const modalHtml = `
        <div style="font-family:var(--font-display); font-size:22px; font-weight:900; text-transform:uppercase; margin-bottom:6px;">
          Document Details
        </div>
        <div style="font-size:13px; color:var(--text-muted); font-weight:600;">Added by ${esc(file.author)} • ${esc(file.date || 'Today')}</div>
        ${previewContent}
        <button class="big-btn secondary" style="margin-bottom:8px;" onclick="closeModal()">Close</button>
        <button class="big-btn" style="background:var(--alert);" onclick="deleteFile('${escJs(jobId)}', '${escJs(fileId)}')">🗑️ Delete Document</button>
      `;
      openModal(modalHtml);
    }

    function openJobEmailModal(jobId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (!job) return;
      const client = DATA.clients.find(c => c.id === job.clientId) || { name: "Client", email: "" };
      const firstName = client.name.split(' ')[0] || "there";

      const subject = encodeURIComponent(`${job.name} update from ${DATA.business.name}`);
      const bodyText = `Hi ${firstName},

Here is a quick update on ${job.name} at ${job.address}.

Status: ${job.status}

Note:


${DATA.business.name}
${DATA.business.phone}
Sent from Shop Board`;

      const mailtoUrl = `mailto:${client.email || ''}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;

      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">Format Client Email</div>
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
          Tapping Send opens your phone's default mail app with everything pre-filled.
        </div>
        <div class="input-group">
          <label class="input-label">To</label>
          <input type="text" class="text-input" value="${esc(client.email || '')}" readonly>
        </div>
        <div class="input-group">
          <label class="input-label">Subject</label>
          <input type="text" class="text-input" value="${esc(job.name)} update from ${esc(DATA.business.name)}" readonly>
        </div>
        <div class="input-group">
          <label class="input-label">Draft Preview</label>
          <textarea class="text-input" style="height: 120px;" readonly>${esc(bodyText)}</textarea>
        </div>
        <a href="${esc(mailtoUrl)}" class="big-btn" onclick="closeModal()">🚀 Open in Mail App</a>
      `;
      openModal(modalHtml);
    }

    function openQuoteEmailModal(jobId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (!job) return;
      const client = DATA.clients.find(c => c.id === job.clientId) || { name: "Client", email: "" };
      const firstName = client.name.split(' ')[0] || "there";

      let itemsText = "";
      let total = 0;
      if (job.quotes && job.quotes[0]) {
        job.quotes[0].items.forEach(it => {
          const sub = it.qty * it.rate;
          total += sub;
          itemsText += `- ${it.desc}: $${sub.toLocaleString()}
`;
        });
      }

      const subject = encodeURIComponent(`${job.name} quote from ${DATA.business.name}`);
      const bodyText = `Hi ${firstName},

Here is the quote breakdown for ${job.name}:

${itemsText}
Total: $${total.toLocaleString()}

Note:


${DATA.business.name}
${DATA.business.phone}
Sent from Shop Board`;

      const mailtoUrl = `mailto:${client.email || ''}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;

      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">Email Quote</div>
        <div class="input-group">
          <label class="input-label">Draft Preview</label>
          <textarea class="text-input" style="height: 150px;" readonly>${esc(bodyText)}</textarea>
        </div>
        <a href="${esc(mailtoUrl)}" class="big-btn" onclick="closeModal()">🚀 Open in Mail App</a>
      `;
      openModal(modalHtml);
    }

    function openBillEmailModal(jobId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (!job) return;
      const client = DATA.clients.find(c => c.id === job.clientId) || { name: "Client", email: "" };
      const firstName = client.name.split(' ')[0] || "there";

      let billsText = "";
      let total = 0;
      (job.bills || []).forEach(b => {
        total += b.amount;
        billsText += `- ${b.desc}: $${b.amount.toLocaleString()} [${b.status.toUpperCase()}]
`;
      });

      const subject = encodeURIComponent(`${job.name} bill from ${DATA.business.name}`);
      const bodyText = `Hi ${firstName},

Here is the current billing breakdown for ${job.name}:

${billsText}
Total: $${total.toLocaleString()}

${DATA.business.name}
${DATA.business.phone}
Sent from Shop Board`;

      const mailtoUrl = `mailto:${client.email || ''}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;

      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">Email Bill</div>
        <div class="input-group">
          <label class="input-label">Draft Preview</label>
          <textarea class="text-input" style="height: 150px;" readonly>${esc(bodyText)}</textarea>
        </div>
        <a href="${esc(mailtoUrl)}" class="big-btn" onclick="closeModal()">🚀 Open in Mail App</a>
      `;
      openModal(modalHtml);
    }

    function openNewClientModal() {
      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 12px;">New Client</div>
        <div class="input-group">
          <label class="input-label">Client Name</label>
          <input type="text" id="clName" class="text-input" placeholder="e.g. John Smith">
        </div>
        <div class="input-group">
          <label class="input-label">Phone</label>
          <input type="tel" id="clPhone" class="text-input" placeholder="e.g. 207-555-0100">
        </div>
        <div class="input-group">
          <label class="input-label">Email</label>
          <input type="email" id="clEmail" class="text-input" placeholder="e.g. john@example.com">
        </div>
        <div class="input-group">
          <label class="input-label">Address</label>
          <input type="text" id="clAddress" class="text-input" placeholder="e.g. 55 Elm St, Town">
        </div>
        <div class="input-group"><label class="input-label">Project Notes</label><textarea id="clProjectNotes" class="text-input" placeholder="Scope, preferences, access notes, or next steps"></textarea></div>
        <button class="big-btn" onclick="saveNewClient()">Save Client</button>
      `;
      openModal(modalHtml);
    }

    async function saveNewClient() {
      const name = document.getElementById("clName").value.trim();
      const phone = document.getElementById("clPhone").value.trim();
      const email = document.getElementById("clEmail").value.trim();
      const address = document.getElementById("clAddress").value.trim();
      const projectNotes = document.getElementById("clProjectNotes").value.trim();
      if (!name) return;

      DATA.clients.push({
        id: uid("cl"),
        name: name,
        phone: phone,
        email: email,
        address: address,
        projectNotes: projectNotes
      });
      await saveData();
      closeModal();
      renderCurrentView();
    }

    function openEditClientModal(clientId) {
      const client = DATA.clients.find(c => c.id === clientId);
      if (!client) return;
      openModal(`<div style="font-family:var(--font-display); font-size:24px; font-weight:900; text-transform:uppercase; margin-bottom:12px;">Edit Client</div>
        <div class="input-group"><label class="input-label">Client Name</label><input id="editClName" class="text-input" value="${esc(client.name || '')}"></div>
        <div class="input-group"><label class="input-label">Phone</label><input type="tel" id="editClPhone" class="text-input" value="${esc(client.phone || '')}"></div>
        <div class="input-group"><label class="input-label">Email</label><input type="email" id="editClEmail" class="text-input" value="${esc(client.email || '')}"></div>
        <div class="input-group"><label class="input-label">Address</label><input id="editClAddress" class="text-input" value="${esc(client.address || '')}"></div>
        <div class="input-group"><label class="input-label">Project Notes</label><textarea id="editClProjectNotes" class="text-input">${esc(client.projectNotes || '')}</textarea></div>
        <button class="big-btn" onclick="saveClientEdits('${escJs(client.id)}')">Save Changes</button>
        <button class="big-btn" style="background: var(--alert); margin-top: 10px;" onclick="deleteClient('${escJs(client.id)}')">🗑️ Delete Client</button>`);
    }

    async function saveClientEdits(clientId) {
      const client = DATA.clients.find(c => c.id === clientId);
      const name = document.getElementById('editClName').value.trim();
      if (!client || !name) { alert('Please enter a client name.'); return; }
      client.name = name;
      client.phone = document.getElementById('editClPhone').value.trim();
      client.email = document.getElementById('editClEmail').value.trim();
      client.address = document.getElementById('editClAddress').value.trim();
      client.projectNotes = document.getElementById('editClProjectNotes').value.trim();
      await saveData(); closeModal(); renderCurrentView(); showToast('Client updated');
    }

    function openEditJobMoneyModal(jobId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (!job) return;
      const money = getJobMoney(job);
      openModal(`<div style="font-family:var(--font-display); font-size:24px; font-weight:900; text-transform:uppercase; margin-bottom:12px;">Edit Job Money</div>
        <div style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">These direct totals drive the job and Money Board. Existing invoice history remains unchanged.</div>
        <div class="input-group"><label class="input-label">Money Billed ($)</label><input type="number" min="0" step="0.01" id="editMoneyBilled" class="text-input" value="${money.billed}"></div>
        <div class="input-group"><label class="input-label">Money Collected ($)</label><input type="number" min="0" step="0.01" id="editMoneyCollected" class="text-input" value="${money.collected}"></div>
        <button class="big-btn" onclick="saveJobMoney('${escJs(job.id)}')">Save Money Totals</button>`);
    }

    async function saveJobMoney(jobId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      const billed = Number(document.getElementById('editMoneyBilled').value);
      const collected = Number(document.getElementById('editMoneyCollected').value);
      if (!job || !Number.isFinite(billed) || billed < 0 || !Number.isFinite(collected) || collected < 0) { alert('Enter valid zero-or-greater dollar amounts.'); return; }
      job.moneyBilled = billed; job.moneyCollected = collected;
      await saveData(); closeModal(); renderCurrentView(); showToast('Job money totals updated');
    }

    function openNewCrewModal() {
      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 12px;">Add Crew Member</div>
        <div class="input-group">
          <label class="input-label">Name</label>
          <input type="text" id="crName" class="text-input" placeholder="e.g. Sam White">
        </div>
        <div class="input-group">
          <label class="input-label">Phone</label>
          <input type="tel" id="crPhone" class="text-input" placeholder="e.g. 207-555-9988">
        </div>
        <div class="input-group">
          <label class="input-label">Role</label>
          <select id="crRole" class="text-input">
            <option value="Crew">Crew</option>
            <option value="Owner">Owner</option>
          </select>
        </div>
        <button class="big-btn" onclick="saveNewCrew()">Add to Roster</button>
      `;
      openModal(modalHtml);
    }

    async function saveNewCrew() {
      const name = document.getElementById("crName").value.trim();
      const phone = document.getElementById("crPhone").value.trim();
      const role = document.getElementById("crRole").value;
      if (!name) return;

      DATA.crewMembers.push({
        id: uid("c"),
        name: name,
        phone: phone,
        email: "",
        role: role
      });
      await saveData();
      closeModal();
      renderCurrentView();
    }

    
    /* CUSTOM IN-APP CONFIRMATION MODAL (100% RELIABLE ON IOS SAFARI & MOBILE PWAS) */
    let PENDING_CONFIRM_ACTION = null;

    function showAppConfirm(title, message, btnText, onConfirmFn) {
      PENDING_CONFIRM_ACTION = onConfirmFn;
      const modalHtml = `
        <div style="text-align: center; padding: 6px 0;">
          <div style="font-size: 40px; margin-bottom: 8px;">⚠️</div>
          <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; color: var(--alert); margin-bottom: 8px;">
            ${esc(title || 'Confirm Deletion')}
          </div>
          <div style="font-size: 15px; color: var(--text); line-height: 1.4; margin-bottom: 20px; font-weight: 600;">
            ${esc(message)}
          </div>
          <button class="big-btn" style="background: var(--alert); margin-bottom: 10px;" onclick="executeConfirmedAction()">
            ${esc(btnText || 'Yes, Delete')}
          </button>
          <button class="big-btn secondary" style="margin-bottom: 0;" onclick="closeModal()">
            Cancel
          </button>
        </div>
      `;
      openModal(modalHtml);
    }

    async function executeConfirmedAction() {
      const action = PENDING_CONFIRM_ACTION;
      PENDING_CONFIRM_ACTION = null;
      closeModal();
      if (typeof action === 'function') {
        await action();
      }
    }

    function deleteClient(clientId) {
      const client = DATA.clients.find(c => c.id === clientId);
      const name = client ? client.name : 'this client';
      showAppConfirm(
        "Delete Client?",
        `Are you sure you want to delete "${name}"? Existing jobs on your board will remain.`,
        "🗑️ Yes, Delete Client",
        async function() {
          DATA.clients = DATA.clients.filter(c => c.id !== clientId);
          await saveData();
          renderCurrentView();
          showToast("Client deleted");
        }
      );
    }

    function deleteCrewMember(crewId) {
      const cr = DATA.crewMembers.find(c => c.id === crewId);
      if (cr && cr.role === "Owner") {
        showToast("The Owner account cannot be removed.");
        return;
      }
      const name = cr ? cr.name : 'crew member';
      showAppConfirm(
        "Remove Crew?",
        `Remove "${name}" from your crew roster?`,
        "🗑️ Yes, Remove Crew",
        async function() {
          DATA.crewMembers = DATA.crewMembers.filter(c => c.id !== crewId);
          await saveData();
          renderCurrentView();
          showToast("Crew member removed");
        }
      );
    }

    function deleteJob(jobId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      const name = job ? job.name : 'this job';
      showAppConfirm(
        "Delete Job?",
        `Permanently delete "${name}" and all of its notes, photos, and bills?`,
        "🗑️ Yes, Delete Job",
        async function() {
          DATA.jobs = DATA.jobs.filter(j => j.id !== jobId);
          await saveData();
          goHome();
          showToast("Job deleted");
        }
      );
    }

    function deletePhoto(jobId, photoId) {
      showAppConfirm(
        "Delete Photo?",
        "Permanently delete this photo from the job?",
        "🗑️ Yes, Delete Photo",
        async function() {
          const job = DATA.jobs.find(j => j.id === jobId);
          if (job && job.photos) {
            job.photos = job.photos.filter(p => p.id !== photoId);
            await saveData();
            renderCurrentView();
            showToast("Photo deleted");
          }
        }
      );
    }

    function deleteBill(jobId, billId) {
      showAppConfirm(
        "Delete Bill?",
        "Are you sure you want to delete this bill / invoice record?",
        "🗑️ Yes, Delete Bill",
        async function() {
          const job = DATA.jobs.find(j => j.id === jobId);
          if (job && job.bills) {
            job.bills = job.bills.filter(b => b.id !== billId);
            await saveData();
            renderCurrentView();
            showToast("Bill deleted");
          }
        }
      );
    }

    function deleteExpense(jobId, expId) {
      showAppConfirm(
        "Delete Receipt?",
        "Permanently delete this receipt and expense record?",
        "🗑️ Yes, Delete Receipt",
        async function() {
          const job = DATA.jobs.find(j => j.id === jobId);
          if (job && job.expenses) {
            job.expenses = job.expenses.filter(e => e.id !== expId);
            if (job.photos) {
              job.photos = job.photos.filter(p => !p.caption || !p.caption.includes(expId));
            }
            await saveData();
            renderCurrentView();
            showToast("Receipt deleted");
          }
        }
      );
    }

    function deleteFile(jobId, fileId) {
      showAppConfirm(
        "Delete File?",
        "Remove this document attachment from the job?",
        "🗑️ Yes, Remove File",
        async function() {
          const job = DATA.jobs.find(j => j.id === jobId);
          if (job && job.files) {
            job.files = job.files.filter(f => f.id !== fileId);
            await saveData();
            renderCurrentView();
            showToast("File removed");
          }
        }
      );
    }

    /* STEP 2: RECEIPT CAMERA & CANVAS COMPRESSION */
    let TEMP_RECEIPT_PHOTO = null;

    function compressImage(file, maxWidth, quality, callback) {
      if (!file) { callback(null); return; }
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          callback(compressedDataUrl);
        };
        img.onerror = function() { callback(e.target.result); };
        img.src = e.target.result;
      };
      reader.onerror = function() { callback(null); };
      reader.readAsDataURL(file);
    }

    function openQuickReceiptModal(preselectedJobId = null) {
      const targetJobId = preselectedJobId || ACTIVE_JOB_ID || (DATA.jobs[0] ? DATA.jobs[0].id : '');
      TEMP_RECEIPT_PHOTO = null;

      const jobOptions = DATA.jobs.map(j => `
        <option value="${esc(j.id)}" ${j.id === targetJobId ? 'selected' : ''}>${esc(j.name)}</option>
      `).join('');

      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">
          🧾 Snap Receipt
        </div>
        <div style="font-size: 13px; color: var(--text-muted); font-weight: 600; margin-bottom: 14px;">
          Take a photo or choose from camera roll. Auto-compressed for phone storage.
        </div>

        <div class="input-group">
          <label class="input-label">Camera / Photo of Receipt</label>
          <input type="file" id="receiptFileInput" accept="image/*" class="text-input" onchange="handleReceiptPhotoPick(this)">
          <div id="receiptPreviewWrap" style="margin-top: 8px; display: none;">
            <img id="receiptPreviewImg" src="" style="width: 100%; max-height: 180px; object-fit: contain; border-radius: 8px; border: 2px solid var(--border-dark); background:#111;">
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">Assign to Job</label>
          <select id="receiptJobSelect" class="text-input">
            ${jobOptions}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="input-group">
            <label class="input-label">Amount ($)</label>
            <input type="number" step="0.01" min="0" id="receiptAmountInput" class="text-input" placeholder="e.g. 78.50">
          </div>
          <div class="input-group">
            <label class="input-label">Category</label>
            <select id="receiptCategorySelect" class="text-input">
              <option value="Materials">Materials</option>
              <option value="Hardware">Hardware</option>
              <option value="Lumber">Lumber</option>
              <option value="Tools">Tools / Blades</option>
              <option value="Fuel / Dump">Fuel / Dump</option>
              <option value="Subcontract">Subcontract</option>
            </select>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">Vendor / Description</label>
          <input type="text" id="receiptDescInput" class="text-input" placeholder="e.g. Simpson Ties, Lowe's, Lumber yard">
        </div>

        <button class="big-btn" id="saveReceiptBtn" style="background: #2E7D32; margin-top: 8px;" onclick="saveQuickReceipt()">
          ✓ Save Receipt to Job
        </button>
      `;
      openModal(modalHtml);
    }

    function handleReceiptPhotoPick(input) {
      if (input.files && input.files[0]) {
        const saveBtn = document.getElementById("saveReceiptBtn");
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerText = "⏳ Compressing receipt...";
          saveBtn.style.opacity = "0.7";
        }
        showToast("Compressing receipt image...");
        compressImage(input.files[0], 1000, 0.72, function(compressedUrl) {
          TEMP_RECEIPT_PHOTO = compressedUrl;
          const wrap = document.getElementById("receiptPreviewWrap");
          const img = document.getElementById("receiptPreviewImg");
          if (wrap && img && compressedUrl) {
            img.src = compressedUrl;
            wrap.style.display = "block";
          }
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = "✓ Save Receipt to Job";
            saveBtn.style.opacity = "1";
          }
          showToast("Receipt ready");
        });
      }
    }

    async function saveQuickReceipt() {
      const selectEl = document.getElementById("receiptJobSelect");
      const jobId = selectEl ? selectEl.value : ACTIVE_JOB_ID;
      const job = DATA.jobs.find(j => j.id === jobId);
      if (!job) {
        alert("Please select or start a job first.");
        return;
      }

      const amountVal = parseFloat(document.getElementById("receiptAmountInput").value) || 0;
      const descVal = (document.getElementById("receiptDescInput").value || "").trim() || "Receipt / Materials";
      const categoryVal = document.getElementById("receiptCategorySelect") ? document.getElementById("receiptCategorySelect").value : "Materials";

      if (!Array.isArray(job.expenses)) job.expenses = [];

      const expId = uid("e");
      const newExpense = {
        id: expId,
        desc: descVal,
        amount: amountVal,
        category: categoryVal,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        photoUrl: TEMP_RECEIPT_PHOTO || null,
        author: DATA.currentUser ? DATA.currentUser.name : "Crew"
      };

      job.expenses.unshift(newExpense);

      // Register under Job Photos tagged as Receipt
      if (TEMP_RECEIPT_PHOTO) {
        if (!Array.isArray(job.photos)) job.photos = [];
        job.photos.unshift({
          id: uid("p"),
          url: TEMP_RECEIPT_PHOTO,
          tag: "Receipt",
          caption: `${descVal} - $${amountVal.toFixed(2)} (${expId})`,
          author: DATA.currentUser ? DATA.currentUser.name : "Crew",
          timestamp: "Today",
          createdAt: new Date().toISOString()
        });
      }

      TEMP_RECEIPT_PHOTO = null;
      await saveData();
      closeModal();
      renderCurrentView();
      showToast(`Receipt saved: $${amountVal.toFixed(2)} to ${job.name}`);
    }

    function openReceiptViewerById(jobId, expId) {
      const job = DATA.jobs.find(j => j.id === jobId);
      if (!job || !job.expenses) return;
      const exp = job.expenses.find(e => e.id === expId);
      if (!exp || !exp.photoUrl) return;

      const modalHtml = `
        <div style="font-family: var(--font-display); font-size: 22px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">
          Receipt Photo
        </div>
        <div style="font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px;">${esc(exp.desc)}</div>
        <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 12px;">Amount: $${(Number(exp.amount) || 0).toFixed(2)} • ${esc(exp.category || 'Materials')}</div>
        <img src="${esc(exp.photoUrl)}" style="width: 100%; max-height: 60vh; object-fit: contain; border-radius: 8px; border: 2px solid var(--border-dark); background: #000; margin-bottom: 14px;">
        <button class="big-btn secondary" style="margin-bottom: 8px;" onclick="closeModal()">Close</button>
        <button class="big-btn" style="background: var(--alert);" onclick="deleteExpense('${escJs(jobId)}', '${escJs(expId)}')">🗑️ Delete Receipt</button>
      `;
      openModal(modalHtml);
    }


    let COMPANY_LOGO_DRAFT = "";
    let COMPANY_LOGO_BUSY = false;
    let COMPANY_LOGO_REQUEST = 0;

    function openCompanySettings() {
      if (DATA.currentUser.role !== "Owner") {
        showToast("Switch to Owner view to change company settings");
        return;
      }
      COMPANY_LOGO_REQUEST++;
      COMPANY_LOGO_BUSY = false;
      COMPANY_LOGO_DRAFT = DATA.business.logoDataUrl || "";
      openModal(`
        <div style="font-family:var(--font-display);font-size:24px;font-weight:900;margin-bottom:12px;">Company Settings</div>
        <p style="font-size:14px;color:var(--text-muted);margin-bottom:14px;">Company name appears in the header and new email drafts. Your logo appears in the header. Changes apply after saving.</p>
        <form id="companySettingsForm" onsubmit="event.preventDefault();saveCompanyName();">
          <div class="input-group">
            <label class="input-label" for="companyNameInput">Company Name</label>
            <input id="companyNameInput" class="text-input" type="text" maxlength="80" autocomplete="organization" required aria-describedby="companyNameError">
          </div>
          <div class="input-group">
            <label class="input-label" for="companyLogoInput">Company Logo</label>
            <input id="companyLogoInput" class="text-input" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onchange="pickCompanyLogo(this)">
            <p style="font-size:13px;color:var(--text-muted);margin:8px 0;">PNG or JPEG, up to 10 MB. PNG transparency is preserved. Resized to fit within 256 × 256 pixels, without cropping.</p>
            <img id="companyLogoPreview" class="company-logo-preview" alt="Selected company logo" hidden>
            <p id="companyLogoStatus" role="status" aria-live="polite" style="font-size:13px;margin:8px 0;"></p>
            <button id="removeCompanyLogoBtn" class="comm-btn" type="button" onclick="removeCompanyLogo()" hidden>Remove Logo</button>
          </div>
          <div id="companyNameError" role="alert" style="color:var(--alert);font-weight:700;margin-bottom:12px;" hidden></div>
          <button id="saveCompanySettingsBtn" type="submit" class="big-btn">Save Settings</button>
          <button type="button" class="big-btn secondary" onclick="cancelCompanySettings()">Cancel</button>
        </form>
      `);
      document.getElementById("companyNameInput").value = DATA.business.name || "";
      refreshCompanyLogoPreview();
    }

    function refreshCompanyLogoPreview() {
      const preview = document.getElementById("companyLogoPreview");
      const remove = document.getElementById("removeCompanyLogoBtn");
      if (!preview || !remove) return;
      if (COMPANY_LOGO_DRAFT) {
        preview.src = COMPANY_LOGO_DRAFT;
        preview.hidden = false;
      } else {
        preview.removeAttribute("src");
        preview.hidden = true;
      }
      remove.hidden = !COMPANY_LOGO_DRAFT;
    }

    function cancelCompanySettings() {
      COMPANY_LOGO_REQUEST++;
      COMPANY_LOGO_BUSY = false;
      COMPANY_LOGO_DRAFT = "";
      closeModal();
    }

    function removeCompanyLogo() {
      COMPANY_LOGO_REQUEST++;
      COMPANY_LOGO_BUSY = false;
      COMPANY_LOGO_DRAFT = "";
      const input = document.getElementById("companyLogoInput");
      const save = document.getElementById("saveCompanySettingsBtn");
      if (input) input.value = "";
      if (save) { save.disabled = false; save.textContent = "Save Settings"; }
      refreshCompanyLogoPreview();
      document.getElementById("companyLogoStatus").textContent = "Logo will be removed when you save. Cancel keeps the current logo.";
    }

    function pickCompanyLogo(input) {
      if (DATA.currentUser.role !== "Owner" || !input.files || !input.files[0]) return;
      const file = input.files[0];
      const status = document.getElementById("companyLogoStatus");
      const save = document.getElementById("saveCompanySettingsBtn");
      const request = ++COMPANY_LOGO_REQUEST;
      COMPANY_LOGO_BUSY = false;
      save.disabled = false;
      save.textContent = "Save Settings";
      const png = file.type === "image/png" || (!file.type && /\.png$/i.test(file.name));
      const jpeg = file.type === "image/jpeg" || (!file.type && /\.jpe?g$/i.test(file.name));
      if (!png && !jpeg) { status.textContent = "Choose a PNG or JPEG image. Current logo is unchanged."; input.value = ""; return; }
      if (file.size > 10 * 1024 * 1024) { status.textContent = "Image is too large. Choose a file under 10 MB."; input.value = ""; return; }
      COMPANY_LOGO_BUSY = true;
      save.disabled = true;
      save.textContent = "Preparing Logo…";
      status.textContent = "Preparing logo…";
      function active() {
        return request === COMPANY_LOGO_REQUEST && document.getElementById("companyLogoInput") === input &&
          document.getElementById("modalOverlay").style.display === "flex";
      }
      function fail(message) {
        if (!active()) return;
        COMPANY_LOGO_BUSY = false;
        save.disabled = false;
        save.textContent = "Save Settings";
        status.textContent = message + " Current logo is unchanged.";
        input.value = "";
      }
      const reader = new FileReader();
      reader.onerror = () => fail("Could not read the image.");
      reader.onload = () => {
        if (!active()) return;
        const img = new Image();
        img.onerror = () => fail("Could not decode this image.");
        img.onload = () => {
          if (!active()) return;
          try {
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;
            if (!width || !height || width * height > 40000000) throw new Error("Image dimensions are unsupported; use a smaller image.");
            const scale = Math.min(1, 256 / width, 256 / height);
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Image processing is unavailable.");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const data = canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.85);
            if (!/^data:image\/(png|jpeg);base64,/.test(data) || data.length > 256 * 1024) throw new Error("Prepared logo is too large; use a simpler or smaller image.");
            COMPANY_LOGO_DRAFT = data;
            COMPANY_LOGO_BUSY = false;
            save.disabled = false;
            save.textContent = "Save Settings";
            refreshCompanyLogoPreview();
            status.textContent = "Logo ready. Tap Save Settings to apply it.";
          } catch (e) { fail(e.message || "Could not prepare logo."); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }

    async function saveCompanyName() {
      if (DATA.currentUser.role !== "Owner" || COMPANY_LOGO_BUSY) return;
      const input = document.getElementById("companyNameInput");
      const error = document.getElementById("companyNameError");
      if (!input || !error) return;
      const name = input.value.trim();
      error.hidden = true;
      if (!name || name.length > 80 || /[<>"\r\n]/.test(name)) {
        error.textContent = "Enter a company name (1–80 characters), without angle brackets, double quotes, or line breaks.";
        error.hidden = false;
        return;
      }
      const next = {...DATA, business: {...DATA.business, name: name, companyNameCustomized: true, logoDataUrl: COMPANY_LOGO_DRAFT}};
      try {
        const payload = JSON.stringify(next);
        await Storage.set("SHOP_BOARD_DATA", payload);
        if (Storage.get("SHOP_BOARD_DATA") !== payload) throw new Error("Save verification failed");
      } catch (e) {
        error.textContent = "Settings were not saved. Phone storage may be full or unavailable. Your saved company name and logo are unchanged.";
        error.hidden = false;
        return;
      }
      DATA.business = next.business;
      updateHeaderBadges();
      COMPANY_LOGO_REQUEST++;
      closeModal();
      showToast("Company settings saved on this device");
    }

    // Run setup
    updateHeaderBadges();
  
;





;





;





;





;





;





;





;





;





;





;





for (const runAddOn of (window.ShopBoardAddOns || [])) await runAddOn();
const indicator=document.getElementById('savedIndicator');if(indicator)indicator.textContent='SAVED ON PHONE • '+Storage.backendLabel();document.body.removeAttribute('data-shop-boot');document.getElementById('shopBootOverlay').hidden=true;
}
