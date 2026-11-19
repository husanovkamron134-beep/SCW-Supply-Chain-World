/* SCW module bootstrap — explicit ordered startup / reverse shutdown. */
(function(root){
"use strict";
const ORDER=[
 "INVENTORY_ADAPTER","OPERATIONS_ADAPTER","WMS_ADAPTER",
 "INBOUND","QUALITY_CONTROL","RESERVE_STORAGE","HIGH_BAY_ASRS",
 "PICKING","REPLENISHMENT","SORTING","PACKING","OUTBOUND_STAGING",
 "DISPATCH","RETURNS","CONTROL_CENTER"
];
async function startAll(){
 if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");
 const missing=ORDER.filter(id=>!root.SCWCore.getModule(id));
 if(missing.length)throw Error("Quyidagi modullar script sifatida yuklanmagan: "+missing.join(", "));
 const started=[];
 try{
  for(const id of ORDER){await root.SCWCore.startModule(id);started.push(id)}
  return {started,core:root.SCWCore.status()};
 }catch(error){
  for(const id of started.reverse()){try{await root.SCWCore.stopModule(id)}catch(ignore){}}
  throw error;
 }
}
async function stopAll(){
 const stopped=[];
 for(const id of ORDER.slice().reverse()){
  const item=root.SCWCore.getModule(id);
  if(item&&item.status==="RUNNING"){await root.SCWCore.stopModule(id);stopped.push(id)}
 }
 return {stopped,core:root.SCWCore.status()};
}
root.SCWBootstrap=Object.freeze({order:ORDER.slice(),startAll,stopAll});
})(window);
