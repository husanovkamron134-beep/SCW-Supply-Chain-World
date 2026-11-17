/* SCW Phase 13 — Bullwhip effekti: 4 bosqichli ta’minot zanjiri simulyatori (Beer Distribution Game).
   Mexanika Forrester (1961, Industrial Dynamics) va Sterman (1989, Management Science 35(3)) ishlariga
   asoslangan. Boshlang‘ich g‘oya va parametrlar: jncohen/supply-chain-simulation (CC0 1.0, public domain);
   kod SCW uchun qayta yozilgan.
   Rejimlar: yakka (1 rol — o‘yinchi, qolganlari avtomatik), guruh (4 rol — 4 o‘quvchi) va avtomatik.
   Sinf uchun: 20 ta tayyor ssenariy, natija kodi (resultCode) va o‘qituvchi hisoboti (classReport). */
(function(){
"use strict";
const HOLD_COST=0.5,BACK_COST=1,BASE_DEMAND=4,START_INVENTORY=12,START_PIPE=4;
const ROLES=["Chakana sotuvchi","Ulgurji sotuvchi","Distribyutor","Zavod"];
const SUPPLIER=["Ulgurji sotuvchi","Distribyutor","Zavod","ishlab chiqarish liniyasi"];
const CUSTOMER=["xaridorlar","Chakana sotuvchi","Ulgurji sotuvchi","Distribyutor"];
const MAX_ORDER=1000,MAX_SEED=40,MAX_NAME=30,CODE_TAG="SCW1";
const FORECAST_SMOOTHING=0.3,STOCK_ADJUST=0.3,SUPPLY_LINE_ADJUST=0.15;
/* 20 ta ssenariy: talab o‘zgarishi (raund, yangi daraja) juftlari o‘zaro farq qiladi — har bir o‘quvchiga alohida ssenariy berish mumkin. */
const PRESET_SEEDS=["ssenariy-1","ssenariy-2","ssenariy-3","ssenariy-4","ssenariy-5","ssenariy-7","ssenariy-8","ssenariy-9","ssenariy-10","ssenariy-11","ssenariy-13","ssenariy-14","ssenariy-15","ssenariy-16","ssenariy-19","ssenariy-21","ssenariy-22","ssenariy-23","ssenariy-24","ssenariy-26"];

function hashString(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rngFromSeed(seed){let a=hashString(String(seed));return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function makeDemand(seed){
 const rng=rngFromSeed(seed),shockRound=4+Math.floor(rng()*4),step=2+Math.floor(rng()*8);
 return {baseline:BASE_DEMAND,shockRound,step,newLevel:BASE_DEMAND+step,at:round=>round<shockRound?BASE_DEMAND:BASE_DEMAND+step};
}
const presets=PRESET_SEEDS.map((seed,i)=>{const d=makeDemand(seed);return {id:i+1,seed,label:"Ssenariy "+(i+1),shockRound:d.shockRound,newLevel:d.newLevel}});
function cleanSeed(v){return String(v).replace(/[~\s]+/g,"-").slice(0,MAX_SEED)}
function cleanName(v){const s=String(v===undefined||v===null?"":v).replace(/[~\r\n\t]+/g," ").replace(/\s+/g," ").trim().slice(0,MAX_NAME);return s||"Nomsiz"}
function makeRole(index){return {index,name:ROLES[index],inventory:START_INVENTORY,backlog:0,shipIn:[START_PIPE,START_PIPE],orderIn:[START_PIPE,START_PIPE],incoming:null,shipped:null,orders:[],inventoryHistory:[],backlogHistory:[],cost:0}}

/* Rejim: humanRoles bo‘sh — avtomatik; bitta rol — yakka; [0,1,2,3] — guruh. (playerRole eski usul: bitta rol yoki -1.) */
function resolveHumans(o){
 if(Array.isArray(o.humanRoles)){
  const h=o.humanRoles.map(Number).sort((a,b)=>a-b);
  if(h.some(x=>!Number.isInteger(x)||x<0||x>3)||new Set(h).size!==h.length)throw Error("Rollar 0–3 oralig‘ida bo‘lishi kerak.");
  if(h.length>1&&h.length<4)throw Error("Guruh rejimida 4 ta rol ham o‘yinchilarga berilishi kerak.");
  return h;
 }
 const pr=o.playerRole===undefined||o.playerRole===null?0:Number(o.playerRole);
 if(!Number.isInteger(pr)||pr<-1||pr>3)throw Error("Rol 0–3 oralig‘ida bo‘lishi kerak (-1 — kuzatuvchi).");
 return pr<0?[]:[pr];
}
function newGame(options){
 const o=options||{};
 const rounds=Number(o.rounds===undefined?16:o.rounds);
 if(!Number.isInteger(rounds)||rounds<8||rounds>30)throw Error("Raundlar soni 8–30 oralig‘ida butun son bo‘lishi kerak.");
 const humans=resolveHumans(o);
 const raw=o.seed===undefined||o.seed===null||String(o.seed).trim()===""?Date.now():o.seed;
 const seed=cleanSeed(String(raw).trim());
 const game={seed,rounds,humans,mode:humans.length===4?"team":humans.length===1?"solo":"auto",playerRole:humans.length===1?humans[0]:-1,round:0,finished:false,demand:makeDemand(seed),roles:[0,1,2,3].map(makeRole),demandHistory:[],forecast:[BASE_DEMAND,BASE_DEMAND,BASE_DEMAND,BASE_DEMAND]};
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
 if(value===""||value===null||value===undefined||typeof value==="boolean"||!Number.isFinite(q)||!Number.isInteger(q)||q<0||q>MAX_ORDER)throw Error("Buyurtma 0–"+MAX_ORDER+" oralig‘ida butun son bo‘lishi kerak.");
 return q;
}
/* Bitta raundni yakunlaydi.
   input: yakka rejimda son (yoki null — avtomatik); guruh rejimida {rol: miqdor} (4 rol ham shart). */
function play(game,input){
 if(game.finished)throw Error("O‘yin yakunlangan.");
 const given={};
 if(typeof input==="number"||typeof input==="string"){
  if(game.humans.length!==1)throw Error("Bu rejimda buyurtma rol bo‘yicha berilishi kerak.");
  given[game.humans[0]]=input;
 }else if(input&&typeof input==="object"){
  Object.keys(input).forEach(k=>{if(game.humans.includes(Number(k)))given[Number(k)]=input[k]});
 }
 const qty=game.roles.map((_,i)=>{
  if(game.humans.includes(i)){
   const v=given[i];
   if(v===undefined||v===null){
    if(game.mode==="team")throw Error("Guruh rejimida barcha rollar buyurtma berishi kerak.");
    return policyOrder(game,i);
   }
   return checkQty(v);
  }
  return policyOrder(game,i);
 });
 qty.forEach((q,i)=>{game.roles[i].orders.push(q);if(i===3)game.roles[3].shipIn.push(q);else game.roles[i+1].orderIn.push(q)});
 if(game.round>=game.rounds)game.finished=true;else beginRound(game);
 return game;
}
function autoPlay(game){
 if(game.mode==="team")throw Error("Guruh rejimini avtomatik o‘ynab bo‘lmaydi.");
 while(!game.finished)play(game,null);
 return game;
}

function stdev(a){if(!a.length)return 0;const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)}
function summary(game){
 const dStd=stdev(game.demandHistory);
 const roles=game.roles.map(r=>{const s=stdev(r.orders);return {name:r.name,orderStdev:s,peakOrder:r.orders.length?Math.max(...r.orders):0,cost:r.cost,amplification:dStd>0?s/dStd:null}});
 return {seed:game.seed,rounds:game.rounds,mode:game.mode,humans:game.humans.slice(),shockRound:game.demand.shockRound,baseline:game.demand.baseline,newLevel:game.demand.newLevel,demandStdev:dStd,roles,totalCost:roles.reduce((a,r)=>a+r.cost,0)};
}
/* Xuddi shu ssenariy bo‘yicha barcha rollar avtomatik o‘ynaganda natija (taqqoslash uchun). */
function benchmark(game){return summary(autoPlay(newGame({rounds:game.rounds,seed:game.seed,humanRoles:[]})))}

/* ---- Natija kodi: o‘quvchi uni o‘qituvchiga yuboradi; o‘qituvchi paneli o‘yinni qayta o‘ynatib, natijani o‘zi hisoblaydi. ---- */
function codeCheck(body){return hashString(body).toString(36)}
function resultCode(game,name){
 if(!game.finished)throw Error("Natija kodi o‘yin tugagach beriladi.");
 if(game.mode==="auto")throw Error("Avtomatik o‘yin uchun natija kodi yo‘q.");
 const orders=game.humans.map(h=>game.roles[h].orders.join(",")).join("/");
 const body=[CODE_TAG,cleanName(name),game.seed,game.rounds,game.mode==="team"?"T":"S",game.humans.join(""),orders].join("~");
 return body+"~"+codeCheck(body);
}
function parseCode(code){
 const parts=String(code).trim().split("~");
 if(parts.length!==8||parts[0]!==CODE_TAG)throw Error("Kod formati noto‘g‘ri.");
 const body=parts.slice(0,7).join("~");
 if(codeCheck(body)!==parts[7])throw Error("Kod buzilgan yoki noto‘g‘ri ko‘chirilgan (nazorat belgisi mos emas).");
 const name=parts[1],seed=parts[2],rounds=Number(parts[3]),mode=parts[4];
 if(!name||name.length>MAX_NAME||!seed||seed.length>MAX_SEED)throw Error("Ism yoki ssenariy kodi noto‘g‘ri.");
 if(!Number.isInteger(rounds)||rounds<8||rounds>30)throw Error("Raundlar soni noto‘g‘ri.");
 let humans;
 if(mode==="S"){if(!/^[0-3]$/.test(parts[5]))throw Error("Rol noto‘g‘ri.");humans=[Number(parts[5])]}
 else if(mode==="T"){if(parts[5]!=="0123")throw Error("Guruh rollari noto‘g‘ri.");humans=[0,1,2,3]}
 else throw Error("Rejim noto‘g‘ri.");
 const lists=parts[6].split("/");
 if(lists.length!==humans.length)throw Error("Buyurtmalar soni rollarga mos emas.");
 const orders=lists.map(l=>{const a=l.split(",");if(a.length!==rounds)throw Error("Buyurtmalar soni raundlarga mos emas.");return a.map(x=>{if(!/^\d{1,4}$/.test(x))throw Error("Buyurtma qiymati noto‘g‘ri.");return checkQty(x)})});
 return {name,seed,rounds,mode,humans,orders};
}
function replay(code){
 const p=parseCode(code),game=newGame({seed:p.seed,rounds:p.rounds,humanRoles:p.humans});
 for(let r=0;r<p.rounds;r++){const input={};p.humans.forEach((h,k)=>{input[h]=p.orders[k][r]});play(game,input)}
 return {name:p.name,mode:game.mode,humans:p.humans,game,summary:summary(game),benchmark:benchmark(game)};
}
/* O‘qituvchi hisoboti: kodlar ro‘yxati → yakka va guruh natijalari avtomatik qoidadan farq bo‘yicha tartiblangan
   (turli ssenariylar ham adolatli taqqoslanadi), o‘rtacha bullwhip kuchayishi va xato qatorlar. */
function classReport(lines){
 const solo=[],team=[],invalid=[],seen=new Set(),sums=[0,0,0,0],counts=[0,0,0,0];
 (lines||[]).forEach((raw,idx)=>{
  const line=String(raw).trim();if(!line)return;
  if(seen.has(line)){invalid.push({line:idx+1,error:"Takror kiritilgan kod."});return}
  seen.add(line);
  try{
   const r=replay(line),s=r.summary,b=r.benchmark;
   s.roles.forEach((x,k)=>{if(x.amplification!==null){sums[k]+=x.amplification;counts[k]+=1}});
   if(r.mode==="solo"){
    const h=r.humans[0],cost=s.roles[h].cost,bench=b.roles[h].cost;
    solo.push({line:idx+1,name:r.name,seed:s.seed,role:ROLES[h],roleIndex:h,cost,benchCost:bench,delta:cost-bench,amplification:s.roles[h].amplification,chainCost:s.totalCost});
   }else{
    team.push({line:idx+1,name:r.name,seed:s.seed,cost:s.totalCost,benchCost:b.totalCost,delta:s.totalCost-b.totalCost,amplification:s.roles[3].amplification});
   }
  }catch(e){invalid.push({line:idx+1,error:e.message})}
 });
 const byDelta=(a,b)=>a.delta-b.delta;
 solo.sort(byDelta);team.sort(byDelta);
 solo.forEach((x,i)=>{x.rank=i+1});team.forEach((x,i)=>{x.rank=i+1});
 return {solo,team,invalid,total:solo.length+team.length,averageAmplification:sums.map((s,k)=>counts[k]?s/counts[k]:null)};
}

window.SCWBullwhip={newGame,play,autoPlay,summary,benchmark,policyOrder,resultCode,replay,classReport,presets,constants:{HOLD_COST,BACK_COST,ROLES:ROLES.slice(),SUPPLIER:SUPPLIER.slice(),CUSTOMER:CUSTOMER.slice(),MAX_ORDER,MAX_NAME,MAX_SEED}};
})();
