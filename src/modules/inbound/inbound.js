/* SCW Inbound module — first operational module on Shared Core. */
(function(root){
"use strict";
let unsubs=[];
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function ops(){if(!root.SCWOperationsAdapter)throw Error("Operations Adapter yuklanmagan.");return root.SCWOperationsAdapter}
function inventory(){if(!root.SCWInventoryAdapter)throw Error("Inventory Adapter yuklanmagan.");return root.SCWInventoryAdapter}
const api={
 snapshot(){
  const data=ops().snapshot();
  return {purchaseOrders:data.purchaseOrders.map(po=>({id:po.id,supplier:po.supplier,sku:po.sku,qty:po.qty,received:po.received,status:po.status,receipts:po.receipts})),recentReceipts:data.purchaseOrders.flatMap(po=>po.receipts.map(r=>({purchaseOrderId:po.id,sku:po.sku,...r}))).slice(0,20)};
 },
 receive(input){
  if(!input||!input.id)throw Error("PO raqami talab qilinadi.");
  const before=ops().snapshot().purchaseOrders.find(x=>x.id===input.id);
  if(!before)throw Error("Xarid buyurtmasi topilmadi.");
  const po=ops().receivePurchaseOrder(input);
  const receipt=po.receipts[0];
  core().emit("inbound.received",{purchaseOrderId:po.id,supplier:po.supplier,sku:po.sku,qty:receipt.qty,lot:receipt.lot,location:receipt.location,status:po.status},{source:"Inbound"});
  return po;
 },
 stockSnapshot(){return inventory().snapshot()}
};
function start(){
 unsubs.push(core().on("inventory.received",event=>{
  core().emit("inbound.inventory.synced",{sourceEventId:event.id,payload:event.payload},{source:"Inbound"});
 }));
 core().emit("inbound.ready",{moduleId:"INBOUND"},{source:"Inbound"});
}
function stop(){unsubs.forEach(fn=>fn());unsubs=[]}
root.SCWInbound=Object.freeze(api);
core().registerModule({id:"INBOUND",name:"Inbound",version:"1.0.0",dependencies:["INVENTORY_ADAPTER","OPERATIONS_ADAPTER"],start,stop});
core().registerCommand("inbound.snapshot",()=>api.snapshot(),{moduleId:"INBOUND"});
core().registerCommand("inbound.receive",input=>api.receive(input),{moduleId:"INBOUND"});
})(window);
