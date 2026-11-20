# Phase 19 — Order-aware warehouse fulfilment

## What changed
- The Smart Warehouse 3D page loads the existing sales-order module alongside the inventory and WMS modules.
- The WMS creates picking tasks for NEW sales orders, allocating quantities across available inventory lots.
- The AGV can execute either putaway or picking tasks. Picking transfers the allocated lots from storage locations to `DSP-01`.
- A completed WMS picking task updates the linked sales order to `PICKED`.
- Existing packing remains the next step. Dispatch then issues the staged quantities from `DSP-01`, lot by lot, to the customer and records each movement in the inventory ledger.

## Test flow
1. Open the main SCW app and go to **Operatsiyalar**.
2. Create a customer sales order for a SKU and quantity that is available in inventory.
3. Open **Smart Warehouse 3D**.
4. Click **Picking yaratish**, then **AGV: WMS bajarish**.
5. Wait for the AGV to reach the dispatch zone. The order should change to **PICKED** in the operations screen.
6. In **Operatsiyalar**, pack the order and dispatch it. Confirm that stock is deducted from `DSP-01` and appears in the inventory movement ledger.

## Important constraints
- Picking can allocate a single order across multiple LOTs; the dispatch workflow now supports those multiple LOT lines.
- Inventory and task state are still stored in the current browser's localStorage. Open both pages in the same browser profile to share the local data.
- AGV navigation is a deterministic waypoint demonstration, not a collision-aware fleet planner.
- This phase does not connect physical scanners, RFID, conveyors, vehicles, or live warehouse telemetry.
- Browser/WebGL runtime testing is still required before treating this as production-ready.
