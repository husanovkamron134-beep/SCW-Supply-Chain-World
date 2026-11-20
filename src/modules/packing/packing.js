/* SCW Packing — packs orders only after their Sorting task is complete. */
(function(root){
"use strict";
const KEY="scw-phase29-packing-v1";
let state=load(),unsubscribeSorted=null;
function load(){try{const x=JSON.parse(root.localStorage.getItem(KEY));if(x&&Array.isArray(x.tasks)&&Number.isInteger(x.sequence))return x}catch(e){}return {tasks:[],sequence:1}}
function save(){root.localStorage.setItem(KEY,JSON.stringify(state))}
function clone(x){return JSON.parse(JSON.stringify(x))}
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function operations(){if(!root.SCWOperationsAdapter)throw Error("Operations Adapter yuklanmagan.");return root.SCWOperationsAdapter}
function sorting(){if(!root.SCWSorting)throw Error("Sorting moduli yuklanmagan.");return root.SCWSorting}
function nextId(){return "PACK-"+String(state.sequence++).padStart(6,"0")}
function plan(){
 const orders=operations().snapshot().salesOrders,sorted=sorting().snapshot().tasks,created=[];
 orders.filter(o=>o.status==="PICKED"&&sorted.some(t=>t.orderId===o.id&&t.status==="DONE")&&!state.tasks.some(t=>t.orderId===o.id)).forEach(order=>{
  const task={id:nextId(),orderId:order.id,sku:order.sku,qty:order.qty,status:"OPEN",createdAt:new Date().toISOString()};
  state.tasks.unshift(task);created.push(clone(task));
 });
 if(created.length)save();
 created.forEach(task=>core().emit("packing.task.created",{task},{source:"Packing"}));
 return created;
}
function complete(taskId,input){
 const task=state.tasks.find(x=>x.id===taskId);
 if(!task)throw Error("Packing topshirig'i topilmadi.");
 if(task.status!=="OPEN")throw Error("Faqat ochiq Packing topshirig'i bajariladi.");
 const order=operations().snapshot().salesOrders.find(x=>x.id===task.orderId);
 if(!order||order.status!=="PICKED")throw Error("Packing uchun buyurtma PICKED holatida bo'lishi kerak.");
 if(!sorting().snapshot().tasks.some(x=>x.orderId===task.orderId&&x.status==="DONE"))throw Error("Avval Sorting topshirig'ini yakunlang.");
 const packed=operations().packOrder({id:task.orderId,packageType:input&&input.packageType||"Standart quti",reference:input&&input.reference||task.id});
 task.status="DONE";task.completedAt=new Date().toISOString();task.packageType=packed.package.packageType;save();
 core().emit("packing.task.completed",{task:clone(task),order:packed},{source:"Packing"});
 return {task:clone(task),order:packed};
}
function snapshot(){return {tasks:clone(state.tasks),metrics:{open:state.tasks.filter(x=>x.status==="OPEN").length,completed:state.tasks.filter(x=>x.status==="DONE").length}}}
function start(){
 unsubscribeSorted=core().on("sorting.completed",()=>{try{plan()}catch(error){core().emit("packing.planning.error",{message:error.message},{source:"Packing"})}});
 core().emit("packing.ready",{moduleId:"PACKING"},{source:"Packing"});
}
function stop(){if(unsubscribeSorted){unsubscribeSorted();unsubscribeSorted=null}}
root.SCWPacking=Object.freeze({plan,complete,snapshot});
core().registerModule({id:"PACKING",name:"Packing",version:"1.0.0",dependencies:["OPERATIONS_ADAPTER","SORTING"],start,stop});
core().registerCommand("packing.plan",()=>plan(),{moduleId:"PACKING"});
core().registerCommand("packing.complete",input=>complete(input&&input.id,input),{moduleId:"PACKING"});
core().registerCommand("packing.snapshot",()=>snapshot(),{moduleId:"PACKING"});
})(window);
