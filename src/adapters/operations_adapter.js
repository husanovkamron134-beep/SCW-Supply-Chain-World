/* Adapter: Shared Core <-> legacy SCWOperations. */
(function(root){
"use strict";
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function ops(){if(!root.SCWOperations)throw Error("SCWOperations yuklanmagan.");return root.SCWOperations}
const api={
 snapshot(){return ops().snapshot()},
 createPurchaseOrder(input){const x=ops().createPurchaseOrder(input);core().emit("procurement.po.created",{purchaseOrder:x},{source:"OperationsAdapter"});return x},
 receivePurchaseOrder(input){const x=ops().receivePurchaseOrder(input);const receipt=x.receipts[0];core().emit("procurement.po.received",{purchaseOrderId:x.id,receipt},{source:"OperationsAdapter"});core().emit("inventory.received",{sku:x.sku,qty:receipt.qty,lot:receipt.lot,to:receipt.location,reference:x.id},{source:"OperationsAdapter"});return x},
 createSalesOrder(input){const x=ops().createSalesOrder(input);core().emit("orders.sales.created",{order:x},{source:"OperationsAdapter"});return x},
 completeWarehousePick(input){const x=ops().completeWarehousePick(input);core().emit("orders.sales.picked",{order:x},{source:"OperationsAdapter"});return x},
 packOrder(input){const x=ops().packOrder(input);core().emit("packing.completed",{order:x},{source:"OperationsAdapter"});return x},
 dispatchOrder(input){const x=ops().dispatchOrder(input);core().emit("dispatch.shipped",{order:x},{source:"OperationsAdapter"});return x}
};
root.SCWOperationsAdapter=Object.freeze(api);
if(root.SCWCore)root.SCWCore.registerModule({id:"OPERATIONS_ADAPTER",name:"Operations Adapter",version:"1.0.0"});
})(window);
