/* SCW Phase 10 — explainable decision intelligence and optimization. */
(function(){
"use strict";
const clone=x=>JSON.parse(JSON.stringify(x));
function inventoryAnalysis(){
 const recs=SCWPlanning.recommendations(),inv=SCWDomain.snapshot();
 return recs.map(r=>{
  const daily=r.weeklyForecast/7,coverDays=daily>0?r.onHand/daily:null;
  let score=0,reasons=[];
  if(r.status==="NO_DATA"){score=r.onHand<r.min?55:15;reasons.push("Talab tarixi yetarli emas");}
  else{
   if(r.onHand<=r.reorderPoint){score+=45;reasons.push("Zaxira qayta buyurtma nuqtasiga yetgan");}
   if(coverDays!==null&&coverDays<=r.leadDays){score+=35;reasons.push("Mavjud zaxira yetkazish muddatigacha yetmasligi mumkin");}
   if(r.onHand<r.min){score+=20;reasons.push("Zaxira minimal me’yordan past");}
   if(r.onOrder>0){score=Math.max(0,score-10);reasons.push("Ochiq xarid buyurtmasi hisobga olindi");}
  }
  score=Math.min(100,score);
  return {...r,coverDays:coverDays===null?null:Number(coverDays.toFixed(1)),riskScore:score,risk:score>=70?"HIGH":score>=35?"MEDIUM":"LOW",reasons};
 }).sort((a,b)=>b.riskScore-a.riskScore);
}
function transportAnalysis(){
 const s=SCWTransport.snapshot(),pending=s.deliveries.filter(x=>x.status==="PENDING");
 if(!pending.length)return {pending:0,options:[],best:null,message:"Rejalashtirish uchun kutilayotgan yetkazma yo‘q."};
 const options=s.fleet.map(v=>{try{const p=SCWTransport.optimize(pending.map(x=>x.id),v.id);return {vehicleId:v.id,vehicle:v.name,capacityKg:v.capacityKg,loadKg:p.loadKg,distanceKm:Number(p.km.toFixed(1)),totalCost:Math.round(p.totalCost),costPerKg:Number(p.costPerKg.toFixed(2)),estimatedHours:Number(p.estimatedHours.toFixed(1)),feasible:true}}catch(e){return {vehicleId:v.id,vehicle:v.name,capacityKg:v.capacityKg,feasible:false,reason:e.message}}});
 const feasible=options.filter(x=>x.feasible).sort((a,b)=>a.totalCost-b.totalCost);
 return {pending:pending.length,options,best:feasible[0]||null,message:feasible.length?"Eng arzon sig‘imi yetarli transport varianti tanlandi.":"Barcha yetkazmalarni bitta transportga sig‘dirib bo‘lmaydi."};
}
function networkAnalysis(){
 const s=SCWNetwork.snapshot(),p=s.scenario,c=SCWNetwork.compare(p);
 const edge=s.edges.find(x=>x.id===p.disruptionEdgeId);
 return {scenario:c.scenario,baseline:c.baseline,impact:c.impact,edge:edge?{id:edge.id,name:edge.name,capacity:edge.capacity}:null,alert:c.scenario.serviceLevel<c.baseline.serviceLevel?"SERVICE_RISK":"STABLE"};
}
function analyze(){
 const inventory=inventoryAnalysis(),transport=transportAnalysis(),network=networkAnalysis();
 const high=inventory.filter(x=>x.risk==="HIGH"),medium=inventory.filter(x=>x.risk==="MEDIUM");
 const insights=[];
 high.forEach(x=>insights.push({level:"HIGH",title:x.product+" zaxirasi xavf ostida",detail:x.reasons.join("; ")+". "+(x.suggestedQty?"Tavsiya etilgan xarid: "+x.suggestedQty+" "+x.unit+".":"Talab tarixini yangilang va zaxirani tekshiring."),action:"REPLENISH",sku:x.sku}));
 medium.forEach(x=>insights.push({level:"MEDIUM",title:x.product+" zaxirasini kuzating",detail:x.reasons.join("; ")+".",action:"MONITOR",sku:x.sku}));
 if(network.alert==="SERVICE_RISK")insights.push({level:"HIGH",title:"Ta’minot tarmog‘ida xizmat darajasi xavfi",detail:network.edge.id+" · "+network.edge.name+" uzilishi ssenariysida xizmat darajasi "+network.scenario.serviceLevel.toFixed(1)+"% bo‘ldi.",action:"NETWORK"});
 if(transport.pending&&!transport.best)insights.push({level:"HIGH",title:"Transport sig‘imi yetarli emas",detail:transport.message+" Yetkazmalarni bir nechta reysga bo‘ling.",action:"SPLIT_ROUTE"});
 if(transport.best)insights.push({level:"INFO",title:"Transport varianti optimallashtirildi",detail:transport.best.vehicle+" · "+transport.best.distanceKm+" km · "+transport.best.totalCost.toLocaleString("uz-UZ")+" UZS taxminiy xarajat.",action:"ROUTE"});
 if(!insights.length)insights.push({level:"INFO",title:"Jiddiy xavf aniqlanmadi",detail:"Yangi ma’lumotlar kiritilganda tahlilni qayta ishga tushiring.",action:"NONE"});
 const summary={high:high.length,medium:medium.length,reorder:inventory.filter(x=>x.suggestedQty>0).length,serviceLevel:Number(network.scenario.serviceLevel.toFixed(1)),pendingDeliveries:transport.pending};
 return {generatedAt:new Date().toISOString(),summary,inventory,transport,network,insights};
}
window.SCWIntelligence={analyze,inventoryAnalysis,transportAnalysis,networkAnalysis};
})();