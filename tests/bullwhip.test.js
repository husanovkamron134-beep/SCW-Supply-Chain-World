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

/* ---- Sinf rejimi: 20 ssenariy, guruh rejimi, natija kodi, o‘qituvchi hisoboti ---- */
test("there are 20 presets with pairwise distinct demand shocks",()=>{
 assert.equal(api.presets.length,20);
 assert.equal(new Set(api.presets.map(p=>p.seed)).size,20);
 assert.equal(new Set(api.presets.map(p=>p.shockRound+"/"+p.newLevel)).size,20);
 for(const p of api.presets){const g=api.newGame({seed:p.seed,rounds:8,humanRoles:[]});assert.equal(g.demand.shockRound,p.shockRound);assert.equal(g.demand.newLevel,p.newLevel)}
});
test("team mode needs all four orders and cannot be auto-played",()=>{
 const g=api.newGame({seed:"t",rounds:8,humanRoles:[0,1,2,3]});
 assert.equal(g.mode,"team");
 assert.throws(()=>api.play(g,{0:4,1:4,2:4}));
 assert.throws(()=>api.play(g,5));
 assert.throws(()=>api.autoPlay(g));
 assert.equal(g.round,1);assert.equal(g.roles[0].orders.length,0);
 api.play(g,{0:5,1:6,2:7,3:8});
 assert.deepEqual(Array.from(g.roles.map(r=>r.orders[0])),[5,6,7,8]);
 assert.equal(g.round,2);
});
test("partial human sets are rejected",()=>{
 assert.throws(()=>api.newGame({humanRoles:[0,1]}));
 assert.throws(()=>api.newGame({humanRoles:[0,0]}));
 assert.throws(()=>api.newGame({humanRoles:[5]}));
});
test("solo result code replays to identical results",()=>{
 const g=api.newGame({seed:"ssenariy-3",rounds:12,humanRoles:[2]});
 for(let i=0;i<12;i++)api.play(g,i%3===0?9:5);
 const code=api.resultCode(g,"Ali Valiyev");
 const r=api.replay(code);
 assert.equal(r.name,"Ali Valiyev");assert.equal(r.mode,"solo");
 assert.equal(r.summary.totalCost,api.summary(g).totalCost);
 assert.equal(JSON.stringify(r.game.roles.map(x=>x.orders)),JSON.stringify(g.roles.map(x=>x.orders)));
});
test("a solo game finished with auto-play also replays identically",()=>{
 const g=api.newGame({seed:"zz",rounds:10,humanRoles:[1]});
 api.play(g,7);api.autoPlay(g);
 const r=api.replay(api.resultCode(g,"Auto"));
 assert.equal(r.summary.totalCost,api.summary(g).totalCost);
});
test("team result code replays to identical results",()=>{
 const g=api.newGame({seed:"guruh",rounds:9,humanRoles:[0,1,2,3]});
 for(let i=0;i<9;i++)api.play(g,{0:4+i%2,1:5,2:6,3:7+i%3});
 const r=api.replay(api.resultCode(g,"1-guruh"));
 assert.equal(r.mode,"team");assert.equal(r.summary.totalCost,api.summary(g).totalCost);
});
test("result codes: unfinished game, tampering and malformed input are rejected",()=>{
 const g=api.newGame({seed:"c",rounds:8,humanRoles:[0]});
 assert.throws(()=>api.resultCode(g,"x"));
 for(let i=0;i<8;i++)api.play(g,4);
 const code=api.resultCode(g,"Vali");
 const tampered=code.replace("Vali","Gani");
 assert.throws(()=>api.replay(tampered),/nazorat/);
 const changed=code.split("~");changed[6]=changed[6].replace("4,4","9,4");
 assert.throws(()=>api.replay(changed.join("~")));
 for(const bad of ["","abc","SCW1~a~b","SCW2~a~b~8~S~0~1,1,1,1,1,1,1,1~x"])assert.throws(()=>api.replay(bad));
 assert.throws(()=>api.resultCode(api.autoPlay(api.newGame({rounds:8,humanRoles:[]})),"x"));
});
test("names and seeds cannot break the code format",()=>{
 const g=api.newGame({seed:"a~b c",rounds:8,humanRoles:[0]});
 for(let i=0;i<8;i++)api.play(g,4);
 const code=api.resultCode(g,"Ali~Vali\nQodirov "+"x".repeat(60));
 assert.equal(code.split("~").length,8);
 const r=api.replay(code);
 assert.ok(r.name.length<=30);assert.equal(r.summary.totalCost,api.summary(g).totalCost);
});
test("class report ranks by difference from the automatic policy, flags bad and duplicate lines",()=>{
 const P=api.presets[0];
 const make=(orders,name)=>{const g=api.newGame({seed:P.seed,rounds:12,humanRoles:[0]});orders.forEach(q=>api.play(g,q));return api.resultCode(g,name)};
 const follow=Array.from({length:12},(_,k)=>k>=P.shockRound-1?P.newLevel:4),zero=Array(12).fill(0);
 const a=make(follow,"Talabga ergashdi"),b=make(zero,"Hech narsa buyurtma bermadi");
 const tg=api.newGame({seed:"ssenariy-5",rounds:12,humanRoles:[0,1,2,3]});for(let i=0;i<12;i++)api.play(tg,{0:5,1:5,2:5,3:5});
 const t=api.resultCode(tg,"Guruh A");
 const rep=api.classReport([b,a,"",t,a,"SCW1~xxx"]);
 assert.equal(rep.solo.length,2);assert.equal(rep.team.length,1);assert.equal(rep.invalid.length,2);
 assert.equal(rep.total,3);
 assert.equal(rep.solo[0].name,"Talabga ergashdi");assert.equal(rep.solo[0].rank,1);assert.equal(rep.solo[1].name,"Hech narsa buyurtma bermadi");
 assert.ok(rep.solo[0].delta<rep.solo[1].delta);
 assert.equal(rep.team[0].name,"Guruh A");
 assert.equal(rep.averageAmplification.length,4);
 assert.ok(rep.averageAmplification.every(x=>x===null||x>=0));
});
test("a class of 20 students (one preset each) can be reported",()=>{
 const codes=api.presets.map((p,i)=>{const g=api.newGame({seed:p.seed,rounds:12,humanRoles:[i%4]});for(let k=0;k<12;k++)api.play(g,4+(k>=p.shockRound-1?p.newLevel-4:0));return api.resultCode(g,"O‘quvchi "+(i+1))});
 const rep=api.classReport(codes);
 assert.equal(rep.total,20);assert.equal(rep.invalid.length,0);
 assert.deepEqual(Array.from(rep.solo.map(x=>x.rank)),Array.from({length:20},(_,i)=>i+1));
 for(let i=1;i<rep.solo.length;i++)assert.ok(rep.solo[i-1].delta<=rep.solo[i].delta);
});
