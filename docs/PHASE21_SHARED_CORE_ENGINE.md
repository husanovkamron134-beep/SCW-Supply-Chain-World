# SCW Shared Core Engine — Phase 21

## Maqsad
12 ta ombor moduli uchun yagona lifecycle, event va command qatlamini yaratish. Bu bosqich mavjud inventar yoki WMS ma'lumotlarini ko'chirmaydi va legacy modullarni almashtirmaydi.

## Tavsiya etilgan papka tuzilmasi

```text
SCW-Supply-Chain-World/
├── index.html
├── warehouse3d.html
├── mega-warehouse-5xl.html
├── src/
│   ├── domain.js                 # legacy: yagona inventar ledger (hozircha saqlanadi)
│   ├── warehouse_sim.js          # legacy: WMS task engine (hozircha saqlanadi)
│   ├── operations.js             # legacy: PO/SO, packing, dispatch (hozircha saqlanadi)
│   ├── core/
│   │   ├── shared_core.js        # module registry, lifecycle, event bus, commands
│   │   └── mega_layout.js        # 5XL building geometry and 12-zone registry
│   ├── adapters/
│   │   ├── inventory_adapter.js  # future bridge to SCWDomain
│   │   ├── wms_adapter.js        # future bridge to SCWWarehouse
│   │   └── operations_adapter.js # future bridge to SCWOperations
│   ├── modules/
│   │   ├── inbound/
│   │   ├── quality_control/
│   │   ├── reserve_storage/
│   │   ├── high_bay_asrs/
│   │   ├── picking/
│   │   ├── replenishment/
│   │   ├── sorting/
│   │   ├── packing/
│   │   ├── outbound_staging/
│   │   ├── dispatch/
│   │   ├── returns/
│   │   └── control_center/
│   └── visualization/
│       ├── warehouse_scene.js
│       ├── equipment/
│       └── ui/
├── docs/
│   ├── PHASE20_MEGA_WAREHOUSE_CORE.md
│   └── PHASE21_SHARED_CORE_ENGINE.md
└── backend/                      # existing optional API; later shared persistence
```

## Shared Core Engine contract
- `SCWCore.registerModule({id,name,version,dependencies,start,stop,health})`
- `SCWCore.startModule(id)` — dependencies must already be running.
- `SCWCore.stopModule(id)` — running dependents must stop first.
- `SCWCore.on(type, handler)` / `off(type, handler)` — subscribe/unsubscribe.
- `SCWCore.emit(type, payload, {source})` — immutable event envelope and delivery error report.
- `SCWCore.registerCommand(name, handler, {moduleId})` / `execute(name,input,context)`.
- `SCWCore.status()` — module and command counts.

## Event naming convention
Use domain-qualified names, for example:
- `inventory.received`, `inventory.transferred`, `inventory.issued`
- `quality.accepted`, `quality.quarantined`, `quality.rejected`
- `wms.putaway.created`, `wms.pick.completed`
- `sorting.completed`, `packing.completed`
- `staging.ready`, `dispatch.shipped`
- `returns.received`, `returns.inspected`
- `core.module.error`

## Workflow contracts
- SORTING publishes `sorting.completed`; PACKING consumes eligible sorted order lines.
- OUTBOUND STAGING publishes `staging.ready`; DISPATCH validates lane/order/carrier before shipment.
- RETURNS publishes `returns.received`; QUALITY CONTROL inspects returned goods and publishes accepted/quarantined/rejected disposition.
- CONTROL CENTER subscribes to module, task, inventory and equipment events; it issues commands through the Core, not by directly mutating another module's private state.

## Migration rules
1. Keep `SCWDomain`, `SCWWarehouse`, and `SCWOperations` authoritative during the adapter migration.
2. Add adapters around their public APIs; do not duplicate stock balances or create a second inventory ledger.
3. Migrate one workflow at a time and compare legacy result vs adapter result.
4. Do not load both legacy and replacement writers for the same operation.
5. Only after parity tests may a legacy responsibility be retired in a separately approved change.

## Current scope / exclusions
Phase 21 adds only the isolated Shared Core Engine foundation and this architecture contract. No existing business workflow, localStorage key, UI page, or inventory state is changed. Browser runtime and integration tests are still required before enabling modules in production.
