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

## Phase 11 — multi-user backend foundation
- Optional FastAPI service with account registration/login and hashed passwords
- Workspace membership with owner, admin, operator and viewer roles
- Shared versioned JSON state snapshots with conflict detection
- Workspace audit events and server-side Gemini API proxy (API key never goes to the browser)
- PostgreSQL production configuration, Dockerfile and API tests
- Existing browser-only modules remain compatible; automatic frontend synchronization is Phase 12

## Phase 12 — frontend cloud integration
- Added browser login/register modal and configurable backend API URL
- Explicit choice to import local browser state to server or restore server state into browser
- Version-aware autosync after operational localStorage changes; conflicts stop automatic writes to avoid silent overwrite
- Gemini analysis can be requested through the authenticated server proxy; the API key remains server-side
- Browser operational modules remain usable offline; cloud sync requires the deployed backend and an authenticated workspace

## Phase 13 — Bullwhip effekti o'yini
- 4 bosqichli Beer Distribution Game: siz bitta rolni boshqarasiz, qolganlari avtomatik
- Buyurtmalar grafigi, bosqichlar bo'yicha tebranish (bullwhip ko'rsatkichi), avtomatik rejim bilan xarajat taqqoslash va CSV eksport
- Mexanika Forrester/Sterman ishlariga va CC0 loyihasiga asoslangan (docs/PHASE13_BULLWHIP.md)

## Run
Open `index.html` in a modern browser. An internet connection is required for the 3D and font CDN resources.

## Data and limitations
Phase 1–10 browser modules still store operational data in localStorage until Phase 12 connects their adapters to the backend. The Phase 11 API provides multi-user accounts, workspaces and versioned server snapshots but does not yet migrate each module. Route distances use straight-line city coordinates, not live road routing or traffic. No GPS or live carrier integration is implemented.
