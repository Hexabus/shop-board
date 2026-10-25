(function(){
"use strict";
if(window.ShopBoardOwnerCloud)return;
const PROJECT="https://pgnhbcauvugxbbylxzye.supabase.co";
const KEY="sb_publishable_xvVqeoyGvl-aVyIr8wWnDw_a8LWBtlL";
const OWNER="a2447b13-633c-4a88-874e-f67f99509709";
const ACCESS="/rest/v1/shop_board_owner_access?select=user_id";
const SNAP="/rest/v1/shop_board_cloud_snapshots";
const RECEIPT_KEY="shopBoardCloudSnapshotReceipt";
const MAX_BYTES=25*1024*1024;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let session=null,busy=false,expiryTimer=null,anonymousPassed=false,lastVerified=null;
let preview=null,receipt=null,receiptError="",lastResult="";
let notice="Not signed in. Manual cloud snapshots only; automatic synchronization is disabled.";
function node(id){return document.getElementById(id);}
function text(id,value){const n=node(id);if(n)n.textContent=value;}
function loadReceipt(){try{const raw=localStorage.getItem(RECEIPT_KEY);if(!raw)return;const r=JSON.parse(raw);if(!r||!UUID.test(r.snapshotId)||r.owner!==OWNER||!/^[0-9a-f]{64}$/.test(r.hash)||!["pending","verified"].includes(r.state)||typeof r.source!=="string")throw Error("Invalid local upload receipt.");receipt=r;}catch(e){receiptError="The local upload receipt could not be read. Do not start a new upload; report this message.";}}
function saveReceipt(r){const previous=localStorage.getItem(RECEIPT_KEY);if(previous){const old=JSON.parse(previous);if(old&&old.state==="pending"&&old.snapshotId!==r.snapshotId)throw Error("Another unresolved upload receipt exists on this installation. Check that snapshot before starting another.");}const value=JSON.stringify(r);localStorage.setItem(RECEIPT_KEY,value);if(localStorage.getItem(RECEIPT_KEY)!==value)throw Error("The upload receipt could not be verified on this device.");receipt=r;}
function describe(r){return "Snapshot ID: "+r.snapshotId+"\nJSON content SHA-256: "+r.hash+"\nSource: "+r.source+"\nState: "+r.state+(r.verifiedAt?"\nVerified here: "+new Date(r.verifiedAt).toLocaleString():"");}
function render(){
 const signed=Boolean(session);text("shopOwnerCloudStatus",notice);
 text("shopOwnerCloudIdentity",session?"Cloud owner: "+session.email+". Last access verification: "+new Date(lastVerified).toLocaleString():"No cloud session. Your local records remain available.");
 text("shopOwnerCloudAnonymousResult",anonymousPassed?"Anonymous reads blocked for owner and snapshot tables.":"Anonymous table tests have not passed in this open app.");
 text("shopSnapshotReceipt",receiptError||(receipt?describe(receipt):"No upload receipt recorded on this installation."));
 text("shopSnapshotPreview",preview?"Selected file: "+preview.fileName+"\nSource: "+preview.row.source_device+"\nExported: "+preview.row.payload.exportedAt+"\n"+preview.summary+"\nRequest size: "+(preview.bytes/1024/1024).toFixed(2)+" MiB\nSnapshot ID: "+preview.row.id+"\nJSON content SHA-256: "+preview.row.payload_sha256+(preview.verified?"\nPreviously verified. Use Check Snapshot by ID to read it again.":""):"Select a fresh exported backup and prepare a preview. Nothing uploads automatically.");
 text("shopSnapshotResult",lastResult);
 const state={shopOwnerCloudEmail:busy||signed,shopOwnerCloudPassword:busy||signed,shopOwnerCloudSignIn:busy||signed,shopOwnerCloudRecheck:busy||!signed,shopOwnerCloudSignOut:busy||!signed,shopOwnerCloudTestAnonymous:busy,shopSnapshotFile:busy,shopSnapshotSource:busy,shopSnapshotPrepare:busy||!signed||Boolean(receiptError),shopSnapshotUpload:busy||!signed||!preview||preview.verified||Boolean(receiptError),shopSnapshotVerify:busy||!signed,shopSnapshotID:busy,shopSnapshotExpectedHash:busy,shopSnapshotConfirmed:busy};
 Object.entries(state).forEach(([id,value])=>{const n=node(id);if(n&&n.disabled!==Boolean(value))n.disabled=Boolean(value);});
}
function clearSession(){clearTimeout(expiryTimer);expiryTimer=null;session=null;lastVerified=null;render();}
function expire(){if(session&&Date.now()>=session.expiresAt){clearSession();notice="Cloud session expired. Sign in again while online. Local records and any pending upload receipt remain unchanged.";render();}}
async function request(path,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),options.timeout||20000);
 const headers={apikey:KEY,Accept:"application/json"};if(options.token)headers.Authorization="Bearer "+options.token;if(options.body!==undefined)headers["Content-Type"]="application/json";if(options.prefer)headers.Prefer=options.prefer;
 try{const response=await fetch(PROJECT+path,{method:options.method||"GET",headers,body:options.body===undefined?undefined:JSON.stringify(options.body),cache:"no-store",credentials:"omit",redirect:"error",signal:controller.signal});let data=null;if(response.status!==204){const raw=await response.text();if(raw){try{data=JSON.parse(raw);}catch(e){throw Error("Supabase returned a non-JSON response. No verification was completed.");}}}return{ok:response.ok,status:response.status,data};}
 catch(e){if(e.name==="AbortError")throw Error("Supabase request timed out. If an upload was attempted, its server outcome is uncertain; keep the same snapshot ID for checking or retrying.");if(e instanceof TypeError)throw Error("Could not reach Supabase. Check your connection; any attempted upload must be checked with the same snapshot ID.");throw e;}finally{clearTimeout(timer);}
}
function failure(r,step){const code=r.data&&(r.data.error_code||r.data.code);if(code==="invalid_credentials")return Error("Email or password was not accepted. Use the project owner account, not the Supabase dashboard account.");if(code==="email_not_confirmed")return Error("Confirm your owner email in Supabase Authentication → Users.");if(r.status===429)return Error("Supabase rate limit reached. Wait before retrying.");return Error(step+" failed (HTTP "+r.status+(code?", code "+String(code):"")+"). Do not disable RLS or share secret keys.");}
async function run(label,work){if(busy)return false;busy=true;notice=label;render();try{await work();return true;}catch(e){notice=e.message+" Local business records were not replaced or deleted.";return false;}finally{busy=false;render();}}
async function anonymousRead(){anonymousPassed=false;for(const path of[ACCESS,SNAP+"?select=id&limit=1"]){const r=await request(path);if((r.status===401||r.status===403)&&r.data&&r.data.code==="42501")continue;if(r.ok&&Array.isArray(r.data)&&r.data.length)throw Error("STOP: anonymous access returned cloud data. Review grants and RLS before proceeding.");if(r.ok)throw Error("Anonymous request succeeded instead of receiving the expected table permission denial. Security test is inconclusive.");throw failure(r,"Anonymous access test");}anonymousPassed=true;}
async function verifyOwner(token){const u=await request("/auth/v1/user",{token});if(!u.ok)throw failure(u,"Owner identity check");const r=await request(ACCESS,{token});if(!r.ok)throw failure(r,"Owner access read");if(!u.data||u.data.id!==OWNER)throw Error("Access denied: this is not the configured owner account.");if(!Array.isArray(r.data)||r.data.length!==1||r.data[0].user_id!==OWNER)throw Error("The protected owner row did not match.");return typeof u.data.email==="string"?u.data.email:"Verified owner";}
async function serverSignOut(token){const r=await request("/auth/v1/logout?scope=local",{method:"POST",token});if(!r.ok)throw failure(r,"Server sign-out");}
function requireSession(){expire();if(!session)throw Error("Sign in as the owner first. The session is not retained after reload.");return session;}
async function checkedSession(){const s=requireSession();await verifyOwner(s.token);if(session!==s||Date.now()>=s.expiresAt)throw Error("Session expired. Sign in again.");lastVerified=Date.now();return s;}
async function testAnonymous(){return run("Testing anonymous access to both cloud tables…",async()=>{await anonymousRead();notice="Anonymous reads correctly blocked for both tables. No owner or snapshot data returned.";});}
async function signIn(email,password){expire();if(session){notice="Already signed in; use Recheck Owner Access.";render();return false;}if(typeof email!=="string"||!email.trim()||typeof password!=="string"||!password){notice="Enter your owner email and password. Keep passwords out of chat.";render();return false;}return run("Signing in and checking protected owner access…",async()=>{let candidate=null;try{await anonymousRead();const a=await request("/auth/v1/token?grant_type=password",{method:"POST",body:{email:email.trim(),password}});password="";if(!a.ok)throw failure(a,"Sign-in");if(!a.data||typeof a.data.access_token!=="string"||!Number.isFinite(a.data.expires_in)||a.data.expires_in<=0)throw Error("Invalid session response.");candidate=a.data.access_token;const expiresAt=Date.now()+Math.min(a.data.expires_in,3600)*1000;a.data.refresh_token=null;const ownerEmail=await verifyOwner(candidate);if(Date.now()>=expiresAt)throw Error("Session expired during verification.");session={token:candidate,email:ownerEmail,expiresAt};lastVerified=Date.now();clearTimeout(expiryTimer);expiryTimer=setTimeout(expire,expiresAt-Date.now()+10);notice="Owner access verified. Manual snapshot uploads are available; automatic sync remains disabled.";}catch(e){if(candidate){try{await serverSignOut(candidate);}catch(_){}}clearSession();throw e;}finally{password="";}});}
async function recheck(){return run("Rechecking owner access…",async()=>{try{await checkedSession();notice="Owner access reverified by Supabase. Automatic sync remains disabled.";}catch(e){clearSession();throw e;}});}
async function signOut(){if(busy)return false;const token=session&&session.token;clearSession();if(!token){notice="No cloud session remains. Local records were kept.";render();return true;}return run("Cleared cloud token here; requesting current-session sign-out…",async()=>{try{await serverSignOut(token);notice="Signed out. Local business records and upload receipts were kept. This does not lock the offline app.";}catch(e){throw Error("Token cleared here, but server sign-out was not confirmed. "+e.message);}});}
function canonical(v){if(v===null)return"null";if(typeof v==="string"||typeof v==="boolean")return JSON.stringify(v);if(typeof v==="number"&&Number.isFinite(v))return JSON.stringify(v);if(Array.isArray(v))return"["+v.map(canonical).join(",")+"]";if(v&&typeof v==="object")return"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";throw Error("Backup contains an unsupported JSON value.");}
async function checksum(value){if(!window.crypto||!window.crypto.subtle||typeof TextEncoder==="undefined")throw Error("Secure SHA-256 verification is unavailable in this browser.");const raw=await window.crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical(value)));return Array.from(new Uint8Array(raw),b=>b.toString(16).padStart(2,"0")).join("");}
function newID(){if(window.crypto.randomUUID)return window.crypto.randomUUID();const b=window.crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20);}
function validateBackup(payload){const api=window.ShopBoardBackupRestore;if(!api||typeof api.validateBackup!=="function")throw Error("The app's backup validator is unavailable. Nothing was uploaded.");if(!payload||payload.app!=="Shop Board"||payload.schemaVersion!==1||typeof payload.exportedAt!=="string"||Number.isNaN(Date.parse(payload.exportedAt)))throw Error("Choose a version 1 Shop Board JSON export with an export timestamp.");return api.validateBackup(payload);}
function summary(stats){return stats.jobs+" jobs • "+stats.clients+" clients • "+stats.crew+" crew • "+stats.photos+" photo records • "+stats.documents+" document records • "+stats.receipts+" expenses • "+stats.notes+" notes • "+stats.bills+" bills";}
function receiptFor(p,state){return{owner:OWNER,snapshotId:p.row.id,hash:p.row.payload_sha256,source:p.row.source_device,fileName:p.fileName,exportedAt:p.row.payload.exportedAt,state,verifiedAt:state==="verified"?new Date().toISOString():null};}
async function prepareFile(file,source){return run("Reading and validating the selected backup locally; no upload is being made…",async()=>{
 preview=null;lastResult="";const confirmation=node("shopSnapshotConfirmed");if(confirmation)confirmation.checked=false;requireSession();if(receiptError)throw Error(receiptError);if(!file||typeof file.text!=="function"||typeof file.name!=="string"||!/\.json$/i.test(file.name))throw Error("Choose the fresh JSON backup exported from your main iPhone.");if(file.size>MAX_BYTES)throw Error("This first snapshot release limits files and requests to 25 MiB. Nothing uploaded; do not remove attachments to force it through.");if(typeof source!=="string"||!source.trim()||source.trim().length>80)throw Error("Enter a source label of 1–80 characters, for example Main iPhone.");
 const raw=await file.text();if(new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw Error("Backup exceeds this release's 25 MiB limit. Nothing uploaded.");const payload=JSON.parse(raw),validated=validateBackup(payload),hash=await checksum(payload);
 if(receipt&&receipt.state==="pending"&&receipt.hash!==hash)throw Error("An earlier upload is unresolved. Check its snapshot ID first, or reselect the SAME backup file to retry with its existing ID. No new upload was prepared.");
 const reuse=receipt&&receipt.hash===hash;const row={id:reuse?receipt.snapshotId:newID(),owner_id:OWNER,source_device:reuse?receipt.source:source.trim(),backup_schema:1,payload,payload_sha256:hash};const bytes=new TextEncoder().encode(JSON.stringify(row)).byteLength;if(bytes>MAX_BYTES)throw Error("Upload request exceeds the 25 MiB guard. Nothing uploaded.");
 preview={row,bytes,fileName:file.name,summary:summary(validated.stats),verified:Boolean(reuse&&receipt.state==="verified")};const c=node("shopSnapshotConfirmed");if(c)c.checked=false;const id=node("shopSnapshotID");if(id)id.value=row.id;const expected=node("shopSnapshotExpectedHash");if(expected)expected.value=hash;
 notice=preview.verified?"This exact backup was previously verified on this installation. Use Check Snapshot by ID rather than uploading a duplicate.":"Preview ready. Review source, export date, counts and size; then explicitly confirm before uploading.";
 });}
async function getSnapshot(id,token){const r=await request(SNAP+"?id=eq."+encodeURIComponent(id)+"&select=id,owner_id,created_at,source_device,backup_schema,payload,payload_sha256",{token,timeout:60000});if(!r.ok)throw failure(r,"Snapshot read");if(!Array.isArray(r.data)||r.data.length>1)throw Error("Unexpected snapshot response.");return r.data[0]||null;}
async function verifyRow(row,id,expectedHash,expectedSource){if(!row||row.id!==id||row.owner_id!==OWNER||row.backup_schema!==1||typeof row.source_device!=="string"||!row.created_at||Number.isNaN(Date.parse(row.created_at)))throw Error("Cloud snapshot metadata did not match.");if(expectedSource!==undefined&&row.source_device!==expectedSource)throw Error("Cloud source label did not match the selected snapshot.");const validated=validateBackup(row.payload);const actual=await checksum(row.payload);if(actual!==row.payload_sha256||(expectedHash&&actual!==expectedHash))throw Error("Cloud read-back checksum did NOT match. Do not treat this snapshot as verified.");return{hash:actual,summary:summary(validated.stats)};}
function showVerified(row,checked){lastResult="Cloud snapshot verified by reading it back.\nSnapshot ID: "+row.id+"\nJSON content SHA-256: "+checked.hash+"\nSource: "+row.source_device+"\nStored: "+new Date(row.created_at).toLocaleString()+"\n"+checked.summary+"\nNo local records were restored, replaced or merged.";const id=node("shopSnapshotID");if(id)id.value=row.id;const hash=node("shopSnapshotExpectedHash");if(hash)hash.value=checked.hash;}
function markVerified(p){p.verified=true;try{saveReceipt(receiptFor(p,"verified"));return"";}catch(e){return" Cloud contents were verified, but saving the local receipt failed. Keep the displayed snapshot ID and checksum.";}}
async function uploadPrepared(confirmed){return run("Checking the selected snapshot before manual upload…",async()=>{
 if(!confirmed)throw Error("Confirm that this is the main iPhone's intended backup, a separate backup is saved, and you approve uploading its private contents.");if(!preview)throw Error("Prepare a backup preview first.");if(preview.verified)throw Error("This snapshot was already verified. Use Check Snapshot by ID; no duplicate was uploaded.");if(receiptError)throw Error(receiptError);const p=preview;const s=await checkedSession();await anonymousRead();
 if(await checksum(p.row.payload)!==p.row.payload_sha256)throw Error("The prepared snapshot changed. Prepare it again.");
 // Persist only an ID/checksum receipt before POST, never the payload, password or tokens.
 saveReceipt(receiptFor(p,"pending"));
 const existing=await getSnapshot(p.row.id,s.token);
 if(existing){const checked=await verifyRow(existing,p.row.id,p.row.payload_sha256,p.row.source_device);showVerified(existing,checked);notice="Existing snapshot matched; no duplicate upload was sent."+markVerified(p);return;}
 notice="Uploading the confirmed snapshot. Keep this app open; it is not background sync.";render();
 try{const result=await request(SNAP,{method:"POST",token:s.token,body:p.row,prefer:"return=minimal",timeout:60000});if(!result.ok&&!(result.status===409&&result.data&&result.data.code==="23505"))throw failure(result,"Snapshot upload");}
 catch(e){throw Error(e.message+" The server may or may not have stored it. The local pending receipt was retained. Check or retry this SAME ID; do not prepare a different upload.");}
 const row=await getSnapshot(p.row.id,s.token);if(!row)throw Error("No snapshot row was visible after the attempt. Outcome is not verified. Keep the pending receipt and retry/check the SAME snapshot ID.");const checked=await verifyRow(row,p.row.id,p.row.payload_sha256,p.row.source_device);showVerified(row,checked);notice="Manual cloud upload and read-back verification succeeded. Automatic sync remains disabled."+markVerified(p);const c=node("shopSnapshotConfirmed");if(c)c.checked=false;
 });}
async function verifySnapshot(id,expectedHash){return run("Reading the requested cloud snapshot; no upload or restore is being made…",async()=>{
 if(typeof id!=="string"||!UUID.test(id.trim()))throw Error("Enter a valid snapshot UUID.");id=id.trim().toLowerCase();expectedHash=typeof expectedHash==="string"?expectedHash.trim().toLowerCase():"";if(expectedHash&&!/^[0-9a-f]{64}$/.test(expectedHash))throw Error("Expected checksum must contain 64 hexadecimal characters.");const s=await checkedSession();const row=await getSnapshot(id,s.token);if(!row)throw Error("No visible row with that ID. If an upload was interrupted, wait and recheck or reselect the same original file to retry. No receipt was discarded.");
 const pendingMatch=receipt&&receipt.snapshotId===id;const expected=expectedHash||(pendingMatch?receipt.hash:"");const checked=await verifyRow(row,id,expected,pendingMatch?receipt.source:undefined);showVerified(row,checked);let warning="";
 if(pendingMatch){try{saveReceipt({...receipt,state:"verified",verifiedAt:new Date().toISOString()});if(preview&&preview.row.id===id)preview.verified=true;}catch(e){warning=" Local receipt tracking could not be updated; retain the displayed ID and checksum.";}}
 notice=(expected?"Cloud content matched the supplied/original checksum.":"Cloud snapshot is internally consistent. Compare the displayed checksum with the original device to confirm it is the intended copy.")+" No local records were restored or merged."+warning;
 });}
  // SHOP BOARD VERIFIED CLOUD DOWNLOAD v1 — paste ONCE immediately BEFORE function insertPanel(){
// This code belongs INSIDE the existing Owner Cloud script. No new script tags.
let shopCloudDownloadReady=null,shopCloudDownloadTimer=null;
let shopCloudDownloadMessage="Prepare a verified JSON file, then save it. This does not restore or merge records.";
function shopCloudForgetDownload(){
 clearTimeout(shopCloudDownloadTimer);shopCloudDownloadTimer=null;
 if(shopCloudDownloadReady)URL.revokeObjectURL(shopCloudDownloadReady.url);
 shopCloudDownloadReady=null;
}
function shopCloudDownloadInputs(){
 const id=(node("shopSnapshotID")?.value||"").trim().toLowerCase();
 let hash=(node("shopSnapshotExpectedHash")?.value||"").trim().toLowerCase();
 if(!hash&&receipt&&receipt.snapshotId===id)hash=receipt.hash;
 return{id,hash};
}
function shopCloudDownloadMatches(){
 const p=shopCloudDownloadReady,inputs=shopCloudDownloadInputs();
 return Boolean(p&&session===p.session&&Date.now()<p.expiresAt&&inputs.id===p.id&&inputs.hash===p.hash);
}
function shopCloudRenderDownload(){
 if(shopCloudDownloadReady&&(!session||session!==shopCloudDownloadReady.session||Date.now()>=shopCloudDownloadReady.expiresAt)){
  shopCloudForgetDownload();shopCloudDownloadMessage="Prepared download cleared after sign-out or expiry. Sign in and prepare it again; saved files are unaffected.";
 }
 const prepare=node("shopCloudDownloadPrepare"),saved=node("shopCloudSavedCheck"),input=node("shopCloudSavedFile"),confirm=node("shopCloudDownloadConfirm"),link=node("shopCloudDownloadLink");
 if(prepare)prepare.disabled=busy||!session;
 if(saved)saved.disabled=busy;
 if(input)input.disabled=busy;
 if(confirm)confirm.disabled=busy||!shopCloudDownloadMatches();
 if(link){const allowed=!busy&&shopCloudDownloadMatches()&&Boolean(confirm&&confirm.checked);link.setAttribute("aria-disabled",String(!allowed));link.tabIndex=allowed?0:-1;link.style.opacity=allowed?"1":"0.55";
  if(allowed){link.href=shopCloudDownloadReady.url;link.download=shopCloudDownloadReady.filename;}else{link.removeAttribute("href");link.removeAttribute("download");}
 }
 text("shopCloudDownloadStatus",shopCloudDownloadMessage);
}
async function shopCloudPrepareDownload(){
 return run("Reading and verifying a cloud snapshot for download; no upload or restore…",async()=>{
  shopCloudForgetDownload();const confirmation=node("shopCloudDownloadConfirm");if(confirmation)confirmation.checked=false;
  shopCloudDownloadMessage="No verified download ready yet. See Owner Cloud status if preparation fails.";
  const inputs=shopCloudDownloadInputs();
  if(!UUID.test(inputs.id))throw Error("Enter the snapshot ID in the field above.");
  if(!/^[0-9a-f]{64}$/.test(inputs.hash))throw Error("For download, enter the ORIGINAL 64-character JSON content checksum in the field above. A matching local receipt can also supply it.");
  const s=await checkedSession();const row=await getSnapshot(inputs.id,s.token);
  if(!row)throw Error("No snapshot is visible with that ID. No file was prepared.");
  const checked=await verifyRow(row,inputs.id,inputs.hash);
  const raw=JSON.stringify(row.payload),bytes=new TextEncoder().encode(raw).byteLength;
  if(bytes>MAX_BYTES)throw Error("Downloaded JSON exceeds this release's 25 MiB guard. No file prepared; do not strip attachments.");
  if(await checksum(JSON.parse(raw))!==checked.hash)throw Error("JSON export content did not match the verified snapshot. No file prepared.");
  if(session!==s||Date.now()>=s.expiresAt)throw Error("Session expired during preparation. Sign in and prepare again.");
  if(!window.URL||typeof URL.createObjectURL!=="function"||typeof Blob!=="function")throw Error("This browser cannot prepare a JSON download.");
  const filename="shop-board-cloud-snapshot-"+row.id+".json";
  shopCloudDownloadReady={url:URL.createObjectURL(new Blob([raw],{type:"application/json;charset=utf-8"})),filename,id:row.id,hash:checked.hash,session:s,expiresAt:Math.min(s.expiresAt,Date.now()+10*60*1000)};
  shopCloudDownloadTimer=setTimeout(()=>{shopCloudForgetDownload();shopCloudDownloadMessage="Prepared download expired. Prepare it again; saved files are unaffected.";shopCloudRenderDownload();},Math.max(1,shopCloudDownloadReady.expiresAt-Date.now()));
  shopCloudDownloadMessage="Verified JSON ready — NOT yet confirmed saved.\nFile: "+filename+"\nSource: "+row.source_device+"\nExported: "+row.payload.exportedAt+"\n"+checked.summary+"\nSize: "+(bytes/1024/1024).toFixed(2)+" MiB\nJSON content SHA-256: "+checked.hash+"\nConfirm the private-file notice, then tap Save Verified JSON. Link expires within 10 minutes or on sign-out. No local records changed.";
  notice="Cloud content verified and JSON file prepared. Saving is a separate tap; no restore was performed.";
 });
}
async function shopCloudCheckSavedFile(){
 return run("Checking the selected saved JSON locally; no cloud request or restore…",async()=>{
  shopCloudDownloadMessage="Saved-file check has not passed yet. See Owner Cloud status if validation fails.";
  const file=node("shopCloudSavedFile")?.files?.[0];const inputs=shopCloudDownloadInputs();
  if(!file||typeof file.text!=="function"||!/\.json$/i.test(file.name))throw Error("Choose the JSON file you actually saved to Files.");
  if(!/^[0-9a-f]{64}$/.test(inputs.hash))throw Error("Enter the original JSON content checksum above for this local-file check.");
  if(file.size>MAX_BYTES)throw Error("Selected file exceeds the 25 MiB guard.");
  const raw=await file.text();if(new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw Error("Selected file exceeds the 25 MiB guard.");
  const payload=JSON.parse(raw),validated=validateBackup(payload),hash=await checksum(payload);
  if(hash!==inputs.hash)throw Error("Saved JSON checksum did NOT match the original. Do not treat this file as a verified recovery copy.");
  shopCloudDownloadMessage="Saved JSON passed backup validation and matched the original content checksum.\nFile: "+file.name+"\n"+summary(validated.stats)+"\nJSON content SHA-256: "+hash+"\nNo local records were restored, replaced or merged.";
  notice="Saved JSON validation and checksum check passed. This checked the file only; restore and automatic sync remain disabled.";
 });
}
function shopCloudInsertDownload(){
 const host=node("shopOwnerCloudPanel");if(!host||node("shopCloudDownloadSection"))return;
 const section=document.createElement("section");section.id="shopCloudDownloadSection";
 section.innerHTML=`<hr style="margin:16px 0;border:0;border-top:1px solid var(--border);">
<h4 style="font-size:18px;margin:12px 0;">3. Download a verified cloud backup</h4>
<p class="shop-cloud-note">Uses the snapshot ID and original JSON checksum entered above. Download requires the original checksum (or a matching local receipt), even though the read-only check allows it to be blank. No restore or merge.</p>
<button id="shopCloudDownloadPrepare" type="button" class="big-btn secondary">Prepare Verified JSON Download</button>
<label style="display:flex;gap:10px;margin:14px 0;"><input id="shopCloudDownloadConfirm" type="checkbox" style="min-width:24px;min-height:24px;"><span>I understand this backup contains private client, financial and embedded-file contents. I will save it to a location I control. Downloading does not restore it.</span></label>
<a id="shopCloudDownloadLink" class="big-btn" aria-disabled="true" style="display:block;text-align:center;text-decoration:none;">Save Verified JSON</a>
<p class="shop-cloud-note">After tapping Save, confirm the file exists in Files. A download request alone does not prove it was saved. The downloaded JSON contains the original backup payload, not cloud session tokens or the database row wrapper.</p>
<h4 style="font-size:16px;margin:12px 0;">Check the file you saved — no restore</h4>
<label class="input-label" for="shopCloudSavedFile">Select the downloaded JSON from Files</label>
<input id="shopCloudSavedFile" class="text-input" type="file" accept=".json,application/json">
<button id="shopCloudSavedCheck" type="button" class="big-btn secondary">Validate Saved JSON — No Restore</button>
<p id="shopCloudDownloadStatus" class="shop-cloud-detail" role="status" aria-live="polite"></p>`;
 host.appendChild(section);
 node("shopCloudDownloadPrepare").addEventListener("click",shopCloudPrepareDownload);
 node("shopCloudDownloadConfirm").addEventListener("change",shopCloudRenderDownload);
 node("shopCloudSavedCheck").addEventListener("click",shopCloudCheckSavedFile);
 node("shopCloudDownloadLink").addEventListener("click",event=>{
  expire();if(busy||!shopCloudDownloadMatches()||!node("shopCloudDownloadConfirm")?.checked){event.preventDefault();shopCloudRenderDownload();return;}
  shopCloudDownloadMessage="Download requested: "+shopCloudDownloadReady.filename+". Confirm it is saved in Files, then select it below and run Validate Saved JSON. No records were restored.";
  shopCloudRenderDownload();
 });
 for(const id of["shopSnapshotID","shopSnapshotExpectedHash"]){const input=node(id);if(input)input.addEventListener("input",()=>{if(shopCloudDownloadReady&&!shopCloudDownloadMatches()){shopCloudForgetDownload();shopCloudDownloadMessage="Snapshot ID/checksum changed. Prepare the intended download again.";}shopCloudRenderDownload();});}
 shopCloudRenderDownload();
}
const shopCloudDownloadOriginalRender=render;
render=function(){shopCloudDownloadOriginalRender();shopCloudRenderDownload();};
const shopCloudDownloadOriginalInsert=insertPanel;
insertPanel=function(){const result=shopCloudDownloadOriginalInsert.apply(this,arguments);shopCloudInsertDownload();return result;};
// END SHOP BOARD VERIFIED CLOUD DOWNLOAD v1
// SHOP BOARD DIRECT DEVICE BACKUP v1 — insert ONCE before the existing function insertPanel(){ line.
// INSIDE the Owner Cloud script; keep the previous download patch. No script tags.
let shopDirectMeta=null,shopDirectDBPromise=null,shopDirectRenderedID=null;
function shopDirectOpen(){
 if(shopDirectDBPromise)return shopDirectDBPromise;
 shopDirectDBPromise=new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(Error("IndexedDB is unavailable. Direct backup was not started."));return;}
  let done=false;const req=window.indexedDB.open("SHOP_BOARD_CLOUD_DIRECT_OUTBOX",1);
  const timer=setTimeout(()=>{if(!done){done=true;reject(Error("Pending-backup storage timed out. Close other Shop Board windows and retry."));}},15000);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("pending"))req.result.createObjectStore("pending",{keyPath:"id"});};
  req.onerror=()=>{if(!done){done=true;clearTimeout(timer);reject(req.error||Error("Pending-backup storage could not open."));}};
  req.onblocked=()=>{notice="Pending-backup storage is blocked. Close other Shop Board windows and retry.";render();};
  req.onsuccess=()=>{if(done){req.result.close();return;}done=true;clearTimeout(timer);const db=req.result;db.onversionchange=()=>{db.close();shopDirectDBPromise=null;};resolve(db);};
 }).catch(e=>{shopDirectDBPromise=null;throw e;});return shopDirectDBPromise;
}
async function shopDirectTransaction(mode,work){
 const db=await shopDirectOpen();return new Promise((resolve,reject)=>{let tx,result,reason;
  try{tx=db.transaction("pending",mode);}catch(e){shopDirectDBPromise=null;reject(e);return;}
  const fail=e=>{reason=e;try{tx.abort();}catch(_){reject(e);}};
  tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(reason||tx.error||Error("Pending-backup storage transaction aborted."));tx.onerror=()=>{reason=reason||tx.error;};
  try{work(tx.objectStore("pending"),v=>{result=v;},fail);}catch(e){fail(e);}
 });
}
function shopDirectRead(){return shopDirectTransaction("readonly",(s,finish)=>{const r=s.get("current");r.onsuccess=()=>finish(r.result||null);});}
function shopDirectStage(p){return shopDirectTransaction("readwrite",(s,finish,fail)=>{const r=s.get("current");r.onsuccess=()=>{if(r.result&&(r.result.row.id!==p.row.id||r.result.row.payload_sha256!==p.row.payload_sha256)){fail(Error("Another direct backup is pending. Resume it before preparing a different upload."));return;}s.put({id:"current",row:p.row,fileName:p.fileName});finish(true);};});}
function shopDirectRemove(id){return shopDirectTransaction("readwrite",(s,finish,fail)=>{const r=s.get("current");r.onsuccess=()=>{if(r.result&&r.result.row.id!==id){fail(Error("A different pending backup was found; it was not removed."));return;}s.delete("current");finish(true);};});}
function shopDirectReceiptMatches(row){return Boolean(receipt&&receipt.state==="verified"&&receipt.snapshotId===row.id&&receipt.hash===row.payload_sha256);}
function shopDirectAPI(){const db=window.ShopBoardDatabase;if(!db||!db.isActive()||typeof db.checkActive!=="function"||typeof db.values!=="function"||typeof db.signature!=="function")throw Error("Direct backup requires active IndexedDB storage. No backup was prepared.");if(db.isBusy())throw Error("A device save is still running. Finish saving, then prepare again.");return db;}
async function shopDirectCheckUnchanged(signature){const db=shopDirectAPI();await db.checkActive();if(db.isBusy()||db.signature(db.values())!==signature)throw Error("Saved records or preferences changed since this preview. Prepare a fresh direct-device preview before uploading.");}
async function shopDirectCheckRow(row){
 if(!row||!UUID.test(row.id)||row.owner_id!==OWNER||row.backup_schema!==1||typeof row.source_device!=="string"||!row.source_device.trim()||Array.from(row.source_device).length>80||!/^[0-9a-f]{64}$/.test(row.payload_sha256))throw Error("Pending direct-backup metadata is invalid. Nothing uploaded; do not clear site data.");
 const validated=validateBackup(row.payload);if(await checksum(row.payload)!==row.payload_sha256)throw Error("Pending direct-backup content failed its checksum. Nothing uploaded; keep this device's saved records.");
 const bytes=new TextEncoder().encode(JSON.stringify(row)).byteLength;if(bytes>MAX_BYTES)throw Error("Direct backup exceeds the existing 25 MiB request guard. Nothing uploaded; do not remove attachments to force it through.");return{bytes,summary:summary(validated.stats)};
}
function shopDirectSetPreview(row,fileName,checked,signature,resumed){
 preview={row,fileName,bytes:checked.bytes,summary:checked.summary,verified:false};shopDirectMeta={id:row.id,signature,resumed};
 const c=node("shopDirectConfirmed");if(c)c.checked=false;const legacy=node("shopSnapshotConfirmed");if(legacy)legacy.checked=false;
 const source=node("shopDirectSource");if(source)source.value=row.source_device;const id=node("shopSnapshotID");if(id)id.value=row.id;const hash=node("shopSnapshotExpectedHash");if(hash)hash.value=row.payload_sha256;
 lastResult="";
}
async function shopDirectPrepare(){return run("Preparing a snapshot of saved device records; no cloud upload…",async()=>{
 requireSession();if(receiptError)throw Error(receiptError);
 // A failed new preview must not leave an older snapshot ready to upload.
 shopDirectMeta=null;preview=null;const confirmation=node("shopDirectConfirmed");if(confirmation)confirmation.checked=false;
 let staged=await shopDirectRead();
 if(staged&&shopDirectReceiptMatches(staged.row)){await shopDirectRemove(staged.row.id);staged=null;}
 if(staged){const checked=await shopDirectCheckRow(staged.row);shopDirectSetPreview(staged.row,staged.fileName||"Pending direct-device snapshot (not a separately saved JSON file)",checked,null,true);notice="Pending direct backup recovered locally. Review its ORIGINAL source, time and counts, then confirm to check/retry its SAME ID. Newer device edits are not part of this frozen snapshot.";return;}
 if(receipt&&receipt.state==="pending")throw Error("An earlier file-based upload is unresolved. Check its snapshot ID or retry its original JSON file before preparing a different backup.");
 const source=(node("shopDirectSource")?.value||"").trim();if(!source||Array.from(source).length>80)throw Error("Enter a device source label of 1–80 characters, for example Main iPhone.");
 const db=shopDirectAPI();await db.checkActive();if(db.isBusy())throw Error("A save is still running. Wait and prepare again.");
 const saved=db.values(),signature=db.signature(saved),exporter=window.ShopBoardBackupExport;
 if(!exporter||typeof exporter.makeBackup!=="function")throw Error("The saved-data backup export API is unavailable.");
 const result=exporter.makeBackup(),payload=result&&result.backup;
 validateBackup(payload);
 if(canonical(payload.data)!==canonical(JSON.parse(saved.SHOP_BOARD_DATA)))throw Error("Export did not match committed device records. Nothing uploaded.");
 const preferences={...saved};delete preferences.SHOP_BOARD_DATA;
 if(canonical(payload.deviceSettings?.preferences)!==canonical(preferences))throw Error("Export did not match saved device preferences. Nothing uploaded.");
 const hash=await checksum(payload),row={id:newID(),owner_id:OWNER,source_device:source,backup_schema:1,payload,payload_sha256:hash};
 const checked=await shopDirectCheckRow(row);await shopDirectCheckUnchanged(signature);
 shopDirectSetPreview(row,"Direct device snapshot — "+result.filename+" (prepared in memory; no separate JSON file saved)",checked,signature,false);
 notice="Direct-device preview ready from saved IndexedDB data. Review it and confirm before uploading. This is a point-in-time snapshot, not automatic sync.";
 });}
