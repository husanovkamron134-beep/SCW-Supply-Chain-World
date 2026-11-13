/* SCW Phase 2 — inventory domain model. Browser-only, auditable stock ledger. */
(function(){
"use strict";
const STORAGE="scw-phase2-state-v1";
const seed={
 products:[
  {sku:"SCW-001",name:"Qadoqlash qutilari",unit:"dona",min:100,lotTracked:true},
  {sku:"SCW-002",name:"Tekstil xomashyosi",unit:"kg",min:120,lotTracked:true},
  {sku:"SCW-003",name:"Elektr jihozlari",unit:"dona",min:80,lotTracked:true},
  {sku:"SCW-004",name:"Tayyor mahsulot",unit:"dona",min:150,lotTracked:true}
 ],
 locations:[
  {code:"RCV-01",name:"Qabul zonasi",type:"receiving",capacity:5000},
  {code:"A-01-01",name:"A qator · 1-rak",type:"storage",capacity:500},
  {code:"A-01-02",name:"A qator · 2-rak",type:"storage",capacity:500},
  {code:"B-01-01",name:"B qator · 1-rak",type:"storage",capacity:500},
  {code:"DSP-01",name:"Jo'natish zonasi",type:"dispatch",capacity:5000}
 ],
 balances:[
  {sku:"SCW-001",location:"A-01-01",lot:"BOX-2601",qty:420},
  {sku:"SCW-002",location:"A-01-02",lot:"TEX-2601",qty:310},
  {sku:"SCW-003",location:"B-01-01",lot:"ELC-2601",qty:185},
  {sku:"SCW-004",location:"B-01-01",lot:"FIN-2601",qty:325}
 ],
 ledger:[]
};
function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){
 try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(saved&&Array.isArray(saved.products)&&Array.isArray(saved.balances)&&Array.isArray(saved.ledger))return saved}catch(e){}
 // One-time migration from Phase 1's aggregate SKU quantities.
 let state=clone(seed);
 try{const old=JSON.parse(localStorage.getItem("scw-stock")||"null");if(Array.isArray(old)){state.balances=[];old.forEach((p,i)=>state.balances.push({sku:p.sku,location:["A-01-01","A-01-02","B-01-01","B-01-01"][i]||"A-01-01",lot:"MIG-"+p.sku,qty:Math.max(0,Number(p.qty)||0)}));}}catch(e){}
 persist(state);return state;
}
let state=load();
function persist(s){localStorage.setItem(STORAGE,JSON.stringify(s))}
function product(sku){return state.products.find(p=>p.sku===sku)}
function balance(sku,loc,lot){return state.balances.find(b=>b.sku===sku&&b.location===loc&&b.lot===lot)}
function total(sku){return state.balances.filter(b=>b.sku===sku).reduce((n,b)=>n+b.qty,0)}
function snapshot(){return clone(state)}
function record(input){
 const {type,sku,qty,lot,from,to,reference="",note=""}=input||{};
 const p=product(sku),n=Number(qty);
 if(!p)throw Error("Mahsulot SKU kodi topilmadi.");
 if(!Number.isInteger(n)||n<=0)throw Error("Miqdor musbat butun son bo'lishi kerak.");
 if(!["RECEIPT","ISSUE","TRANSFER","ADJUSTMENT"].includes(type))throw Error("Harakat turi noto'g'ri.");
 if(!lot||!String(lot).trim())throw Error("Partiya (LOT) raqami kiritilishi shart.");
 const find=(loc)=>balance(sku,loc,lot);
 if(type==="RECEIPT"||type==="ADJUSTMENT"){
  const dest=to||from;if(!state.locations.some(l=>l.code===dest))throw Error("Qabul lokatsiyasi topilmadi.");
  let b=find(dest);if(!b){b={sku,location:dest,lot:String(lot).trim(),qty:0};state.balances.push(b)}
  const before=b.qty;b.qty+=n;
  state.ledger.unshift({id:"MOV-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),type,sku,product:p.name,qty:n,lot:String(lot).trim(),from:"—",to:dest,before,after:b.qty,reference,note,at:new Date().toISOString()});
 }else if(type==="ISSUE"){
  if(!state.locations.some(l=>l.code===from))throw Error("Chiqim lokatsiyasi topilmadi.");
  const b=find(from);if(!b||b.qty<n)throw Error("Tanlangan lokatsiya va partiyada yetarli zaxira yo'q.");
  const before=b.qty;b.qty-=n;
  state.ledger.unshift({id:"MOV-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),type,sku,product:p.name,qty:n,lot:String(lot).trim(),from,to:"Mijoz / tashqi chiqim",before,after:b.qty,reference,note,at:new Date().toISOString()});
 }else{
  if(from===to)throw Error("Ko'chirish uchun manba va manzil turlicha bo'lishi kerak.");
  if(!state.locations.some(l=>l.code===from)||!state.locations.some(l=>l.code===to))throw Error("Manba yoki manzil lokatsiyasi topilmadi.");
  const src=find(from);if(!src||src.qty<n)throw Error("Manba lokatsiyasida yetarli zaxira yo'q.");
  let dst=find(to);if(!dst){dst={sku,location:to,lot:String(lot).trim(),qty:0};state.balances.push(dst)}
  const before=src.qty;src.qty-=n;const after=dst.qty;dst.qty+=n;
  state.ledger.unshift({id:"MOV-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),type,sku,product:p.name,qty:n,lot:String(lot).trim(),from,to,before,after:dst.qty,reference,note,at:new Date().toISOString()});
 }
 persist(state);return snapshot();
}
function aggregate(){return state.products.map(p=>({...p,qty:total(p.sku),status:total(p.sku)<p.min?"LOW":"OK"}))}
function locationBalances(){return state.locations.map(l=>({...l,used:state.balances.filter(b=>b.location===l.code).reduce((n,b)=>n+b.qty,0)}))}
window.SCWDomain={snapshot,record,aggregate,locationBalances,total,reset(){state=clone(seed);persist(state);return snapshot()}};
})();