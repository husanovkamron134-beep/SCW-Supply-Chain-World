/* SCW Phase 13 — Bullwhip effekti: 4 bosqichli ta’minot zanjiri simulyatori (Beer Distribution Game).
   Mexanika Forrester (1961, Industrial Dynamics) va Sterman (1989, Management Science 35(3)) ishlariga
   asoslangan. Boshlang‘ich g‘oya va parametrlar: jncohen/supply-chain-simulation (CC0 1.0, public domain);
   kod SCW uchun qayta yozilgan. */
(function(){
"use strict";
const HOLD_COST=0.5,BACK_COST=1,BASE_DEMAND=4,START_INVENTORY=12,START_PIPE=4;
const ROLES=["Chakana sotuvchi","Ulgurji sotuvchi","Distribyutor","Zavod"];
const SUPPLIER=["Ulgurji sotuvchi","Distribyutor","Zavod","ishlab chiqarish liniyasi"];
const CUSTOMER=["xaridorlar","Chakana sotuvchi","Ulgurji sotuvchi","Distribyutor"];
const MAX_ORDER=1000;
const FORECAST_SMOOTHING=0.3,STOCK_ADJUST=0.3,SUPPLY_LINE_ADJUST=0.15;

function hashString(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rngFromSeed(seed){let a=hashString(String(seed));return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function makeDemand(seed){
 const rng=rngFromSeed(seed),shockRound=4+Math.floor(rng()*4),step=2+Math.floor(rng()*8);
 return {baseline:BASE_DEMAND,shockRound,step,newLevel:BASE_DEMAND+step,at:round=>round<shockRound?BASE_DEMAND:BASE_DEMAND+step};
}
function makeRole(index){return {index,name:ROLES[index],inventory:START_INVENTORY,backlog:0,shipIn:[START_PIPE,START_PIPE],orderIn:[START_PIPE,START_PIPE],incoming:null,shipped:null,orders:[],inventoryHistory:[],backlogHistory:[],cost:0}}

function newGame(options){
 const o=options||{};
 const rounds=Number(o.rounds===undefined?16:o.rounds);
 if(!Number.isInteger(rounds)||rounds<8||rounds>30)throw Error("Raundlar soni 8–30 oralig‘ida butun son bo‘lishi kerak.");
 const playerRole=o.playerRole===undefined||o.playerRole===null?0:Number(o.playerRole);
 if(!Number.isInteger(playerRole)||playerRole<-1||playerRole>3)throw Error("Rol 0–3 oralig‘ida bo‘lishi kerak (-1 — kuzatuvchi).");
 const seed=String(o.seed===undefined||o.seed===null||String(o.seed).trim()===""?Date.now():o.seed).trim();
 const game={seed,rounds,playerRole,round:0,finished:false,demand:makeDemand(seed),roles:[0,1,2,3].map(makeRole),demandHistory:[],forecast:[BASE_DEMAND,BASE_DEMAND,BASE_DEMAND,BASE_DEMAND]};
 beginRound(game);
 return game;
}

function beginRound(game){
 game.round+=1;
 const demand=game.demand.at(game.round);
 game.demandHistory.push(demand);
 const shipped=[];
 game.roles.forEach((r,i)=>{
  r.inventory+=r.shipIn.shift();
  r.incoming=i===0?demand:r.orderIn.shift();
  const need=r.incoming+r.backlog,ship=Math.min(r.inventory,need);
  r.backlog=need-ship;r.inventory-=ship;r.shipped=ship;shipped[i]=ship;
  r.cost+=r.inventory*HOLD_COST+r.backlog*BACK_COST;
  r.inventoryHistory.push(r.inventory);r.backlogHistory.push(r.backlog);
  game.forecast[i]+=FORECAST_SMOOTHING*(r.incoming-game.forecast[i]);
 });
 for(let i=1;i<4;i++)game.roles[i-1].shipIn.push(shipped[i]);
}

function supplyLine(game,i){
 const r=game.roles[i],inShipping=r.shipIn.reduce((a,b)=>a+b,0);
 const inOrders=i<3?game.roles[i+1].orderIn.reduce((a,b)=>a+b,0):0;
 return inShipping+inOrders;
}
/* Avtomatik qaror qoidasi: prognoz + zaxira tuzatishi + yo‘ldagi yuk tuzatishi (Sterman anchor-and-adjust).
   Yo‘ldagi yukni qisman hisobga olish zanjir bo‘ylab tebranishni kuchaytiradi — bu bullwhip effektining sababi. */
function policyOrder(game,i){
 const r=game.roles[i],f=game.forecast[i],net=r.inventory-r.backlog;
 const wantedPipe=f*4,line=supplyLine(game,i);
 const q=f+STOCK_ADJUST*(START_INVENTORY-net)+SUPPLY_LINE_ADJUST*(wantedPipe-line);
 return Math.max(0,Math.min(MAX_ORDER,Math.round(q)));
}
function checkQty(value){
 const q=Number(value);
 if(value===""||value===null||value===undefined||!Number.isFinite(q)||!Number.isInteger(q)||q<0||q>MAX_ORDER)throw Error("Buyurtma 0–"+MAX_ORDER+" oralig‘ida butun son bo‘lishi kerak.");
 return q;
}
/* Bitta raundni yakunlaydi: o‘yinchi roli buyurtmasi (yoki avtomatik), qolgan rollar qoida bo‘yicha. */
function play(game,playerQty){
 if(game.finished)throw Error("O‘yin yakunlangan.");
 const manual=game.playerRole>=0&&playerQty!==null&&playerQty!==undefined;
 const qty=game.roles.map((_,i)=>i===game.playerRole&&manual?checkQty(playerQty):policyOrder(game,i));
 qty.forEach((q,i)=>{game.roles[i].orders.push(q);if(i===3)game.roles[3].shipIn.push(q);else game.roles[i+1].orderIn.push(q)});
 if(game.round>=game.rounds)game.finished=true;else beginRound(game);
 return game;
}
function autoPlay(game){while(!game.finished)play(game,null);return game}

function stdev(a){if(!a.length)return 0;const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)}
function summary(game){
 const dStd=stdev(game.demandHistory);
 const roles=game.roles.map(r=>{const s=stdev(r.orders);return {name:r.name,orderStdev:s,peakOrder:r.orders.length?Math.max(...r.orders):0,cost:r.cost,amplification:dStd>0?s/dStd:null}});
 return {seed:game.seed,rounds:game.rounds,shockRound:game.demand.shockRound,baseline:game.demand.baseline,newLevel:game.demand.newLevel,demandStdev:dStd,roles,totalCost:roles.reduce((a,r)=>a+r.cost,0)};
}
/* Xuddi shu ssenariy bo‘yicha barcha rollar avtomatik o‘ynaganda natija (taqqoslash uchun). */
function benchmark(game){return summary(autoPlay(newGame({rounds:game.rounds,seed:game.seed,playerRole:-1})))}

window.SCWBullwhip={newGame,play,autoPlay,summary,benchmark,policyOrder,constants:{HOLD_COST,BACK_COST,ROLES:ROLES.slice(),SUPPLIER:SUPPLIER.slice(),CUSTOMER:CUSTOMER.slice(),MAX_ORDER}};
})();
