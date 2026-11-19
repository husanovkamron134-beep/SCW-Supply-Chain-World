/* SCW Dispatch — ships only orders cleared by Outbound Staging. */
(function(root){
"use strict";
const KEY="scw-phase31-dispatch-v1";
let state=load(),unsubscribeStaged=null;
function load(){try{const x=JSON.parse(root.localStorage.getItem(KEY));if(x&&Array.isArray(x.tasks)&&Number.isInteger(x.sequence))return x}catch(e){}return {tasks:[],sequence:1}}
function save(){root.localStorage.setItem(KEY,JSON.stringify(state))}
function clone(x){return JSON.parse(JSON.stringify(x))}
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function operations(){if(!root.SCWOperationsAdapter)throw Error("Operations Adapter yuklanmagan.");return root.SCWOperationsAdapter}
function staging(){if(!root.SCWOutboundStaging)throw Error("Outbound Staging moduli yuklanmagan.");return root.SCWOutboundStaging}
function nextId(){return "DSP-"+String(state.sequence++).padStart(6,"0")}
function plan(){
 const orders=operations().snapshot().salesOrders,staged=staging().snapshot().tasks,created=[];
 orders.filter(o=>o.status==="PACKED"&&staged.some(t=>t.orderId===o.id&&t.status==="DONE")&&!state.tasks.some(t=>t.orderId===o.id)).forEach(order=>{
  const stage=staged.find(t=>t.orderId===order.id&&t.status==="DONE");
  const task={id:nextId(),orderId:order.id,sku:order.sku,qty:order.qty,dock:stage.dock,carrier:"SCW Transport",trackingRef:"SCW-"+order.id,status:"OPEN",createdAt:new Date().toISOString()};
  state.tasks.unshift(task);created.push(clone(task));
 });
 if(created.length)save();
 created.forEach(task=>core().emit("dispatch.task.created",{task},{source:"Dispatch"}));
 return created;
}
function complete(taskId,input){
 const task=state.tasks.find(x=>x.id===taskId);
 if(!task)throw Error("Dispatch topshirig'i topilmadi.");
 if(task.status!=="OPEN")throw Error("Faqat ochiq Dispatch topshirig'i bajariladi.");
 const order=operations().snapshot().salesOrders.find(x=>x.id===task.orderId);
 if(!order||order.status!=="PACKED")throw Error("Dispatch uchun buyurtma PACKED holatida bo'lishi kerak.");
 if(!staging().snapshot().tasks.some(x=>x.orderId===task.orderId&&x.status==="DONE"))throw Error("Avval Outbound Staging topshirig'ini yakunlang.");
 const shipped=operations().dispatchOrder({id:task.orderId,carrier:input&&input.carrier||task.carrier,reference:input&&input.reference||task.trackingRef});
 task.status="DONE";task.shippedAt=new Date().toISOString();task.carrier=shipped.dispatch.carrier;task.trackingRef=shipped.dispatch.trackingRef;save();
 core().emit("dispatch.task.completed",{task:clone(task),order:shipped},{source:"Dispatch"});
 return {task:clone(task),order:shipped};
}
function snapshot(){return {tasks:clone(state.tasks),metrics:{open:state.tasks.filter(x=>x.status==="OPEN").length,shipped:state.tasks.filter(x=>x.status==="DONE").length}}}
function start(){
 unsubscribeStaged=core().on("outbound.staging.completed",()=>{try{plan()}catch(error){core().emit("dispatch.planning.error",{message:error.message},{source:"Dispatch"})}});
 core().emit("dispatch.ready",{moduleId:"DISPATCH"},{source:"Dispatch"});
}
function stop(){if(unsubscribeStaged){unsubscribeStaged();unsubscribeStaged=null}}
root.SCWDispatch=Object.freeze({plan,complete,snapshot});
core().registerModule({id:"DISPATCH",name:"Dispatch",version:"1.0.0",dependencies:["OPERATIONS_ADAPTER","OUTBOUND_STAGING"],start,stop});
core().registerCommand("dispatch.plan",()=>plan(),{moduleId:"DISPATCH"});
core().registerCommand("dispatch.complete",input=>complete(input&&input.id,input),{moduleId:"DISPATCH"});
core().registerCommand("dispatch.snapshot",()=>snapshot(),{moduleId:"DISPATCH"});
})(window);
