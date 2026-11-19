# SCW Phase 22 — Legacy adapters and Inbound

## Delivered files
- `src/adapters/inventory_adapter.js`: read/record bridge to `SCWDomain`; translates inventory movements into Shared Core events.
- `src/adapters/wms_adapter.js`: task, metrics, putaway, picking and cancellation bridge to `SCWWarehouse`.
- `src/adapters/operations_adapter.js`: PO/SO and fulfilment bridge to `SCWOperations`; publishes PO receipt, inventory receipt, packing and dispatch events.
- `src/modules/inbound/inbound.js`: Inbound module, PO receipt workflow, snapshot and Core commands.

## Required script load order
The following browser scripts must load only after the existing legacy globals have been initialized:
1. `src/core/shared_core.js`
2. Existing legacy scripts: `src/domain.js`, `src/operations.js`, `src/warehouse_sim.js` (keep the current app's dependency order).
3. `src/adapters/inventory_adapter.js`
4. `src/adapters/wms_adapter.js`
5. `src/adapters/operations_adapter.js`
6. `src/modules/inbound/inbound.js`

Do not add these scripts to the production navigation or replace existing pages until the isolated integration checks pass. The 3D preview remains independent.

## Start sequence
After loading scripts, initialize modules in dependency order:
```js
await SCWCore.startModule("INVENTORY_ADAPTER");
await SCWCore.startModule("OPERATIONS_ADAPTER");
await SCWCore.startModule("WMS_ADAPTER");
await SCWCore.startModule("INBOUND");
```
Inbound depends on Inventory and Operations adapters. WMS adapter is available to later workflows but is not a hard dependency for PO receiving.

## Inbound API
- `SCWInbound.snapshot()` returns PO receipt history and recent receipts.
- `SCWInbound.receive({id, qty, lot, location, discrepancy})` receives against an existing PO.
- `SCWCore.execute("inbound.snapshot")` returns the inbound snapshot.
- `SCWCore.execute("inbound.receive", input)` runs the same validated receipt workflow.

The legacy `SCWOperations.receivePurchaseOrder` remains the authoritative PO workflow and calls `SCWDomain.record` exactly once. The Operations Adapter emits `procurement.po.received` and `inventory.received` events after that operation succeeds; Inbound adds the higher-level `inbound.received` event. The adapter must not independently post another inventory receipt.

## Events
- `procurement.po.created`
- `procurement.po.received`
- `inventory.received`
- `inbound.received`
- `inbound.inventory.synced`
- `wms.putaway.created`, `wms.pick.created`, `wms.putaway.completed`, `wms.pick.completed`
- `packing.completed`
- `dispatch.shipped`

## Safety / migration guarantees
- No existing legacy source file was replaced.
- No localStorage key or schema was changed.
- Adapters do not maintain a second inventory balance or WMS task store.
- Existing 3D pages were not wired to the new modules yet.
- Browser integration/runtime validation is still required before production activation.

## Manual integration test
1. Open an isolated test page with the script order above and the existing legacy scripts.
2. Start adapters in the documented order, then start Inbound.
3. Create a PO using `SCWOperationsAdapter.createPurchaseOrder(...)`.
4. Subscribe to `inventory.received` and `inbound.received`.
5. Call `SCWInbound.receive({id: po.id, qty: 5, lot: "TEST-LOT-01", location: "RCV-01"})`.
6. Confirm PO received quantity increases by 5, exactly one matching inventory LOT balance is added, and both event types are observed once.
7. Confirm a repeated receipt is rejected if it exceeds remaining PO quantity.
