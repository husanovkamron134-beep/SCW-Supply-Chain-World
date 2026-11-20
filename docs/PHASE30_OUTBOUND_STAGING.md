# SCW Phase 30 — Outbound Staging

## Scope
- Creates staging tasks only for PACKED orders whose Packing task is complete.
- Assigns one of four logical dispatch docks.
- Staging completion emits a dispatch-ready event.
- Does not issue inventory or change sales-order status.

## Files
- `src/modules/outbound_staging/outbound_staging.js`

## API / commands
- `SCWOutboundStaging.plan()`
- `SCWOutboundStaging.complete(taskId)`
- `SCWOutboundStaging.snapshot()`
- Commands: `outbound.staging.plan`, `outbound.staging.complete`, `outbound.staging.snapshot`.

## Events
- `outbound.staging.ready`
- `outbound.staging.task.created`
- `outbound.staging.planning.error`
- `outbound.staging.completed`

## Manual integration test
1. Complete Picking, Sorting and Packing for an order.
2. Verify an Outbound Staging task appears with a dock assignment.
3. Complete staging and verify `outbound.staging.completed`.
4. Verify the sales order remains PACKED until Dispatch is completed.
