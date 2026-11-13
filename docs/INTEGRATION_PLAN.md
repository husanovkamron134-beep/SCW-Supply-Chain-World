# SCW integration plan

## Phase 1 — browser prototype
- Responsive dashboard and virtual warehouse scene
- Inventory receiving and dispatch simulation
- Local browser persistence
- Academy lessons and EOQ/ROP calculators

## Phase 2 — domain model
- SKU, location, lot and movement ledger
- Receiving, put-away, picking, packing and dispatch workflows
- Auditable inventory adjustments and validation rules

## Phase 3 — supply-chain network
- Suppliers, factories, distribution centers and demand nodes
- Lead times, capacities, transport costs and disruption scenarios

## Phase 4 — simulation and analytics
- Reproducible discrete-event simulation
- EOQ, reorder point, safety stock, ABC/XYZ and service-level metrics
- What-if scenario comparison

## Phase 5 — optional shared backend
- FastAPI service, PostgreSQL and WebSocket updates
- Authentication and classroom collaboration only when needed

## Engineering principles
One canonical state must power the dashboard, inventory ledger and 3D view. Keep simulation deterministic when a seed is supplied. Explain assumptions beside every formula. Do not copy third-party repositories wholesale; preserve their license notices if any compatible code is later reused.
