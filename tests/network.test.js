const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const store=new Map();
const context={window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},console,Date,Math,JSON};
vm.runInNewContext(fs.readFileSync("src/network.js","utf8"),context);
const api=context.window.SCWNetwork;
const base={demandPerDay:40,horizonDays:30,disruptionEdgeId:"E-04",capacityFactor:1,delayDays:0,costMultiplier:1};
test("network contains connected supplier-to-customer paths",()=>{
 const s=api.snapshot(),ids=new Set(s.nodes.map(n=>n.id));
 assert.ok(s.nodes.length>=8);assert.ok(s.edges.length>=7);
 for(const e of s.edges){assert.ok(ids.has(e.from));assert.ok(ids.has(e.to))}
});
test("baseline simulation is reproducible and bounded by demand",()=>{
 const a=api.simulate(base),b=api.simulate(base);
 assert.equal(a.delivered,b.delivered);assert.ok(a.delivered<=a.demand);assert.ok(a.serviceLevel<=100);
});
test("disruption reduces throughput and increases lead time",()=>{
 const x=api.compare({...base,capacityFactor:.25,delayDays:6,costMultiplier:1.5});
 assert.ok(x.scenario.bottleneck<x.baseline.bottleneck);
 assert.ok(x.scenario.leadDays>x.baseline.leadDays);
 assert.ok(x.scenario.delivered<=x.baseline.delivered);
});
test("invalid scenario values are rejected",()=>{
 assert.throws(()=>api.simulate({...base,demandPerDay:0}));
 assert.throws(()=>api.simulate({...base,horizonDays:500}));
 assert.throws(()=>api.simulate({...base,disruptionEdgeId:"UNKNOWN"}));
});
test("scenario settings persist",()=>{
 api.setScenario({...base,capacityFactor:.4});
 assert.equal(api.snapshot().scenario.capacityFactor,.4);
});
