# Execution Breakdown — 恩典之网 (Net of Grace)

**Date:** 2026-05-01
**Budget:** ≤4 files, ≤500 net lines
**Test:** `node test.mjs` (37 tests, Playwright)

---

## Worker Packet 1: Fix Crash Bugs (P0)

**Worker ID:** `game2-grace-net-fix-p0`
**Scope:** `js/node-system.js`, `js/grace-flow.js`, `js/main.js`
**Estimated changes:** ~25 lines across 3 files

### Task 1.1 — Fix `Rules.getReachableNodes` call in node-system.js

**File:** `js/node-system.js`
**Line:** 774
**Current code:**
```js
var reachable = Rules.getReachableNodes(sourceId, edges);
```
**Replace with:**
```js
var reachableArr = Rules.findReachable(sourceId, edges);
var reachable = {};
for (var ri = 0; ri < reachableArr.length; ri++) {
  reachable[reachableArr[ri]] = true;
}
```

**Verification:** After fix, call `NodeSystem.getCompletionPercentage(EdgeSystem.edges, level.sourceId)` in browser console during gameplay — should return a number 0–1 instead of throwing.

### Task 1.2 — Fix `CanvasEngine.getWidth()`/`getHeight()` in grace-flow.js

**File:** `js/grace-flow.js`
**Lines:** 1046–1047
**Current code:**
```js
var w = CanvasEngine.getWidth();
var h = CanvasEngine.getHeight();
```
**Replace with:**
```js
var w = CanvasEngine.canvas.clientWidth;
var h = CanvasEngine.canvas.clientHeight;
```

**Verification:** Complete any level — celebration fireworks should spawn without crash. Check browser console for errors.

### Task 1.3 — Fix achievement context in main.js

**File:** `js/main.js`
**Lines:** 504–516
**Add to context object:**
```js
levelsCompleted: Object.keys(levelStarsMap).length,
maxCombo: Rules.getComboState ? Rules.getComboState().max : comboCount,
bridgeCount: countEdgesByCategory('bridge'),
healCount: countEdgesByCategory('heal'),
maxStars: getMaxStarCount(),
totalStars: getTotalStarCount(),
timeRatio: elapsed / (level.parTime || 60)
```

**Add helper function before `checkAchievementsOnComplete`:**
```js
function countEdgesByCategory(category) {
  var count = 0;
  var edges = EdgeSystem.edges;
  for (var i = 0; i < edges.length; i++) {
    var target = findNodeById(edges[i].to);
    if (target) {
      var connType = Rules.getConnectionType(findNodeById(edges[i].from), target);
      if (connType === category) count++;
    }
  }
  return count;
}
function getMaxStarCount() {
  var max = 0;
  var keys = Object.keys(levelStarsMap);
  for (var i = 0; i < keys.length; i++) {
    if (levelStarsMap[keys[i]] > max) max = levelStarsMap[keys[i]];
  }
  return max;
}
function getTotalStarCount() {
  var total = 0;
  var keys = Object.keys(levelStarsMap);
  for (var i = 0; i < keys.length; i++) {
    total += levelStarsMap[keys[i]];
  }
  return total;
}
```

**Note:** Check `Rules.getComboState` exists before using it — if not available, fallback to `comboCount`. Also check what `Rules.getConnectionType` actually returns (may use different category names than `bridge`/`heal`).

**Verification:** Complete a level — check browser console. Achievement toasts should appear when conditions are met. Test by completing level 0 with no undos → "First Light" achievement should fire.

### Post-Worker 1 Test

```bash
node test.mjs
```
Must still pass 37/37.

---

## Worker Packet 2: Fix Logic Errors + Minor Issues (P1, P2)

**Worker ID:** `game2-grace-net-fix-p1p2`
**Scope:** `js/node-system.js`, `js/main.js`
**Estimated changes:** ~15 lines across 2 files
**Depends on:** Worker Packet 1

### Task 2.1 — Fix `repositionNodes()` to use percentage positions

**File:** `js/node-system.js`
**In `loadNodes()` function:** Store `px` and `py` on each node when loading:
```js
// After setting x and y from px/py conversion
node.px = rawNode.px;
node.py = rawNode.py;
```

**File:** `js/main.js`
**Replace `repositionNodes()` body:**
```js
function repositionNodes() {
  if (state !== 'playing') return;
  var canvas = CanvasEngine.canvas;
  var cw = canvas.clientWidth;
  var ch = canvas.clientHeight;
  var ns = NodeSystem.nodes;
  for (var i = 0; i < ns.length; i++) {
    if (ns[i].px !== undefined && ns[i].py !== undefined) {
      var newX = ns[i].px * cw;
      var newY = ns[i].py * ch;
      Animation.tween(ns[i], { x: newX, y: newY }, 0.3);
    }
  }
}
```

### Task 2.2 — Fix `totalPlayTime` tracking

**File:** `js/main.js`
**In `CanvasEngine.update` callback (around line 51), add after `UI.update(dt)`:**
```js
totalPlayTime += dt;
```

### Post-Worker 2 Test

```bash
node test.mjs
```
Must still pass 37/37.

---

## Dependency Graph

```
Worker 1 (P0 fixes)
  ├── Task 1.1 (node-system.js) — independent
  ├── Task 1.2 (grace-flow.js)  — independent
  └── Task 1.3 (main.js)        — independent
  All 3 tasks can run in parallel.

Worker 2 (P1/P2 fixes)
  ├── Task 2.1 (node-system.js + main.js) — depends on Worker 1
  └── Task 2.2 (main.js)                   — depends on Worker 1
  Must run after Worker 1 completes.
```

## Total Budget Impact

| Metric | Budget | Estimated |
|--------|--------|-----------|
| Files modified | ≤4 | 3 (node-system.js, grace-flow.js, main.js) |
| Net lines changed | ≤500 | ~40 |
| Workers | N/A | 2 (sequential) |
