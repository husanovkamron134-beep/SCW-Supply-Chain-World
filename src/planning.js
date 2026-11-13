/* SCW Phase 6 — demand forecasting and replenishment recommendations. */
(function(){
"use strict";
const KEY="scw-phase6-planning-v1";
const seed={history:[],sequence:1};
const clone=x=>JSON.parse(JSON.stringify(x));
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Array.isArray(x.history))return x}catch(e){}localStorage.setItem(KEY,JSON.stringify(seed));return clone(seed)}
let state=load();function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function catalog(){return SCWDomain.snapshot().products}
function recordDemand(input){
 const sku=String(input.sku||"").trim().toUpperCase(),p=catalog().find(x=>x.sku===sku);
 if(!p)throw Error("SKU topilmadi.");
 const qty=Number(input.qty);if(!Number.isInteger(qty)||qty<0)throw Error("Haftalik talab 0 yoki undan katta butun son bo‘lishi kerak.");
 const date=String(input.weekEnding||"").trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw Error("Hafta sanasini YYYY-MM-DD formatida kiriting.");
 let row=state.history.find(x=>x.sku===sku&&x.weekEnding===date);
 if(row){row.qty=qty;row.updatedAt=new Date().toISOString()}else{row={id:"DEM-"+String(state.sequence++).padStart(5,"0"),sku,product:p.name,qty,weekEnding:date,createdAt:new Date().toISOString()};state.history.push(row)}
 save();return clone(row)
}
function forecastSku(sku){
 const rows=state.history.filter(x=>x.sku===sku).sort((a,b)=>a.weekEnding.localeCompare(b.weekEnding));
 if(!rows.length)return {sku,observations:0,weeklyForecast:0,sma:null,wma:null,ses:null,history:[]};
 const vals=rows.map(x=>x.qty),last=vals.slice(-3),weights=[.2,.3,.5].slice(3-last.length);
 const wma=last.reduce((n,v,i)=>n+v*weights[i],0)/weights.reduce((a,b)=>a+b,0);
 const sma=last.reduce((a,b)=>a+b,0)/last.length;
 const alpha=.35;let ses=vals[0];for(let i=1;i<vals.length;i++)ses=alpha*vals[i]+(1-alpha)*ses;
 return {sku,observations:rows.length,weeklyForecast:Math.max(0,wma),sma:Number(sma.toFixed(2)),wma:Number(wma.toFixed(2)),ses:Number(ses.toFixed(2)),history:clone(rows.slice(-8).reverse())}
}
function recommendations(){
 const inv=SCWDomain.snapshot(),ops=SCWOperations.snapshot(),suppliers=ops.suppliers;
 return inv.products.map(p=>{
  const f=forecastSku(p.sku),supplierBySku={"SCW-001":"SUP-001","SCW-002":"SUP-002","SCW-003":"SUP-003","SCW-004":"SUP-001"};
  const supplier=suppliers.find(s=>s.id===supplierBySku[p.sku])||suppliers[0]||{id:"",name:"Tanlanmagan",leadDays:7};
  const onHand=inv.balances.filter(b=>b.sku===p.sku).reduce((n,b)=>n+b.qty,0);
  const onOrder=ops.purchaseOrders.filter(o=>o.sku===p.sku&&["OPEN","PARTIAL"].includes(o.status)).reduce((n,o)=>n+o.qty-o.received,0);
  const weekly=f.weeklyForecast,safetyStock=Math.ceil(weekly*.2),leadDemand=Math.ceil(weekly*supplier.leadDays/7),reorderPoint=leadDemand+safetyStock,position=onHand+onOrder,target=Math.ceil(weekly*Math.max(2,supplier.leadDays/7+1)),suggestedQty=weekly>0&&position<=reorderPoint?Math.max(0,target-position):0;
  return {sku:p.sku,product:p.name,unit:p.unit,min:p.min,onHand,onOrder,inventoryPosition:position,weeklyForecast:Number(weekly.toFixed(2)),sma:f.sma,wma:f.wma,ses:f.ses,observations:f.observations,safetyStock,leadDays:supplier.leadDays,leadDemand,reorderPoint,targetStock:target,suggestedQty,supplierId:supplier.id,supplier:supplier.name,status:!f.observations?"NO_DATA":suggestedQty>0?"REORDER":"OK"}
 })
}
function snapshot(){return clone(state)}
function reset(){state=clone(seed);save();return snapshot()}
window.SCWPlanning={recordDemand,forecastSku,recommendations,snapshot,reset};
})();