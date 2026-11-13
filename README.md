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
- One-time migration from Phase 1 browser inventory data

## Phase 3 — Procurement and fulfilment
- Supplier master data and purchase orders (PO)
- Partial and complete PO receiving, LOT capture and discrepancy notes
- Customer sales orders (SO)
- Validated picking against SKU + location + LOT stock
- Packing and dispatch workflow with carrier/tracking reference
- Dispatch posts an inventory issue transaction to the Phase 2 audit ledger

## Run
Open `index.html` in a modern browser. An internet connection is required for the 3D and font CDN resources.

## Data and limitations
Data is stored in browser localStorage. This is a single-browser educational prototype, not a multi-user production WMS/ERP. No authentication, server database, EDI, live carrier integration, tax/accounting, or real purchase payments are implemented.
