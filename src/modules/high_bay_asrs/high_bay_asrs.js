/* SCW High-Bay AS/RS — logical automated storage and retrieval task engine. */
(function(root){
"use strict";
const KEY="scw-phase25-high-bay-asrs-v1";
const seed={tasks:[],sequence:1};
const AISLES=["A","B","C"],LEVELS=[1,2,3,4],BAYS=[1,2];
const BIN_CAPACITY=250;
let state=load();
function load(){try{const x=JSON.parse(root.localStorage.getItem(KEY));if(x&&Array.isArray(x.tasks)&&Number.isInteger(x.sequence))return x}catch(e){}return {tasks:[],sequence:1}}
function save(){root.localStorage.setItem(KEY,JSON.stringify(state))}
function clone(x){return JSON.parse(JSON.stringify(x))}
function core(){if(!root.SCWCore)throw Error("SCWCore yuklanmagan.");return root.SCWCore}
function inventory(){if(!root.SCWInventoryAdapter)throw Error("Inventory Adapter yuklanmagan.");return root.SCWInventoryAdapter}
function nextId(){return "ASRS-"+String(state.sequence++).padStart(6,"0")}
function binDefinitions(){
 const out=[];
 AISLES.forEach(aisle=>LEVELS.forEach(level=>BAYS.forEach(bay=>{
  const code="HBA-"+aisle+level+"-B"+bay;
  out.push({code,name:"High-Bay "+aisle+" / Level "+level+" / Bay "+bay,type:"storage",capacity:BIN_CAPACITY,aisle,level,bay});
 })));
 return out;
}
function ensureLocations(){
 binDefinitions().forEach(bin=>inventory().ensureLocation({code:bin.code,name:bin.name,type:bin.type,capacity:bin.capacity}));
 inventory().ensureLocation({code:"PICK-01",name:"AS/RS retrieval buffer",type:"picking",capacity:5000});
 return {bins:binDefinitions().length,retrievalBuffer:"PICK-01"};
}
function balances(){return inventory().snapshot()}
function getBalance(data,sku,location,lot){return data.balances.find(x=>x.sku===sku&&x.location===location&&x.lot===lot)}
function openReserved(from,sku,lot,kind){return state.tasks.filter(t=>t.status==="OPEN"&&t.kind===kind&&t.from===from&&t.sku===sku&&t.lot===lot).reduce((n,t)=>n+t.qty,0)}
function createPutaway(input){
 input=input||{};
 const sku=String(input.sku||"").trim(),lot=String(input.lot||"").trim(),from=String(input.from||"").trim(),qty=Number(input.qty);
 if(!sku||!lot||!from||!Number.isInteger(qty)||qty<=0)throw Error("SKU, LOT, manba va musbat butun miqdor talab qilinadi.");
 const data=balances(),source=getBalance(data,sku,from,lot);
 const available=(source?source.qty:0)-openReserved(from,sku,lot,"STORE");
 if(available<qty)throw Error("Manba lokatsiyasida AS/RS uchun yetarli zaxira yo'q.");
 const definitions=binDefinitions(),binData=definitions.map(bin=>{
  const stock=data.balances.filter(x=>x.location===bin.code);
  const used=stock.reduce((n,x)=>n+x.qty,0);
  const reserved=state.tasks.filter(t=>t.status==="OPEN"&&t.kind==="STORE"&&t.to===bin.code).reduce((n,t)=>n+t.qty,0);
  const compatible=!stock.length||stock.every(x=>x.sku===sku&&x.lot===lot);
  return {...bin,free:bin.capacity-used-reserved,compatible};
 }).filter(x=>x.compatible&&x.free>0);
 let remaining=qty;const created=[];
 for(const bin of binData){
  if(remaining<=0)break;
  const take=Math.min(remaining,bin.free);
  const task={id:nextId(),kind:"STORE",sku,lot,qty:take,from,to:bin.code,status:"OPEN",createdAt:new Date().toISOString(),aisle:bin.aisle,level:bin.level,bay:bin.bay};
  state.tasks.unshift(task);created.push(clone(task));remaining-=take;
 }
 if(remaining>0)throw Error("High-Bay bo'sh sig'imi yetarli emas; "+remaining+" dona uchun joy topilmadi.");
 save();created.forEach(task=>core().emit("asrs.task.created",{task},{source:"HighBayASRS"}));return created;
}
function createRetrieval(input){
 input=input||{};
 const sku=String(input.sku||"").trim(),lot=String(input.lot||"").trim(),to=String(input.to||"PICK-01").trim(),qty=Number(input.qty);
 if(!sku||!lot||!to||!Number.isInteger(qty)||qty<=0)throw Error("SKU, LOT, manzil va musbat butun miqdor talab qilinadi.");
 const data=balances();
 if(!data.locations.some(x=>x.code===to))throw Error("AS/RS retrieval manzili mavjud emas.");
 let remaining=qty;const created=[];
 const bins=binDefinitions();
 for(const bin of bins){
  if(remaining<=0)break;
  const stock=getBalance(data,sku,bin.code,lot);
  const available=(stock?stock.qty:0)-openReserved(bin.code,sku,lot,"RETRIEVE");
  if(available<=0)continue;
  const take=Math.min(remaining,available);
  const task={id:nextId(),kind:"RETRIEVE",sku,lot,qty:take,from:bin.code,to,status:"OPEN",createdAt:new Date().toISOString(),aisle:bin.aisle,level:bin.level,bay:bin.bay};
  state.tasks.unshift(task);created.push(clone(task));remaining-=take;
 }
 if(remaining>0)throw Error("High-Bay zaxirasida so'ralgan LOT miqdori yetarli emas; "+remaining+" dona topilmadi.");
 save();created.forEach(task=>core().emit("asrs.task.created",{task},{source:"HighBayASRS"}));return created;
}
function complete(taskId){
 const task=state.tasks.find(x=>x.id===taskId);
 if(!task)throw Error("AS/RS topshirig'i topilmadi.");
 if(task.status!=="OPEN")throw Error("Faqat ochiq AS/RS topshirig'i bajariladi.");
 const data=balances(),source=getBalance(data,task.sku,task.from,task.lot);
 if(!source||source.qty<task.qty)throw Error("AS/RS manba binida/Lokatsiyasida zaxira yetarli emas.");
 const destination=data.locations.find(x=>x.code===task.to);
 if(!destination)throw Error("AS/RS manzil lokatsiyasi topilmadi.");
 const used=data.balances.filter(x=>x.location===task.to).reduce((n,x)=>n+x.qty,0);
 const reserved=state.tasks.filter(t=>t.status==="OPEN"&&t.id!==task.id&&t.to===task.to).reduce((n,t)=>n+t.qty,0);
 if(used+reserved+task.qty>destination.capacity)throw Error("AS/RS manzil sig'imi yetarli emas.");
 const destStock=data.balances.filter(x=>x.location===task.to&&x.qty>0);
 if(destStock.some(x=>x.sku!==task.sku||x.lot!==task.lot))throw Error("Bitta AS/RS binida turli SKU/LOT aralashtirilmaydi.");
 inventory().record({type:"TRANSFER",sku:task.sku,qty:task.qty,lot:task.lot,from:task.from,to:task.to,reference:task.id,note:task.kind==="STORE"?"High-Bay AS/RS automated putaway":"High-Bay AS/RS retrieval"});
 task.status="DONE";task.completedAt=new Date().toISOString();save();
 core().emit(task.kind==="STORE"?"asrs.putaway.completed":"asrs.retrieval.completed",{task:clone(task)},{source:"HighBayASRS"});
 return clone(task);
}
function snapshot(){
 const data=balances(),bins=binDefinitions().map(bin=>{
  const stock=data.balances.filter(x=>x.location===bin.code&&x.qty>0);
  return {...bin,used:stock.reduce((n,x)=>n+x.qty,0),contents:stock.map(x=>({sku:x.sku,lot:x.lot,qty:x.qty}))};
 });
 return {bins,tasks:clone(state.tasks),metrics:{totalBins:bins.length,occupiedBins:bins.filter(x=>x.used>0).length,openTasks:state.tasks.filter(x=>x.status==="OPEN").length,completedTasks:state.tasks.filter(x=>x.status==="DONE").length,storedUnits:bins.reduce((n,x)=>n+x.used,0)}};
}
function start(){ensureLocations();core().emit("asrs.ready",{moduleId:"HIGH_BAY_ASRS",bins:binDefinitions().length},{source:"HighBayASRS"})}
root.SCWHBASRS=Object.freeze({ensureLocations,createPutaway,createRetrieval,complete,snapshot});
core().registerModule({id:"HIGH_BAY_ASRS",name:"High-Bay AS/RS",version:"1.0.0",dependencies:["INVENTORY_ADAPTER"],start});
core().registerCommand("asrs.snapshot",()=>snapshot(),{moduleId:"HIGH_BAY_ASRS"});
core().registerCommand("asrs.putaway.create",input=>createPutaway(input),{moduleId:"HIGH_BAY_ASRS"});
core().registerCommand("asrs.retrieval.create",input=>createRetrieval(input),{moduleId:"HIGH_BAY_ASRS"});
core().registerCommand("asrs.task.complete",input=>complete(input&&input.id),{moduleId:"HIGH_BAY_ASRS"});
})(window);
