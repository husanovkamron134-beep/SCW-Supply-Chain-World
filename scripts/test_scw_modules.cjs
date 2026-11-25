const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const memory = new Map();
const localStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); }
};
const sandbox = { localStorage, console, Date, setTimeout, clearTimeout };
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
const root = process.cwd();

const files = [
  "src/core/shared_core.js",
  "src/domain.js",
  "src/operations.js",
  "src/warehouse_sim.js",
  "src/adapters/inventory_adapter.js",
  "src/adapters/wms_adapter.js",
  "src/adapters/operations_adapter.js",
  "src/modules/inbound/inbound.js",
  "src/modules/quality_control/quality_control.js",
  "src/modules/reserve_storage/reserve_storage.js",
  "src/modules/high_bay_asrs/high_bay_asrs.js",
  "src/modules/picking/picking.js",
  "src/modules/replenishment/replenishment.js",
  "src/modules/sorting/sorting.js",
  "src/modules/packing/packing.js",
  "src/modules/outbound_staging/outbound_staging.js",
  "src/modules/dispatch/dispatch.js",
  "src/modules/returns/returns.js",
  "src/modules/control_center/control_center.js",
  "src/core/module_bootstrap.js"
];

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(source, context, { filename: file });
}

(async () => {
  const started = await context.SCWBootstrap.startAll();
  assert.equal(started.started.length, 15, "three adapters + twelve modules start");

  const po = context.SCWOperationsAdapter.createPurchaseOrder({
    supplierId: "SUP-001", sku: "SCW-001", qty: 10, unitCost: 1, currency: "USD"
  });
  context.SCWInbound.receive({
    id: po.id, qty: 10, lot: "LOT-TEST-01", location: "RCV-01"
  });

  const inspection = context.SCWQualityControl.inspectInbound({
    purchaseOrderId: po.id, receiptIndex: 0, qty: 10, decision: "ACCEPTED"
  });
  assert.equal(inspection.decision, "ACCEPTED");

  const reserveTask = context.SCWReserveStorage.snapshot().tasks.find(x => x.status === "OPEN");
  assert.ok(reserveTask, "accepted inbound stock creates a reserve putaway task");
  context.SCWReserveStorage.complete(reserveTask.id);

  const asrsPutaway = context.SCWHBASRS.createPutaway({
    sku: "SCW-001", lot: "LOT-TEST-01", from: reserveTask.to, qty: 10
  });
  asrsPutaway.forEach(task => context.SCWHBASRS.complete(task.id));

  const replenishment = context.SCWReplenishment.request({
    sku: "SCW-001", lot: "LOT-TEST-01", qty: 8
  });
  assert.equal(replenishment.waiting.length, 1, "high-bay stock creates a linked AS/RS retrieval");
  replenishment.waiting[0].asrsTaskIds.forEach(id => context.SCWHBASRS.complete(id));
  context.SCWReplenishment.refresh();

  const order = context.SCWOperationsAdapter.createSalesOrder({
    sku: "SCW-001", qty: 8, customer: "SCW Test Customer"
  });
  const pickTask = context.SCWPicking.snapshot().tasks.find(x => x.orderId === order.id);
  assert.ok(pickTask, "sales order creates a picking task from PICK-01");
  context.SCWPicking.complete(pickTask.id);

  const sortTask = context.SCWSorting.snapshot().tasks.find(x => x.orderId === order.id);
  assert.ok(sortTask, "picked order creates a sorting task");
  context.SCWSorting.complete(sortTask.id);

  const packTask = context.SCWPacking.snapshot().tasks.find(x => x.orderId === order.id);
  assert.ok(packTask, "sorted order creates a packing task");
  context.SCWPacking.complete(packTask.id, { packageType: "Test carton", reference: "PK-TEST-01" });

  const stagingTask = context.SCWOutboundStaging.snapshot().tasks.find(x => x.orderId === order.id);
  assert.ok(stagingTask, "packed order creates an outbound staging task");
  context.SCWOutboundStaging.complete(stagingTask.id);

  const dispatchTask = context.SCWDispatch.snapshot().tasks.find(x => x.orderId === order.id);
  assert.ok(dispatchTask, "staged order creates a dispatch task");
  const shipped = context.SCWDispatch.complete(dispatchTask.id, {
    carrier: "SCW Test Carrier", reference: "TRACK-TEST-01"
  });
  assert.equal(shipped.order.status, "DISPATCHED");

  const returned = context.SCWReturns.receive({
    orderId: order.id, qty: 2, lot: "LOT-TEST-01", reason: "Automated integration test"
  });
  const returnQC = context.SCWQualityControl.inspectReturn({
    returnId: returned.id, sku: returned.sku, lot: returned.lot,
    qty: 2, decision: "ACCEPTED", inspector: "CI"
  });
  assert.equal(returnQC.decision, "ACCEPTED");
  assert.equal(context.SCWReturns.get(returned.id).status, "QC_COMPLETE");

  const dashboard = context.SCWControlCenter.snapshot();
  assert.equal(dashboard.orders.metrics.dispatched, 1);
  assert.equal(dashboard.returns.metrics.completed, 1);
  assert.equal(dashboard.core.runningModules, 15);

  const stopped = await context.SCWBootstrap.stopAll();
  assert.equal(stopped.core.runningModules, 0);
  process.stdout.write("PASS: full SCW module workflow (Inbound → QC → Reserve → AS/RS → Replenishment → Picking → Sorting → Packing → Staging → Dispatch → Returns → Control Center)\\n");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
