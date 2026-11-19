/* SCW Sorting — order-to-lane sorting workflow before packing. */
(function(root){
"use strict";
const KEY="scw-phase28-sorting-v1";
let state=load(),unsubscribePicked=null;
function load(){try{const x=JSON.parse(root.localStorage.getItem(KEY));if(x&&Array.isArray(x.tasks)&&Number.isInteger(x.sequence))return x}catch(e){}return {tasks:[],sequence:1}}
function save(){root.localStorage.setItem(KEY,JSON.stringify(state))}
function clone(x){return JSON.parse(JSON.stringify(x))}
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function operations(){if(!root.SCWOperationsAdapter)throw Error("Operations Adapter yuklanmagan.");return root.SCWOperationsAdapter}
function nextId(){return "SORT-"+String(state.sequence++).padStart(6,"0")}
function laneFor(order){const digits=String(order.sku||"").replace(/\D/g,"");const n=Number(digits.slice(-2)||0);return "SORT-LANE-"+String((n%4)+1).padStart(2,"0")}
function plan(){
 const orders=operations().snapshot().salesOrders,created=[];
 orders.filter(o=>o.status==="PICKED"&&!state.tasks.some(t=>t.orderId===o.id)).forEach(order=>{
  const task={id:nextId(),orderId:order.id,sku:order.sku,qty:order.qty,lane:laneFor(order),status:"OPEN",createdAt:new Date().toISOString()};
  state.tasks.unshift(task);created.push(clone(task));
 });
 if(created.length)save();
 created.forEach(task=>core().emit("sorting.task.created",{task},{source:"Sorting"}));
 return created;
}
function complete(taskId){
 const task=state.tasks.find(x=>x.id===taskId);
 if(!task)throw Error("Sorting topshirig'i topilmadi.");
 if(task.status!=="OPEN")throw Error("Faqat ochiq Sorting topshirig'i bajariladi.");
 const order=operations().snapshot().salesOrders.find(x=>x.id===task.orderId);
 if(!order||order.status!=="PICKED")throw Error("Sorting bilan bog'langan buyurtma PICKED holatida emas.");
 task.status="DONE";task.completedAt=new Date().toISOString();save();
 core().emit("sorting.completed",{task:clone(task),orderId:order.id,lane:task.lane},{source:"Sorting"});
 return clone(task);
}
function snapshot(){return {tasks:clone(state.tasks),metrics:{open:state.tasks.filter(x=>x.status==="OPEN").length,completed:state.tasks.filter(x=>x.status==="DONE").length,lanes:Array.from(new Set(state.tasks.map(x=>x.lane))).length}}}
function start(){
 unsubscribePicked=core().on("orders.sales.picked",()=>{try{plan()}catch(error){core().emit("sorting.planning.error",{message:error.message},{source:"Sorting"})}});
 core().emit("sorting.ready",{moduleId:"SORTING"},{source:"Sorting"});
}
function stop(){if(unsubscribePicked){unsubscribePicked();unsubscribePicked=null}}
root.SCWSorting=Object.freeze({plan,complete,snapshot});
core().registerModule({id:"SORTING",name:"Sorting",version:"1.0.0",dependencies:["OPERATIONS_ADAPTER"],start,stop});
core().registerCommand("sorting.plan",()=>plan(),{moduleId:"SORTING"});
core().registerCommand("sorting.complete",input=>complete(input&&input.id),{moduleId:"SORTING"});
core().registerCommand("sorting.snapshot",()=>snapshot(),{moduleId:"SORTING"});
})(window);
