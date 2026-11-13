/* SCW Phase 7 — supply-chain network and deterministic digital-twin scenarios. */
(function(){
"use strict";
const KEY="scw-phase7-network-v1";
const nodes=[
 {id:"SUP-A",name:"Mahalliy xomashyo",type:"supplier",x:70,y:95,capacity:58},
 {id:"SUP-B",name:"Xorijiy yetkazuvchi",type:"supplier",x:70,y:245,capacity:46},
 {id:"FACT",name:"Ishlab chiqarish",type:"factory",x:285,y:170,capacity:52},
 {id:"HUB",name:"Markaziy ombor",type:"warehouse",x:500,y:170,capacity:48},
 {id:"DC-E",name:"Sharqiy taqsimot",type:"dc",x:710,y:90,capacity:32},
 {id:"DC-W",name:"G‘arbiy taqsimot",type:"dc",x:710,y:250,capacity:30},
 {id:"CUS-E",name:"Sharqiy mijozlar",type:"customer",x:925,y:90,capacity:40},
 {id:"CUS-W",name:"G‘arbiy mijozlar",type:"customer",x:925,y:250,capacity:38}
];
const edges=[
 {id:"E-01",from:"SUP-A",to:"FACT",name:"Mahalliy ta’minot",capacity:42,leadDays:3,cost:8200,reliability:.97},
 {id:"E-02",from:"SUP-B",to:"FACT",name:"Import ta’minoti",capacity:30,leadDays:9,cost:14500,reliability:.91},
 {id:"E-03",from:"FACT",to:"HUB",name:"Ishlab chiqarish oqimi",capacity:48,leadDays:2,cost:5600,reliability:.98},
 {id:"E-04",from:"HUB",to:"DC-E",name:"Sharqiy magistral",capacity:27,leadDays:2,cost:4100,reliability:.96},
 {id:"E-05",from:"HUB",to:"DC-W",name:"G‘arbiy magistral",capacity:25,leadDays:3,cost:4700,reliability:.94},
 {id:"E-06",from:"DC-E",to:"CUS-E",name:"Sharqiy oxirgi yetkazish",capacity:31,leadDays:1,cost:2900,reliability:.98},
 {id:"E-07",from:"DC-W",to:"CUS-W",name:"G‘arbiy oxirgi yetkazish",capacity:29,leadDays:1,cost:3300,reliability:.97}
];
const seed={scenario:{demandPerDay:40,horizonDays:30,disruptionEdgeId:"E-04",capacityFactor:.5,delayDays:4,costMultiplier:1.25}};
const clone=x=>JSON.parse(JSON.stringify(x));
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&x.scenario)return x}catch(e){}localStorage.setItem(KEY,JSON.stringify(seed));return clone(seed)}
let state=load();
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function snapshot(){return {nodes:clone(nodes),edges:clone(edges),scenario:clone(state.scenario)}}
function validate(input){
 const demandPerDay=Number(input.demandPerDay),horizonDays=Number(input.horizonDays),capacityFactor=Number(input.capacityFactor),delayDays=Number(input.delayDays),costMultiplier=Number(input.costMultiplier);
 if(!Number.isFinite(demandPerDay)||demandPerDay<=0)throw Error("Kunlik talab musbat son bo‘lishi kerak.");
 if(!Number.isInteger(horizonDays)||horizonDays<1||horizonDays>365)throw Error("Davr 1–365 kun oralig‘ida bo‘lishi kerak.");
 if(!Number.isFinite(capacityFactor)||capacityFactor<.05||capacityFactor>1)throw Error("Quvvat koeffitsiyenti 0.05–1 oralig‘ida bo‘lishi kerak.");
 if(!Number.isFinite(delayDays)||delayDays<0||delayDays>90)throw Error("Kechikish 0–90 kun oralig‘ida bo‘lishi kerak.");
 if(!Number.isFinite(costMultiplier)||costMultiplier<1||costMultiplier>5)throw Error("Xarajat koeffitsiyenti 1–5 oralig‘ida bo‘lishi kerak.");
 const edge=edges.find(x=>x.id===input.disruptionEdgeId);if(!edge)throw Error("Uzilish uchun yo‘nalish tanlanmagan.");
 return {demandPerDay,horizonDays,capacityFactor,delayDays,costMultiplier,disruptionEdgeId:edge.id};
}
function simulate(input){
 const p=validate(input),changed=edges.map(e=>e.id===p.disruptionEdgeId?{...e,capacity:e.capacity*p.capacityFactor,leadDays:e.leadDays+p.delayDays,cost:e.cost*p.costMultiplier}:e);
 const maxNode= Math.min(...nodes.filter(n=>n.type!=="supplier"&&n.type!=="customer").map(n=>n.capacity));
 const bottleneck=Math.min(maxNode,...changed.map(e=>e.capacity));
 const demand=p.demandPerDay*p.horizonDays;
 const effectiveDays=Math.max(0,p.horizonDays-Math.min(p.horizonDays,changed.reduce((n,e)=>n+e.leadDays,0)));
 const capacityAvailable=bottleneck*effectiveDays;
 const delivered=Math.min(demand,capacityAvailable);
 const lost=Math.max(0,demand-delivered);
 const leadDays=changed.reduce((n,e)=>n+e.leadDays,0);
 const unitCost=changed.reduce((n,e)=>n+e.cost,0);
 const cost=delivered*unitCost;
 const reliability=changed.reduce((n,e)=>n*e.reliability,1);
 return {demand,delivered,lost,serviceLevel:demand?delivered/demand*100:0,bottleneck,leadDays,unitCost,cost,reliability:reliability*100,changedEdge:p.disruptionEdgeId,capacityFactor:p.capacityFactor,delayDays:p.delayDays,horizonDays:p.horizonDays,demandPerDay:p.demandPerDay};
}
function compare(input){const p=validate(input);const base=simulate({...p,disruptionEdgeId:"E-04",capacityFactor:1,delayDays:0,costMultiplier:1});const scenario=simulate(p);return {baseline:base,scenario,impact:{delivered:scenario.delivered-base.delivered,serviceLevel:scenario.serviceLevel-base.serviceLevel,cost:scenario.cost-base.cost,leadDays:scenario.leadDays-base.leadDays}}}
function setScenario(input){state.scenario=validate(input);save();return clone(state.scenario)}
function reset(){state=clone(seed);save();return snapshot()}
window.SCWNetwork={snapshot,simulate,compare,setScenario,reset};
})();