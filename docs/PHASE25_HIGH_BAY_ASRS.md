# SCW Phase 25 — High-Bay AS/RS foundation

## Scope
- Adds a logical automated storage/retrieval engine with 24 bins (3 aisles × 4 levels × 2 bays).
- Registers bin locations through the Inventory Adapter and the additive `SCWDomain.ensureLocation` API.
- Enforces one SKU/LOT per bin, bin capacity, source availability, open-task reservations and destination capacity.
- Supports split putaway and retrieval tasks.
- Posts every completed movement through `SCWInventoryAdapter.record`; inventory remains single-source-of-truth.

## Files
- `src/modules/high_bay_asrs/high_bay_asrs.js`
- Additive location registration in `src/domain.js` and `src/adapters/inventory_adapter.js`.

## Load / start
Load after Core, legacy domain, Inventory Adapter and other adapters.
```js
await SCWCore.startModule("INVENTORY_ADAPTER");
await SCWCore.startModule("HIGH_BAY_ASRS");
```

## API / commands
- `SCWHBASRS.ensureLocations()`
- `SCWHBASRS.createPutaway({sku, lot, from, qty})`
- `SCWHBASRS.createRetrieval({sku, lot, qty, to:"PICK-01"})`
- `SCWHBASRS.complete(taskId)`
- `SCWHBASRS.snapshot()`
- Commands: `asrs.snapshot`, `asrs.putaway.create`, `asrs.retrieval.create`, `asrs.task.complete` (input `{id}`).

## Events
- `asrs.ready`
- `asrs.task.created`
- `asrs.putaway.completed`
- `asrs.retrieval.completed`

## Boundaries
This phase implements the logical inventory/bin/task engine, not physical crane-control hardware, collision avoidance, PLC/OPC-UA integration, or a 3D animated AS/RS crane. Task state is browser localStorage-backed. A later visualization and hardware-integration phase can consume these stable bin and task APIs.

## Manual integration test
1. Start Inventory Adapter and High-Bay AS/RS.
2. Confirm 24 bin locations plus `PICK-01` are registered.
3. Ensure a source storage location has at least 300 units of a single SKU/LOT.
4. Create a 300-unit putaway; it should split across bins because each bin capacity is 250.
5. Complete each task and verify the source decreases and high-bay bins increase by the same total.
6. Create a retrieval for a portion of the stored LOT to `PICK-01`; complete tasks and verify the ledger transfers the exact quantity.
7. Try mixed LOT in an occupied bin, over-capacity tasks, and insufficient source quantity; each must be rejected.
