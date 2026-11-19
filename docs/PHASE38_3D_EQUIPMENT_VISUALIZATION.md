# SCW Phase 38 — 3D equipment visualization

## Delivered
- Added a moving High-Bay AS/RS mast and lift carriage in the High-Bay zone.
- Added a roller conveyor from Sorting toward Packing, with animated parcels.
- Equipment is rendered only on the isolated `mega-warehouse-5xl-ops.html` preview.
- The original `mega-warehouse-5xl.html` and `warehouse3d.html` remain unchanged.

## Boundaries
These are visual simulation objects driven by a local animation clock. They are not synchronized to real PLCs, physical AS/RS machines, or actual parcel sensor data. Operational module tasks remain separate from the animation until a later visualization adapter connects them.

## Performance
The scene retains capped renderer pixel ratio and uses simple geometry for equipment. Browser FPS and mobile thermals still require real-device testing.
