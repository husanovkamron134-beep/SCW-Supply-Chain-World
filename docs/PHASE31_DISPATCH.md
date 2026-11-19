# SCW Phase 31 — Dispatch

## Scope
- Creates dispatch tasks only for PACKED orders with completed Outbound Staging.
- Completes shipment through the Operations Adapter and existing `SCWOperations.dispatchOrder`.
- Existing dispatch workflow remains authoritative for inventory ISSUE postings; this module never posts a second issue.
- Records carrier and tracking reference on the dispatch task.

## Files
- `src/modules/dispatch/dispatch.js`

## API / commands
- `SCWDispatch.plan()`
- `SCWDispatch.complete(taskId, {carrier, reference})`
- `SCWDispatch.snapshot()`
- Commands: `dispatch.plan`, `dispatch.complete`, `dispatch.snapshot`.

## Events
- `dispatch.ready`
- `dispatch.task.created`
- `dispatch.planning.error`
- `dispatch.task.completed`
- Existing adapter event: `dispatch.shipped`.

## Manual integration test
1. Complete Picking, Sorting, Packing and Outbound Staging for an order.
2. Verify a Dispatch task is created with the staging dock.
3. Complete dispatch with a carrier and tracking reference.
4. Verify order status becomes DISPATCHED and exactly the legacy dispatch workflow posts inventory issues.
5. Try dispatch before staging; it must be rejected.
