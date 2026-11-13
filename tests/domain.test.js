const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("src/domain.js", "utf8");
function setup(){
  const store = new Map();
  const sandbox = {localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},Date,Math,JSON,Error,window:{}};
  vm.runInNewContext(source,sandbox);
  return sandbox.window.SCWDomain;
}
test("seed inventory has four SKUs and opening stock",()=>{
  const d=setup();
  assert.equal(d.aggregate().length,4);
  assert.equal(d.aggregate().reduce((n,p)=>n+p.qty,0),1240);
});
test("receipt adds a lot balance and ledger entry",()=>{
  const d=setup();
  d.record({type:"RECEIPT",sku:"SCW-001",qty:25,lot:"BOX-NEW",to:"RCV-01"});
  assert.equal(d.total("SCW-001"),445);
  assert.equal(d.snapshot().ledger[0].type,"RECEIPT");
});
test("issue cannot make stock negative",()=>{
  const d=setup();
  assert.throws(()=>d.record({type:"ISSUE",sku:"SCW-001",qty:999,lot:"BOX-2601",from:"A-01-01"}),/yetarli zaxira/);
  assert.equal(d.total("SCW-001"),420);
});
test("transfer keeps global quantity unchanged",()=>{
  const d=setup();
  d.record({type:"TRANSFER",sku:"SCW-001",qty:40,lot:"BOX-2601",from:"A-01-01",to:"A-01-02"});
  assert.equal(d.total("SCW-001"),420);
  const balances=d.snapshot().balances.filter(b=>b.sku==="SCW-001"&&b.lot==="BOX-2601");
  assert.equal(balances.find(b=>b.location==="A-01-01").qty,380);
  assert.equal(balances.find(b=>b.location==="A-01-02").qty,40);
});
test("invalid SKU and zero quantity are rejected",()=>{
  const d=setup();
  assert.throws(()=>d.record({type:"RECEIPT",sku:"UNKNOWN",qty:1,lot:"X",to:"RCV-01"}),/SKU kodi/);
  assert.throws(()=>d.record({type:"RECEIPT",sku:"SCW-001",qty:0,lot:"X",to:"RCV-01"}),/musbat butun/);
});
