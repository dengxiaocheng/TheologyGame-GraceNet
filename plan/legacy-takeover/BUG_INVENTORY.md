# Bug Inventory — 恩典之网 (Net of Grace)

**Auditor:** game2-grace-net-legacy-planner
**Date:** 2026-05-01
**Codebase:** ~10,928 lines across 9 JS files
**Test status:** 37/37 Playwright tests pass (API smoke tests, not gameplay integration)

---

## P0 — Crash / Broken Feature (will throw at runtime)

| # | Bug | File:Line | Symptom | Repro | Owner | Test Evidence |
|---|-----|-----------|---------|-------|-------|---------------|
| P0-1 | `Rules.getReachableNodes` does not exist — called as `Rules.getReachableNodes(sourceId, edges)` | `node-system.js:774` | `TypeError: Rules.getReachableNodes is not a function` when `getCompletionPercentage()` is called. The function exists internally as `findReachable()` and is exported as `Rules.findReachable`, but returns an Array, not an Object. The caller treats the return as an object lookup (`reachable[nodes[i].id]`). | Start any level, make an edge — completion progress updates call this path. | `node-system.js` | Not covered by test.mjs — tests call `NodeSystem.getCompletionPercentage` but it's never asserted, and the test path doesn't trigger the `Rules.getReachableNodes` call because it checks for the function existence, not its output. |
| P0-2 | `CanvasEngine.getWidth()` / `CanvasEngine.getHeight()` do not exist | `grace-flow.js:1046-1047` | `TypeError: CanvasEngine.getWidth is not a function` when celebration fireworks spawn on level complete. CanvasEngine exposes `width`/`height` as properties, not getter methods. | Complete any level → celebration triggers → crash. | `grace-flow.js` | Not covered — test.mjs verifies `EdgeSystem` edge creation and undo, but doesn't drive level completion through to celebration. |
| P0-3 | Achievement context missing required fields | `main.js:504-516` | 11 of 12 achievement `check()` functions reference fields not present in the context object passed from `checkAchievementsOnComplete()`: `levelsCompleted`, `maxCombo`, `bridgeCount`, `healCount`, `maxStars`, `totalStars`, `timeRatio`. These are all `undefined`, so achievements silently never unlock. | Complete any level — `Rules.checkAllAchievements(context)` receives a context where these fields are `undefined`. Achievement checks like `ctx.levelsCompleted >= 1` evaluate `undefined >= 1` → `false`. | `main.js` | Not covered — test.mjs checks `Rules.checkAllAchievements` exists, but doesn't verify it returns correct results with a realistic context. |

## P1 — Logic Error / Silent Failure

| # | Bug | File:Line | Symptom | Repro | Owner | Test Evidence |
|---|-----|-----------|---------|-------|-------|---------------|
| P1-1 | `repositionNodes()` uses pixel positions for resize | `main.js:272-287` | On window resize, `repositionNodes()` reads `level.nodes[j].x` and `level.nodes[j].y` — but these are already converted to pixels by `getLevel()`. Since `px`/`py` (percentages) are not stored on the node after `loadNodes()`, resize uses stale pixel values. Nodes drift or cluster on orientation change. | Play on mobile, rotate device during gameplay. | `main.js` + `levels.js` | Not covered — test.mjs tests touch drag but not resize behavior. |
| P1-2 | `findReachable` returns Array but caller expects Object | `rules.js:163` + `node-system.js:774-778` | Even if P0-1 is fixed to call `Rules.findReachable`, it returns an Array of node IDs. The caller does `reachable[nodes[i].id]` which would be `undefined` for string IDs on an Array. Need to either convert return to Object or change caller to `reachable.indexOf(nodes[i].id) >= 0`. | Same as P0-1. | `rules.js` or `node-system.js` | Not covered. |
| P1-3 | `window.currentLevel` sync hack wraps `startLevel` | `main.js:620-624` | The IIFE wraps `Game.startLevel` to sync `window.currentLevel`, but this means any code that compared `Game.startLevel` to a stored reference (e.g., event handler cleanup) will fail. Minor — no current callers do this. | N/A — latent. | `main.js` | Not covered. |

## P2 — Cosmetic / Minor

| # | Bug | File:Line | Symptom | Repro | Owner | Test Evidence |
|---|-----|-----------|---------|-------|-------|---------------|
| P2-1 | `Animation.colorLerp` called with `#ffffff` — may produce incorrect hex if colorLerp doesn't handle 3-char hex | `grace-flow.js:633` | If `colorLerp` doesn't normalize `#ffffff` correctly, trail rendering may show wrong colors. `colorLerp` in `animation.js:343` appears to handle standard 6-char hex. | Visual inspection during flow animation. | `grace-flow.js` | Not covered — visual assertion. |
| P2-2 | `totalPlayTime` declared but never updated | `main.js:29, 544` | `totalPlayTime` is reset in `restart()` and exposed via `getTotalPlayTime()` but never incremented anywhere. Always returns 0. | Call `Game.getTotalPlayTime()` at any point. | `main.js` | Not covered. |

---

## Summary

| Severity | Count | Affected Files |
|----------|-------|----------------|
| P0 (Crash/Broken) | 3 | `node-system.js`, `grace-flow.js`, `main.js` |
| P1 (Logic Error) | 3 | `main.js`, `rules.js`, `node-system.js` |
| P2 (Minor) | 2 | `grace-flow.js`, `main.js` |
| **Total** | **8** | **4 unique files** |

### Test Coverage Gap

The 37 Playwright tests are **API smoke tests** — they verify that functions exist and return without throwing when called with trivial inputs. They do **not** verify:
- Cross-module API contracts (function names, return types)
- Game flow integration (level start → play → complete → celebration)
- Achievement computation with realistic context
- Resize/orientation behavior

This explains how 37/37 tests pass despite 3 crash-level bugs.