const shopDirectOriginalUpload=uploadPrepared;
uploadPrepared=async function(confirmed){
 if(busy)return false;
 if(!shopDirectMeta||!preview||preview.row.id!==shopDirectMeta.id)return shopDirectOriginalUpload.apply(this,arguments);
 if(!confirmed){notice="Review the direct-device preview and explicitly confirm uploading its private contents first.";render();return false;}
 if(preview.verified)return shopDirectOriginalUpload.apply(this,arguments);
 const p=preview,meta=shopDirectMeta;
 const stagedOK=await run("Checking and retaining this confirmed snapshot locally before upload…",async()=>{
  requireSession();if(receiptError)throw Error(receiptError);await shopDirectCheckRow(p.row);
  const prior=await shopDirectRead();if(prior&&(prior.row.id!==p.row.id||prior.row.payload_sha256!==p.row.payload_sha256))throw Error("A different direct backup is pending. Resume it first.");
  if(!prior){if(meta.signature===null)throw Error("The pending local snapshot disappeared. Do not start a different upload until its outcome is checked.");await shopDirectCheckUnchanged(meta.signature);}
  await shopDirectStage(p);const saved=await shopDirectRead();if(!saved||saved.row.id!==p.row.id||saved.row.source_device!==p.row.source_device||saved.row.payload_sha256!==p.row.payload_sha256)throw Error("Pending snapshot read-back did not match. No cloud upload started.");await shopDirectCheckRow(saved.row);
 });
 if(!stagedOK)return false;
 const result=await shopDirectOriginalUpload.call(this,true);
 if(p.verified&&shopDirectReceiptMatches(p.row)){try{await shopDirectRemove(p.row.id);}catch(e){notice+=" The verified upload's local pending copy could not be cleaned up; it will be checked again on the next Prepare tap.";render();}}
 return result;
};
function shopDirectRender(){
 const direct=Boolean(shopDirectMeta&&preview&&preview.row.id===shopDirectMeta.id),id=direct?preview.row.id:null;
 if(shopDirectRenderedID!==id){const c=node("shopDirectConfirmed");if(c)c.checked=false;shopDirectRenderedID=id;}
 const prepare=node("shopDirectPrepare"),upload=node("shopDirectUpload"),source=node("shopDirectSource"),confirmation=node("shopDirectConfirmed");
 if(prepare)prepare.disabled=busy||!session||Boolean(receiptError);
 if(upload)upload.disabled=busy||!session||!direct||preview.verified||Boolean(receiptError);
 if(source)source.disabled=busy;if(confirmation)confirmation.disabled=busy||!direct||preview.verified;
 text("shopDirectPreview",direct?"Source: "+preview.row.source_device+"\nPrepared: "+preview.row.payload.exportedAt+"\n"+preview.summary+"\nRequest size: "+(preview.bytes/1024/1024).toFixed(2)+" MiB\nSnapshot ID: "+preview.row.id+"\nJSON content SHA-256: "+preview.row.payload_sha256+"\n"+(preview.verified?"Cloud upload read back and verified.":shopDirectMeta.resumed?"Recovered pending copy: newer device edits are NOT included. Retry uses this same ID and content.":"Saved records only; unsaved form edits and future changes are NOT included. No separate JSON file has been saved."):"No direct-device preview prepared. A pending direct snapshot, if present, is recovered only when you tap Prepare. Nothing uploads automatically.");
}
function shopDirectInsert(){
 const host=node("shopOwnerCloudPanel");if(!host||node("shopDirectSection"))return;
 const section=document.createElement("section");section.id="shopDirectSection";
 section.innerHTML=`<h4 style="font-size:18px;margin:12px 0;">Back Up This Device</h4>
<p class="shop-cloud-note">Finish saving edits first. Prepare reads saved IndexedDB records and preferences, including embedded attachments, without exporting or selecting a JSON file. Source labels identify your intended device; they are not device authentication.</p>
<label class="input-label" for="shopDirectSource">This device's source label</label><input id="shopDirectSource" class="text-input" type="text" placeholder="Main iPhone" maxlength="80">
<button id="shopDirectPrepare" type="button" class="big-btn secondary">Prepare / Resume Device Backup</button>
<p id="shopDirectPreview" class="shop-cloud-detail"></p>
<label style="display:flex;gap:10px;margin:14px 0;"><input id="shopDirectConfirmed" type="checkbox" style="min-width:24px;min-height:24px;"><span>I reviewed this snapshot's source, time, counts and size, and approve uploading its private client, financial and embedded-file contents to my Supabase project. This does not restore or merge records.</span></label>
<button id="shopDirectUpload" type="button" class="big-btn">Upload / Verify This Device Backup</button>
<p class="shop-cloud-note">The 25 MiB guard still applies. After confirmation, one pending snapshot is retained in a separate local IndexedDB outbox before cloud upload. If interrupted or reloaded, sign in and tap Prepare / Resume to recover its same content and ID—even if newer device edits exist. No background retries. The pending copy is removed only after a matching verified upload receipt. Keep independent JSON recovery copies; the outbox is not a backup history.</p>
<hr style="margin:16px 0;border:0;border-top:1px solid var(--border);">`;
 const alternative=host.querySelector("h4");if(alternative){host.insertBefore(section,alternative);alternative.textContent="Alternative: upload an existing backup file";}else host.appendChild(section);
 node("shopDirectPrepare").addEventListener("click",shopDirectPrepare);node("shopDirectUpload").addEventListener("click",()=>uploadPrepared(Boolean(node("shopDirectConfirmed")?.checked)));
 shopDirectRender();
}
const shopDirectOriginalRender=render;
render=function(){shopDirectOriginalRender();shopDirectRender();};
const shopDirectOriginalInsert=insertPanel;
insertPanel=function(){const result=shopDirectOriginalInsert.apply(this,arguments);shopDirectInsert();return result;};
// END SHOP BOARD DIRECT DEVICE BACKUP v1

