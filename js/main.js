/* global Game */
var Game = (function () {
  'use strict';

  var currentLevel = 0;
  var state = 'title'; // title | tutorial | select | playing | complete | gameover
  var undoStack = [];
  var currentLevelData = null;
  var touchStartTime = 0;
  var touchStartX = 0;
  var touchStartY = 0;
  var TAP_THRESHOLD = 200; // ms
  var TAP_MOVE_THRESHOLD = 10; // px
  var tutorialShown = false;

  // Scoring state
  var totalScore = 0;
  var levelScore = 0;
  var comboCount = 0;
  var lastConnectTime = 0;
  var COMBO_WINDOW = 3.0; // seconds

  // Star tracking
  var levelStarsMap = {};

  // Game time tracking
  var levelStartTime = 0;
  var totalPlayTime = 0;

  // Hint debounce
  var lastHintTime = 0;
  var HINT_COOLDOWN = 2.0;

  // 自动保存键名
  var SAVE_KEY = 'graceNet_save';
  var ACHIEVEMENT_KEY = 'graceNet_achievements';

  // 设置状态
  var settings = {
    musicVolume: 70,
    sfxVolume: 80,
    particleQuality: 'medium',
    showHints: true,
    animationsEnabled: true
  };

  function init() {
    CanvasEngine.init('gameCanvas');
    UI.init();

    CanvasEngine.update = function (dt) {
      Animation.update(dt);
      NodeSystem.update(dt);
      EdgeSystem.update(dt);
      GraceFlow.update(dt);
      UI.update(dt);
    };

    CanvasEngine.render = function (ctx) {
      var theme = currentLevelData
        ? Levels.THEME_COLORS[currentLevelData.theme] || Levels.THEME_COLORS['default']
        : Levels.THEME_COLORS['default'];
      CanvasEngine.drawGradientBg([theme.bg1, theme.bg2]);
      EdgeSystem.render(ctx);
      GraceFlow.render(ctx);
      NodeSystem.render(ctx);
      CanvasEngine.drawVignette();
    };

    CanvasEngine.onMouseDown = function (x, y) {
      if (state !== 'playing') return;

      touchStartTime = performance.now();
      touchStartX = x;
      touchStartY = y;

      var node = NodeSystem.findNodeAt(x, y);
      if (node) {
        NodeSystem.selectedNode = node;
        NodeSystem.triggerPress(node.id);
        EdgeSystem.startDrag(node);
      }
    };

    CanvasEngine.onMouseMove = function (x, y) {
      if (state !== 'playing') return;

      var node = NodeSystem.findNodeAt(x, y);
      NodeSystem.hoverNode = node;

      var canvas = CanvasEngine.canvas;
      if (node) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    };

    CanvasEngine.onMouseUp = function (x, y) {
      if (state !== 'playing') return;

      var elapsed = performance.now() - touchStartTime;
      var dx = x - touchStartX;
      var dy = y - touchStartY;
      var moved = Math.sqrt(dx * dx + dy * dy);
      var isTap = elapsed < TAP_THRESHOLD && moved < TAP_MOVE_THRESHOLD;

      if (EdgeSystem.isDragging) {
        var success = EdgeSystem.endDrag(x, y);

        if (success) {
          var lastEdge = EdgeSystem.edges[EdgeSystem.edges.length - 1];
          if (lastEdge) {
            undoStack.push({ from: lastEdge.from, to: lastEdge.to });
          }

          // Trigger ripple on target node
          if (lastEdge) {
            GraceFlow.triggerRipple(lastEdge.to);

            // Trigger burst particles on target node
            var targetNode = findNodeById(lastEdge.to);
            if (targetNode) {
              var typeInfo = Rules.NODE_TYPES[targetNode.type];
              GraceFlow.triggerBurst(lastEdge.to, typeInfo ? typeInfo.color : '#FFD700');
            }
          }

          // Show connection description as toast
          var fromNode = findNodeById(lastEdge.from);
          var toNode = findNodeById(lastEdge.to);
          if (fromNode && toNode) {
            var desc = Rules.getConnectionDescription(fromNode, toNode);
            UI.showToast(desc, 2500);

            // Score the connection
            var now = performance.now() / 1000;
            if (now - lastConnectTime < COMBO_WINDOW) {
              comboCount++;
            } else {
              comboCount = 1;
            }
            lastConnectTime = now;

            var baseScore = Rules.getConnectionValue(fromNode, toNode);
            var comboMult = Math.min(comboCount, 5);
            var points = baseScore * comboMult;
            levelScore += points;
            totalScore += points;

            UI.addScore(totalScore);
            if (comboCount > 1) {
              UI.triggerCombo(comboCount);
              if (toNode) {
                GraceFlow.triggerComboPopup(toNode.x, toNode.y, comboCount);
              }
            }
            if (toNode) {
              GraceFlow.triggerScorePopup(toNode.x + 30, toNode.y - 20, points);
            }
          }

          // Update progress
          var stats = Rules.getLevelStats(NodeSystem.nodes, EdgeSystem.edges, level.sourceId);
          UI.updateProgressAnimated(stats.progress);

          // Update hint dynamically
          updateDynamicHint();

          // Check level completion
          var level = Levels.getLevel(currentLevel);
          if (level) {
            var complete = Rules.isLevelComplete(
              NodeSystem.nodes,
              EdgeSystem.edges,
              level.sourceId
            );
            if (complete) {
              levelComplete();
            }
          }
        }
      } else if (isTap) {
        // Tap on a node: show info popup
        var tappedNode = NodeSystem.findNodeAt(x, y);
        if (tappedNode) {
          UI.showNodeInfo(tappedNode);
        } else {
          UI.hideNodeInfo();
        }
      }

      NodeSystem.selectedNode = null;
    };

    // Wire UI buttons
    UI.onTitleStart(function () {
      if (!tutorialShown) {
        tutorialShown = true;
        UI.showTutorial(function () {
          showLevelSelect();
        });
      } else {
        showLevelSelect();
      }
    });

    // Resize callback: reposition nodes smoothly
    CanvasEngine.onResize = function () {
      repositionNodes();
    };

    UI.onUndo(function () {
      undoLastEdge();
    });

    UI.onReset(function () {
      resetLevel();
    });

    // 设置面板集成
    initSettings();

    // 加载存档
    loadSave();

    // Start with title screen
    UI.showTitleScreen();
  }

  function findNodeById(id) {
    var ns = NodeSystem.nodes;
    for (var i = 0; i < ns.length; i++) {
      if (ns[i].id === id) return ns[i];
    }
    return null;
  }

  function updateDynamicHint() {
    var level = Levels.getLevel(currentLevel);
    if (!level) return;
    var hint = Rules.getHintForLevel(level, NodeSystem.nodes, EdgeSystem.edges);
    UI.setHint(hint);
  }

  function undoLastEdge() {
    if (state !== 'playing') return;
    if (undoStack.length === 0) {
      UI.showToast('没有可撤销的操作', 1500);
      return;
    }

    var lastAction = undoStack.pop();
    var removed = EdgeSystem.removeEdge(lastAction.from, lastAction.to);
    if (removed) {
      UI.showToast('已撤销上一步连接', 1500);
      updateDynamicHint();
    }
  }

  function resetLevel() {
    if (state !== 'playing') return;
    startLevel(currentLevel);
  }

  function showLevelSelect() {
    UI.showLevelSelect(function (index) {
      startLevel(index);
    });
  }

  function repositionNodes() {
    if (state !== 'playing') return;

    var level = Levels.getLevel(currentLevel);
    if (!level) return;

    var ns = NodeSystem.nodes;
    for (var i = 0; i < ns.length; i++) {
      for (var j = 0; j < level.nodes.length; j++) {
        if (ns[i].id === level.nodes[j].id) {
          Animation.tween(ns[i], { x: level.nodes[j].x, y: level.nodes[j].y }, 0.3);
          break;
        }
      }
    }
  }

  function startLevel(index) {
    currentLevel = index;
    state = 'title';
    undoStack = [];

    var level = Levels.getLevel(index);
    if (!level) return;

    currentLevelData = level;

    NodeSystem.reset();
    EdgeSystem.reset();
    GraceFlow.reset();

    NodeSystem.loadNodes(level.nodes);

    UI.updateHUD(level.title, '关卡 ' + (index + 1) + ' / ' + Levels.total);
    UI.hideGameControls();

    // Show narrative text if available
    if (level.narrative) {
      UI.showNarrative(level.narrative);
    }

    levelStartTime = performance.now() / 1000;
    levelScore = 0;

    UI.showLevelTitle(level.title, level.subtitle, function () {
      state = 'playing';
      GraceFlow.activate();
      UI.updateHUD(level.title, '关卡 ' + (index + 1) + ' / ' + Levels.total);
      UI.setHint(level.hint);
      UI.showGameControls();
    });
  }

  function levelComplete() {
    state = 'complete';

    GraceFlow.activate();
    GraceFlow.triggerCelebration();
    CanvasEngine.shakeScreen(3, 0.5);
    CanvasEngine.flash('#FFD700', 0.4);

    UI.clearHint();
    UI.hideGameControls();

    var level = Levels.getLevel(currentLevel);
    var title = level ? level.title : '';
    UI.updateHUD(title, '✦ 恩典已流遍 ✦');

    // Calculate star rating
    var elapsed = (performance.now() / 1000) - levelStartTime;
    var starResult = Rules.calculateStars(level, NodeSystem.nodes, EdgeSystem.edges, elapsed, undoStack.length);
    var stars = starResult.stars;
    UI.setStars(stars);
    UI.setLevelStars(currentLevel, stars);
    levelStarsMap[currentLevel] = stars;

    UI.recordBestScore(currentLevel, levelScore);

    // 成就检查
    checkAchievementsOnComplete();

    // 自动保存
    saveSave();

    setTimeout(function () {
      if (currentLevel >= Levels.total - 1) {
        GraceFlow.triggerCelebration();
        UI.showGameComplete(function () {
          restart();
        });
      } else {
        UI.showCompletion(function () {
          transitionToNextLevel();
        });
      }
    }, 2000);
  }

  /** 初始化设置面板绑定 */
  function initSettings() {
    var musicSlider = document.getElementById('musicSlider');
    var sfxSlider = document.getElementById('sfxSlider');
    var particleSelect = document.getElementById('particleSelect');
    var hintToggle = document.getElementById('hintToggle');
    var animToggle = document.getElementById('animToggle');
    var settingsBtn = document.getElementById('settingsBtn');
    var settingsPanel = document.getElementById('settingsPanel');
    var settingsClose = document.getElementById('settingsClose');

    if (musicSlider) {
      musicSlider.addEventListener('input', function () {
        settings.musicVolume = parseInt(this.value);
        saveSettings();
      });
    }
    if (sfxSlider) {
      sfxSlider.addEventListener('input', function () {
        settings.sfxVolume = parseInt(this.value);
        saveSettings();
      });
    }
    if (particleSelect) {
      particleSelect.addEventListener('change', function () {
        settings.particleQuality = this.value;
        applyParticleQuality();
        saveSettings();
      });
    }
    if (hintToggle) {
      hintToggle.addEventListener('click', function () {
        settings.showHints = !settings.showHints;
        this.classList.toggle('active', settings.showHints);
        saveSettings();
      });
    }
    if (animToggle) {
      animToggle.addEventListener('click', function () {
        settings.animationsEnabled = !settings.animationsEnabled;
        this.classList.toggle('active', settings.animationsEnabled);
        saveSettings();
      });
    }
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function () {
        if (settingsPanel) settingsPanel.classList.toggle('hidden');
      });
    }
    if (settingsClose) {
      settingsClose.addEventListener('click', function () {
        if (settingsPanel) settingsPanel.classList.add('hidden');
      });
    }
  }

  /** 保存设置到 localStorage */
  function saveSettings() {
    try {
      localStorage.setItem('graceNet_settings', JSON.stringify(settings));
    } catch (e) { /* 静默失败 */ }
  }

  /** 加载设置 */
  function loadSettings() {
    try {
      var saved = localStorage.getItem('graceNet_settings');
      if (saved) {
        var parsed = JSON.parse(saved);
        var keys = Object.keys(parsed);
        for (var i = 0; i < keys.length; i++) {
          if (settings.hasOwnProperty(keys[i])) {
            settings[keys[i]] = parsed[keys[i]];
          }
        }
      }
    } catch (e) { /* 静默失败 */ }
  }

  /** 应用粒子质量设置 */
  function applyParticleQuality() {
    var level = settings.particleQuality;
    if (level === 'low') {
      GraceFlow.throttleEffects(0.5);
    } else if (level === 'high') {
      GraceFlow.throttleEffects(1.5);
    } else {
      GraceFlow.throttleEffects(1.0);
    }
  }

  /** 保存游戏进度 */
  function saveSave() {
    try {
      var data = {
        levelStarsMap: levelStarsMap,
        totalScore: totalScore,
        highestLevel: Math.max.apply(null, Object.keys(levelStarsMap).map(Number).concat([0])),
        settings: settings,
        timestamp: Date.now()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { /* 静默失败 */ }
  }

  /** 加载游戏进度 */
  function loadSave() {
    loadSettings();
    applyParticleQuality();
    try {
      var saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        var data = JSON.parse(saved);
        if (data.levelStarsMap) {
          var lvlKeys = Object.keys(data.levelStarsMap);
          for (var i = 0; i < lvlKeys.length; i++) {
            levelStarsMap[lvlKeys[i]] = data.levelStarsMap[lvlKeys[i]];
            UI.setLevelStars(parseInt(lvlKeys[i]), data.levelStarsMap[lvlKeys[i]]);
          }
        }
        if (data.totalScore) {
          totalScore = data.totalScore;
          UI.addScore(totalScore);
        }
      }
    } catch (e) { /* 静默失败 */ }
  }

  /** 检查并触发成就 */
  function checkAchievementsOnComplete() {
    if (typeof Rules === 'undefined' || !Rules.checkAllAchievements) return;
    var level = Levels.getLevel(currentLevel);
    var elapsed = (performance.now() / 1000) - levelStartTime;

    var context = {
      levelIndex: currentLevel,
      level: level,
      nodes: NodeSystem.nodes,
      edges: EdgeSystem.edges,
      elapsed: elapsed,
      undoCount: undoStack.length,
      score: levelScore,
      combo: comboCount,
      totalScore: totalScore,
      levelStarsMap: levelStarsMap,
      totalLevels: Levels.total
    };

    var newAchievements = Rules.checkAllAchievements(context);
    for (var i = 0; i < newAchievements.length; i++) {
      UI.showAchievement(newAchievements[i]);
    }

    // 保存成就
    if (Rules.saveAchievements) {
      Rules.saveAchievements();
    }
  }

  /** 关卡过渡动画 */
  function transitionToNextLevel() {
    CanvasEngine.fadeOut(1.5, '#000000', function () {
      startLevel(currentLevel + 1);
      CanvasEngine.fadeIn(1.5, '#000000');
    });
  }

  function restart() {
    currentLevel = 0;
    totalScore = 0;
    levelScore = 0;
    comboCount = 0;
    lastConnectTime = 0;
    levelStarsMap = {};
    totalPlayTime = 0;
    UI.resetScore();
    UI.resetProgress();
    UI.showTitleScreen();
  }

  function getTotalScore() {
    return totalScore;
  }

  function getLevelScore() {
    return levelScore;
  }

  function getComboCount() {
    return comboCount;
  }

  function getStarsForLevel(index) {
    return levelStarsMap[index] || 0;
  }

  function getTotalPlayTime() {
    return totalPlayTime;
  }

  function getState() {
    return state;
  }

  function requestHint() {
    var now = performance.now() / 1000;
    if (now - lastHintTime < HINT_COOLDOWN) return;
    lastHintTime = now;
    updateDynamicHint();
    UI.showToast('提示已更新', 1500);
  }

  // Bootstrap
  document.addEventListener('DOMContentLoaded', function () {
    init();
    CanvasEngine.start();
  });

  return {
    get currentLevel() { return currentLevel; },
    get state() { return state; },
    init: init,
    startLevel: startLevel,
    levelComplete: levelComplete,
    restart: restart,
    undoLastEdge: undoLastEdge,
    resetLevel: resetLevel,
    getTotalScore: getTotalScore,
    getLevelScore: getLevelScore,
    getComboCount: getComboCount,
    getStarsForLevel: getStarsForLevel,
    getTotalPlayTime: getTotalPlayTime,
    getState: getState,
    requestHint: requestHint,
    get settings() { return settings; },
    get levelStarsMap() { return levelStarsMap; },
    saveSave: saveSave,
    loadSave: loadSave,
    transitionToNextLevel: transitionToNextLevel
  };
})();

// Expose game systems for testing
window.game = Game;
window.nodes = NodeSystem.nodes;
window.edges = EdgeSystem.edges;
window.grace = GraceFlow;
window.currentLevel = 0;

// Keep window.currentLevel in sync
var _origStartLevel = Game.startLevel;
Game.startLevel = function (index) {
  window.currentLevel = index;
  _origStartLevel(index);
};
