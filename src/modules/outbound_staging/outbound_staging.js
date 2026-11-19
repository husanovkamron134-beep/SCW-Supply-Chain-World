/* SCW Outbound Staging — dock assignment after successful packing. */
(function(root){
"use strict";
const KEY="scw-phase30-outbound-staging-v1",DOCKS=["DOCK-01","DOCK-02","DOCK-03","DOCK-04"];
let state=load(),unsubscribePacked=null;
function load(){try{const x=JSON.parse(root.localStorage.getItem(KEY));if(x&&Array.isArray(x.tasks)&&Number.isInteger(x.sequence))return x}catch(e){}return {tasks:[],sequence:1}}
function save(){root.localStorage.setItem(KEY,JSON.stringify(state))}
function clone(x){return JSON.parse(JSON.stringify(x))}
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function operations(){if(!root.SCWOperationsAdapter)throw Error("Operations Adapter yuklanmagan.");return root.SCWOperationsAdapter}
function packing(){if(!root.SCWPacking)throw Error("Packing moduli yuklanmagan.");return root.SCWPacking}
function nextId(){return "STAGE-"+String(state.sequence++).padStart(6,"0")}
function plan(){
 const orders=operations().snapshot().salesOrders,packed=packing().snapshot().tasks,created=[];
 orders.filter(o=>o.status==="PACKED"&&packed.some(t=>t.orderId===o.id&&t.status==="DONE")&&!state.tasks.some(t=>t.orderId===o.id)).forEach(order=>{
  const dock=DOCKS[(state.sequence-1)%DOCKS.length];
  const task={id:nextId(),orderId:order.id,sku:order.sku,qty:order.qty,dock,status:"OPEN",createdAt:new Date().toISOString()};
  state.tasks.unshift(task);created.push(clone(task));
 });
 if(created.length)save();
 created.forEach(task=>core().emit("outbound.staging.task.created",{task},{source:"OutboundStaging"}));
 return created;
}
function complete(taskId){
 const task=state.tasks.find(x=>x.id===taskId);
 if(!task)throw Error("Outbound staging topshirig'i topilmadi.");
 if(task.status!=="OPEN")throw Error("Faqat ochiq staging topshirig'i bajariladi.");
 const order=operations().snapshot().salesOrders.find(x=>x.id===task.orderId);
 if(!order||order.status!=="PACKED")throw Error("Staging uchun buyurtma PACKED holatida bo'lishi kerak.");
 task.status="DONE";task.stagedAt=new Date().toISOString();save();
 core().emit("outbound.staging.completed",{task:clone(task),orderId:order.id,dock:task.dock},{source:"OutboundStaging"});
 return clone(task);
}
function snapshot(){return {tasks:clone(state.tasks),metrics:{open:state.tasks.filter(x=>x.status==="OPEN").length,staged:state.tasks.filter(x=>x.status==="DONE").length,docks:DOCKS.slice()}}}
function start(){
 unsubscribePacked=core().on("packing.task.completed",()=>{try{plan()}catch(error){core().emit("outbound.staging.planning.error",{message:error.message},{source:"OutboundStaging"})}});
 core().emit("outbound.staging.ready",{moduleId:"OUTBOUND_STAGING",docks:DOCKS.length},{source:"OutboundStaging"});
}
function stop(){if(unsubscribePacked){unsubscribePacked();unsubscribePacked=null}}
root.SCWOutboundStaging=Object.freeze({plan,complete,snapshot});
core().registerModule({id:"OUTBOUND_STAGING",name:"Outbound Staging",version:"1.0.0",dependencies:["OPERATIONS_ADAPTER","PACKING"],start,stop});
core().registerCommand("outbound.staging.plan",()=>plan(),{moduleId:"OUTBOUND_STAGING"});
core().registerCommand("outbound.staging.complete",input=>complete(input&&input.id),{moduleId:"OUTBOUND_STAGING"});
core().registerCommand("outbound.staging.snapshot",()=>snapshot(),{moduleId:"OUTBOUND_STAGING"});
})(window);
