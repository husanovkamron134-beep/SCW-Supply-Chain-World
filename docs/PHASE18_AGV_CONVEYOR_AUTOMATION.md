# Phase 18 — WMS-dispatched AGV and conveyor

## Added
- Conveyor rollers rotate continuously while simulation is running.
- Demo parcels move along the conveyor lane and wrap around to the start.
- “WMS topshiriq yaratish” calls the existing `SCWWarehouse.createPutawayTasks()` method.
- AGV now executes an open PUTAWAY task from the existing Phase 9 task engine instead of following a free-running loop.
- On arrival, AGV calls `SCWWarehouse.complete(task.id)`; this posts the inventory transfer through `SCWDomain`.
- The 3D pallet position and local stock-location metadata are updated after task completion.
- AGV can be stopped during travel.

## Test flow
1. Open Smart Warehouse 3D.
2. Use the inbound action to receive 24 units of SCW-001 into RCV-01.
3. Click “WMS topshiriq yaratish”.
4. Click “AGV: topshiriq bajarish” and let it reach the storage destination.
5. Verify the task status, inventory balances and movement ledger in SCW.

## Limitations
- AGV follows a simple waypoint route for the selected putaway destination; it is not a collision-aware fleet scheduler.
- Conveyor parcels are visual demonstration objects and are not yet tied to order lines or SKU-level sorting rules.
- The current map supports the five location codes already documented in Phase 17.
- Manual desktop/mobile browser and WebGL validation is still required.
