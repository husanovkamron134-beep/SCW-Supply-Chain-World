# SCW Industrial Mega Warehouse — process-flow redesign

This is a separate preview page and does not replace `mega-warehouse-5xl-ops.html`.

## Corrected building geometry
- Enclosed building footprint: 160 × 150 m (24,000 m²), coordinate bounds X −80…80 and Z −75…75.
- All 12 zones are validated against the actual building footprint; Outbound Staging, Dispatch and Control Center remain inside the building.
- North receiving block: Inbound, Quality Control and Returns.
- Central storage block: Reserve Storage, High-Bay AS/RS and Replenishment.
- South fulfilment block: Picking, Sorting, Packing, Outbound Staging and Dispatch.
- Control Center is a raised mezzanine within the south-east building zone.

## Warehouse geometry
- Reserve Storage and Picking use five long parallel rack runs, with longitudinal bays and clear forklift aisles.
- High-Bay AS/RS uses four tall rack runs flanking a central stacker-crane aisle.
- Sorting and Packing use a main conveyor with branch feeds and scan/packing cells.
- Inbound and outbound have separate dock doors and exterior truck aprons.
- Forklifts and AGVs are currently visual simulation objects; motion is not yet collision-aware or WMS-task driven.

## Reference research and licensing
- WareTwin (WayneChou-bot/WareTwin) was inspected as an architectural reference for deterministic simulation, robot state machines, A* routing, aisle-aware navigation, and separation of scene layout from simulation state.
- Its README declares MIT; its LICENSE file was checked. This SCW page does not copy its React/TypeScript engine or assets. The current renderer remains Three.js and the warehouse layout remains SCW-authored.
- Repository: https://github.com/WayneChou-bot/WareTwin

## Validation
- Layout validation checks all 12 zone rectangles against the real 160 × 150 m building bounds and checks zone overlap.
- Browser runtime and mobile GPU performance still require a real-device test before this preview can replace the operational page.
