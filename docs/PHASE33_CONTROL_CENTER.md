# SCW Phase 33 — Control Center

## Scope
- Adds a read-only operational overview across Core, inventory, purchase / sales orders and all available warehouse modules.
- Aggregates module snapshots without creating another inventory or order store.
- Subscribes to known domain events and retains the latest 100 events in the current browser session.
- Exposes health / metrics through a single API and Core commands.

## Files
- `src/modules/control_center/control_center.js`

## API / commands
- `SCWControlCenter.snapshot()`
- `SCWControlCenter.events()`
- Commands: `control.center.snapshot`, `control.center.events`.

## Events
The Control Center listens to inventory, inbound, QC, reserve storage, AS/RS, picking, replenishment, sorting, packing, outbound staging, dispatch, returns and Core lifecycle events.

## Boundaries
This is a data / API foundation, not yet a visual dashboard screen. Recent events are in-memory and limited to the latest 100 events. Snapshot submodules are optional; missing globals return null. It does not mutate operational state.

## Manual integration test
1. Load and start all operational modules.
2. Start Control Center.
3. Receive inventory, inspect it, move it through putaway / AS/RS / picking / dispatch, and create a return.
4. Call `SCWControlCenter.snapshot()`; verify inventory, order and module metrics.
5. Call `SCWControlCenter.events()`; verify recent events appear in reverse chronological order.
6. Stop Control Center and verify no more events are added.
