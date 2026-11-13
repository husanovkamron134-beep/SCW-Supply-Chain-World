/* SCW Phase 9 — warehouse execution task engine. Inventory remains authoritative in SCWDomain. */
(function(){
"use strict";
const KEY="scw-phase9-warehouse-tasks-v1";
const seed={tasks:[],sequence:1,completed:0};
const clone=x=>JSON.parse(JSON.stringify(x));
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Array.isArray(x.tasks))return x}catch(e){}localStorage.setItem(KEY,JSON.stringify(seed));return clone(seed)}
let state=load();
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function id(){return "WT-"+String(state.sequence++).padStart(5,"0")}
function stock(){if(!window.SCWDomain)throw Error("Inventar moduli yuklanmagan.");return SCWDomain.snapshot()}
function openTask(task){return state.tasks.some(x=>x.kind===task.kind&&x.reference===task.reference&&x.status!=="DONE"&&x.status!=="CANCELLED")}
function createPutawayTasks(){
 const d=stock(),created=[];
 d.balances.filter(b=>b.location==="RCV-01"&&b.qty>0).forEach(b=>{
  if(openTask({kind:"PUTAWAY",reference:b.sku+"|"+b.lot}))return;
  const loc=d.locations.filter(x=>x.type==="storage").map(x=>({...x,used:d.balances.filter(bal=>bal.location===x.code).reduce((n,v)=>n+v.qty,0)})).find(x=>x.capacity-x.used>=b.qty);
  if(!loc)return;
  const t={id:id(),kind:"PUTAWAY",sku:b.sku,lot:b.lot,qty:b.qty,from:b.location,to:loc.code,reference:b.sku+"|"+b.lot,status:"OPEN",createdAt:new Date().toISOString()};
  state.tasks.unshift(t);created.push(clone(t));
 });
 save();return created;
}
function createPickTasks(){
 const d=stock(),ops=window.SCWOperations;if(!ops)throw Error("Buyurtmalar moduli yuklanmagan.");
 const orders=ops.snapshot().salesOrders,created=[];
 orders.filter(o=>o.status==="NEW").forEach(o=>{
  if(openTask({kind:"PICK",reference:o.id}))return;
  let remaining=o.qty;const lines=[];
  d.balances.filter(b=>b.sku===o.sku&&b.location!=="DSP-01"&&b.qty>0).sort((a,b)=>a.location.localeCompare(b.location)).forEach(b=>{
   if(remaining<=0)return;const take=Math.min(remaining,b.qty);lines.push({from:b.location,lot:b.lot,qty:take});remaining-=take;
  });
  if(remaining>0)return;
  const t={id:id(),kind:"PICK",sku:o.sku,lot:lines.map(x=>x.lot).join(", "),qty:o.qty,from:lines[0].from,to:"DSP-01",reference:o.id,lines,status:"OPEN",createdAt:new Date().toISOString()};
  state.tasks.unshift(t);created.push(clone(t));
 });
 save();return created;
}
function complete(taskId){
 const t=state.tasks.find(x=>x.id===taskId);if(!t)throw Error("Ombor topshirig'i topilmadi.");
 if(t.status!=="OPEN")throw Error("Faqat ochiq topshiriq bajariladi.");
 if(t.kind==="PUTAWAY"){
  SCWDomain.record({type:"TRANSFER",sku:t.sku,qty:t.qty,lot:t.lot,from:t.from,to:t.to,reference:t.id,note:"WMS putaway"});
 }else if(t.kind==="PICK"){
  t.lines.forEach(line=>SCWDomain.record({type:"TRANSFER",sku:t.sku,qty:line.qty,lot:line.lot,from:line.from,to:"DSP-01",reference:t.id,note:"WMS picking · "+t.reference}));
 }else throw Error("Topshiriq turi tanilmadi.");
 t.status="DONE";t.completedAt=new Date().toISOString();state.completed++;save();return clone(t);
}
function cancel(taskId){const t=state.tasks.find(x=>x.id===taskId);if(!t)throw Error("Topshiriq topilmadi.");if(t.status!=="OPEN")throw Error("Faqat ochiq topshiriq bekor qilinadi.");t.status="CANCELLED";save();return clone(t)}
function snapshot(){return clone(state)}
function metrics(){const tasks=state.tasks;return {open:tasks.filter(x=>x.status==="OPEN").length,completed:state.completed,putaway:tasks.filter(x=>x.kind==="PUTAWAY"&&x.status==="OPEN").length,picking:tasks.filter(x=>x.kind==="PICK"&&x.status==="OPEN").length}}
function reset(){state=clone(seed);save();return snapshot()}
window.SCWWarehouse={snapshot,metrics,createPutawayTasks,createPickTasks,complete,cancel,reset};
})();