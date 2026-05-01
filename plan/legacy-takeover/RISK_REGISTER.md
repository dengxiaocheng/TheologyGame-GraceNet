# Risk Register — 恩典之网 (Net of Grace)

**Date:** 2026-05-01

---

## R1 — Achievement category names may not match

**Likelihood:** Medium
**Impact:** P0-3 fix produces wrong `bridgeCount`/`healCount` values → achievements still don't fire
**Mitigation:** Before implementing Task 1.3, read `Rules.getConnectionType()` return values to confirm category strings are exactly `'bridge'` and `'heal'`. The achievement checks in `rules.js` use these strings (`ctx.bridgeCount`, `ctx.healCount`) but the connection type categorization may use different names.
**Stop condition:** If `getConnectionType` doesn't return `'bridge'`/`'heal'`, executor must read `rules.js:908-920` to find the actual category-to-achievement mapping and adjust accordingly.

## R2 — `Rules.findReachable` edge shape assumption

**Likelihood:** Low
**Impact:** P0-1 fix produces wrong completion percentage
**Mitigation:** `Rules.findReachable(sourceId, edges)` in `rules.js:163` does a BFS from `sourceId` through `edges`, where each edge has `.from` and `.to` properties. Verify that `EdgeSystem.edges` items have `.from`/`.to` (they do — confirmed in `edge-system.js`). The function returns an array of node ID strings. The P0-1 fix converts this to an Object lookup, which is correct.
**Stop condition:** If `findReachable` returns something other than an array of strings, executor must inspect its return value before proceeding.

## R3 — `totalPlayTime += dt` may break save/load round-trip

**Likelihood:** Low
**Impact:** Save data includes `totalPlayTime` format that didn't exist before — old saves don't have it, but the load function in `main.js:476-496` uses `Object.keys` iteration with `hasOwnProperty` guard, so missing keys are simply not loaded. No crash risk.
**Mitigation:** No action needed — the save/load is resilient to missing keys.

## R4 — `node.px`/`node.py` may already be set by `loadNodes`

**Likelihood:** Low
**Impact:** If `loadNodes` in `node-system.js` already copies `px`/`py` from raw node data, adding it again is harmless (idempotent). If it doesn't, the fix is necessary.
**Mitigation:** Executor must read `node-system.js` `loadNodes()` function to check whether `px`/`py` are already preserved on the node object after loading.
**Stop condition:** If `px`/`py` are already preserved, skip Task 2.1's `node-system.js` change and only modify `main.js`.

## R5 — Playwright test may not catch runtime crashes

**Likelihood:** High (confirmed)
**Impact:** All 37 tests pass despite 3 crash-level bugs
**Mitigation:** Tests are API smoke tests that call functions with trivial inputs. They don't exercise the full game flow (level start → play → complete → celebration). Executor should manually verify each fix by:
1. Opening `index.html` in a browser
2. Starting level 0, connecting edges to complete it
3. Checking console for errors during celebration
4. Verifying achievement toasts appear
**Stop condition:** If executor cannot run a browser, they should add targeted `page.evaluate()` assertions in `test.mjs` — but test changes are out of scope for this fix cycle.

## R6 — Global scope pollution

**Likelihood:** Confirmed
**Impact:** All systems are global singletons (`NodeSystem`, `EdgeSystem`, `Rules`, etc.). Any naming collision with future code would be catastrophic. However, this is architectural debt, not a bug to fix now.
**Mitigation:** Out of scope. Document and move on.

---

## Escalation Triggers

Any executor should **stop and escalate** if:
1. `Rules.findReachable` does not exist or has unexpected signature
2. `Rules.getConnectionType` returns category names that don't match what achievements expect
3. Fixing P0-1 introduces new test failures
4. A fix requires changes to more than the 3 planned files
5. Net line changes exceed 100 (current estimate is ~40)
