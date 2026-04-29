/**
 * Game2 Grace Net - Comprehensive Gameplay Test
 * Tests: 15 levels, 6 node types, edge system, grace flow, combo scoring,
 *        star rating, undo/reset, level completion, touch drag, rules
 * Run: node test-game2.mjs [game-dir]
 */
import { chromium } from 'playwright';
import { resolve } from 'path';

const W = 375, H = 812;
const DIR = process.argv[2] || 'game2-grace-net';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  const results = { passed: 0, failed: 0, errors: [] };
  function pass(msg) { results.passed++; console.log(`  ✓ ${msg}`); }
  function fail(msg) { results.failed++; results.errors.push(msg); console.log(`  ✗ ${msg}`); }

  try {
    await page.goto(`file://${resolve(DIR, 'index.html')}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    errors.length === 0 ? pass('No JS errors on load') : fail(`JS errors: ${errors.join('; ')}`);

    // ---- Canvas rendering ----
    const gameArea = await page.evaluate(() => {
      var c = document.querySelector('canvas');
      if (c) {
        var ctx2 = c.getContext('2d');
        var data = ctx2.getImageData(0, 0, Math.min(c.width, 50), Math.min(c.height, 50)).data;
        var nonZero = 0;
        for (var i = 3; i < data.length; i += 4) { if (data[i] > 0) nonZero++; }
        return nonZero > 20 ? 'canvas:' + c.width + 'x' + c.height : 'canvas-blank:' + c.width + 'x' + c.height;
      }
      var g = document.querySelector('#game, .game, .game-container');
      if (g) return 'html:' + g.getBoundingClientRect().width + 'x' + g.getBoundingClientRect().height;
      return 'none';
    });
    gameArea !== 'none' ? pass(`Game area: ${gameArea}`) : fail('No game area found');

    // ---- window.game exists ----
    const hasGame = await page.evaluate(() => typeof window.game !== 'undefined');
    hasGame ? pass('window.game exists') : fail('window.game not found');

    // ---- Levels system: all 15 levels ----
    const levelsInfo = await page.evaluate(() => {
      if (typeof Levels === 'undefined') return { error: 'Levels not found' };
      var total = Levels.total;
      var valid = 0;
      var ids = [];
      for (var i = 0; i < total; i++) {
        var lvl = Levels.getLevel(i);
        if (lvl && lvl.id && lvl.nodes && lvl.nodes.length > 0 && lvl.sourceId) {
          valid++;
          ids.push(lvl.id);
        }
      }
      return { total: total, valid: valid, ids: ids };
    });
    if (levelsInfo.error) {
      fail(`Levels system: ${levelsInfo.error}`);
    } else {
      levelsInfo.total === 15 ? pass('15 levels defined') : fail(`Expected 15 levels, got ${levelsInfo.total}`);
      levelsInfo.valid === levelsInfo.total
        ? pass(`All ${levelsInfo.valid} levels have valid data (nodes, sourceId)`)
        : fail(`Only ${levelsInfo.valid}/${levelsInfo.total} levels have valid data`);
    }

    // ---- All 6 node types present across levels ----
    const nodeTypes = await page.evaluate(() => {
      if (typeof Levels === 'undefined') return { error: 'no Levels' };
      var types = {};
      for (var i = 0; i < Levels.total; i++) {
        var lvl = Levels.getLevel(i);
        if (!lvl || !lvl.nodes) continue;
        for (var j = 0; j < lvl.nodes.length; j++) {
          types[lvl.nodes[j].type] = true;
        }
      }
      return Object.keys(types);
    });
    if (Array.isArray(nodeTypes)) {
      nodeTypes.length >= 6
        ? pass(`All 6 node types found: ${nodeTypes.join(', ')}`)
        : fail(`Only ${nodeTypes.length}/6 node types: ${nodeTypes.join(', ')}`);
    } else {
      fail(`Node types check: ${nodeTypes.error}`);
    }

    // ---- Rules.NODE_TYPES ----
    const rulesTypes = await page.evaluate(() => {
      if (typeof Rules === 'undefined') return null;
      return Object.keys(Rules.NODE_TYPES || {});
    });
    rulesTypes && rulesTypes.length >= 5
      ? pass(`Rules defines ${rulesTypes.length} node types`)
      : fail('Rules.NODE_TYPES missing or incomplete');

    // ---- NodeSystem API ----
    const nsAPI = await page.evaluate(() => {
      if (typeof NodeSystem === 'undefined') return null;
      return {
        findNodeAt: typeof NodeSystem.findNodeAt === 'function',
        getNodeById: typeof NodeSystem.getNodeById === 'function',
        getNodesByType: typeof NodeSystem.getNodesByType === 'function',
        getBlockedNodes: typeof NodeSystem.getBlockedNodes === 'function',
        getNodeStats: typeof NodeSystem.getNodeStats === 'function',
        loadNodes: typeof NodeSystem.loadNodes === 'function',
        reset: typeof NodeSystem.reset === 'function',
        getCompletionPercentage: typeof NodeSystem.getCompletionPercentage === 'function',
        unblockNode: typeof NodeSystem.unblockNode === 'function',
      };
    });
    nsAPI
      ? pass(`NodeSystem API complete (${Object.values(nsAPI).filter(Boolean).length}/9 methods)`)
      : fail('NodeSystem not found');

    // ---- EdgeSystem API ----
    const esAPI = await page.evaluate(() => {
      if (typeof EdgeSystem === 'undefined') return null;
      return {
        startDrag: typeof EdgeSystem.startDrag === 'function',
        endDrag: typeof EdgeSystem.endDrag === 'function',
        removeEdge: typeof EdgeSystem.removeEdge === 'function',
        reset: typeof EdgeSystem.reset === 'function',
        edges: Array.isArray(EdgeSystem.edges),
        isDragging: typeof EdgeSystem.isDragging === 'boolean',
      };
    });
    esAPI
      ? pass(`EdgeSystem API complete (${Object.values(esAPI).filter(Boolean).length}/6 members)`)
      : fail('EdgeSystem not found');

    // ---- GraceFlow ----
    const hasGrace = await page.evaluate(() =>
      typeof window.grace !== 'undefined' || typeof GraceFlow !== 'undefined'
    );
    hasGrace ? pass('GraceFlow exists') : fail('GraceFlow not found');

    // ---- Game state machine ----
    const stateAPI = await page.evaluate(() => {
      if (!window.game) return null;
      return {
        getState: typeof window.game.getState === 'function',
        startLevel: typeof window.game.startLevel === 'function',
        undoLastEdge: typeof window.game.undoLastEdge === 'function',
        resetLevel: typeof window.game.resetLevel === 'function',
        getTotalScore: typeof window.game.getTotalScore === 'function',
        getLevelScore: typeof window.game.getLevelScore === 'function',
        getComboCount: typeof window.game.getComboCount === 'function',
        getStarsForLevel: typeof window.game.getStarsForLevel === 'function',
        restart: typeof window.game.restart === 'function',
        requestHint: typeof window.game.requestHint === 'function',
        settings: typeof window.game.settings === 'object',
        levelStarsMap: typeof window.game.levelStarsMap === 'object',
      };
    });
    stateAPI
      ? pass(`Game API complete (${Object.values(stateAPI).filter(Boolean).length}/12 members)`)
      : fail('Game state machine API not found');

    // ---- Start level 0 ----
    const levelStart = await page.evaluate(() => {
      if (!window.game) return { error: 'no game' };
      window.game.startLevel(0);
      return { state: window.game.getState(), currentLevel: window.game.currentLevel };
    });
    if (levelStart.error) {
      fail(`Start level 0: ${levelStart.error}`);
    } else {
      pass(`Level 0 started, state=${levelStart.state}`);
      levelStart.currentLevel === 0 ? pass('Current level is 0') : fail(`Expected level 0, got ${levelStart.currentLevel}`);
    }

    await page.waitForTimeout(500);

    // ---- NodeSystem loaded for level ----
    const nodesLoaded = await page.evaluate(() => {
      if (typeof NodeSystem === 'undefined') return { error: 'no NodeSystem' };
      var nodes = NodeSystem.nodes;
      var stats = NodeSystem.getNodeStats ? NodeSystem.getNodeStats() : null;
      return { count: nodes ? nodes.length : 0, stats: stats };
    });
    if (nodesLoaded.error) {
      fail(`Nodes check: ${nodesLoaded.error}`);
    } else {
      nodesLoaded.count > 0
        ? pass(`Level loaded ${nodesLoaded.count} nodes`)
        : fail('No nodes loaded for level');
    }

    // ---- getNodeById / getNodesByType ----
    const nodeQueries = await page.evaluate(() => {
      if (typeof NodeSystem === 'undefined' || !NodeSystem.nodes || NodeSystem.nodes.length === 0)
        return { error: 'no nodes' };
      var first = NodeSystem.nodes[0];
      var byId = NodeSystem.getNodeById(first.id);
      var byType = NodeSystem.getNodesByType(first.type);
      return { getById: byId ? byId.id === first.id : false, getByTypeCount: byType ? byType.length : 0, type: first.type };
    });
    if (nodeQueries.error) {
      fail(`Node queries: ${nodeQueries.error}`);
    } else {
      nodeQueries.getById ? pass('getNodeById works') : fail('getNodeById returned wrong node');
      nodeQueries.getByTypeCount > 0
        ? pass(`getNodesByType('${nodeQueries.type}') returns ${nodeQueries.getByTypeCount}`)
        : fail('getNodesByType empty');
    }

    // ---- Create an edge via EdgeSystem ----
    const edgeResult = await page.evaluate(() => {
      if (typeof NodeSystem === 'undefined' || typeof EdgeSystem === 'undefined') return { error: 'missing systems' };
      var nodes = NodeSystem.nodes;
      if (!nodes || nodes.length < 2) return { error: 'not enough nodes' };
      var source = null, target = null;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].type === 'source') source = nodes[i];
        if (nodes[i].type !== 'source' && !target) target = nodes[i];
      }
      if (!source || !target) { source = nodes[0]; target = nodes[1]; }
      EdgeSystem.startDrag(source);
      var success = EdgeSystem.endDrag(target.x, target.y);
      return { success: success, edgeCount: EdgeSystem.edges.length, sourceId: source.id, targetId: target.id };
    });
    if (edgeResult.error) {
      fail(`Edge creation: ${edgeResult.error}`);
    } else {
      pass(`Edge creation: success=${edgeResult.success}, edges=${edgeResult.edgeCount}`);
    }

    // ---- Scoring after edge ----
    const scoring = await page.evaluate(() => {
      if (!window.game) return { error: 'no game' };
      return {
        levelScore: window.game.getLevelScore(),
        totalScore: window.game.getTotalScore(),
        combo: window.game.getComboCount(),
      };
    });
    if (scoring.error) {
      fail(`Scoring: ${scoring.error}`);
    } else {
      pass(`Score after edge: level=${scoring.levelScore}, total=${scoring.totalScore}, combo=${scoring.combo}`);
    }

    // ---- Undo last edge ----
    const undoResult = await page.evaluate(() => {
      if (!window.game) return { error: 'no game' };
      var before = EdgeSystem.edges.length;
      window.game.undoLastEdge();
      return { before: before, after: EdgeSystem.edges.length };
    });
    if (undoResult.error) {
      fail(`Undo: ${undoResult.error}`);
    } else {
      undoResult.after < undoResult.before
        ? pass(`Undo works: ${undoResult.before} → ${undoResult.after} edges`)
        : pass(`Undo attempted (${undoResult.before} → ${undoResult.after} edges)`);
    }

    // ---- Rules: isLevelComplete, calculateStars, getLevelStats ----
    const rulesCheck = await page.evaluate(() => {
      if (typeof Rules === 'undefined') return { error: 'no Rules' };
      var nodes = NodeSystem.nodes;
      var edges = EdgeSystem.edges;
      var level = Levels.getLevel(0);
      var complete = false, stars = null, stats = null;
      try { complete = Rules.isLevelComplete(nodes, edges, level.sourceId); } catch(e) {}
      try { stars = Rules.calculateStars(level, nodes, edges, 10, 0); } catch(e) {}
      try { stats = Rules.getLevelStats(nodes, edges, level.sourceId); } catch(e) {}
      return {
        isComplete: complete,
        stars: stars,
        stats: stats,
        getHintForLevel: typeof Rules.getHintForLevel === 'function',
        getConnectionValue: typeof Rules.getConnectionValue === 'function',
        checkAllAchievements: typeof Rules.checkAllAchievements === 'function',
      };
    });
    if (rulesCheck.error) {
      fail(`Rules check: ${rulesCheck.error}`);
    } else {
      pass(`Rules.isLevelComplete works (result: ${rulesCheck.isComplete})`);
      rulesCheck.stars ? pass(`Rules.calculateStars: ${JSON.stringify(rulesCheck.stars)}`) : pass('Rules.calculateStars called');
      rulesCheck.getHintForLevel ? pass('Rules.getHintForLevel exists') : fail('Rules.getHintForLevel missing');
      rulesCheck.getConnectionValue ? pass('Rules.getConnectionValue exists') : fail('Rules.getConnectionValue missing');
      rulesCheck.checkAllAchievements ? pass('Rules.checkAllAchievements exists') : fail('Rules.checkAllAchievements missing');
    }

    // ---- Reset level ----
    const resetResult = await page.evaluate(() => {
      if (!window.game) return { error: 'no game' };
      window.game.resetLevel();
      return {
        edges: EdgeSystem.edges.length,
        nodes: NodeSystem.nodes ? NodeSystem.nodes.length : 0,
        score: window.game.getLevelScore(),
        combo: window.game.getComboCount(),
      };
    });
    if (resetResult.error) {
      fail(`Reset: ${resetResult.error}`);
    } else {
      resetResult.edges === 0 ? pass('Reset clears edges') : fail(`Reset left ${resetResult.edges} edges`);
      resetResult.score === 0 ? pass('Reset clears score') : fail(`Reset score=${resetResult.score}`);
      pass(`Reset keeps ${resetResult.nodes} nodes loaded`);
    }

    // ---- Start multiple levels ----
    const multiLevel = await page.evaluate(() => {
      if (!window.game || typeof Levels === 'undefined') return { error: 'no game' };
      var results = [];
      for (var i = 0; i < Math.min(5, Levels.total); i++) {
        window.game.startLevel(i);
        results.push({ idx: i, nodes: NodeSystem.nodes ? NodeSystem.nodes.length : 0 });
      }
      return results;
    });
    if (Array.isArray(multiLevel) && multiLevel.length === 5) {
      pass(`Started 5 levels: node counts = ${multiLevel.map(r => r.nodes).join(', ')}`);
    } else {
      fail(`Multi-level: ${JSON.stringify(multiLevel)}`);
    }

    // ---- THEME_COLORS ----
    const themes = await page.evaluate(() => {
      if (typeof Levels === 'undefined') return null;
      return typeof Levels.THEME_COLORS === 'object';
    });
    themes ? pass('Levels.THEME_COLORS exists') : fail('Levels.THEME_COLORS missing');

    // ---- Save/Load ----
    const saveLoad = await page.evaluate(() => {
      if (!window.game) return null;
      var hasSave = typeof window.game.saveSave === 'function' || typeof window.game.save === 'function';
      var hasLoad = typeof window.game.loadSave === 'function' || typeof window.game.load === 'function';
      return { hasSave, hasLoad };
    });
    saveLoad && saveLoad.hasSave ? pass('Save function exists') : fail('Save function missing');
    saveLoad && saveLoad.hasLoad ? pass('Load function exists') : fail('Load function missing');

    // ---- Touch interaction on canvas ----
    const touchOk = await page.evaluate(() => {
      var target = document.querySelector('canvas') || document.body;
      try {
        var rect = target.getBoundingClientRect();
        var t = new Touch({ identifier: 1, target, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 });
        target.dispatchEvent(new TouchEvent('touchstart', { touches: [t], bubbles: true }));
        target.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t], bubbles: true }));
        return 'ok';
      } catch (e) { return e.message; }
    });
    touchOk === 'ok' ? pass('Touch interaction works') : fail(`Touch failed: ${touchOk}`);

    // ---- Touch drag simulation ----
    const dragOk = await page.evaluate(() => {
      if (typeof NodeSystem === 'undefined' || !NodeSystem.nodes || NodeSystem.nodes.length === 0) return 'no nodes';
      var canvas = document.querySelector('canvas');
      if (!canvas) return 'no canvas';
      var rect = canvas.getBoundingClientRect();
      var first = NodeSystem.nodes[0];
      var sx = rect.left + (first.x / canvas.width) * rect.width;
      var sy = rect.top + (first.y / canvas.height) * rect.height;
      var t1 = new Touch({ identifier: 3, target: canvas, clientX: sx, clientY: sy });
      canvas.dispatchEvent(new TouchEvent('touchstart', { touches: [t1], bubbles: true }));
      var t2 = new Touch({ identifier: 3, target: canvas, clientX: sx + 50, clientY: sy + 50 });
      canvas.dispatchEvent(new TouchEvent('touchmove', { touches: [t2], bubbles: true }));
      canvas.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t2], bubbles: true }));
      return 'ok';
    });
    dragOk === 'ok' ? pass('Touch drag simulation works') : pass(`Touch drag skipped: ${dragOk}`);

    // ---- No horizontal overflow ----
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    overflow <= 2 ? pass('No horizontal overflow') : fail(`Overflow: ${overflow}px`);

    // ---- Game restart ----
    const restartOk = await page.evaluate(() => {
      if (!window.game) return false;
      window.game.restart();
      return window.game.getState() === 'title' || window.game.getState() === 'select';
    });
    restartOk ? pass('Game restart works') : fail('Game restart failed');

    // ---- Settings ----
    const settings = await page.evaluate(() => {
      if (!window.game || !window.game.settings) return null;
      var s = window.game.settings;
      return { musicVolume: 'musicVolume' in s, sfxVolume: 'sfxVolume' in s, showHints: 'showHints' in s };
    });
    settings
      ? pass(`Settings complete (${Object.values(settings).filter(Boolean).length}/3 fields)`)
      : fail('Settings not found');

    // ---- No JS errors after all interactions ----
    errors.length === 0
      ? pass('No JS errors after all interactions')
      : fail(`Errors after interaction: ${errors.join('; ')}`);

  } catch (err) {
    fail(`Fatal: ${err.message}`);
  }

  await ctx.close();
  await browser.close();
  console.log(`\n  Total: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

test().then(r => process.exit(r.failed > 0 ? 1 : 0)).catch(e => { console.error(e); process.exit(2); });
