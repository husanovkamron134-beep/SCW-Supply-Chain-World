# SCW Phase 2 — inventory domain model

## Delivered
- Canonical inventory state: product master, storage locations, lot/batch balances and movement ledger.
- Receiving, issue and inter-location transfer transactions.
- Validation prevents invalid quantities, unknown SKUs/locations and negative stock.
- Each successful operation writes an auditable record with timestamp, before/after quantity, lot, source, destination and optional reference.
- Location utilization and SKU reorder-threshold status are derived from the same state.
- One-time migration reads Phase 1 `scw-stock` browser data and migrates aggregate SKU quantities into opening balances.
- State remains browser-local in this phase.

## Domain model
- Product: SKU, name, unit, minimum stock, lot tracking flag.
- Location: code, name, type, capacity.
- Balance: SKU + location + lot + quantity.
- Movement: immutable-style transaction record with type, quantity, lot, source/destination, reference, timestamp and balance snapshot.

## Known limitations
- Browser localStorage is not a multi-user database and can be cleared by the browser.
- LOT is tracked as a batch identifier; expiry dates, serial numbers, reservations and FEFO/FIFO allocation are not implemented yet.
- Transfers validate source quantity and target location, but do not yet enforce capacity limits or location/product compatibility.
- No authentication, server API, shared classroom state or production audit guarantees.

## Next
Phase 3: supplier and purchase-order workflow, inbound appointment, receiving discrepancy, put-away tasks, picking, packing and dispatch documents.
