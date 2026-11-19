/* SCW Replenishment — replenishes the dedicated pick buffer from reserve and AS/RS. */
(function(root){
"use strict";
const KEY="scw-phase27-replenishment-v1";
let state=load(),unsubscribeShortage=null;
function load(){try{const x=JSON.parse(root.localStorage.getItem(KEY));if(x&&Array.isArray(x.tasks)&&Number.isInteger(x.sequence))return x}catch(e){}return {tasks:[],sequence:1}}
function save(){root.localStorage.setItem(KEY,JSON.stringify(state))}
function clone(x){return JSON.parse(JSON.stringify(x))}
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function inventory(){if(!root.SCWInventoryAdapter)throw Error("Inventory Adapter yuklanmagan.");return root.SCWInventoryAdapter}
function nextId(){return "REP-"+String(state.sequence++).padStart(6,"0")}
function request(input){
 input=input||{};
 const sku=String(input.sku||"").trim(),qty=Number(input.qty),lot=input.lot?String(input.lot).trim():null,orderId=input.orderId?String(input.orderId):null;
 if(!sku||!Number.isInteger(qty)||qty<=0)throw Error("SKU va musbat butun replenishment miqdori talab qilinadi.");
 if(orderId&&state.tasks.some(t=>t.orderId===orderId))return {created:[],waiting:[],shortage:0,duplicate:true};
 const data=inventory().snapshot(),buffer=data.locations.find(x=>x.code==="PICK-01");
 if(!buffer)throw Error("PICK-01 mavjud emas. Avval High-Bay AS/RS modulini ishga tushiring.");
 const used=data.balances.filter(x=>x.location==="PICK-01").reduce((n,x)=>n+x.qty,0);
 const reservedBuffer=state.tasks.filter(t=>(t.status==="OPEN"||t.status==="WAITING_ASRS")&&t.to==="PICK-01").reduce((n,t)=>n+t.qty,0);
 let freeBuffer=Math.max(0,buffer.capacity-used-reservedBuffer),remaining=qty;
 const sources=data.locations.filter(x=>x.type==="storage"&&x.code!=="PICK-01"&&!x.code.startsWith("HBA-"));
 const candidates=[];
 data.balances.filter(b=>b.sku===sku&&b.qty>0&&(!lot||b.lot===lot)&&sources.some(x=>x.code===b.location)).forEach(b=>{
  const reserved=state.tasks.filter(t=>t.status==="OPEN"&&t.kind==="RESERVE_TRANSFER"&&t.from===b.location&&t.sku===sku&&t.lot===b.lot).reduce((n,t)=>n+t.qty,0);
  const available=b.qty-reserved;
  if(available>0)candidates.push({from:b.location,lot:b.lot,available});
 });
 candidates.sort((a,b)=>a.from.localeCompare(b.from)||a.lot.localeCompare(b.lot));
 const created=[];
 for(const source of candidates){
  if(remaining<=0||freeBuffer<=0)break;
  const take=Math.min(remaining,freeBuffer,source.available);
  const task={id:nextId(),kind:"RESERVE_TRANSFER",orderId,sku,lot:source.lot,qty:take,from:source.from,to:"PICK-01",status:"OPEN",createdAt:new Date().toISOString()};
  state.tasks.unshift(task);created.push(clone(task));remaining-=take;freeBuffer-=take;
 }
 const waiting=[];
 let highBayAvailable=0;
 const highBayLots={};
 data.balances.filter(b=>b.sku===sku&&b.location.startsWith("HBA-")&&b.qty>0&&(!lot||b.lot===lot)).forEach(b=>{
  highBayAvailable+=b.qty;highBayLots[b.lot]=(highBayLots[b.lot]||0)+b.qty;
 });
 if(remaining>0&&highBayAvailable>0&&freeBuffer>0&&root.SCWHBASRS){
  let asrsRemaining=Math.min(remaining,highBayAvailable,freeBuffer);
  const asrsTaskIds=[];let asrsQty=0;
  for(const highBayLot of Object.keys(highBayLots).sort()){
   if(asrsRemaining<=0)break;
   const take=Math.min(asrsRemaining,highBayLots[highBayLot]);
   try{
    const tasks=root.SCWHBASRS.createRetrieval({sku,lot:highBayLot,qty:take,to:"PICK-01"});
    tasks.forEach(task=>asrsTaskIds.push(task.id));asrsQty+=take;asrsRemaining-=take;
   }catch(error){core().emit("replenishment.asrs.error",{sku,lot:highBayLot,qty:take,message:error.message},{source:"Replenishment"})}
  }
  if(asrsQty>0){
   const task={id:nextId(),kind:"ASRS_RETRIEVAL",orderId,sku,lot:lot||null,qty:asrsQty,from:"HIGH_BAY",to:"PICK-01",asrsTaskIds,status:"WAITING_ASRS",createdAt:new Date().toISOString()};
   state.tasks.unshift(task);waiting.push(clone(task));remaining-=asrsQty;freeBuffer-=asrsQty;
  }
 }
 if(created.length||waiting.length)save();
 created.forEach(task=>core().emit("replenishment.task.created",{task},{source:"Replenishment"}));
 waiting.forEach(task=>core().emit("replenishment.asrs.requested",{task},{source:"Replenishment"}));
 if(remaining>0)core().emit("replenishment.shortage",{sku,orderId,requested:qty,planned:qty-remaining,shortage:remaining,highBayAvailable},{source:"Replenishment"});
 return {created,waiting,shortage:remaining,highBayAvailable};
}
function complete(taskId){
 const task=state.tasks.find(x=>x.id===taskId);
 if(!task)throw Error("Replenishment topshirig'i topilmadi.");
 if(task.kind==="ASRS_RETRIEVAL"){refresh();return clone(state.tasks.find(x=>x.id===taskId))}
 if(task.status!=="OPEN")throw Error("Faqat ochiq replenishment topshirig'i bajariladi.");
 const data=inventory().snapshot(),source=data.balances.find(x=>x.sku===task.sku&&x.location===task.from&&x.lot===task.lot);
 if(!source||source.qty<task.qty)throw Error("Reserve manbasida LOT miqdori yetarli emas.");
 const dest=data.locations.find(x=>x.code==="PICK-01");
 const used=data.balances.filter(x=>x.location==="PICK-01").reduce((n,x)=>n+x.qty,0);
 const reserved=state.tasks.filter(t=>(t.status==="OPEN"||t.status==="WAITING_ASRS")&&t.to==="PICK-01"&&t.id!==task.id).reduce((n,t)=>n+t.qty,0);
 if(!dest||used+reserved+task.qty>dest.capacity)throw Error("Pick buffer sig'imi yetarli emas.");
 inventory().record({type:"TRANSFER",sku:task.sku,qty:task.qty,lot:task.lot,from:task.from,to:"PICK-01",reference:task.id,note:"Replenishment to pick buffer"});
 task.status="DONE";task.completedAt=new Date().toISOString();save();
 core().emit("replenishment.completed",{task:clone(task)},{source:"Replenishment"});
 return clone(task);
}
function refresh(){
 if(!root.SCWHBASRS)return snapshot();
 const asrs=root.SCWHBASRS.snapshot().tasks,completed=[];
 state.tasks.filter(t=>t.kind==="ASRS_RETRIEVAL"&&t.status==="WAITING_ASRS").forEach(task=>{
  if(task.asrsTaskIds.every(id=>asrs.some(x=>x.id===id&&x.status==="DONE"))){task.status="DONE";task.completedAt=new Date().toISOString();completed.push(clone(task))}
 });
 if(completed.length){save();completed.forEach(task=>core().emit("replenishment.completed",{task,source:"ASRS"},{source:"Replenishment"}))}
 return snapshot();
}
function snapshot(){return {tasks:clone(state.tasks),metrics:{open:state.tasks.filter(x=>x.status==="OPEN").length,waitingASRS:state.tasks.filter(x=>x.status==="WAITING_ASRS").length,completed:state.tasks.filter(x=>x.status==="DONE").length}}}
function start(){
 unsubscribeShortage=core().on("picking.shortage",event=>{try{request({sku:event.payload.sku,qty:event.payload.shortage,orderId:event.payload.orderId})}catch(error){core().emit("replenishment.planning.error",{message:error.message,payload:event.payload},{source:"Replenishment"})}});
 core().emit("replenishment.ready",{moduleId:"REPLENISHMENT"},{source:"Replenishment"});
}
function stop(){if(unsubscribeShortage){unsubscribeShortage();unsubscribeShortage=null}}
root.SCWReplenishment=Object.freeze({request,complete,refresh,snapshot});
core().registerModule({id:"REPLENISHMENT",name:"Replenishment",version:"1.0.0",dependencies:["INVENTORY_ADAPTER"],start,stop});
core().registerCommand("replenishment.request",input=>request(input),{moduleId:"REPLENISHMENT"});
core().registerCommand("replenishment.complete",input=>complete(input&&input.id),{moduleId:"REPLENISHMENT"});
core().registerCommand("replenishment.refresh",()=>refresh(),{moduleId:"REPLENISHMENT"});
core().registerCommand("replenishment.snapshot",()=>snapshot(),{moduleId:"REPLENISHMENT"});
})(window);
