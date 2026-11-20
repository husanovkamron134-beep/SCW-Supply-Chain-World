/* SCW Quality Control — inspection decisions without a second inventory ledger. */
(function(root){
"use strict";
let inspections=[];
let unsubs=[];
let sequence=0;
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function operations(){if(!root.SCWOperationsAdapter)throw Error("Operations Adapter yuklanmagan.");return root.SCWOperationsAdapter}
function textValue(value,label){const valueText=String(value||"").trim();if(!valueText)throw Error(label+" kiritilishi shart.");return valueText}
function positive(value){const n=Number(value);if(!Number.isInteger(n)||n<=0)throw Error("Tekshiruv miqdori musbat butun son bo'lishi kerak.");return n}
function clone(value){return JSON.parse(JSON.stringify(value))}
function nextId(){sequence+=1;return "QC-"+String(sequence).padStart(6,"0")}
function receiptFor(input){
 const data=operations().snapshot();
 const po=data.purchaseOrders.find(x=>x.id===input.purchaseOrderId);
 if(!po)throw Error("Bog'langan xarid buyurtmasi topilmadi.");
 const index=Number(input.receiptIndex);
 if(!Number.isInteger(index)||index<0||index>=po.receipts.length)throw Error("Qabul yozuvi indeksi noto'g'ri.");
 const receipt=po.receipts[index];
 if(input.sku&&input.sku!==po.sku)throw Error("SKU xarid buyurtmasiga mos emas.");
 if(input.lot&&input.lot!==receipt.lot)throw Error("LOT qabul yozuviga mos emas.");
 const receiptAt=receipt.at;
 const inspected=inspections.filter(x=>x.sourceType==="INBOUND"&&x.purchaseOrderId===po.id&&x.receiptAt===receiptAt).reduce((n,x)=>n+x.qty,0);
 const remaining=receipt.qty-inspected;
 const qty=positive(input.qty);
 if(qty>remaining)throw Error("Tekshiruv miqdori shu qabul yozuvida qolgan miqdordan oshdi ("+remaining+").");
 return {po,receipt,index,receiptAt,qty,remaining};
}
function validateDecision(value){const decision=String(value||"").toUpperCase();if(!["ACCEPTED","QUARANTINED","REJECTED"].includes(decision))throw Error("QC qarori noto'g'ri.");return decision}
function recordDecision(data,decision){
 const item={
  id:nextId(),sourceType:data.sourceType,sourceId:data.sourceId,
  purchaseOrderId:data.purchaseOrderId||null,receiptIndex:data.receiptIndex===undefined?null:data.receiptIndex,receiptAt:data.receiptAt||null,
  returnId:data.returnId||null,sku:data.sku,lot:data.lot,location:data.location||null,qty:data.qty,
  decision,reason:String(data.reason||"").trim(),inspector:String(data.inspector||"").trim(),
  at:new Date().toISOString()
 };
 inspections.unshift(item);
 const eventNames={ACCEPTED:"quality.accepted",QUARANTINED:"quality.quarantined",REJECTED:"quality.rejected"};
 core().emit(eventNames[decision],item,{source:"QualityControl"});
 core().emit("quality.inspection.completed",item,{source:"QualityControl"});
 return clone(item);
}
const api={
 snapshot(){return {inspections:clone(inspections),metrics:{total:inspections.length,accepted:inspections.filter(x=>x.decision==="ACCEPTED").length,quarantined:inspections.filter(x=>x.decision==="QUARANTINED").length,rejected:inspections.filter(x=>x.decision==="REJECTED").length}}},
 inspectInbound(input){
  input=input||{};
  const decision=validateDecision(input.decision);
  const source=receiptFor(input);
  const data={sourceType:"INBOUND",sourceId:source.po.id+":"+source.index,purchaseOrderId:source.po.id,receiptIndex:source.index,receiptAt:source.receiptAt,sku:source.po.sku,lot:source.receipt.lot,location:source.receipt.location,qty:source.qty,reason:input.reason,inspector:input.inspector};
  core().emit("quality.inspection.started",data,{source:"QualityControl"});
  return recordDecision(data,decision);
 },
 inspectReturn(input){
  input=input||{};
  const decision=validateDecision(input.decision);
  if(!root.SCWReturns)throw Error("Returns moduli yuklanmagan.");
  const returnId=textValue(input.returnId,"Return ID"),returned=root.SCWReturns.get(returnId);
  if(!returned)throw Error("Qaytarish yozuvi topilmadi.");
  const sku=textValue(input.sku,"SKU"),lot=textValue(input.lot,"LOT"),qty=positive(input.qty);
  if(returned.sku!==sku||returned.lot!==lot)throw Error("QC SKU/LOT qaytarish yozuviga mos emas.");
  if(returned.inspectedQty+qty>returned.qty)throw Error("QC tekshiruv miqdori qaytarilgan miqdordan oshib ketdi.");
  const data={sourceType:"RETURN",sourceId:returnId,returnId,sku,lot,location:returned.location,qty,reason:input.reason,inspector:input.inspector};
  core().emit("quality.return.inspection.started",data,{source:"QualityControl"});
  const result=recordDecision(data,decision);
  root.SCWReturns.recordInspection(result);
  core().emit("quality.return.inspected",result,{source:"QualityControl"});
  return result;
 },
 eligibleInboundReceipts(){
  const data=operations().snapshot(),out=[];
  data.purchaseOrders.forEach(po=>po.receipts.forEach((receipt,index)=>{
   const inspected=inspections.filter(x=>x.sourceType==="INBOUND"&&x.purchaseOrderId===po.id&&x.receiptAt===receipt.at).reduce((n,x)=>n+x.qty,0);
   out.push({purchaseOrderId:po.id,supplier:po.supplier,sku:po.sku,lot:receipt.lot,location:receipt.location,received:receipt.qty,inspected,remaining:receipt.qty-inspected});
  }));
  return out;
 }
};
function start(){
 unsubs.push(core().on("inbound.received",event=>core().emit("quality.inbound.available",{sourceEventId:event.id,payload:event.payload},{source:"QualityControl"})));
 unsubs.push(core().on("returns.received",event=>core().emit("quality.return.available",{sourceEventId:event.id,payload:event.payload},{source:"QualityControl"})));
 core().emit("quality.ready",{moduleId:"QUALITY_CONTROL"},{source:"QualityControl"});
}
function stop(){unsubs.forEach(fn=>fn());unsubs=[]}
root.SCWQualityControl=Object.freeze(api);
core().registerModule({id:"QUALITY_CONTROL",name:"Quality Control",version:"1.0.0",dependencies:["INVENTORY_ADAPTER","OPERATIONS_ADAPTER"],start,stop});
core().registerCommand("quality.snapshot",()=>api.snapshot(),{moduleId:"QUALITY_CONTROL"});
core().registerCommand("quality.inspect.inbound",input=>api.inspectInbound(input),{moduleId:"QUALITY_CONTROL"});
core().registerCommand("quality.inspect.return",input=>api.inspectReturn(input),{moduleId:"QUALITY_CONTROL"});
core().registerCommand("quality.inbound.eligible",()=>api.eligibleInboundReceipts(),{moduleId:"QUALITY_CONTROL"});
})(window);
