# Phase 9 — Advanced Warehouse Simulation

## Delivered
- Warehouse execution task engine for putaway and sales-order picking.
- Putaway tasks are generated from stock in the receiving location (RCV-01).
- Picking tasks are generated from NEW sales orders when available SKU/LOT balances cover the full order.
- Completed picking moves stock into DSP-01 dispatch staging; the existing fulfilment module can then pick from DSP-01 and dispatch it.
- Every stock movement is posted through SCWDomain.record, preserving Phase 2 as the single inventory authority.
- Duplicate open tasks are suppressed; task completion/cancellation is state-validated.
- 3D warehouse view is a visual training scene, not live forklift telemetry.

## Constraints
- Single-browser localStorage persistence.
- Demo aisle and rack geometry; no barcode scanner, RF handhelds, labor scheduling, live equipment telemetry or multi-user locking.
- Picking currently requires the order to be fully coverable by current stock. FEFO and partial wave picking are not implemented.
