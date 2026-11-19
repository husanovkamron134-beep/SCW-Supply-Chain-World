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

## Phase 14 — Musobaqa va baholash tizimi
- O'qituvchi/talaba hisoblari, sinf kodi, 2–4 teng jamoa va 5 rol (server bilan)
- Individual case topshiriqlar: 100 ballik rubrika, tasdiqlash yoki fikr bilan qaytarish
- Har raund operatsion qarorlar va KPI simulyatsiyasi; jamoaviy va individual reyting (Case×0.5 + Qarorlar×0.5)
- `competition.html`, `backend/competition*.py` (docs/PHASE14_COMPETITION.md)

## Run
Open `index.html` in a modern browser. An internet connection is required for the 3D and font CDN resources.

## Data and limitations
Phase 1–10 browser modules still store operational data in localStorage until Phase 12 connects their adapters to the backend. The Phase 11 API provides multi-user accounts, workspaces and versioned server snapshots but does not yet migrate each module. Route distances use straight-line city coordinates, not live road routing or traffic. No GPS or live carrier integration is implemented.


## Phase 17 — inventory-linked Smart Warehouse 3D
- Standalone `warehouse3d.html` scene linked from the main navigation
- 3D pallets are generated from Phase 2 inventory balances with SKU, LOT and quantity metadata
- Forklift pallet transfers post to the authoritative `SCWDomain` movement ledger
- Inbound demo action records a real inventory receipt; a deterministic AGV route is included
- Details and manual test steps: `docs/PHASE17_INVENTORY_LINKED_3D_WAREHOUSE.md`


## Phase 18 — WMS and conveyor automation
- Conveyor rollers and demo parcels animate during simulation.
- AGV receives putaway tasks from the existing warehouse task engine and completes them through the SCW inventory ledger.
- Test steps and limitations: `docs/PHASE18_AGV_CONVEYOR_AUTOMATION.md`


## Phase 19 — order-aware warehouse fulfilment
- WMS picking tasks are generated from NEW sales orders and available stock across multiple LOTs.
- AGV executes picking transfers into the dispatch staging location (`DSP-01`).
- Completed WMS picking updates the linked sales order to `PICKED`; the existing pack and dispatch workflow can then continue.
- Dispatch consumes the staged quantities lot-by-lot through the shared inventory ledger.
- The 3D scene exposes separate putaway and picking task creation controls.
- This remains a browser-local deterministic simulation; AGV routing is waypoint-based and does not represent real fleet coordination.


## Phase 20 — Mega Warehouse 5XL layout foundation
- Added a side-effect-free 116 × 94 world-space layout configuration with 12 named zones.
- Added primary service-corridor centre lines and zone lookup / containment helpers.
- Added a layout validator for zone count, footprint bounds and overlap.
- Existing Three.js scene, inventory, WMS tasks and localStorage behaviour remain unchanged in this phase.
- Technical plan and validation notes: `docs/PHASE20_MEGA_WAREHOUSE_CORE.md`


## Phase 21 — Shared Core Engine foundation
- Added a standalone module registry, dependency-aware lifecycle, domain event bus and command dispatcher in `src/core/shared_core.js`.
- Documented the 12-module folder architecture, adapter migration strategy and inter-module workflow contracts.
- Existing `SCWDomain`, `SCWWarehouse`, `SCWOperations`, inventory storage and 3D pages remain unchanged.
- Technical contract: `docs/PHASE21_SHARED_CORE_ENGINE.md`.


## Phase 22 — legacy adapters and Inbound foundation
- Added Inventory, WMS and Operations adapters around the existing public APIs.
- Added the first Core-managed Inbound module with PO receipt, snapshot and command interfaces.
- PO receiving still posts inventory once through the legacy authoritative workflow; adapters publish events without creating a second ledger.
- No legacy source, localStorage schema, existing page or production navigation was replaced.
- Integration contract and manual test: `docs/PHASE22_ADAPTERS_INBOUND.md`.


## Phase 23 — Quality Control foundation
- Added inbound LOT/receipt inspections and returned-goods inspection decisions (accepted, quarantined, rejected).
- Prevents inspecting more units than the remaining quantity on a specific PO receipt row.
- Publishes quality events for future Reserve Storage and Returns integration without posting a second inventory movement.
- QC inspection records are currently in-memory; durable audit persistence is deferred to backend integration.
- Technical contract and manual integration test: `docs/PHASE23_QUALITY_CONTROL.md`.


## Phase 24 — QC-gated Reserve Storage
- Added Reserve Storage task planning from accepted inbound QC inspections only.
- Putaway validates LOT source availability and destination capacity, then posts one transfer through the authoritative Inventory Adapter.
- Reserve task state is persisted separately; no duplicate stock ledger is introduced.
- The older generic WMS putaway remains QC-unaware and must not be used for production until migrated.
- Technical contract and manual integration test: `docs/PHASE24_RESERVE_STORAGE.md`.


## Phase 25 — High-Bay AS/RS foundation
- Added a 24-bin logical automated storage/retrieval engine (3 aisles × 4 levels × 2 bays).
- Added safe, additive inventory-location registration through the domain and adapter APIs.
- Supports capacity-aware split putaway, LOT-isolated bins, retrieval tasks and ledger-backed transfers.
- Physical crane control, PLC integration and 3D crane animation remain future work.
- Technical contract and manual integration test: `docs/PHASE25_HIGH_BAY_ASRS.md`.


