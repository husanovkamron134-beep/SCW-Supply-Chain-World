const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const ctx={window:{},Math,Number,Error};
vm.runInNewContext(fs.readFileSync("src/digital_twin.js","utf8"),ctx);
const api=ctx.window.SCWDigitalTwin;
test("digital twin paths connect the configured network nodes",()=>{
 const s=api.snapshot(),ids=new Set(s.nodeIds);
 assert.equal(s.paths.length,2);
 for(const p of s.paths){assert.ok(p.nodes.length>=4);for(const id of p.nodes)assert.ok(ids.has(id))}
});
test("timeline advances only while playing and respects speed",()=>{
 api.reset();api.setSpeed(2);api.setPlaying(true);api.tick(1);
 assert.equal(api.snapshot().elapsed,2);
 api.setPlaying(false);api.tick(1);assert.equal(api.snapshot().elapsed,2);
});
test("route position is bounded and changes over time",()=>{
 api.reset();api.setPlaying(true);api.tick(3);
 const p=api.position("ROUTE-E");
 assert.ok(p.progress>0&&p.progress<1);assert.ok(p.segment>=0&&p.segment<=3);
});
test("invalid speed and route are rejected",()=>{
 assert.throws(()=>api.setSpeed(8));assert.throws(()=>api.position("BAD"));
});
test("reset returns timeline to start",()=>{
 api.setPlaying(true);api.tick(2);const s=api.reset();
 assert.equal(s.elapsed,0);assert.equal(s.playing,false);
});