function insertPanel(){if(!node("companySettingsForm")||node("shopOwnerCloudPanel"))return;const sheet=node("modalSheet");if(!sheet)return;const panel=document.createElement("section");panel.id="shopOwnerCloudPanel";panel.className="shop-owner-cloud-panel";panel.setAttribute("aria-label","Owner cloud manual snapshots");panel.innerHTML=`
<h3 style="font-size:20px;margin:0 0 10px;">Owner Cloud — Manual Snapshot</h3>
<p class="shop-cloud-note">Owner-only sign-in plus explicitly confirmed snapshot upload. No automatic sync, merging, cloud restore or background upload. The Owner/Crew display switch is not authentication.</p>
<button id="shopOwnerCloudTestAnonymous" type="button" class="big-btn secondary">Test Anonymous Access Is Blocked</button><p id="shopOwnerCloudAnonymousResult" class="shop-cloud-note"></p>
<label class="input-label" for="shopOwnerCloudEmail">Owner email</label><input id="shopOwnerCloudEmail" type="email" class="text-input" autocomplete="username" autocapitalize="none" spellcheck="false">
<label class="input-label" for="shopOwnerCloudPassword">Owner password</label><input id="shopOwnerCloudPassword" type="password" class="text-input" autocomplete="current-password">
<button id="shopOwnerCloudSignIn" type="button" class="big-btn">Sign In &amp; Verify Owner</button><button id="shopOwnerCloudRecheck" type="button" class="big-btn secondary">Recheck Owner Access</button><button id="shopOwnerCloudSignOut" type="button" class="big-btn secondary">Sign Out of Cloud</button>
<p id="shopOwnerCloudIdentity" class="shop-cloud-note"></p><p id="shopOwnerCloudStatus" role="status" aria-live="polite" class="shop-cloud-note"></p>
<hr style="margin:16px 0;border:0;border-top:1px solid var(--border);">
<h4 style="font-size:18px;margin:12px 0;">1. Prepare the main iPhone backup</h4>
<p class="shop-cloud-note">Export and save a fresh JSON backup from your MAIN iPhone first. Select that file below. This release limits the file/request to 25 MiB and includes embedded photos/documents; external links remain links. Do not strip attachments to fit the limit.</p>
<label class="input-label" for="shopSnapshotSource">Source label</label><input id="shopSnapshotSource" class="text-input" type="text" maxlength="80" placeholder="Main iPhone">
<label class="input-label" for="shopSnapshotFile">Saved JSON backup</label><input id="shopSnapshotFile" class="text-input" type="file" accept=".json,application/json">
<button id="shopSnapshotPrepare" type="button" class="big-btn secondary">Prepare Selected Backup Preview</button><p id="shopSnapshotPreview" class="shop-cloud-detail"></p>
<label style="display:flex;gap:10px;margin:14px 0;"><input id="shopSnapshotConfirmed" type="checkbox" style="min-width:24px;min-height:24px;"><span>I am uploading my intended MAIN iPhone backup, have kept a separate recovery copy, reviewed the source/date/counts, and approve sending its private client, financial and embedded-file contents to my Supabase project.</span></label>
<button id="shopSnapshotUpload" type="button" class="big-btn">Upload / Retry This Same Snapshot</button>
<h4 style="font-size:18px;margin:16px 0 10px;">2. Read back a cloud snapshot</h4>
<label class="input-label" for="shopSnapshotID">Snapshot ID</label><input id="shopSnapshotID" class="text-input" type="text" autocapitalize="none" spellcheck="false">
<label class="input-label" for="shopSnapshotExpectedHash">Original JSON content SHA-256 (optional)</label><input id="shopSnapshotExpectedHash" class="text-input" type="text" autocapitalize="none" spellcheck="false" maxlength="64">
<button id="shopSnapshotVerify" type="button" class="big-btn secondary">Check Snapshot by ID — No Restore</button><p id="shopSnapshotResult" class="shop-cloud-detail" role="status" aria-live="polite"></p>
<h4 style="font-size:16px;margin:12px 0;">Local upload receipt</h4><p id="shopSnapshotReceipt" class="shop-cloud-detail"></p>
<p class="shop-cloud-note">Tokens stay only in this open app's memory; reload requires sign-in. Only upload ID/checksum tracking is saved locally outside business-data backups. If a connection fails, reselect the same JSON file and reuse the pending ID. Nothing uploads on opening or reconnecting. Signing out does not lock or erase local business records. A checksum verifies content consistency, not independent authenticity or end-to-end encryption.</p>`;
const footer=node("shopSettingsFooter");if(footer&&footer.parentNode===sheet)sheet.insertBefore(panel,footer);else sheet.appendChild(panel);
node("shopOwnerCloudTestAnonymous").addEventListener("click",testAnonymous);node("shopOwnerCloudSignIn").addEventListener("click",()=>{const email=node("shopOwnerCloudEmail").value,input=node("shopOwnerCloudPassword"),password=input.value;input.value="";signIn(email,password);});node("shopOwnerCloudRecheck").addEventListener("click",recheck);node("shopOwnerCloudSignOut").addEventListener("click",signOut);
node("shopSnapshotPrepare").addEventListener("click",()=>prepareFile(node("shopSnapshotFile").files&&node("shopSnapshotFile").files[0],node("shopSnapshotSource").value));node("shopSnapshotUpload").addEventListener("click",()=>uploadPrepared(node("shopSnapshotConfirmed").checked));node("shopSnapshotVerify").addEventListener("click",()=>verifySnapshot(node("shopSnapshotID").value,node("shopSnapshotExpectedHash").value));
if(preview)node("shopSnapshotSource").value=preview.row.source_device;else if(receipt)node("shopSnapshotSource").value=receipt.source;if(receipt){node("shopSnapshotID").value=receipt.snapshotId;node("shopSnapshotExpectedHash").value=receipt.hash;}expire();render();}
function setup(){if(document.body.getAttribute("data-shop-boot")==="loading")return;loadReceipt();const original=window.openCompanySettings;if(typeof original==="function")window.openCompanySettings=function(){const r=original.apply(this,arguments);insertPanel();return r;};const sheet=node("modalSheet");if(sheet&&window.MutationObserver)new MutationObserver(insertPanel).observe(sheet,{childList:true});document.addEventListener("visibilitychange",expire);insertPanel();}
window.ShopBoardOwnerCloud={testAnonymous,signIn,recheck,signOut,prepareFile,uploadPrepared,verifySnapshot,getState:()=>({signedIn:Boolean(session),anonymousPassed,lastVerified,syncEnabled:false,manualSnapshots:true,preview:preview?{id:preview.row.id,hash:preview.row.payload_sha256,bytes:preview.bytes,verified:preview.verified}:null,receipt:receipt?{snapshotId:receipt.snapshotId,state:receipt.state,hash:receipt.hash}:null})};
if(window.ShopBoardBootPromise&&typeof window.ShopBoardBootPromise.then==="function")window.ShopBoardBootPromise.then(setup);else setup();
})();

