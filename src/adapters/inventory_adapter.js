/* Adapter: Shared Core <-> legacy SCWDomain. */
(function(root){
"use strict";
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function domain(){if(!root.SCWDomain)throw Error("SCWDomain yuklanmagan.");return root.SCWDomain}
const api={
 snapshot(){return domain().snapshot()},
 record(input){
  const result=domain().record(input),data={type:input.type,sku:input.sku,qty:Number(input.qty),lot:input.lot,from:input.from||null,to:input.to||null,reference:input.reference||""};
  const names={RECEIPT:"inventory.received",TRANSFER:"inventory.transferred",ISSUE:"inventory.issued",ADJUSTMENT:"inventory.adjusted"};
  core().emit(names[input.type]||"inventory.changed",data,{source:"InventoryAdapter"});
  return result;
 },
 aggregate(){return domain().aggregate()},
 locationBalances(){return domain().locationBalances()},
 ensureLocation(input){const location=domain().ensureLocation(input);core().emit("inventory.location.registered",{location},{source:"InventoryAdapter"});return location},
 total(sku){return domain().total(sku)}
};
root.SCWInventoryAdapter=Object.freeze(api);
if(root.SCWCore)root.SCWCore.registerModule({id:"INVENTORY_ADAPTER",name:"Inventory Adapter",version:"1.0.0"});
})(window);
