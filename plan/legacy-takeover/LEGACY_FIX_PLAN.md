# Legacy Fix Plan — 恩典之网 (Net of Grace)

**Date:** 2026-05-01
**Scope:** Fix 8 bugs across 4 files. Zero new features. Zero refactoring.
**Budget:** ≤4 files modified, ≤500 net lines changed.

---

## Repair Strategy

Fix cross-module API contract mismatches. Every P0 bug is a caller using a function name or return shape that doesn't match the callee's actual API. The fix in every case is to align the caller with the callee — not to change the callee's public API.

**Principle:** Fix callers, not providers. The internal implementations (`rules.js`, `canvas-engine.js`, `animation.js`) are internally consistent. The bugs are in external callers that guessed wrong.

## Execution Phases

### Phase 1: Fix Crash Bugs (P0)

| Bug | Fix | File | Lines Changed |
|-----|-----|------|---------------|
| P0-1: `Rules.getReachableNodes` doesn't exist | Change `node-system.js:774` to call `Rules.findReachable(sourceId, edges)` and convert the returned Array to a lookup Object: `var arr = Rules.findReachable(sourceId, edges); var reachable = {}; for (var i = 0; i < arr.length; i++) reachable[arr[i]] = true;` | `node-system.js` | ~5 lines |
| P0-2: `CanvasEngine.getWidth()`/`getHeight()` don't exist | Change `grace-flow.js:1046-1047` to `var w = CanvasEngine.canvas.clientWidth; var h = CanvasEngine.canvas.clientHeight;` (or `CanvasEngine.width`, `CanvasEngine.height` — both are set in `resize()`). Using `canvas.clientWidth/clientHeight` is safer as it returns CSS pixels. | `grace-flow.js` | ~2 lines |
| P0-3: Achievement context missing fields | Add missing fields to the context object in `main.js:504-516`: `levelsCompleted: Object.keys(levelStarsMap).length, maxCombo: comboCount, bridgeCount: countEdgesByType('bridge'), healCount: countEdgesByType('heal'), maxStars: Math.max.apply(null, Object.values(levelStarsMap).concat([0])), totalStars: Object.values(levelStarsMap).reduce(function(a,b){return a+b}, 0), timeRatio: elapsed / (level.parTime \|\| 60)`. Requires a small helper `countEdgesByType()` that counts edges whose target node type matches a Rules category. | `main.js` | ~15 lines |

### Phase 2: Fix Logic Errors (P1)

| Bug | Fix | File | Lines Changed |
|-----|-----|------|---------------|
| P1-1: `repositionNodes()` uses pixel positions | Store `px`/`py` on each node during `loadNodes()`. In `repositionNodes()`, recompute pixel positions from `px`/`py` using current canvas dimensions. | `node-system.js` + `main.js` | ~10 lines |
| P1-2: `findReachable` return type mismatch | Already fixed by P0-1 fix (converts Array to Object). | (covered by P0-1) | 0 |
| P1-3: `window.currentLevel` sync hack | Leave as-is. No current callers are affected. Document as known tech debt. | N/A | 0 |

### Phase 3: Fix Minor Issues (P2)

| Bug | Fix | File | Lines Changed |
|-----|-----|------|---------------|
| P2-2: `totalPlayTime` never updated | Add `totalPlayTime += dt` in the `CanvasEngine.update` callback within `init()`. | `main.js` | ~1 line |
| P2-1: `colorLerp` with `#ffffff` | No fix needed — `animation.js:343` handles 6-char hex correctly. `#ffffff` is valid 6-char hex. | N/A | 0 |

## Stop Conditions

1. All P0 bugs fixed → game no longer crashes on level completion
2. All P1 bugs fixed → progress tracking and resize work correctly
3. P2 bugs fixed → minor quality improvements
4. `node test.mjs` still passes 37/37
5. Manual smoke test: start level 0 → connect edges → complete level → verify celebration plays without crash → verify achievement toast appears

## Files Modified (Final Tally)

| File | Estimated Net Lines |
|------|-------------------:|
| `js/node-system.js` | +8 |
| `js/grace-flow.js` | +2 |
| `js/main.js` | +20 |
| **Total** | **~30 lines** |

Well within the ≤4 files, ≤500 lines budget.

## Out of Scope

- Refactoring any system architecture
- Adding new levels or node types
- Adding new tests
- CSS/HTML changes
- Performance optimization
- The `window.currentLevel` sync hack (P1-3) — low risk, no current impact
