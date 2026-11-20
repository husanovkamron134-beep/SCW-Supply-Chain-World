# SCW Phase 26 — Picking

## Scope
- Adds order-aware picking from the dedicated `PICK-01` buffer.
- Creates tasks only for NEW sales orders with enough LOT-tracked pick-buffer stock.
- Reserves open-task quantities to prevent multiple orders allocating the same stock.
- Completes each pick by transferring exact LOT lines to `DSP-01`, then marks the order PICKED through the Operations Adapter.
- Reports shortages for the Replenishment module; it does not pick directly from high-bay bins.

## Files
- `src/modules/picking/picking.js`
- `src/adapters/operations_adapter.js` now exposes `completeWarehousePick`.

## Start
After Core, legacy operations, Inventory Adapter and Operations Adapter:
```js
await SCWCore.startModule("PICKING");
```

## API / commands
- `SCWPicking.plan()`
- `SCWPicking.complete(taskId)`
- `SCWPicking.snapshot()`
- Commands: `picking.plan`, `picking.snapshot`, `picking.complete` (input `{id}`).

## Events
- `picking.ready`
- `picking.task.created`
- `picking.shortage`
- `picking.planning.error`
- `picking.completed`

## Boundaries
Pick task state is localStorage-backed. Inventory stays in the Phase 2 ledger. The older generic WMS picking engine remains untouched and is not wired to this QC / AS/RS gated workflow. Replenishment must first move suitable stock into `PICK-01`; High-Bay stock is retrieved via the AS/RS module.

## Manual integration test
1. Start Inventory Adapter, Operations Adapter and Picking.
2. Ensure `PICK-01` exists (start High-Bay AS/RS once) and has sufficient SKU/LOT stock.
3. Create a sales order for a quantity covered by one or more LOT balances in `PICK-01`.
4. Verify a picking task is created and duplicate planning does not allocate the same order twice.
5. Complete the task; verify LOT balances move from `PICK-01` to `DSP-01` and the sales order status becomes `PICKED`.
6. Create an order with insufficient pick-buffer stock; verify `picking.shortage` is emitted and no partial task is saved.
