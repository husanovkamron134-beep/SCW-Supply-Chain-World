/* SCW Control Center — read-only operational overview and recent event feed. */
(function(root){
"use strict";
let unsubs=[],recent=[];
const EVENT_TYPES=[
 "inventory.received","inventory.transferred","inventory.issued","inventory.adjusted",
 "inbound.received","quality.accepted","quality.quarantined","quality.rejected","quality.return.inspected",
 "reserve.storage.putaway.created","reserve.storage.putaway.completed","asrs.task.created","asrs.putaway.completed","asrs.retrieval.completed",
 "picking.task.created","picking.shortage","picking.completed","replenishment.task.created","replenishment.asrs.requested","replenishment.completed",
 "sorting.task.created","sorting.completed","packing.task.created","packing.task.completed","packing.completed",
 "outbound.staging.task.created","outbound.staging.completed","dispatch.task.created","dispatch.task.completed","dispatch.shipped",
 "returns.received","core.module.started","core.module.stopped","core.module.error"
];
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function clone(x){return JSON.parse(JSON.stringify(x))}
function safe(fn){try{return fn()}catch(error){return {error:error&&error.message?error.message:String(error)}}}
function moduleSnapshot(name,globalName){
 const mod=root[globalName];
 if(!mod||typeof mod.snapshot!=="function")return null;
 return safe(()=>mod.snapshot());
}
function snapshot(){
 const inv=root.SCWInventoryAdapter?safe(()=>({products:root.SCWInventoryAdapter.aggregate(),locations:root.SCWInventoryAdapter.locationBalances(),totalUnits:root.SCWInventoryAdapter.snapshot().balances.reduce((n,x)=>n+x.qty,0)})):null;
 const ops=root.SCWOperationsAdapter?safe(()=>root.SCWOperationsAdapter.snapshot()):null;
 const orders=ops&&!ops.error?ops.salesOrders:[];
 const orderMetrics={total:orders.length,new:orders.filter(x=>x.status==="NEW").length,picked:orders.filter(x=>x.status==="PICKED").length,packed:orders.filter(x=>x.status==="PACKED").length,dispatched:orders.filter(x=>x.status==="DISPATCHED").length};
 return {
  generatedAt:new Date().toISOString(),
  core:core().status(),
  inventory:inv,
  orders:{metrics:orderMetrics,purchaseOrders:ops&&!ops.error?ops.purchaseOrders.length:0},
  warehouse:root.SCWWarehouse?safe(()=>root.SCWWarehouse.metrics()):null,
  qualityControl:moduleSnapshot("Quality Control","SCWQualityControl"),
  reserveStorage:moduleSnapshot("Reserve Storage","SCWReserveStorage"),
  highBayASRS:moduleSnapshot("High-Bay AS/RS","SCWHBASRS"),
  picking:moduleSnapshot("Picking","SCWPicking"),
  replenishment:moduleSnapshot("Replenishment","SCWReplenishment"),
  sorting:moduleSnapshot("Sorting","SCWSorting"),
  packing:moduleSnapshot("Packing","SCWPacking"),
  outboundStaging:moduleSnapshot("Outbound Staging","SCWOutboundStaging"),
  dispatch:moduleSnapshot("Dispatch","SCWDispatch"),
  returns:moduleSnapshot("Returns","SCWReturns"),
  recentEvents:clone(recent)
 };
}
function events(){return clone(recent)}
function start(){
 EVENT_TYPES.forEach(type=>unsubs.push(core().on(type,event=>{
  recent.unshift({id:event.id,type:event.type,source:event.source,at:event.at,payload:clone(event.payload)});
  if(recent.length>100)recent.length=100;
 })));
 core().emit("control.center.ready",{moduleId:"CONTROL_CENTER",eventSubscriptions:EVENT_TYPES.length},{source:"ControlCenter"});
}
function stop(){unsubs.forEach(fn=>fn());unsubs=[]}
root.SCWControlCenter=Object.freeze({snapshot,events});
core().registerModule({id:"CONTROL_CENTER",name:"Control Center",version:"1.0.0",dependencies:["INVENTORY_ADAPTER","OPERATIONS_ADAPTER"],start,stop});
core().registerCommand("control.center.snapshot",()=>snapshot(),{moduleId:"CONTROL_CENTER"});
core().registerCommand("control.center.events",()=>events(),{moduleId:"CONTROL_CENTER"});
})(window);
