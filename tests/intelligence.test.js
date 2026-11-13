const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
function setup(){
 const ctx={localStorage:{getItem:()=>null,setItem:()=>{}},Date,Math,Number,JSON,Error};ctx.window=ctx;
 ctx.SCWPlanning={recommendations:()=>[
  {sku:"A",product:"Critical item",unit:"pcs",status:"REORDER",onHand:5,onOrder:0,weeklyForecast:70,reorderPoint:30,min:10,leadDays:5,suggestedQty:60},
  {sku:"B",product:"Stable item",unit:"pcs",status:"OK",onHand:500,onOrder:0,weeklyForecast:7,reorderPoint:5,min:10,leadDays:4,suggestedQty:0}
 ]};
 ctx.SCWDomain={snapshot:()=>({products:[],balances:[]})};
 ctx.SCWTransport={snapshot:()=>({deliveries:[{id:"D1",status:"PENDING"}],fleet:[{id:"V1",name:"Van",capacityKg:1000},{id:"V2",name:"Truck",capacityKg:5000}]}),optimize:(ids,id)=>{if(id==="V1")return {loadKg:800,km:100,totalCost:150000, costPerKg:187.5,estimatedHours:3};throw Error("capacity")}};
 ctx.SCWNetwork={snapshot:()=>({scenario:{disruptionEdgeId:"E1"},edges:[{id:"E1",name:"Main route",capacity:10}]}),compare:()=>({baseline:{serviceLevel:98,delivered:980,cost:1000},scenario:{serviceLevel:60,delivered:600,cost:1400},impact:{serviceLevel:-38}})};
 vm.runInNewContext(fs.readFileSync("src/intelligence.js","utf8"),ctx);return ctx.SCWIntelligence;
}
test("inventory risk prioritizes items with low cover and reorder need",()=>{const a=setup().inventoryAnalysis();assert.equal(a[0].sku,"A");assert.equal(a[0].risk,"HIGH");assert.equal(a[0].coverDays,.5)});
test("transport optimizer chooses lowest-cost feasible fleet option",()=>{const t=setup().transportAnalysis();assert.equal(t.best.vehicleId,"V1");assert.equal(t.pending,1)});
test("network disruption is surfaced as a service risk",()=>{const n=setup().networkAnalysis();assert.equal(n.alert,"SERVICE_RISK");assert.equal(n.scenario.serviceLevel,60)});
test("decision report combines inventory, network and transport insights",()=>{const r=setup().analyze();assert.equal(r.summary.high,1);assert.ok(r.insights.some(x=>x.action==="NETWORK"));assert.ok(r.insights.some(x=>x.action==="ROUTE"))});
