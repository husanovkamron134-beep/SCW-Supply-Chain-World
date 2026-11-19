/* SCW Picking — order-aware pick tasks from the dedicated pick buffer. */
(function(root){
"use strict";
const KEY="scw-phase26-picking-v1";
let state=load(),unsubscribeOrder=null;
function load(){try{const x=JSON.parse(root.localStorage.getItem(KEY));if(x&&Array.isArray(x.tasks)&&Number.isInteger(x.sequence))return x}catch(e){}return {tasks:[],sequence:1}}
function save(){root.localStorage.setItem(KEY,JSON.stringify(state))}
function clone(x){return JSON.parse(JSON.stringify(x))}
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function inventory(){if(!root.SCWInventoryAdapter)throw Error("Inventory Adapter yuklanmagan.");return root.SCWInventoryAdapter}
function operations(){if(!root.SCWOperationsAdapter)throw Error("Operations Adapter yuklanmagan.");return root.SCWOperationsAdapter}
function nextId(){return "PICK-"+String(state.sequence++).padStart(6,"0")}
function plan(){
 const data=inventory().snapshot(),orders=operations().snapshot().salesOrders,buffer="PICK-01";
 const created=[],shortages=[];
 const reserved={};
 state.tasks.filter(t=>t.status==="OPEN").forEach(t=>t.lines.forEach(line=>{const key=line.lot;reserved[key]=(reserved[key]||0)+line.qty}));
 orders.filter(o=>o.status==="NEW"&&!state.tasks.some(t=>t.orderId===o.id)).forEach(order=>{
  let remaining=order.qty;const lines=[];
  data.balances.filter(b=>b.sku===order.sku&&b.location===buffer&&b.qty>0).forEach(b=>{
   if(remaining<=0)return;
   const available=b.qty-(reserved[b.lot]||0);
   if(available<=0)return;
   const take=Math.min(remaining,available);
   lines.push({from:buffer,lot:b.lot,qty:take});reserved[b.lot]=(reserved[b.lot]||0)+take;remaining-=take;
  });
  if(remaining>0){shortages.push({orderId:order.id,sku:order.sku,required:order.qty,available:order.qty-remaining,shortage:remaining});return}
  const task={id:nextId(),kind:"PICK",orderId:order.id,sku:order.sku,qty:order.qty,lines,status:"OPEN",createdAt:new Date().toISOString()};
  state.tasks.unshift(task);created.push(clone(task));
 });
 if(created.length)save();
 created.forEach(task=>core().emit("picking.task.created",{task},{source:"Picking"}));
 shortages.forEach(item=>core().emit("picking.shortage",item,{source:"Picking"}));
 return {created,shortages};
}
function complete(taskId){
 const task=state.tasks.find(x=>x.id===taskId);
 if(!task)throw Error("Picking topshirig'i topilmadi.");
 if(task.status!=="OPEN")throw Error("Faqat ochiq Picking topshirig'i bajariladi.");
 const order=operations().snapshot().salesOrders.find(x=>x.id===task.orderId);
 if(!order||order.status!=="NEW")throw Error("Picking bilan bog'langan buyurtma endi NEW holatda emas.");
 const data=inventory().snapshot();
 task.lines.forEach(line=>{const b=data.balances.find(x=>x.sku===task.sku&&x.location===line.from&&x.lot===line.lot);if(!b||b.qty<line.qty)throw Error("Pick bufferda LOT zaxirasi yetarli emas: "+line.lot)});
 task.lines.forEach(line=>inventory().record({type:"TRANSFER",sku:task.sku,qty:line.qty,lot:line.lot,from:line.from,to:"DSP-01",reference:task.id,note:"Order picking · "+task.orderId}));
 const picked=operations().completeWarehousePick({id:task.orderId,lines:task.lines.map(x=>({lot:x.lot,qty:x.qty}))});
 task.status="DONE";task.completedAt=new Date().toISOString();save();
 core().emit("picking.completed",{task:clone(task),order:picked},{source:"Picking"});
 return {task:clone(task),order:picked};
}
function snapshot(){return {tasks:clone(state.tasks),metrics:{open:state.tasks.filter(x=>x.status==="OPEN").length,completed:state.tasks.filter(x=>x.status==="DONE").length}}}
function start(){
 unsubscribeOrder=core().on("orders.sales.created",()=>{try{plan()}catch(error){core().emit("picking.planning.error",{message:error.message},{source:"Picking"})}});
 core().emit("picking.ready",{moduleId:"PICKING"},{source:"Picking"});
}
function stop(){if(unsubscribeOrder){unsubscribeOrder();unsubscribeOrder=null}}
root.SCWPicking=Object.freeze({plan,complete,snapshot});
core().registerModule({id:"PICKING",name:"Picking",version:"1.0.0",dependencies:["INVENTORY_ADAPTER","OPERATIONS_ADAPTER"],start,stop});
core().registerCommand("picking.plan",()=>plan(),{moduleId:"PICKING"});
core().registerCommand("picking.snapshot",()=>snapshot(),{moduleId:"PICKING"});
core().registerCommand("picking.complete",input=>complete(input&&input.id),{moduleId:"PICKING"});
})(window);
