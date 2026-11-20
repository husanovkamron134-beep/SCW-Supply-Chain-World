# SCW Phase 23 — Quality Control foundation

## Scope
- Adds a Core-managed Quality Control module for inbound receipt inspections and returned-goods inspections.
- Supports three decisions: `ACCEPTED`, `QUARANTINED`, and `REJECTED`.
- Tracks partial inspections against a specific purchase-order receipt row; total inspected quantity cannot exceed that receipt quantity.
- Publishes quality lifecycle events and exposes inspection snapshots / eligible inbound receipt balances.
- Listens for Inbound and Returns events when those modules are active; Returns is not a dependency, so QC can be deployed before the Returns module.

## Files
- `src/modules/quality_control/quality_control.js`

## Load order
Load after `src/core/shared_core.js`, the legacy domain / operations scripts, the adapters, and `src/modules/inbound/inbound.js`.

Start after the adapters:
```js
await SCWCore.startModule("QUALITY_CONTROL");
```
Dependencies: `INVENTORY_ADAPTER`, `OPERATIONS_ADAPTER`.

## API and commands
- `SCWQualityControl.snapshot()`
- `SCWQualityControl.inspectInbound({purchaseOrderId, receiptIndex, qty, decision, reason, inspector})`
- `SCWQualityControl.inspectReturn({returnId, sku, lot, qty, decision, reason, inspector})`
- `SCWQualityControl.eligibleInboundReceipts()`
- `SCWCore.execute("quality.snapshot")`
- `SCWCore.execute("quality.inspect.inbound", input)`
- `SCWCore.execute("quality.inspect.return", input)`
- `SCWCore.execute("quality.inbound.eligible")`

Inbound inspection identifies a receipt using its PO ID and zero-based receipt index. LOT and SKU can optionally be supplied for an additional consistency check. Multiple partial inspections are supported; an inspection cannot exceed the uninspected quantity of that receipt.

## Events
- `quality.ready`
- `quality.inbound.available`
- `quality.inspection.started`
- `quality.inspection.completed`
- `quality.accepted`
- `quality.quarantined`
- `quality.rejected`
- `quality.return.available`
- `quality.return.inspection.started`
- `quality.return.inspected`

## Inventory and audit boundary
QC records decisions and publishes events; it does **not** post a second receipt, issue, or transfer to `SCWDomain`. Accepted stock remains in its current receiving location until the Reserve Storage / putaway workflow is implemented. Quarantine and rejection are currently QC dispositions, not physical inventory movements. The inspection list is in-memory for this foundation phase and resets on page reload; durable server-side QC audit storage is a later backend integration task.

## Manual integration test
1. Load Core, existing legacy scripts, adapters, Inbound, then this module.
2. Start `INVENTORY_ADAPTER`, `OPERATIONS_ADAPTER`, `WMS_ADAPTER`, `INBOUND`, and `QUALITY_CONTROL` in dependency order.
3. Create a PO, receive 10 units into `RCV-01`, and inspect receipt index 0 for 4 units with `ACCEPTED`.
4. Inspect the same receipt for 6 units with `QUARANTINED`; a further inspection must fail because no uninspected quantity remains.
5. Verify inventory quantity is unchanged by QC decisions and that the appropriate quality events fire once per inspection.
6. Inspect a return using a return ID, SKU, LOT, quantity and decision; verify the return-specific events.
