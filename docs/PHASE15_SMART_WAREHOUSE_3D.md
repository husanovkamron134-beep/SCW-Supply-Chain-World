# SCW Smart Warehouse 3D — Phase 15 foundation

## Entry point
Open `warehouse3d.html` in a modern browser. The page uses Three.js 0.160 from jsDelivr CDN and requires an internet connection.

## Included in this first implementation
- Interactive 3D warehouse shell, roof structure, lighting, floor markings and four operational zones.
- Multi-level pallet racks, sample pallet inventory, receiving/dispatch docks, conveyor mock-up and trucks.
- Forklift model with keyboard movement (W/A/S/D), orbit camera, zoom and top-down camera.
- Pause/resume, simulation speed, reset, zone labels and adding demo pallets.
- Responsive layout for desktop and mobile browsers.

## Important boundaries
This is the visual foundation/prototype, not yet a production WMS or physically accurate digital twin. Inventory counts and tasks are demo values; forklift movement is local client-side movement without collision/physics; pallet placement is not yet persisted or connected to the existing Phase 2 inventory ledger. The next phase should introduce a shared warehouse state adapter, collision/physics, task-driven routes, picking/putaway, and server persistence. Test on target mobile devices before production deployment.
