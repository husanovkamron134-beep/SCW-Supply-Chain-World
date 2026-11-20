# SCW Phase 27 — Replenishment

## Scope
- Replenishes the dedicated `PICK-01` buffer from non-AS/RS reserve storage locations.
- Can subscribe to `picking.shortage` and create a replenishment plan automatically.
- If reserve stock is insufficient but High-Bay stock exists, requests AS/RS retrieval tasks to `PICK-01`.
- Tracks direct reserve transfers and AS/RS-waiting tasks separately from inventory balances.
- Every completed reserve movement uses the Inventory Adapter.

## Files
- `src/modules/replenishment/replenishment.js`

## Start
Start Inventory Adapter, High-Bay AS/RS, Picking and then Replenishment. AS/RS is optional for reserve-only replenishment, but required for automatic high-bay retrieval.
```js
await SCWCore.startModule("REPLENISHMENT");
```

## API / commands
- `SCWReplenishment.request({sku, qty, lot?, orderId?})`
- `SCWReplenishment.complete(taskId)`
- `SCWReplenishment.refresh()` — updates waiting AS/RS tasks after their linked AS/RS tasks finish.
- `SCWReplenishment.snapshot()`
- Commands: `replenishment.request`, `replenishment.complete`, `replenishment.refresh`, `replenishment.snapshot`.

## Events
- `replenishment.ready`
- `replenishment.task.created`
- `replenishment.asrs.requested`
- `replenishment.asrs.error`
- `replenishment.shortage`
- `replenishment.planning.error`
- `replenishment.completed`

## Boundaries
Replenishment uses the existing inventory ledger and stores only task state in localStorage. AS/RS retrieval tasks must be completed through `SCWHBASRS.complete`; call `SCWReplenishment.refresh()` afterward to reconcile the waiting replenishment task. This phase does not automatically execute physical robots or conveyor equipment.

## Manual integration test
1. Start Inventory Adapter, High-Bay AS/RS, Picking and Replenishment.
2. Ensure `PICK-01` exists and a non-AS/RS storage location has SKU/LOT stock.
3. Call `SCWReplenishment.request({sku:"SCW-001",qty:20})`; verify a reserve transfer task is created.
4. Complete it and verify 20 units move into `PICK-01`.
5. Put stock in a High-Bay bin and request more than reserve availability; verify AS/RS retrieval tasks are linked to a WAITING_ASRS task.
6. Complete linked AS/RS tasks, call refresh, and verify the waiting task becomes DONE.
7. Trigger a Picking shortage and verify the Replenishment module receives it once.
