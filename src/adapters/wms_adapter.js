/* Adapter: Shared Core <-> legacy SCWWarehouse. */
(function(root){
"use strict";
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function wms(){if(!root.SCWWarehouse)throw Error("SCWWarehouse yuklanmagan.");return root.SCWWarehouse}
const api={
 snapshot(){return wms().snapshot()},
 metrics(){return wms().metrics()},
 createPutawayTasks(){const x=wms().createPutawayTasks();if(x.length)core().emit("wms.putaway.created",{count:x.length,tasks:x},{source:"WMSAdapter"});return x},
 createPickTasks(){const x=wms().createPickTasks();if(x.length)core().emit("wms.pick.created",{count:x.length,tasks:x},{source:"WMSAdapter"});return x},
 complete(id){const x=wms().complete(id);core().emit(x.kind==="PICK"?"wms.pick.completed":"wms.putaway.completed",{task:x},{source:"WMSAdapter"});return x},
 cancel(id){const x=wms().cancel(id);core().emit("wms.task.cancelled",{task:x},{source:"WMSAdapter"});return x}
};
root.SCWWMSAdapter=Object.freeze(api);
if(root.SCWCore)root.SCWCore.registerModule({id:"WMS_ADAPTER",name:"WMS Adapter",version:"1.0.0"});
})(window);
