/* SCW Phase 12 — explicit cloud sync, account UI and server-side AI bridge. */
(function(){
"use strict";
const KEYS=["scw-phase2-state-v1","scw-phase3-operations-v1","scw-phase4-transport-v1","scw-phase5-production-v1","scw-phase6-planning-v1","scw-phase7-network-v1","scw-phase9-warehouse-tasks-v1","scw-stock"];
const TOKEN_KEY="scw-session-token",WORKSPACE_KEY="scw-session-workspace",VERSION_KEY="scw-session-version",API_KEY="scw-api-base";
let apiBase=localStorage.getItem(API_KEY)||"",version=Number(sessionStorage.getItem(VERSION_KEY)||0),ready=false,busy=false,timer=null,conflicted=false,suppress=false;
const $=id=>document.getElementById(id);
function setStatus(message,kind){const el=$("cloudStatus");if(el){el.textContent=message;el.dataset.kind=kind||"info"}}
function token(){return sessionStorage.getItem(TOKEN_KEY)||""}
function workspace(){return sessionStorage.getItem(WORKSPACE_KEY)||""}
function localSnapshot(){const data={};KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!==null){try{data[k]=JSON.parse(v)}catch(e){data[k]=v}}});return data}
function hasData(data){return data&&Object.keys(data).length>0}
function headers(){return {"Content-Type":"application/json","Authorization":"Bearer "+token()}}
function url(path){return apiBase.replace(/\/$/,"")+path}
async function api(path,options){const response=await fetch(url(path),{...options,headers:{...headers(),...(options&&options.headers||{})}});let payload={};try{payload=await response.json()}catch(e){}if(!response.ok){const error=new Error(payload.detail||("HTTP "+response.status));error.status=response.status;throw error}return payload}
function showAuth(){ $("cloudModal").classList.add("open"); $("cloudModal").setAttribute("aria-hidden","false");}
function hideAuth(){ $("cloudModal").classList.remove("open"); $("cloudModal").setAttribute("aria-hidden","true");}
function setAuthenticated(user,ws){sessionStorage.setItem(TOKEN_KEY,user.access_token);if(ws)sessionStorage.setItem(WORKSPACE_KEY,ws.id);version=0;sessionStorage.setItem(VERSION_KEY,"0");ready=false;renderAccount(user.user||user,ws);loadCloudState();}
function renderAccount(user,ws){const box=$("cloudAccount");if(!box)return;box.hidden=false;$("cloudAuthForm").hidden=true;$("cloudAccountName").textContent=(user.email||"Hisob")+(ws?" · "+ws.name:"");$("cloudActions").hidden=false;$("cloudAi").hidden=false;$("cloudOpen").textContent="Bulut: ulangan"}
function renderLoggedOut(){sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(WORKSPACE_KEY);sessionStorage.removeItem(VERSION_KEY);version=0;ready=false;conflicted=false;$("cloudAccount").hidden=true;$("cloudAuthForm").hidden=false;$("cloudActions").hidden=true;$("cloudAi").hidden=true;$("cloudOpen").textContent="Kirish / Bulut";setStatus("API manzilini kiriting va hisobga kiring.","info")}
async function loadCloudState(){
 try{
  const workspaces=await api("/api/workspaces");
  if(!workspace()&&workspaces.length)sessionStorage.setItem(WORKSPACE_KEY,workspaces[0].id);
  const ws=workspaces.find(x=>x.id===workspace())||workspaces[0];
  if(!ws){setStatus("Ish maydoni topilmadi.","error");return}
  sessionStorage.setItem(WORKSPACE_KEY,ws.id);$("cloudAccountName").textContent=$("cloudAccountName").textContent.split(" · ")[0]+" · "+ws.name;
  const remote=await api("/api/workspaces/"+ws.id+"/state");
  version=remote.version;sessionStorage.setItem(VERSION_KEY,String(version));
  const local=localSnapshot();
  if(hasData(remote.data)){setStatus("Serverda "+Object.keys(remote.data).length+" ta ma’lumot bo‘limi bor. Qaysi nusxani ishlatishni tanlang: serverdan olish yoki brauzerdagini serverga yuborish.","warn");$("cloudPull").hidden=false;$("cloudPush").hidden=false;ready=false}
  else{setStatus("Yangi ish maydoni. Brauzerdagi demo ma’lumotlarni serverga birinchi marta yuklashingiz mumkin.","warn");$("cloudPull").hidden=true;$("cloudPush").hidden=false;ready=false}
 }catch(e){setStatus("Server bilan bog‘lanib bo‘lmadi: "+e.message,"error")}
}
async function pullFromServer(){
 if(busy)return;busy=true;try{const remote=await api("/api/workspaces/"+workspace()+"/state");suppress=true;KEYS.forEach(k=>localStorage.removeItem(k));Object.entries(remote.data||{}).forEach(([k,v])=>{if(KEYS.includes(k))localStorage.setItem(k,JSON.stringify(v))});suppress=false;version=remote.version;sessionStorage.setItem(VERSION_KEY,String(version));ready=true;conflicted=false;setStatus("Server ma’lumotlari yuklandi. Sahifa qayta ochiladi…","ok");setTimeout(()=>location.reload(),250)}catch(e){suppress=false;setStatus("Yuklash amalga oshmadi: "+e.message,"error")}finally{busy=false}
}
async function pushToServer(){
 if(busy)return;busy=true;try{const data=localSnapshot();const result=await api("/api/workspaces/"+workspace()+"/state",{method:"PUT",body:JSON.stringify({data,expected_version:version||1})});version=result.version;sessionStorage.setItem(VERSION_KEY,String(version));ready=true;conflicted=false;setStatus("Brauzer ma’lumotlari serverga saqlandi · versiya "+version,"ok")}catch(e){if(e.status===409){conflicted=true;ready=false;setStatus("Versiya to‘qnashuvi: boshqa foydalanuvchi yangilagan. Avval serverdan yangisini yuklang.","error")}else setStatus("Saqlash xatosi: "+e.message,"error")}finally{busy=false}
}
async function syncNow(){if(!token()||!ready||busy||conflicted)return;busy=true;try{const data=localSnapshot();const result=await api("/api/workspaces/"+workspace()+"/state",{method:"PUT",body:JSON.stringify({data,expected_version:version})});version=result.version;sessionStorage.setItem(VERSION_KEY,String(version));setStatus("Sinxronlandi · versiya "+version,"ok")}catch(e){if(e.status===409){conflicted=true;ready=false;setStatus("Serverda boshqa o‘zgarish bor. Ma’lumot yo‘qolmasligi uchun avtomatik yozish to‘xtatildi; serverdan olishni tanlang.","error")}else setStatus("Sinxronlash vaqtincha bajarilmadi: "+e.message,"error")}finally{busy=false}}
function scheduleSync(){if(!ready||!token()||suppress||conflicted)return;clearTimeout(timer);setStatus("O‘zgarishlar saqlanmoqda…","info");timer=setTimeout(syncNow,1300)}
async function authAction(mode){
 apiBase=$("cloudApiBase").value.trim().replace(/\/$/,"");if(!apiBase){setStatus("Avval backend API manzilini kiriting.","error");return}
 localStorage.setItem(API_KEY,apiBase);
 const email=$("cloudEmail").value.trim(),password=$("cloudPassword").value,workspaceName=$("cloudWorkspaceName").value.trim()||"Mening SCW ish maydonim";
 try{
  const path=mode==="register"?"/api/auth/register":"/api/auth/login";
  const payload=await fetch(url(path),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(mode==="register"?{email,password,workspace_name:workspaceName}:{email,password})});
  const result=await payload.json();if(!payload.ok)throw new Error(result.detail||"Kirish amalga oshmadi.");
  const ws=result.workspace||null;setAuthenticated(result,ws);setStatus("Hisobga muvaffaqiyatli kirdingiz. Ma’lumot manbasini tanlang.","ok");
 }catch(e){setStatus(e.message,"error")}
}
async function runAI(){
 const question=$("cloudAiQuestion").value.trim();if(question.length<3){setStatus("AI savolini kamida 3 belgidan kiriting.","error");return}
 try{$("cloudAiAnswer").textContent="AI tahlil tayyorlanmoqda…";const result=await api("/api/workspaces/"+workspace()+"/ai/analyze",{method:"POST",body:JSON.stringify({question,context:localSnapshot()})});$("cloudAiAnswer").textContent=result.answer+"\n\nModel: "+result.model}catch(e){$("cloudAiAnswer").textContent="AI xatosi: "+e.message}
}
function init(){
 if(!$("cloudModal"))return;
 $("cloudApiBase").value=apiBase;
 $("cloudOpen").addEventListener("click",showAuth);
 $("cloudClose").addEventListener("click",hideAuth);
 $("cloudLogin").addEventListener("click",()=>authAction("login"));
 $("cloudRegister").addEventListener("click",()=>authAction("register"));
 $("cloudPull").addEventListener("click",pullFromServer);
 $("cloudPush").addEventListener("click",pushToServer);
 $("cloudSync").addEventListener("click",syncNow);
 $("cloudLogout").addEventListener("click",()=>{renderLoggedOut();setStatus("Hisobdan chiqildi.","info")});
 $("cloudAiRun").addEventListener("click",runAI);
 $("cloudApiBase").addEventListener("change",()=>{apiBase=$("cloudApiBase").value.trim().replace(/\/$/,"");localStorage.setItem(API_KEY,apiBase)});
 $("cloudModal").addEventListener("click",e=>{if(e.target===$("cloudModal"))hideAuth()});
 const original=Storage.prototype.setItem;
 Storage.prototype.setItem=function(key,value){original.call(this,key,value);if(this===localStorage&&KEYS.includes(String(key)))scheduleSync()};
 if(token()){renderAccount({email:"Faol hisob"},null);if(apiBase)loadCloudState()}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
window.SCWCloud={open:showAuth,sync:syncNow,pull:pullFromServer,push:pushToServer,logout:renderLoggedOut};
})();