# SCW Phase 29 — Packing

## Scope
- Creates packing tasks only for PICKED orders with a completed Sorting task.
- Completes packing through the Operations Adapter and existing `SCWOperations.packOrder` workflow.
- Updates the authoritative sales-order status to PACKED.
- Does not issue inventory; Dispatch remains responsible for shipment posting.

## Files
- `src/modules/packing/packing.js`

## Start
Start Operations Adapter and Sorting before Packing:
```js
await SCWCore.startModule("PACKING");
```

## API / commands
- `SCWPacking.plan()`
- `SCWPacking.complete(taskId, {packageType, reference})`
- `SCWPacking.snapshot()`
- Commands: `packing.plan`, `packing.complete`, `packing.snapshot`.

## Events
- `packing.ready`
- `packing.task.created`
- `packing.planning.error`
- `packing.task.completed`
- Existing adapter event: `packing.completed`.

## Manual integration test
1. Complete a Picking task, then its Sorting task.
2. Verify a Packing task is created.
3. Complete it with a package type and tracking reference.
4. Verify the order becomes PACKED and one adapter `packing.completed` event is published.
5. Try packing before sorting; it must be rejected.
