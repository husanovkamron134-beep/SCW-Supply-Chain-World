# Phase 16 — Forklift handling and warehouse movement

## Added
- Forklift keyboard movement with rack-row collision boundaries.
- Mobile touch directional controls for forward, reverse and steering.
- Nearby pallet pickup (E / button) and safe placement (Q / button).
- Fork carriage height adjustment (R/F / buttons).
- Carry state and current-task status feedback.
- Reset returns the forklift to its starting position and clears its carried load.

## How to try it
1. Open `warehouse3d.html` in a modern browser with internet access.
2. Move the forklift with W/A/S/D or the on-screen directional pad.
3. Drive close to one of the sample pallets and press E / “Yuk olish”.
4. Move to an open floor area and press Q / “Yukni tushirish”.
5. Adjust the fork carriage using R/F or the side-panel buttons.

## Current prototype limitations
- Collision is a lightweight aisle/rack boundary check, not a full rigid-body physics engine.
- The lift control animates the fork carriage position; it is not yet a certified lifting/weight simulation.
- Pallet pickup/drop is local to the browser session and is not connected to SCW's inventory ledger or backend.
- Task and KPI values remain demo values; no multi-user synchronization, barcode/RFID, GPS, or equipment telemetry is connected.
- Validate keyboard/touch behavior and WebGL performance on target devices before operational use.

## Next work
Connect pallet movements to the existing SCW inventory domain, add persistent warehouse state, implement physics-based collision and load constraints, then build task routes and autonomous AMR workflows.
