/* SCW Returns — receive dispatched goods into a controlled returns location. */
(function(root){
"use strict";
const KEY="scw-phase32-returns-v1";
let state=load(),sequence=1;
function load(){try{const x=JSON.parse(root.localStorage.getItem(KEY));if(x&&Array.isArray(x.returns)&&Number.isInteger(x.sequence))return x}catch(e){}return {returns:[],sequence:1}}
function save(){root.localStorage.setItem(KEY,JSON.stringify(state))}
function clone(x){return JSON.parse(JSON.stringify(x))}
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function inventory(){if(!root.SCWInventoryAdapter)throw Error("Inventory Adapter yuklanmagan.");return root.SCWInventoryAdapter}
function operations(){if(!root.SCWOperationsAdapter)throw Error("Operations Adapter yuklanmagan.");return root.SCWOperationsAdapter}
function positive(value){const n=Number(value);if(!Number.isInteger(n)||n<=0)throw Error("Qaytarish miqdori musbat butun son bo'lishi kerak.");return n}
function get(returnId){const item=state.returns.find(x=>x.id===returnId);return item?clone(item):null}
function receive(input){
 input=input||{};
 const orderId=String(input.orderId||"").trim(),lot=String(input.lot||"").trim(),qty=positive(input.qty);
 if(!orderId||!lot)throw Error("Buyurtma ID va qaytarilgan LOT talab qilinadi.");
 const order=operations().snapshot().salesOrders.find(x=>x.id===orderId);
 if(!order||order.status!=="DISPATCHED")throw Error("Faqat jo'natilgan buyurtmadan qaytarish qabul qilinadi.");
 const already=state.returns.filter(x=>x.orderId===orderId).reduce((n,x)=>n+x.qty,0);
 if(already+qty>order.qty)throw Error("Qaytarish miqdori jo'natilgan buyurtma miqdoridan oshib ketdi.");
 const id="RET-"+String(state.sequence++).padStart(6,"0");
 const item={id,orderId,sku:order.sku,product:order.product,qty,lot,location:"RET-01",reason:String(input.reason||"").trim(),receivedAt:new Date().toISOString(),inspectedQty:0,acceptedQty:0,quarantinedQty:0,rejectedQty:0,status:"QC_PENDING"};
 inventory().record({type:"RECEIPT",sku:item.sku,qty,lot,to:item.location,reference:id,note:"Customer return from "+orderId});
 state.returns.unshift(item);save();
 core().emit("returns.received",{returnId:id,orderId,sku:item.sku,qty,lot,location:item.location,status:item.status},{source:"Returns"});
 return clone(item);
}
function recordInspection(inspection){
 const item=state.returns.find(x=>x.id===inspection.returnId);
 if(!item)throw Error("QC bilan bog'langan return topilmadi.");
 if(item.sku!==inspection.sku||item.lot!==inspection.lot)throw Error("QC SKU/LOT qaytarish yozuviga mos emas.");
 if(item.inspectedQty+inspection.qty>item.qty)throw Error("QC tekshiruv miqdori qaytarilgan miqdordan oshib ketdi.");
 item.inspectedQty+=inspection.qty;
 if(inspection.decision==="ACCEPTED")item.acceptedQty+=inspection.qty;
 if(inspection.decision==="QUARANTINED")item.quarantinedQty+=inspection.qty;
 if(inspection.decision==="REJECTED")item.rejectedQty+=inspection.qty;
 item.status=item.inspectedQty===item.qty?"QC_COMPLETE":"QC_PARTIAL";
 item.updatedAt=new Date().toISOString();save();return clone(item);
}
function snapshot(){return {returns:clone(state.returns),metrics:{total:state.returns.length,pending:state.returns.filter(x=>x.status==="QC_PENDING"||x.status==="QC_PARTIAL").length,completed:state.returns.filter(x=>x.status==="QC_COMPLETE").length}}}
function start(){
 inventory().ensureLocation({code:"RET-01",name:"Returns receiving and quarantine",type:"returns",capacity:5000});
 core().emit("returns.ready",{moduleId:"RETURNS",location:"RET-01"},{source:"Returns"});
}
root.SCWReturns=Object.freeze({receive,get,recordInspection,snapshot});
core().registerModule({id:"RETURNS",name:"Returns",version:"1.0.0",dependencies:["INVENTORY_ADAPTER","OPERATIONS_ADAPTER"],start});
core().registerCommand("returns.receive",input=>receive(input),{moduleId:"RETURNS"});
core().registerCommand("returns.snapshot",()=>snapshot(),{moduleId:"RETURNS"});
core().registerCommand("returns.get",input=>get(input&&input.id),{moduleId:"RETURNS"});
})(window);