## Phase 26 — order-aware Picking module
- Added picking tasks from the dedicated `PICK-01` buffer, with LOT-level allocation and open-task reservations.
- Completed picks transfer stock to `DSP-01` through the Inventory Adapter and update the sales order through the Operations Adapter.
- Shortages are emitted for the Replenishment workflow; Picking does not bypass AS/RS by taking stock directly from high-bay bins.
- Technical contract and manual integration test: `docs/PHASE26_PICKING.md`.


## Phase 27 — Replenishment
- Added pick-buffer replenishment from reserve storage, with SKU/LOT source reservations and capacity checks.
- Picking shortage events can automatically create replenishment plans.
- When reserve stock is insufficient, the module can request linked High-Bay AS/RS retrieval tasks.
- Completed movements use the Inventory Adapter; task state is separate from the stock ledger.
- Technical contract and manual integration test: `docs/PHASE27_REPLENISHMENT.md`.


## Phase 28 — Sorting
- Added order-aware sorting tasks and logical lane assignment for PICKED orders.
- Sorting completion publishes a workflow event for Packing without changing inventory balances.
- Technical contract and manual integration test: `docs/PHASE28_SORTING.md`.


## Phase 29 — Packing
- Added a Sorting-gated packing workflow for PICKED orders.
- Packing completion updates the existing sales-order status through the Operations Adapter.
- Dispatch remains the only stage that issues shipped inventory.
- Technical contract and manual integration test: `docs/PHASE29_PACKING.md`.


## Phase 30 — Outbound Staging
- Added dock assignment and staging tasks for fully packed orders.
- Staging is a gate before dispatch and does not post inventory.
- Technical contract: `docs/PHASE30_OUTBOUND_STAGING.md`.

## Phase 31 — Dispatch
- Added dispatch tasks gated by completed Outbound Staging.
- Shipment completion uses the existing Operations Adapter and legacy inventory issue workflow exactly once.
- Technical contract: `docs/PHASE31_DISPATCH.md`.


## Phase 32 — Returns
- Added customer return intake gated by a previously DISPATCHED sales order.
- Returned LOT quantities are received once into `RET-01` through the Inventory Adapter.
- Return quantities are reconciled against QC inspection decisions; accepted / quarantined / rejected stock remains held for a future disposition workflow.
- Technical contract and manual integration test: `docs/PHASE32_RETURNS.md`.


## Phase 33 — Control Center
- Added a read-only operational snapshot across inventory, orders and the warehouse modules.
- Added a 100-event in-memory event feed; no duplicate operational store is created.
- Technical contract: `docs/PHASE33_CONTROL_CENTER.md`.

## Phase 34 — Integrated module bootstrap
- Added explicit dependency-ordered startup and reverse-order shutdown for adapters and all 12 operational modules.
- Bootstrap checks that every module script has loaded and rolls back modules started in a failed startup attempt.
- It is not yet wired into the production pages; see `docs/PHASE34_MODULE_BOOTSTRAP.md`.


## Phase 35 — Mega Warehouse 5XL operations preview
- Added isolated `mega-warehouse-5xl-ops.html` with the existing 3D mega-warehouse scene plus a collapsible live Control Center panel.
- Loads all 12 operational modules and adapters through the documented bootstrap sequence.
- The existing 3D preview and main navigation remain untouched until browser integration validation.
- Test instructions: `docs/PHASE35_MEGA_WAREHOUSE_OPS_PREVIEW.md`.


## Phase 36 — Automated module validation
- Added JavaScript syntax checks and a Node VM end-to-end simulation covering all 12 warehouse modules.
- The scenario validates inbound → QC → reserve → AS/RS → replenishment → picking → sorting → packing → staging → dispatch → returns → Control Center.
- CI workflow: `.github/workflows/scw-module-validation.yml`.
- Test details: `docs/PHASE36_AUTOMATED_VALIDATION.md`.


## Phase 37 — Live 3D zone status
- Connected Control Center module state to the 12 zone floor colors in the isolated 5XL operations preview.
- Blue/original = not started, green = running, gold = open / waiting work.
- Technical notes: `docs/PHASE37_LIVE_3D_ZONE_STATUS.md`.


## Phase 38 — 3D equipment visualization
- Added an animated High-Bay AS/RS mast / lift carriage and Sorting-to-Packing roller conveyor with moving parcels to the isolated 5XL operations preview.
- These are visual simulation elements, not physical equipment integrations.
- Technical notes: `docs/PHASE38_3D_EQUIPMENT_VISUALIZATION.md`.


## Phase 39 — Mobile 3D performance profile
- Added a lower-cost mobile rendering profile, reduced rack density, disabled real-time shadows and capped mobile rendering near 30 FPS in the isolated preview.
- Real-device FPS / memory / thermal tests remain outstanding.
- Technical notes: `docs/PHASE39_MOBILE_PERFORMANCE.md`.


## Phase 40 — Browser runtime test lab
- Added `scw-module-test.html`, an isolated real-browser test runner for the complete 12-module workflow.
- Uses a temporary in-memory localStorage shim so test data does not modify the main app's browser data.
- Reports PASS / FAIL per stage and shuts down modules at the end.
- Instructions: `docs/PHASE40_BROWSER_RUNTIME_TEST.md`.
