# SCW Phase 3 — Procurement and fulfilment

## Delivered workflows

### Procurement
1. Select a supplier from the supplier master.
2. Create a purchase order with SKU, quantity, unit cost and expected date.
3. Receive all or part of the PO.
4. Record the received LOT, receiving location and optional discrepancy note.
5. The receipt is posted through the Phase 2 inventory domain and appears in the movement ledger.

### Customer fulfilment
1. Create a customer sales order for a SKU and quantity.
2. Pick against a specific location and LOT. The system validates available stock.
3. Pack the picked order and record package / tracking reference.
4. Dispatch with carrier and dispatch reference.
5. Dispatch posts an ISSUE transaction to the inventory ledger and closes the order.

## Status models
- Purchase order: OPEN → PARTIAL → RECEIVED; an unreceived PO may be CANCELLED through the domain API.
- Sales order: NEW → PICKED → PACKED → DISPATCHED.

## Data model
Supplier, purchase order, receipt records, sales order, pick record, package record and dispatch record are stored under `scw-phase3-operations-v1` in browser localStorage. Inventory quantity remains authoritative in the Phase 2 `SCWDomain` state; Phase 3 never maintains a second stock counter.

## Important controls
- Purchase receipts cannot exceed the unreceived PO balance.
- SKU and supplier IDs must exist.
- Quantity must be a positive integer.
- Picking validates a matching SKU + location + LOT balance.
- Dispatch is allowed only after packing and records inventory issue in the shared movement ledger.
- A PO with received quantity cannot be cancelled.

## Limitations / next work
- Browser-local data only; no user accounts, shared database or server-side audit.
- Supplier list is demo master data; supplier creation/edit UI is not included yet.
- No automatic replenishment, RFQ/quotation comparison, invoice matching, payment, barcode scanner, carrier API, customs documents or live route planning.
- Picking currently allocates one LOT from one location; multi-location wave picking and FEFO are future work.
- Discrepancy is recorded as a note; formal claims/returns and quality quarantine are future work.
