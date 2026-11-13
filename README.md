# Supply Chain World (SCW)

SCW is a browser-first supply chain and warehouse learning platform.

## Phase 1 — Learning dashboard
- Interactive warehouse dashboard and schematic 3D visualization
- Academy lessons and logistics formulas
- Reorder point (ROP) and EOQ calculators

## Phase 2 — Inventory control
- Product, lot/batch and warehouse-location domain model
- Receiving, issue and inter-location transfer transactions
- Movement ledger with timestamps and references
- Location utilization and minimum-stock warnings

## Phase 3 — Procurement and fulfilment
- Supplier master data and purchase orders (PO)
- Partial and complete PO receiving, LOT capture and discrepancy notes
- Customer sales orders (SO), validated picking, packing and dispatch
- Dispatch posts inventory issue to the Phase 2 movement ledger

## Phase 4 — Transport and route planning
- Demo fleet with payload capacities and operating assumptions
- Delivery tasks and vehicle capacity checks
- Nearest-neighbour route construction with 2-opt improvement
- Route dispatch and delivery status tracking
- Estimated distance, fuel use and transport cost breakdown

## Run
Open `index.html` in a modern browser. An internet connection is required for the 3D and font CDN resources.

## Data and limitations
All data is stored in browser localStorage. This is an educational single-browser prototype, not a production multi-user WMS/TMS. Route distances use straight-line city coordinates, not live road routing or traffic. No authentication, server database, GPS, live carrier integration or payment processing is implemented.
