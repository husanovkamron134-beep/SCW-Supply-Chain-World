# SCW Phase 24 — Reserve Storage

## Scope
- Adds a QC-gated putaway workflow for approved inbound LOT quantities.
- Creates reserve-storage tasks only from `ACCEPTED` inbound QC inspections.
- Chooses an existing `storage` location with sufficient free capacity.
- Completes transfers through `SCWInventoryAdapter.record`, preserving `SCWDomain` as the single authoritative inventory ledger.
- Persists only Reserve Storage task state in its own localStorage key; it does not keep a second stock balance.

## Files
- `src/modules/reserve_storage/reserve_storage.js`

## Load / start order
Load the module after Shared Core, legacy domain and operations, adapters, Inbound, and Quality Control.
```js
await SCWCore.startModule("QUALITY_CONTROL");
await SCWCore.startModule("RESERVE_STORAGE");
```
Reserve Storage depends on `INVENTORY_ADAPTER` and `QUALITY_CONTROL`.

## API
- `SCWReserveStorage.plan()` — creates tasks for accepted inspections not already represented by a task.
- `SCWReserveStorage.complete(taskId)` — transfers the approved LOT from receiving to its assigned storage location.
- `SCWReserveStorage.snapshot()`
- Core commands: `reserve.storage.plan`, `reserve.storage.snapshot`, `reserve.storage.complete` (input: `{id}`).

The module checks source LOT availability and destination capacity again at completion. A task is marked complete only after the inventory adapter transfer succeeds.

## Events
- `reserve.storage.ready`
- `reserve.storage.putaway.created`
- `reserve.storage.putaway.completed`
- `reserve.storage.planning.error`

## Important boundary
The older generic `SCWWarehouse.createPutawayTasks()` still creates tasks from all positive `RCV-01` balances and does not yet enforce QC status. Until that legacy path is migrated, do not use generic putaway for production stock: use this QC-gated Reserve Storage workflow. This phase does not alter the legacy WMS engine or existing pages.

Task state is localStorage-backed; inventory balances remain in the existing domain ledger. Server-side multi-user task synchronization is a later integration.

## Manual integration test
1. Start adapters, Inbound, Quality Control, then Reserve Storage.
2. Create a PO and receive 10 units into `RCV-01`.
3. Inspect 4 units as `ACCEPTED`, and 6 as `QUARANTINED`.
4. Run `SCWReserveStorage.plan()`; it should create a task for 4 units only.
5. Complete that task and verify exactly 4 units move from `RCV-01` to a storage location.
6. Verify the 6 quarantined units remain in receiving; verify inventory ledger records one transfer.
7. Re-run plan; it must not create a duplicate task for the same QC inspection.
