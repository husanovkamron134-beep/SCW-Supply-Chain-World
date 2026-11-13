/* SCW Phase 3 — procurement and order fulfilment workflows. */
(function(){
"use strict";
const KEY="scw-phase3-operations-v1";
const seed={
 suppliers:[
  {id:"SUP-001",name:"Central Packaging",country:"Uzbekistan",leadDays:4},
  {id:"SUP-002",name:"Textile Raw Materials GmbH",country:"Germany",leadDays:12},
  {id:"SUP-003",name:"Electro Trade",country:"Uzbekistan",leadDays:6}
 ],
 purchaseOrders:[],
 salesOrders:[],
 sequence:1
};
const clone=x=>JSON.parse(JSON.stringify(x));
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Array.isArray(x.suppliers)&&Array.isArray(x.purchaseOrders)&&Array.isArray(x.salesOrders))return x}catch(e){}localStorage.setItem(KEY,JSON.stringify(seed));return clone(seed)}
let state=load();
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function id(prefix){return prefix+"-"+String(state.sequence++).padStart(5,"0")}
function requireText(v,label){if(!String(v||"").trim())throw Error(label+" kiritilishi shart.");return String(v).trim()}
function positive(v){const n=Number(v);if(!Number.isInteger(n)||n<=0)throw Error("Miqdor musbat butun son bo'lishi kerak.");return n}
function supplier(id){const s=state.suppliers.find(x=>x.id===id);if(!s)throw Error("Yetkazib beruvchi topilmadi.");return s}
function product(sku){const p=SCWDomain.snapshot().products.find(x=>x.sku===sku);if(!p)throw Error("SKU topilmadi: "+sku);return p}
function createPurchaseOrder(input){
 const s=supplier(input.supplierId),sku=requireText(input.sku,"SKU"),p=product(sku),qty=positive(input.qty),unitCost=Number(input.unitCost);
 if(!Number.isFinite(unitCost)||unitCost<0)throw Error("Birlik narxi 0 yoki undan katta bo'lishi kerak.");
 const po={id:id("PO"),supplierId:s.id,supplier:s.name,sku:p.sku,product:p.name,qty,received:0,unit:p.unit,unitCost,currency:input.currency||"USD",expectedDate:input.expectedDate||"",status:"OPEN",createdAt:new Date().toISOString(),receipts:[]};
 state.purchaseOrders.unshift(po);save();return clone(po)
}
function receivePurchaseOrder(input){
 const po=state.purchaseOrders.find(x=>x.id===input.id);if(!po)throw Error("Xarid buyurtmasi topilmadi.");
 if(po.status==="CLOSED"||po.status==="CANCELLED")throw Error("Bu xarid buyurtmasi yopilgan.");
 const qty=positive(input.qty),lot=requireText(input.lot,"LOT"),location=input.location||"RCV-01";
 if(qty>po.qty-po.received)throw Error("Qabul miqdori buyurtmada qolgan miqdordan oshib ketdi.");
 const discrepancy=String(input.discrepancy||"").trim();
 SCWDomain.record({type:"RECEIPT",sku:po.sku,qty,lot,to:location,reference:po.id,note:discrepancy?"Qabuldagi farq: "+discrepancy:"PO bo'yicha qabul"});
 po.received+=qty;po.receipts.unshift({qty,lot,location,discrepancy,at:new Date().toISOString()});
 po.status=po.received===po.qty?"RECEIVED":"PARTIAL";save();return clone(po)
}
function cancelPurchaseOrder(idValue){const po=state.purchaseOrders.find(x=>x.id===idValue);if(!po)throw Error("PO topilmadi.");if(po.received>0)throw Error("Qisman qabul qilingan PO bekor qilinmaydi.");po.status="CANCELLED";save();return clone(po)}
function createSalesOrder(input){
 const sku=requireText(input.sku,"SKU"),p=product(sku),qty=positive(input.qty),customer=requireText(input.customer,"Mijoz");
 const order={id:id("SO"),customer,sku:p.sku,product:p.name,qty,unit:p.unit,status:"NEW",createdAt:new Date().toISOString(),pick:null,package:null,dispatch:null};
 state.salesOrders.unshift(order);save();return clone(order)
}
function pickOrder(input){
 const o=state.salesOrders.find(x=>x.id===input.id);if(!o)throw Error("Mijoz buyurtmasi topilmadi.");if(o.status!=="NEW")throw Error("Picking faqat yangi buyurtmaga bajariladi.");
 const location=requireText(input.location,"Manba lokatsiyasi"),lot=requireText(input.lot,"LOT");
 const b=SCWDomain.snapshot().balances.find(x=>x.sku===o.sku&&x.location===location&&x.lot===lot);
 if(!b||b.qty<o.qty)throw Error("Tanlangan lokatsiya va LOTda buyurtmani yig'ish uchun zaxira yetarli emas.");
 o.pick={location,lot,qty:o.qty,at:new Date().toISOString()};o.status="PICKED";save();return clone(o)
}
function packOrder(input){
 const o=state.salesOrders.find(x=>x.id===input.id);if(!o)throw Error("Buyurtma topilmadi.");if(o.status!=="PICKED")throw Error("Qadoqlashdan oldin picking bajarilishi kerak.");
 o.package={packageType:requireText(input.packageType||"Standart quti","Qadoq turi"),trackingRef:String(input.reference||"").trim(),at:new Date().toISOString()};o.status="PACKED";save();return clone(o)
}
function dispatchOrder(input){
 const o=state.salesOrders.find(x=>x.id===input.id);if(!o)throw Error("Buyurtma topilmadi.");if(o.status!=="PACKED")throw Error("Jo'natishdan oldin qadoqlash bajarilishi kerak.");
 const ref=String(input.reference||o.id).trim();
 SCWDomain.record({type:"ISSUE",sku:o.sku,qty:o.qty,lot:o.pick.lot,from:o.pick.location,reference:ref,note:"Mijozga jo'natildi: "+o.customer});
 o.dispatch={carrier:requireText(input.carrier||"O'quv transporti","Tashuvchi"),trackingRef:ref,at:new Date().toISOString()};o.status="DISPATCHED";save();return clone(o)
}
function snapshot(){return clone(state)}
function reset(){state=clone(seed);save();return snapshot()}
window.SCWOperations={snapshot,createPurchaseOrder,receivePurchaseOrder,cancelPurchaseOrder,createSalesOrder,pickOrder,packOrder,dispatchOrder,reset}
})();