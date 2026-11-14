const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const context={window:{},console,Date,Math,JSON};
vm.runInNewContext(fs.readFileSync("src/bullwhip.js","utf8"),context);
const api=context.window.SCWBullwhip;
const sum=a=>a.reduce((x,y)=>x+y,0);

test("same seed gives the same scenario and results",()=>{
 const a=api.autoPlay(api.newGame({seed:"guruh-1",rounds:16,playerRole:-1})),b=api.autoPlay(api.newGame({seed:"guruh-1",rounds:16,playerRole:-1}));
 assert.deepEqual(a.demandHistory,b.demandHistory);
 assert.equal(api.summary(a).totalCost,api.summary(b).totalCost);
});
test("demand is steady, then steps up once",()=>{
 const g=api.autoPlay(api.newGame({seed:"x",rounds:20,playerRole:-1})),d=g.demandHistory;
 assert.equal(d.length,20);
 assert.ok(g.demand.shockRound>=4&&g.demand.shockRound<=7);
 assert.ok(d.slice(0,g.demand.shockRound-1).every(v=>v===4));
 assert.ok(d.slice(g.demand.shockRound-1).every(v=>v===g.demand.newLevel));
});
test("bullwhip: order variability grows towards the factory",()=>{
 for(const seed of ["a","b","scenario-1","scenario-7"]){
  const s=api.summary(api.autoPlay(api.newGame({seed,rounds:20,playerRole:-1})));
  const sd=s.roles.map(r=>r.orderStdev);
  assert.ok(sd[0]<sd[1]&&sd[1]<sd[2]&&sd[2]<sd[3],seed+": "+sd.join(","));
 }
});
test("units are conserved and stock is never negative",()=>{
 const g=api.autoPlay(api.newGame({seed:"cons",rounds:25,playerRole:-1}));
 for(const r of g.roles){assert.ok(r.inventoryHistory.every(v=>v>=0));assert.ok(r.backlogHistory.every(v=>v>=0));assert.ok(r.orders.every(v=>Number.isInteger(v)&&v>=0))}
 const c=api.summary(g);
 assert.ok(Math.abs(c.totalCost-sum(g.roles.map(r=>r.cost)))<1e-9);
});
test("player order is used for the chosen role only",()=>{
 const g=api.newGame({seed:"p",rounds:8,playerRole:2});
 api.play(g,37);
 assert.equal(g.roles[2].orders[0],37);
 assert.notEqual(g.roles[0].orders[0],37);
 assert.equal(g.round,2);
});
test("invalid orders are rejected without advancing the game",()=>{
 const g=api.newGame({seed:"v",rounds:8,playerRole:0});
 for(const bad of ["",-1,2.5,"abc",5000,NaN])assert.throws(()=>api.play(g,bad));
 assert.equal(g.round,1);assert.equal(g.roles[0].orders.length,0);
});
test("game finishes after the last round and rejects more moves",()=>{
 const g=api.newGame({seed:"f",rounds:8,playerRole:0});
 for(let i=0;i<8;i++)api.play(g,4);
 assert.equal(g.finished,true);assert.equal(g.round,8);
 assert.throws(()=>api.play(g,4));
});
test("setup validation and benchmark",()=>{
 assert.throws(()=>api.newGame({rounds:7}));assert.throws(()=>api.newGame({rounds:31}));assert.throws(()=>api.newGame({playerRole:4}));
 const g=api.newGame({seed:"bm",rounds:12,playerRole:0});api.autoPlay(g);
 const b=api.benchmark(g);
 assert.equal(b.seed,"bm");assert.equal(b.rounds,12);assert.ok(b.totalCost>0);
});
