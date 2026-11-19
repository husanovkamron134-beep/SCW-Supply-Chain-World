# SCW Phase 40 — Browser runtime test lab

## Page
- `scw-module-test.html` loads all module scripts sequentially and runs the end-to-end scenario in a real browser.
- It replaces the page's localStorage with an isolated in-memory shim before loading SCW modules, so the test does not alter the main app's saved browser state.
- It reports each step as PASS / FAIL and shuts down modules afterward.

## Scenario
Inbound → Quality Control → Reserve Storage → High-Bay AS/RS → Replenishment → Picking → Sorting → Packing → Outbound Staging → Dispatch → Returns → Control Center.

## Use
Open the page over HTTPS and press "To‘liq testni boshlash". This checks browser runtime behavior on the device where it is opened. It is separate from the Node VM CI test.

## Limitations
A successful test on one device does not establish performance on every browser or real equipment integration. The page uses a temporary in-memory store and does not send test data to the backend.
