/* SCW Reserve Storage — QC-gated putaway using the authoritative inventory adapter. */
(function(root){
"use strict";
const KEY="scw-phase24-reserve-storage-v1";
const seed={tasks:[],sequence:1};
let unsubscribeAccepted=null;
function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){try{const x=JSON.parse(root.localStorage.getItem(KEY));if(x&&Array.isArray(x.tasks)&&Number.isInteger(x.sequence))return x}catch(e){}return clone(seed)}
let state=load();
function save(){root.localStorage.setItem(KEY,JSON.stringify(state))}
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function qc(){if(!root.SCWQualityControl)throw Error("Quality Control moduli yuklanmagan.");return root.SCWQualityControl}
function inventory(){if(!root.SCWInventoryAdapter)throw Error("Inventory Adapter yuklanmagan.");return root.SCWInventoryAdapter}
function nextId(){return "RS-"+String(state.sequence++).padStart(6,"0")}
function sourceBalance(data,sku,location,lot){return data.balances.find(x=>x.sku===sku&&x.location===location&&x.lot===lot)}
function plan(){
 const q=qc().snapshot().inspections;
 const inv=inventory().snapshot();
 const locs=inv.locations.filter(x=>x.type==="storage");
 const used={};locs.forEach(loc=>{used[loc.code]=inv.balances.filter(b=>b.location===loc.code).reduce((n,b)=>n+b.qty,0)});
 state.tasks.filter(t=>t.status==="OPEN").forEach(t=>{used[t.to]=(used[t.to]||0)+t.qty});
 const planned=[];
 q.filter(x=>x.sourceType==="INBOUND"&&x.decision==="ACCEPTED"&&!state.tasks.some(t=>t.qcInspectionId===x.id)).forEach(inspection=>{
  const src=sourceBalance(inv,inspection.sku,inspection.location||"RCV-01",inspection.lot);
  const alreadyReserved=state.tasks.filter(t=>t.status==="OPEN"&&t.from===(inspection.location||"RCV-01")&&t.sku===inspection.sku&&t.lot===inspection.lot).reduce((n,t)=>n+t.qty,0);
  const available=src?src.qty-alreadyReserved:0;
  if(available<inspection.qty)return;
  const destination=locs.find(loc=>loc.capacity-(used[loc.code]||0)>=inspection.qty);
  if(!destination)return;
  const task={id:nextId(),kind:"QC_PUTAWAY",qcInspectionId:inspection.id,sku:inspection.sku,lot:inspection.lot,qty:inspection.qty,from:inspection.location||"RCV-01",to:destination.code,status:"OPEN",createdAt:new Date().toISOString()};
  state.tasks.unshift(task);used[destination.code]=(used[destination.code]||0)+task.qty;planned.push(clone(task));
 });
 if(planned.length)save();
 planned.forEach(task=>core().emit("reserve.storage.putaway.created",{task},{source:"ReserveStorage"}));
 return planned;
}
function complete(taskId){
 const task=state.tasks.find(x=>x.id===taskId);
 if(!task)throw Error("Reserve Storage topshirig'i topilmadi.");
 if(task.status!=="OPEN")throw Error("Faqat ochiq Reserve Storage topshirig'i bajariladi.");
 const inv=inventory().snapshot();
 const source=sourceBalance(inv,task.sku,task.from,task.lot);
 if(!source||source.qty<task.qty)throw Error("Qabul zonasida tasdiqlangan LOT miqdori yetarli emas.");
 const destination=inv.locations.find(x=>x.code===task.to&&x.type==="storage");
 if(!destination)throw Error("Saqlash lokatsiyasi topilmadi.");
 const used=inv.balances.filter(x=>x.location===task.to).reduce((n,x)=>n+x.qty,0);
 if(used+task.qty>destination.capacity)throw Error("Saqlash lokatsiyasi sig'imi yetarli emas.");
 inventory().record({type:"TRANSFER",sku:task.sku,qty:task.qty,lot:task.lot,from:task.from,to:task.to,reference:task.id,note:"QC tasdiqlagan Reserve Storage putaway"});
 task.status="DONE";task.completedAt=new Date().toISOString();save();
 core().emit("reserve.storage.putaway.completed",{task:clone(task)},{source:"ReserveStorage"});
 return clone(task);
}
function snapshot(){return {tasks:clone(state.tasks),metrics:{open:state.tasks.filter(x=>x.status==="OPEN").length,completed:state.tasks.filter(x=>x.status==="DONE").length,blocked:0}}}
function start(){
 unsubscribeAccepted=core().on("quality.accepted",()=>{try{plan()}catch(error){core().emit("reserve.storage.planning.error",{message:error.message},{source:"ReserveStorage"})}});
 core().emit("reserve.storage.ready",{moduleId:"RESERVE_STORAGE"},{source:"ReserveStorage"});
}
function stop(){if(unsubscribeAccepted){unsubscribeAccepted();unsubscribeAccepted=null}}
root.SCWReserveStorage=Object.freeze({plan,complete,snapshot});
core().registerModule({id:"RESERVE_STORAGE",name:"Reserve Storage",version:"1.0.0",dependencies:["INVENTORY_ADAPTER","QUALITY_CONTROL"],start,stop});
core().registerCommand("reserve.storage.plan",()=>plan(),{moduleId:"RESERVE_STORAGE"});
core().registerCommand("reserve.storage.snapshot",()=>snapshot(),{moduleId:"RESERVE_STORAGE"});
core().registerCommand("reserve.storage.complete",input=>complete(input&&input.id),{moduleId:"RESERVE_STORAGE"});
})(window);
