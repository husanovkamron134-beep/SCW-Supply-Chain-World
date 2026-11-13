const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const store = new Map();
const context = {window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},Date,Math,JSON,Error};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../src/domain.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(require.resolve('../src/operations.js'),'utf8'),context);
const inv=()=>context.window.SCWDomain, ops=()=>context.window.SCWOperations;
test('purchase order receives partial quantities into shared inventory ledger',()=>{
 const po=ops().createPurchaseOrder({supplierId:'SUP-001',sku:'SCW-001',qty:50,unitCost:2});
 ops().receivePurchaseOrder({id:po.id,qty:20,lot:'TEST-PO',location:'RCV-01'});
 const after=ops().snapshot().purchaseOrders[0];
 assert.equal(after.received,20);assert.equal(after.status,'PARTIAL');
 assert.equal(inv().snapshot().ledger[0].reference,po.id);
});
test('receiving cannot exceed open purchase order balance',()=>{
 const po=ops().createPurchaseOrder({supplierId:'SUP-001',sku:'SCW-001',qty:5,unitCost:1});
 assert.throws(()=>ops().receivePurchaseOrder({id:po.id,qty:6,lot:'OVER'}),/osh/);
});
test('sales order must complete pick, pack, dispatch and deduct stock once',()=>{
 const order=ops().createSalesOrder({customer:'Demo customer',sku:'SCW-001',qty:10});
 ops().pickOrder({id:order.id,location:'A-01-01',lot:'BOX-2601'});
 ops().packOrder({id:order.id,packageType:'Carton'});
 ops().dispatchOrder({id:order.id,carrier:'Demo carrier',reference:'TRK-1'});
 assert.equal(ops().snapshot().salesOrders[0].status,'DISPATCHED');
 assert.equal(inv().snapshot().ledger[0].type,'ISSUE');
 assert.equal(inv().total('SCW-001'),410);
});
test('dispatch cannot skip packing',()=>{
 const order=ops().createSalesOrder({customer:'Demo',sku:'SCW-001',qty:1});
 assert.throws(()=>ops().dispatchOrder({id:order.id,carrier:'X'}),/qadoqlash/);
});
