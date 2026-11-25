# SCW Phase 28 — Sorting

## Scope
- Creates a sorting task for each PICKED sales order.
- Assigns a deterministic sorting lane from the SKU for the prototype.
- Requires the linked order to remain PICKED when the task is completed.
- Publishes sorting events for the Packing module.
- Does not change inventory balances or sales-order status.

## Files
- `src/modules/sorting/sorting.js`

## Start
Load after the Operations Adapter:
```js
await SCWCore.startModule("SORTING");
```

## API / commands
- `SCWSorting.plan()`
- `SCWSorting.complete(taskId)`
- `SCWSorting.snapshot()`
- Commands: `sorting.plan`, `sorting.complete`, `sorting.snapshot`.

## Events
- `sorting.ready`
- `sorting.task.created`
- `sorting.completed`
- `sorting.planning.error`

## Boundaries
Sorting lanes are logical demo lanes, not conveyor PLC destinations. Task state is localStorage-backed. The module does not alter the legacy sales-order or inventory schema.

## Manual integration test
1. Start Operations Adapter and Sorting.
2. Create and complete a Picking order so its status becomes PICKED.
3. Verify a Sorting task appears with a lane.
4. Complete the task and verify `sorting.completed` fires.
5. Run plan again and verify no duplicate task is created for that order.
