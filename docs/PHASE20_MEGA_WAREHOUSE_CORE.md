# Phase 20 — Mega Warehouse Core layout foundation

## Scope
This phase introduces a side-effect-free layout configuration for the SCW Mega Warehouse 5XL concept. It does not replace the existing warehouse scene, inventory model, task engine, or UI.

## Building envelope
- Footprint: 116 × 94 world units.
- Origin: building centre.
- X axis: east-west; Z axis: north-south.
- Building height target: 12 units.
- Zone footprint: 34 × 18 units.
- Layout: 3 columns × 4 rows, with nominal 4-unit service gaps.

## Twelve zone IDs
| ID | Code | Zone |
|---|---|---|
| INBOUND | Z01 | Inbound |
| QUALITY | Z02 | Quality Control |
| RESERVE | Z03 | Reserve Storage |
| HIGH_BAY | Z04 | High-Bay AS/RS |
| PICKING | Z05 | Picking |
| REPLENISHMENT | Z06 | Replenishment |
| SORTING | Z07 | Sorting |
| PACKING | Z08 | Packing |
| OUTBOUND | Z09 | Outbound Staging |
| DISPATCH | Z10 | Dispatch |
| RETURNS | Z11 | Returns |
| CONTROL | Z12 | Control Center |

## Implementation contract
- Global browser API: `window.SCWMegaLayout`.
- `BUILDING`: immutable building dimensions and coordinate convention.
- `zones`: immutable zone definitions and precomputed bounds.
- `corridors`: named primary service-corridor centre lines.
- `getZone(id)`: lookup by zone ID or zone code.
- `contains(id, x, z)`: point-in-zone query.
- `validate()`: checks zone count, building bounds, and footprint overlap.

## Integration plan
1. Keep the existing 52 × 42 scene and inventory coordinate mapping intact until the new scene renderer is ready.
2. Build the 116 × 94 shell and zone floor markings from this configuration in a separate renderer module.
3. Add zone-specific racks, docks, conveyor equipment, and machines as separate module builders.
4. Introduce an explicit location registry mapping WMS location codes to zone IDs and 3D coordinates.
5. Migrate inventory pallets only after location mapping and regression tests are in place.

## Validation
The layout validator must return `{ valid: true, zoneCount: 12, errors: [] }`.
The zone footprints must remain inside the building envelope and must not overlap.
No existing inventory records or localStorage keys are changed by this phase.

## Non-goals
- No changes to live inventory or WMS task behaviour.
- No real robot control or physical equipment connection.
- No replacement of the current Three.js renderer in this phase.
