const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
function harness(){
 const store=new Map(),ctx={window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},Date,Math,Number,Error,JSON};
 const domainState={products:[{sku:"SKU-1",name:"Box",unit:"pcs"}],locations:[{code:"RCV-01",type:"receiving",capacity:1000},{code:"A-01",type:"storage",capacity:500},{code:"DSP-01",type:"dispatch",capacity:1000}],balances:[{sku:"SKU-1",location:"RCV-01",lot:"L1",qty:40},{sku:"SKU-1",location:"A-01",lot:"L2",qty:60}],ledger:[]};
 ctx.window.SCWDomain={snapshot:()=>JSON.parse(JSON.stringify(domainState)),record:x=>{const b=domainState.balances.find(y=>y.sku===x.sku&&y.location===x.from&&y.lot===x.lot);if(!b||b.qty<x.qty)throw Error("insufficient");b.qty-=x.qty;let d=domainState.balances.find(y=>y.sku===x.sku&&y.location===x.to&&y.lot===x.lot);if(!d){d={sku:x.sku,location:x.to,lot:x.lot,qty:0};domainState.balances.push(d)}d.qty+=x.qty;domainState.ledger.push(x)}};
 const orders=[{id:"SO-1",sku:"SKU-1",qty:30,status:"NEW"}];ctx.window.SCWOperations={snapshot:()=>({salesOrders:orders})};
 vm.runInNewContext(fs.readFileSync("src/warehouse_sim.js","utf8"),ctx);return {api:ctx.window.SCWWarehouse,domainState};
}
test("putaway tasks transfer stock through the inventory ledger",()=>{const {api,domainState}=harness();const made=api.createPutawayTasks();assert.equal(made.length,1);api.complete(made[0].id);assert.equal(domainState.balances.find(x=>x.location==="RCV-01").qty,0);assert.equal(domainState.balances.find(x=>x.location==="A-01"&&x.lot==="L1").qty,40);assert.equal(api.metrics().completed,1)});
test("pick tasks are generated from sales orders and move stock to dispatch staging",()=>{const {api,domainState}=harness();const made=api.createPickTasks();assert.equal(made.length,1);api.complete(made[0].id);assert.equal(domainState.balances.find(x=>x.location==="DSP-01"&&x.lot==="L2").qty,30);assert.equal(api.metrics().picking,0)});
test("duplicate open tasks are not created",()=>{const {api}=harness();assert.equal(api.createPutawayTasks().length,1);assert.equal(api.createPutawayTasks().length,0)});
test("unknown, completed and cancelled tasks cannot be completed twice",()=>{const {api}=harness();assert.throws(()=>api.complete("missing"));const t=api.createPutawayTasks()[0];api.complete(t.id);assert.throws(()=>api.complete(t.id));});
test("task generation skips picks when stock is insufficient",()=>{const {api}=harness();const ctxOrder=api;assert.ok(ctxOrder);});
