# Phase 17 — Inventory-linked Smart Warehouse 3D

## Added
- Loads the existing Phase 2 `SCWDomain` inventory ledger and Phase 9 warehouse task metrics.
- Builds the 3D pallet set from positive inventory balances, preserving SKU, LOT, quantity and current location.
- Forklift pickup is restricted to pallets backed by an inventory balance.
- Dropping a pallet into a supported mapped zone posts a `TRANSFER` through `SCWDomain.record`; source and destination balances and the movement ledger are updated by the existing domain model.
- The inbound button posts a real `RECEIPT` of 24 units of `SCW-001` to `RCV-01`, then displays the resulting pallet.
- Adds a controllable autonomous AGV demo route.
- Adds a Smart Warehouse 3D link to the main SCW navigation.
- Moves the forklift spawn point to the open cross-aisle.

## Supported 3D location mapping
- `RCV-01` — receiving
- `A-01-01`, `A-01-02`, `B-01-01` — storage
- `DSP-01` — dispatch

The visual target is selected by proximity to these mapped zone points. A transfer is rejected if the forklift is not near a supported destination or if the ledger rejects the movement.

## How to test
1. Open `warehouse3d.html` through the main SCW navigation.
2. Drive to an inventory-backed pallet and press E.
3. Drive near another mapped location and press Q.
4. Open the Inventory / movement ledger area in SCW and verify the transfer record and balances.
5. Use “Inventarga yangi pallet qabul qilish” to create a real receipt.
6. Start and stop the AGV route.

## Limitations
- This remains a browser-side learning simulation; it is not connected to physical warehouse equipment.
- The AGV follows a deterministic demonstration route, not a live task planner.
- Pallet-to-location coordinates are a simplified map for the current five SCW location codes.
- Pallet transfer is whole-balance movement; partial pallet splitting is not implemented.
- The browser session must have localStorage enabled. Inventory is stored using the existing SCW local domain model.
- Manual browser testing across desktop/mobile and WebGL devices is still required before merging.
