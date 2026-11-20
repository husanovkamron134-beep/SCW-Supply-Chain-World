# SCW Phase 32 — Returns

## Scope
- Accepts customer returns only against DISPATCHED sales orders.
- Caps cumulative returns at the original dispatched order quantity.
- Requires the returned LOT and posts one receipt into `RET-01` through the Inventory Adapter.
- Publishes `returns.received` so Quality Control can inspect the returned goods.
- Tracks QC inspected / accepted / quarantined / rejected quantities without maintaining another stock ledger.

## Files
- `src/modules/returns/returns.js`

## Start
```js
await SCWCore.startModule("RETURNS");
```
The module registers `RET-01` through the Inventory Adapter.

## API / commands
- `SCWReturns.receive({orderId, qty, lot, reason})`
- `SCWReturns.get(returnId)`
- `SCWReturns.recordInspection(inspection)` — called by QC after a validated inspection.
- `SCWReturns.snapshot()`
- Commands: `returns.receive`, `returns.snapshot`, `returns.get`.

## Events
- `returns.ready`
- `returns.received`
- Quality Control publishes return inspection events and updates inspected quantities.

## Boundaries
Returned goods are received into `RET-01` and remain there pending QC. This phase does not automatically restock accepted returns into sellable inventory; that requires a later disposition / putaway workflow. A return must reference a DISPATCHED order and a specific LOT.

## Manual integration test
1. Dispatch an order fully through the staged workflow.
2. Start Returns and Quality Control.
3. Receive part of the order into `RET-01` using its original LOT.
4. Verify one inventory receipt and one `returns.received` event.
5. Inspect the return in QC; verify inspected quantities and decision totals update.
6. Verify cumulative returns cannot exceed the dispatched order quantity.
