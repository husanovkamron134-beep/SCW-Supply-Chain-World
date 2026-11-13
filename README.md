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

## Phase 5 — Production planning and execution
- Demo BOM and component requirements for finished goods
- Production orders with work-centre capacity checks and estimated time/cost
- Raw materials consumed from the shared inventory lot ledger at production start
- Finished goods received into the same inventory ledger at completion

## Phase 6 — Demand forecasting and replenishment
- Weekly SKU demand history and duplicate-week updates
- SMA, weighted moving average (WMA) and simple exponential smoothing (SES)
- Reorder point and suggested purchase quantity using lead time, on-hand stock and open purchase orders
- User-approved purchase order creation through the procurement module

## Phase 7 — Supply chain network and digital twin
- Directed network of suppliers, factory, central warehouse, distribution centres and customers
- Edge capacity, lead time, cost and reliability assumptions
- Baseline-versus-disruption scenario simulation with service level and cost impact

## Phase 8 — 3D digital twin
- Separate Three.js supply-chain scene with facility buildings, route corridors and animated demo vehicles
- Interactive orbit/zoom, playback, reset and simulation-speed controls

## Phase 9 — Advanced warehouse simulation
- Putaway and picking task generation from receiving stock and new sales orders
- LOT-tracked inventory transfers through the shared Phase 2 ledger
- Dispatch staging workflow and interactive 3D rack/forklift training scene

## Phase 10 — Decision intelligence and optimization
- Explainable inventory risk scoring and days-of-cover analysis
- Replenishment prioritization using demand forecast and supplier lead time
- Lowest-cost capacity-feasible fleet comparison using the route optimizer
- Baseline-versus-disruption supply-network analysis and consolidated insights

## Run
Open `index.html` in a modern browser. An internet connection is required for the 3D and font CDN resources.

## Data and limitations
All data is stored in browser localStorage. This is an educational single-browser prototype, not a production multi-user WMS/TMS. Route distances use straight-line city coordinates, not live road routing or traffic. No authentication, server database, GPS, live carrier integration or payment processing is implemented.
