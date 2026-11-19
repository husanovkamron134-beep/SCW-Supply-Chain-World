# SCW Phase 36 — Automated module validation

## CI
The GitHub Actions workflow `.github/workflows/scw-module-validation.yml` runs on pushes to `feature/warehouse-3d-world` and pull requests targeting `main`.

Checks:
1. `node --check` on every JavaScript file under `src/`.
2. A Node VM integration simulation using browser-compatible localStorage and window shims.

## End-to-end scenario
The integration test starts the adapters and all 12 modules, then runs:
- PO creation and inbound receipt
- QC acceptance
- Reserve Storage putaway
- High-Bay AS/RS putaway and retrieval
- Replenishment to PICK-01
- Picking, Sorting, Packing and Outbound Staging
- Dispatch and inventory issue
- Customer return and QC acceptance
- Control Center metrics
- Reverse-order module shutdown

The test is deterministic and uses isolated in-memory localStorage. It does not access production or user data.
