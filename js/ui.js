/* global UI */
var UI = (function () {
  'use strict';

  var dom = {};
  var toastTimer = null;
  var narrativeQueue = [];
  var narrativeActive = false;

  // Settings state
  var settings = {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    particleQuality: 'high',
    showHints: true,
    showAnimations: true
  };

  // Score/combo display state
  var scoreDisplay = 0;
  var scoreTarget = 0;
  var comboCount = 0;
  var comboTimer = 0;
  var starCount = 0;
  var levelStars = [];
  var animatedProgress = 0;
  var targetProgress = 0;
  var pulseElements = [];

  // Stagger animation tracking
  var staggerQueue = [];
  var staggerTimer = 0;

  function init() {
    dom.hudLevel     = document.getElementById('hudLevel');
    dom.hudStatus    = document.getElementById('hudStatus');
    dom.hudProgressFill = document.getElementById('hudProgressFill');
    dom.hint         = document.getElementById('hint');
    dom.modal        = document.getElementById('modal');
    dom.modalTitle   = document.getElementById('modalTitle');
    dom.modalBody    = document.getElementById('modalBody');
    dom.modalBtn     = document.getElementById('modalBtn');
    dom.levelTitle   = document.getElementById('levelTitle');
    dom.levelTitleMain  = document.getElementById('levelTitleMain');
    dom.levelTitleSub   = document.getElementById('levelTitleSub');
    dom.titleScreen  = document.getElementById('titleScreen');
    dom.titleBtn     = document.getElementById('titleBtn');
    dom.undoBtn      = document.getElementById('undoBtn');
    dom.resetBtn     = document.getElementById('resetBtn');
    dom.toast        = document.getElementById('toast');
    dom.narrative    = document.getElementById('narrative');
    dom.tutorial     = document.getElementById('tutorial');
    dom.tutorialBtn  = document.getElementById('tutorialBtn');
    dom.levelSelect  = document.getElementById('levelSelect');
    dom.levelGrid    = document.getElementById('levelGrid');
    dom.levelSelectBack = document.getElementById('levelSelectBack');
    dom.nodeInfo     = document.getElementById('nodeInfo');
    dom.nodeInfoName = document.getElementById('nodeInfoName');
    dom.nodeInfoType = document.getElementById('nodeInfoType');
    dom.nodeInfoDesc = document.getElementById('nodeInfoDesc');
    dom.scoreDisplay = document.getElementById('scoreDisplay');
    dom.comboDisplay = document.getElementById('comboDisplay');
    dom.starDisplay = document.getElementById('starDisplay');
    dom.settingsPanel = document.getElementById('settingsPanel');
    dom.settingsBtn = document.getElementById('settingsBtn');
    dom.settingsClose = document.getElementById('settingsClose');
    dom.musicSlider = document.getElementById('musicSlider');
    dom.sfxSlider = document.getElementById('sfxSlider');
    dom.particleSelect = document.getElementById('particleSelect');
    dom.hintToggle = document.getElementById('hintToggle');
    dom.animToggle = document.getElementById('animToggle');
    dom.levelStarsRow = document.getElementById('levelStarsRow');
    dom.achievementBanner = document.getElementById('achievementBanner');
    dom.achievementIcon = document.getElementById('achievementIcon');
    dom.achievementName = document.getElementById('achievementName');
    dom.achievementDesc = document.getElementById('achievementDesc');
    dom.achievementPanel = document.getElementById('achievementPanel');
    dom.achievementList = document.getElementById('achievementList');
    dom.achievementClose = document.getElementById('achievementClose');
    dom.dialogueBox = document.getElementById('dialogueBox');
    dom.dialogueAvatar = document.getElementById('dialogueAvatar');
    dom.speakerName = document.getElementById('speakerName');
    dom.dialogueText = document.getElementById('dialogueText');
    dom.statsPanel = document.getElementById('statsPanel');
    dom.statEdges = document.getElementById('statEdges');
    dom.statTime = document.getElementById('statTime');
    dom.statCombo = document.getElementById('statCombo');
    dom.statScore = document.getElementById('statScore');
    dom.statStars = document.getElementById('statStars');
  }

  // --- Title screen ---

  function showTitleScreen() {
    if (dom.titleScreen) {
      dom.titleScreen.classList.remove('hidden');
    }
    hideGameControls();
  }

  function hideTitleScreen() {
    if (dom.titleScreen) {
      dom.titleScreen.classList.add('hidden');
    }
  }

  function onTitleStart(callback) {
    if (dom.titleBtn) {
      var btn = dom.titleBtn;
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      dom.titleBtn = newBtn;
      newBtn.addEventListener('click', function () {
        hideTitleScreen();
        if (callback) callback();
      });
    }
  }

  // --- Game controls (undo/reset) ---

  function showGameControls() {
    if (dom.undoBtn) dom.undoBtn.classList.remove('hidden');
    if (dom.resetBtn) dom.resetBtn.classList.remove('hidden');
  }

  function hideGameControls() {
    if (dom.undoBtn) dom.undoBtn.classList.add('hidden');
    if (dom.resetBtn) dom.resetBtn.classList.add('hidden');
  }

  function onUndo(callback) {
    if (dom.undoBtn) {
      var btn = dom.undoBtn;
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      dom.undoBtn = newBtn;
      newBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (callback) callback();
      });
    }
  }

  function onReset(callback) {
    if (dom.resetBtn) {
      var btn = dom.resetBtn;
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      dom.resetBtn = newBtn;
      newBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (callback) callback();
      });
    }
  }

  // --- Level title ---

  function showLevelTitle(title, subtitle, callback) {
    dom.levelTitleMain.textContent = title;
    dom.levelTitleSub.textContent = subtitle;
    dom.levelTitle.classList.remove('hidden', 'fade-out');

    setTimeout(function () {
      dom.levelTitle.classList.add('fade-out');
      setTimeout(function () {
        dom.levelTitle.classList.add('hidden');
        dom.levelTitle.classList.remove('fade-out');
        if (callback) callback();
      }, 800);
    }, 2000);
  }

  function hideLevelTitle() {
    dom.levelTitle.classList.add('fade-out');
    setTimeout(function () {
      dom.levelTitle.classList.add('hidden');
      dom.levelTitle.classList.remove('fade-out');
    }, 800);
  }

  // --- HUD ---

  function updateHUD(levelName, statusText) {
    if (dom.hudLevel) dom.hudLevel.textContent = levelName;
    if (dom.hudStatus) dom.hudStatus.textContent = statusText;
  }

  // --- Hint ---

  function setHint(text) {
    if (!dom.hint) return;
    dom.hint.textContent = text;
    dom.hint.style.opacity = '1';
  }

  function clearHint() {
    if (!dom.hint) return;
    dom.hint.style.opacity = '0';
  }

  // --- Toast notifications ---

  function showToast(text, duration) {
    if (!dom.toast) return;
    dom.toast.textContent = text;
    dom.toast.classList.add('visible');

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(function () {
      dom.toast.classList.remove('visible');
      toastTimer = null;
    }, duration || 2500);
  }

  // --- Narrative display ---

  function showNarrative(text) {
    if (!dom.narrative) return;
    dom.narrative.textContent = text;
    dom.narrative.classList.add('visible');

    setTimeout(function () {
      dom.narrative.classList.remove('visible');
    }, 5000);
  }

  // --- Modal ---

  function showModal(title, body, btnText, callback) {
    if (dom.modalTitle) dom.modalTitle.textContent = title;
    if (dom.modalBody) dom.modalBody.textContent = body;
    if (dom.modalBtn) dom.modalBtn.textContent = btnText;
    dom.modal.classList.remove('hidden');

    // Remove previous listeners by cloning
    var newBtn = dom.modalBtn.cloneNode(true);
    dom.modalBtn.parentNode.replaceChild(newBtn, dom.modalBtn);
    dom.modalBtn = newBtn;

    dom.modalBtn.addEventListener('click', function () {
      hideModal();
      if (callback) callback();
    });
  }

  function hideModal() {
    dom.modal.classList.add('hidden');
  }

  function showCompletion(callback) {
    GraceFlow.activate();
    showModal(
      '关卡完成！',
      '恩典已经流遍整个网络。',
      '继续',
      callback
    );
  }

  function showGameComplete(callback) {
    GraceFlow.activate();
    showModal(
      '通关完成',
      '所有恩典之网已连接。恩典如水，润泽万物。',
      '重新开始',
      callback
    );
  }

  function update(dt) {
    // Animate score counter
    if (scoreDisplay !== scoreTarget) {
      var diff = scoreTarget - scoreDisplay;
      var step = Math.max(1, Math.ceil(Math.abs(diff) * dt * 5));
      if (diff > 0) {
        scoreDisplay = Math.min(scoreTarget, scoreDisplay + step);
      } else {
        scoreDisplay = Math.max(scoreTarget, scoreDisplay - step);
      }
      if (dom.scoreDisplay) {
        dom.scoreDisplay.textContent = scoreDisplay;
      }
    }

    // Animate combo timer
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        comboCount = 0;
        if (dom.comboDisplay) {
          dom.comboDisplay.classList.remove('visible');
        }
      }
    }

    // Animate progress bar smoothly
    if (animatedProgress !== targetProgress) {
      var pDiff = targetProgress - animatedProgress;
      animatedProgress += pDiff * dt * 5;
      if (Math.abs(animatedProgress - targetProgress) < 0.005) {
        animatedProgress = targetProgress;
      }
      if (dom.hudProgressFill) {
        dom.hudProgressFill.style.width = Math.round(animatedProgress * 100) + '%';
      }
    }

    // Stagger animation queue
    if (staggerQueue.length > 0) {
      staggerTimer -= dt;
      if (staggerTimer <= 0) {
        var item = staggerQueue.shift();
        if (item && item.action) item.action();
        staggerTimer = 0.05;
      }
    }

    // Pulse elements
    for (var pi = pulseElements.length - 1; pi >= 0; pi--) {
      var pe = pulseElements[pi];
      pe.timer -= dt;
      if (pe.timer <= 0) {
        pe.el.classList.remove('pulse');
        pulseElements.splice(pi, 1);
      }
    }

    // Dialogue typing effect
    updateDialogueTyping(dt);

    // Floating texts
    updateFloatingTexts(dt);

    // Screen shake
    updateScreenShake(dt);
  }

  // --- Score display ---

  function setScore(value) {
    scoreTarget = value;
  }

  function getScore() {
    return scoreTarget;
  }

  function addScore(points) {
    scoreTarget += points;
    if (dom.scoreDisplay) {
      dom.scoreDisplay.classList.add('pulse');
      pulseElements.push({ el: dom.scoreDisplay, timer: 0.5 });
    }
  }

  function resetScore() {
    scoreTarget = 0;
    scoreDisplay = 0;
    if (dom.scoreDisplay) {
      dom.scoreDisplay.textContent = '0';
    }
  }

  // --- Combo display ---

  function triggerCombo(count) {
    comboCount = count;
    comboTimer = 3.0;
    if (dom.comboDisplay) {
      dom.comboDisplay.textContent = count + 'x 连击';
      dom.comboDisplay.classList.add('visible');
    }
  }

  function getCombo() {
    return comboCount;
  }

  function clearCombo() {
    comboCount = 0;
    comboTimer = 0;
    if (dom.comboDisplay) {
      dom.comboDisplay.classList.remove('visible');
    }
  }

  // --- Star display ---

  function setStars(count) {
    starCount = count;
    if (dom.starDisplay) {
      var starsHtml = '';
      for (var i = 0; i < 3; i++) {
        starsHtml += i < count ? '★' : '☆';
      }
      dom.starDisplay.textContent = starsHtml;
      if (count > 0) {
        dom.starDisplay.classList.add('visible');
      }
    }
  }

  function getStars() {
    return starCount;
  }

  function setLevelStars(levelIndex, count) {
    while (levelStars.length <= levelIndex) {
      levelStars.push(0);
    }
    levelStars[levelIndex] = Math.max(levelStars[levelIndex], count);
  }

  function getLevelStars(levelIndex) {
    return levelStars[levelIndex] || 0;
  }

  function getTotalStars() {
    var total = 0;
    for (var i = 0; i < levelStars.length; i++) {
      total += levelStars[i];
    }
    return total;
  }

  // --- Animated progress ---

  function updateProgressAnimated(ratio) {
    targetProgress = ratio;
  }

  function getAnimatedProgress() {
    return animatedProgress;
  }

  function resetProgress() {
    animatedProgress = 0;
    targetProgress = 0;
    if (dom.hudProgressFill) {
      dom.hudProgressFill.style.width = '0%';
    }
  }

  // --- Settings panel ---

  function showSettings() {
    if (dom.settingsPanel) {
      dom.settingsPanel.classList.remove('hidden');
      // Sync UI with current settings
      if (dom.musicSlider) dom.musicSlider.value = settings.musicVolume;
      if (dom.sfxSlider) dom.sfxSlider.value = settings.sfxVolume;
      if (dom.particleSelect) dom.particleSelect.value = settings.particleQuality;
      if (dom.hintToggle) dom.hintToggle.checked = settings.showHints;
      if (dom.animToggle) dom.animToggle.checked = settings.showAnimations;
    }
  }

  function hideSettings() {
    if (dom.settingsPanel) {
      dom.settingsPanel.classList.add('hidden');
    }
  }

  function toggleSettings() {
    if (dom.settingsPanel && dom.settingsPanel.classList.contains('hidden')) {
      showSettings();
    } else {
      hideSettings();
    }
  }

  function getSettings() {
    return {
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
      particleQuality: settings.particleQuality,
      showHints: settings.showHints,
      showAnimations: settings.showAnimations
    };
  }

  function applySetting(key, value) {
    if (key in settings) {
      settings[key] = value;
    }
  }

  function wireSettings() {
    if (dom.settingsBtn) {
      var btn = dom.settingsBtn;
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      dom.settingsBtn = newBtn;
      newBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSettings();
      });
    }

    if (dom.settingsClose) {
      var cls = dom.settingsClose;
      var newCls = cls.cloneNode(true);
      cls.parentNode.replaceChild(newCls, cls);
      dom.settingsClose = newCls;
      newCls.addEventListener('click', function (e) {
        e.stopPropagation();
        hideSettings();
      });
    }

    if (dom.musicSlider) {
      dom.musicSlider.addEventListener('input', function () {
        settings.musicVolume = parseFloat(this.value);
      });
    }

    if (dom.sfxSlider) {
      dom.sfxSlider.addEventListener('input', function () {
        settings.sfxVolume = parseFloat(this.value);
      });
    }

    if (dom.particleSelect) {
      dom.particleSelect.addEventListener('change', function () {
        settings.particleQuality = this.value;
      });
    }

    if (dom.hintToggle) {
      dom.hintToggle.addEventListener('change', function () {
        settings.showHints = this.checked;
      });
    }

    if (dom.animToggle) {
      dom.animToggle.addEventListener('change', function () {
        settings.showAnimations = this.checked;
      });
    }
  }

  // --- Enhanced level select with stars ---

  function showLevelSelectEnhanced(callback) {
    if (dom.levelSelect) {
      dom.levelSelect.classList.remove('hidden');
    }
    hideGameControls();

    if (dom.levelGrid) {
      dom.levelGrid.innerHTML = '';
      for (var i = 0; i < Levels.total; i++) {
        (function (index) {
          var card = document.createElement('div');
          card.className = 'level-card';

          var num = document.createElement('div');
          num.className = 'level-card-num';
          num.textContent = index + 1;

          var name = document.createElement('div');
          name.className = 'level-card-name';
          name.textContent = Levels.LEVELS[index].title;

          // Star display on card
          var starsEl = document.createElement('div');
          starsEl.className = 'level-card-stars';
          var earned = levelStars[index] || 0;
          var starsText = '';
          for (var s = 0; s < 3; s++) {
            starsText += s < earned ? '★' : '☆';
          }
          starsEl.textContent = starsText;

          // Difficulty indicator
          var diff = Levels.LEVELS[index].difficulty || 1;
          var diffEl = document.createElement('div');
          diffEl.className = 'level-card-diff';
          var diffText = '';
          for (var d = 0; d < diff; d++) diffText += '●';
          diffEl.textContent = diffText;

          card.appendChild(num);
          card.appendChild(name);
          card.appendChild(starsEl);
          card.appendChild(diffEl);

          card.addEventListener('click', function () {
            hideLevelSelect();
            if (callback) callback(index);
          });

          dom.levelGrid.appendChild(card);
        })(i);
      }
    }

    var newBack = dom.levelSelectBack.cloneNode(true);
    dom.levelSelectBack.parentNode.replaceChild(newBack, dom.levelSelectBack);
    dom.levelSelectBack = newBack;
    dom.levelSelectBack.addEventListener('click', function () {
      hideLevelSelect();
      showTitleScreen();
    });
  }

  // --- Stagger animation helper ---

  function queueStagger(elementList, className) {
    staggerQueue = [];
    staggerTimer = 0;
    for (var i = 0; i < elementList.length; i++) {
      (function (el, cls) {
        staggerQueue.push({
          action: function () {
            el.classList.add(cls);
          }
        });
      })(elementList[i], className);
    }
  }

  // --- Streak / best score ---

  var bestScores = {};

  function recordBestScore(levelIndex, score) {
    if (!bestScores[levelIndex] || score > bestScores[levelIndex]) {
      bestScores[levelIndex] = score;
      return true;
    }
    return false;
  }

  function getBestScore(levelIndex) {
    return bestScores[levelIndex] || 0;
  }

  // --- Notification badge ---

  function showBadge(elementId, text) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var badge = document.createElement('span');
    badge.className = 'ui-badge';
    badge.textContent = text || '!';
    el.style.position = 'relative';
    el.appendChild(badge);
  }

  function hideBadge(elementId) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var badges = el.querySelectorAll('.ui-badge');
    for (var i = 0; i < badges.length; i++) {
      badges[i].remove();
    }
  }

  // --- Screen overlay ---

  function showOverlay(id, duration) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    if (duration) {
      setTimeout(function () {
        el.classList.add('hidden');
      }, duration);
    }
  }

  function hideOverlay(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  // --- Progress indicator ---

  function updateProgress(ratio) {
    if (dom.hudProgressFill) {
      dom.hudProgressFill.style.width = Math.round(ratio * 100) + '%';
    }
  }

  // --- Tutorial overlay ---

  var tutorialShown = false;

  function showTutorial(callback) {
    if (dom.tutorial) {
      dom.tutorial.classList.remove('hidden');
    }
    tutorialShown = true;

    var newBtn = dom.tutorialBtn.cloneNode(true);
    dom.tutorialBtn.parentNode.replaceChild(newBtn, dom.tutorialBtn);
    dom.tutorialBtn = newBtn;

    dom.tutorialBtn.addEventListener('click', function () {
      hideTutorial();
      if (callback) callback();
    });
  }

  function hideTutorial() {
    if (dom.tutorial) {
      dom.tutorial.classList.add('hidden');
    }
  }

  function hasTutorialBeenShown() {
    return tutorialShown;
  }

  // --- Level select ---

  function showLevelSelect(callback) {
    if (dom.levelSelect) {
      dom.levelSelect.classList.remove('hidden');
    }
    hideGameControls();

    // Build level cards
    if (dom.levelGrid) {
      dom.levelGrid.innerHTML = '';
      for (var i = 0; i < Levels.total; i++) {
        (function (index) {
          var card = document.createElement('div');
          card.className = 'level-card';

          var num = document.createElement('div');
          num.className = 'level-card-num';
          num.textContent = index + 1;

          var name = document.createElement('div');
          name.className = 'level-card-name';
          name.textContent = Levels.LEVELS[index].title;

          card.appendChild(num);
          card.appendChild(name);
          card.addEventListener('click', function () {
            hideLevelSelect();
            if (callback) callback(index);
          });

          dom.levelGrid.appendChild(card);
        })(i);
      }
    }

    // Wire back button
    var newBack = dom.levelSelectBack.cloneNode(true);
    dom.levelSelectBack.parentNode.replaceChild(newBack, dom.levelSelectBack);
    dom.levelSelectBack = newBack;
    dom.levelSelectBack.addEventListener('click', function () {
      hideLevelSelect();
      showTitleScreen();
    });
  }

  function hideLevelSelect() {
    if (dom.levelSelect) {
      dom.levelSelect.classList.add('hidden');
    }
  }

  // --- Node info popup ---

  var nodeInfoTimer = null;

  function showNodeInfo(node) {
    if (!dom.nodeInfo || !node) return;

    var typeLabels = {
      source: '恩典之源', emotion: '情感', action: '行动',
      virtue: '美德', state: '状态', person: '人物'
    };

    dom.nodeInfoName.textContent = node.name;
    dom.nodeInfoType.textContent = typeLabels[node.type] || node.type;
    dom.nodeInfoDesc.textContent = node.description || '';

    dom.nodeInfo.classList.remove('hidden');
    // Force reflow for transition
    dom.nodeInfo.offsetHeight;
    dom.nodeInfo.classList.add('visible');

    if (nodeInfoTimer) clearTimeout(nodeInfoTimer);
    nodeInfoTimer = setTimeout(function () {
      hideNodeInfo();
    }, 3000);
  }

  function hideNodeInfo() {
    if (dom.nodeInfo) {
      dom.nodeInfo.classList.remove('visible');
      if (nodeInfoTimer) {
        clearTimeout(nodeInfoTimer);
        nodeInfoTimer = null;
      }
      setTimeout(function () {
        if (dom.nodeInfo) dom.nodeInfo.classList.add('hidden');
      }, 300);
    }
  }

  // --- Achievement display ---

  var achievementQueue = [];
  var achievementTimer = null;
  var achievementHideTimer = null;

  /**
   * 显示一个成就通知横幅
   * @param {Object} achievement - 成就对象 { name, description, icon }
   */
  function showAchievement(achievement) {
    if (!achievement) return;

    // 如果当前正在显示成就，加入队列
    if (achievementTimer) {
      achievementQueue.push(achievement);
      return;
    }

    displayAchievement(achievement);
  }

  /**
   * 实际渲染一个成就横幅
   */
  function displayAchievement(achievement) {
    if (!dom.achievementBanner) return;

    if (dom.achievementIcon) {
      dom.achievementIcon.textContent = achievement.icon || '★';
    }
    if (dom.achievementName) {
      dom.achievementName.textContent = achievement.name || '未知成就';
    }
    if (dom.achievementDesc) {
      dom.achievementDesc.textContent = achievement.description || '';
    }

    dom.achievementBanner.classList.remove('hidden');
    dom.achievementBanner.classList.add('visible');

    // 强制回流触发动画
    dom.achievementBanner.offsetHeight;

    if (achievementHideTimer) clearTimeout(achievementHideTimer);
    achievementHideTimer = setTimeout(function () {
      hideAchievement();
    }, 4000);
  }

  /**
   * 隐藏成就横幅
   */
  function hideAchievement() {
    if (dom.achievementBanner) {
      dom.achievementBanner.classList.remove('visible');
      if (achievementHideTimer) {
        clearTimeout(achievementHideTimer);
        achievementHideTimer = null;
      }

      achievementTimer = setTimeout(function () {
        if (dom.achievementBanner) {
          dom.achievementBanner.classList.add('hidden');
        }
        achievementTimer = null;

        // 处理队列中的下一个成就
        if (achievementQueue.length > 0) {
          var next = achievementQueue.shift();
          displayAchievement(next);
        }
      }, 600);
    }
  }

  /**
   * 显示成就列表面板
   * @param {Array} achievements - 成就列表
   * @param {Object} unlockedMap - 已解锁的成就映射 { id: true }
   */
  function showAchievementPanel(achievements, unlockedMap) {
    if (!dom.achievementPanel) return;
    dom.achievementPanel.classList.remove('hidden');

    if (dom.achievementList && achievements) {
      dom.achievementList.innerHTML = '';
      for (var i = 0; i < achievements.length; i++) {
        (function (ach) {
          var item = document.createElement('div');
          item.className = 'achievement-item' + (unlockedMap && unlockedMap[ach.id] ? ' unlocked' : ' locked');

          var iconEl = document.createElement('div');
          iconEl.className = 'achievement-item-icon';
          iconEl.textContent = unlockedMap && unlockedMap[ach.id] ? (ach.icon || '★') : '?';

          var infoEl = document.createElement('div');
          infoEl.className = 'achievement-item-info';

          var nameEl = document.createElement('div');
          nameEl.className = 'achievement-item-name';
          nameEl.textContent = unlockedMap && unlockedMap[ach.id] ? ach.name : '???';

          var descEl = document.createElement('div');
          descEl.className = 'achievement-item-desc';
          descEl.textContent = unlockedMap && unlockedMap[ach.id] ? ach.description : '尚未解锁';

          infoEl.appendChild(nameEl);
          infoEl.appendChild(descEl);
          item.appendChild(iconEl);
          item.appendChild(infoEl);
          dom.achievementList.appendChild(item);
        })(achievements[i]);
      }
    }

    // 绑定关闭按钮
    if (dom.achievementClose) {
      var newClose = dom.achievementClose.cloneNode(true);
      dom.achievementClose.parentNode.replaceChild(newClose, dom.achievementClose);
      dom.achievementClose = newClose;
      dom.achievementClose.addEventListener('click', function () {
        hideAchievementPanel();
      });
    }
  }

  /**
   * 隐藏成就列表面板
   */
  function hideAchievementPanel() {
    if (dom.achievementPanel) {
      dom.achievementPanel.classList.add('hidden');
    }
  }

  // --- Dialogue system with typing effect ---

  var dialogueState = {
    active: false,
    fullText: '',
    displayedChars: 0,
    charTimer: 0,
    charSpeed: 0.04,   // 每字符间隔(秒)
    callback: null,
    queue: []
  };

  /**
   * 显示对话框，带有打字效果
   * @param {string} speaker - 说话者名称
   * @param {string} text - 对话内容
   * @param {string} [avatar] - 头像标识
   * @param {Function} [callback] - 完成回调
   */
  function showDialogue(speaker, text, avatar, callback) {
    if (!dom.dialogueBox) return;

    // 如果当前有对话在播放，加入队列
    if (dialogueState.active) {
      dialogueState.queue.push({
        speaker: speaker,
        text: text,
        avatar: avatar,
        callback: callback
      });
      return;
    }

    dialogueState.active = true;
    dialogueState.fullText = text || '';
    dialogueState.displayedChars = 0;
    dialogueState.charTimer = 0;
    dialogueState.callback = callback || null;

    if (dom.speakerName) {
      dom.speakerName.textContent = speaker || '';
    }
    if (dom.dialogueAvatar) {
      dom.dialogueAvatar.textContent = avatar || '';
      dom.dialogueAvatar.className = 'dialogue-avatar' + (avatar ? ' avatar-' + avatar : '');
    }
    if (dom.dialogueText) {
      dom.dialogueText.textContent = '';
    }

    dom.dialogueBox.classList.remove('hidden');
    // 强制回流
    dom.dialogueBox.offsetHeight;
    dom.dialogueBox.classList.add('visible');
  }

  /**
   * 跳过打字效果，直接显示完整文本
   */
  function skipDialogueTyping() {
    if (!dialogueState.active) return;
    dialogueState.displayedChars = dialogueState.fullText.length;
    if (dom.dialogueText) {
      dom.dialogueText.textContent = dialogueState.fullText;
    }
  }

  /**
   * 推进对话到下一条
   */
  function advanceDialogue() {
    if (!dialogueState.active) return;

    // 如果打字还没完成，先跳过打字
    if (dialogueState.displayedChars < dialogueState.fullText.length) {
      skipDialogueTyping();
      return;
    }

    // 调用当前对话回调
    if (dialogueState.callback) {
      dialogueState.callback();
    }

    // 处理队列中的下一条
    if (dialogueState.queue.length > 0) {
      var next = dialogueState.queue.shift();
      showDialogue(next.speaker, next.text, next.avatar, next.callback);
    } else {
      hideDialogue();
    }
  }

  /**
   * 隐藏对话框
   */
  function hideDialogue() {
    dialogueState.active = false;
    dialogueState.fullText = '';
    dialogueState.displayedChars = 0;
    dialogueState.queue = [];

    if (dom.dialogueBox) {
      dom.dialogueBox.classList.remove('visible');
      setTimeout(function () {
        if (dom.dialogueBox) dom.dialogueBox.classList.add('hidden');
      }, 300);
    }
  }

  /**
   * 检查对话系统是否正在显示
   */
  function isDialogueActive() {
    return dialogueState.active;
  }

  /**
   * 将打字效果更新集成到 update 循环
   */
  function updateDialogueTyping(dt) {
    if (!dialogueState.active) return;
    if (dialogueState.displayedChars >= dialogueState.fullText.length) return;

    dialogueState.charTimer += dt;
    while (dialogueState.charTimer >= dialogueState.charSpeed &&
           dialogueState.displayedChars < dialogueState.fullText.length) {
      dialogueState.charTimer -= dialogueState.charSpeed;
      dialogueState.displayedChars++;
    }

    if (dom.dialogueText) {
      dom.dialogueText.textContent = dialogueState.fullText.substring(0, dialogueState.displayedChars);
    }
  }

  // --- Stats panel ---

  var statsVisible = false;
  var statsHideTimer = null;

  /**
   * 显示统计面板
   * @param {Object} stats - 统计数据 { edges, time, maxCombo, score, stars }
   */
  function showStatsPanel(stats) {
    if (!dom.statsPanel) return;
    if (!stats) return;

    if (dom.statEdges) dom.statEdges.textContent = stats.edges || 0;
    if (dom.statTime) dom.statTime.textContent = formatTime(stats.time || 0);
    if (dom.statCombo) dom.statCombo.textContent = stats.maxCombo || 0;
    if (dom.statScore) dom.statScore.textContent = stats.score || 0;

    // 星级显示
    if (dom.statStars) {
      var starStr = '';
      var count = stats.stars || 0;
      for (var i = 0; i < 3; i++) {
        starStr += i < count ? '★' : '☆';
      }
      dom.statStars.textContent = starStr;
    }

    dom.statsPanel.classList.remove('hidden');
    dom.statsPanel.offsetHeight;
    dom.statsPanel.classList.add('visible');
    statsVisible = true;

    // 自动隐藏
    if (statsHideTimer) clearTimeout(statsHideTimer);
    statsHideTimer = setTimeout(function () {
      hideStatsPanel();
    }, 8000);
  }

  /**
   * 隐藏统计面板
   */
  function hideStatsPanel() {
    if (!dom.statsPanel) return;
    dom.statsPanel.classList.remove('visible');
    statsVisible = false;
    if (statsHideTimer) {
      clearTimeout(statsHideTimer);
      statsHideTimer = null;
    }
    setTimeout(function () {
      if (dom.statsPanel) dom.statsPanel.classList.add('hidden');
    }, 400);
  }

  /**
   * 格式化秒数为可读时间字符串
   * @param {number} seconds
   * @returns {string}
   */
  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    if (m > 0) {
      return m + '分' + s + '秒';
    }
    return s + '秒';
  }

  /**
   * 检查统计面板是否可见
   */
  function isStatsVisible() {
    return statsVisible;
  }

  // --- Enhanced tutorial ---

  var TUTORIAL_STEPS = [
    {
      icon: '①',
      highlight: '拖动',
      text: '从一个节点{highlight}到另一个节点，建立连接'
    },
    {
      icon: '②',
      highlight: '解锁',
      text: '用正确的类型{highlight}被封锁的节点'
    },
    {
      icon: '③',
      highlight: '遍所有节点',
      text: '让恩典之水流{highlight}即可通关'
    },
    {
      icon: '④',
      highlight: '连击加分',
      text: '快速连接多个节点可获得{highlight}'
    },
    {
      icon: '⑤',
      highlight: '撤销/重置',
      text: '犯错不要紧，使用{highlight}功能重来'
    }
  ];

  var tutorialStepIndex = 0;

  /**
   * 获取教程步骤列表
   * @returns {Array}
   */
  function getTutorialSteps() {
    return TUTORIAL_STEPS;
  }

  /**
   * 获取当前教程步骤索引
   * @returns {number}
   */
  function getCurrentTutorialStep() {
    return tutorialStepIndex;
  }

  /**
   * 显示指定教程步骤（增强版，带高亮关键词）
   * @param {number} stepIndex
   */
  function showTutorialStep(stepIndex) {
    tutorialStepIndex = stepIndex;
    var step = TUTORIAL_STEPS[stepIndex];
    if (!step) return;

    // 更新 tutorial overlay 内容
    var tutorialContent = document.querySelector('.tutorial-content');
    if (tutorialContent) {
      var stepsContainer = tutorialContent.querySelector('.tutorial-steps');
      if (stepsContainer) {
        // 高亮当前步骤
        var stepEls = stepsContainer.querySelectorAll('.tutorial-step');
        for (var i = 0; i < stepEls.length; i++) {
          stepEls[i].classList.remove('active');
        }
        if (stepEls[stepIndex]) {
          stepEls[stepIndex].classList.add('active');
        }
      }
    }
  }

  /**
   * 显示增强教程（包含额外步骤）
   * @param {Function} callback
   */
  function showEnhancedTutorial(callback) {
    if (dom.tutorial) {
      dom.tutorial.classList.remove('hidden');
    }
    tutorialShown = true;
    tutorialStepIndex = 0;

    // 重新构建教程内容
    var tutorialContent = document.querySelector('.tutorial-content');
    if (tutorialContent) {
      var stepsContainer = tutorialContent.querySelector('.tutorial-steps');
      if (stepsContainer) {
        stepsContainer.innerHTML = '';
        for (var i = 0; i < TUTORIAL_STEPS.length; i++) {
          (function (step, idx) {
            var stepEl = document.createElement('div');
            stepEl.className = 'tutorial-step' + (idx === 0 ? ' active' : '');

            var iconEl = document.createElement('div');
            iconEl.className = 'tutorial-icon';
            iconEl.textContent = step.icon;

            var textEl = document.createElement('div');
            textEl.className = 'tutorial-text';

            // 处理高亮关键词
            var textParts = step.text.split('{highlight}');
            if (textParts.length > 1) {
              textEl.textContent = '';
              var before = document.createTextNode(textParts[0]);
              var highlightSpan = document.createElement('span');
              highlightSpan.className = 'tutorial-highlight';
              highlightSpan.textContent = step.highlight;
              var after = document.createTextNode(textParts[1]);
              textEl.appendChild(before);
              textEl.appendChild(highlightSpan);
              textEl.appendChild(after);
            } else {
              textEl.textContent = step.text;
            }

            stepEl.appendChild(iconEl);
            stepEl.appendChild(textEl);
            stepsContainer.appendChild(stepEl);
          })(TUTORIAL_STEPS[i], i);
        }
      }
    }

    // 绑定确认按钮
    var newBtn = dom.tutorialBtn.cloneNode(true);
    dom.tutorialBtn.parentNode.replaceChild(newBtn, dom.tutorialBtn);
    dom.tutorialBtn = newBtn;
    dom.tutorialBtn.addEventListener('click', function () {
      hideTutorial();
      if (callback) callback();
    });
  }

  // --- Score popup and floating text ---

  var floatingTexts = [];

  /**
   * 添加浮动文本效果
   * @param {string} text - 显示文本
   * @param {number} x - 起始X坐标
   * @param {number} y - 起始Y坐标
   * @param {string} [color] - 颜色
   * @param {number} [duration] - 持续时间(秒)
   */
  function addFloatingText(text, x, y, color, duration) {
    var el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color || '#FFD700';

    document.body.appendChild(el);

    var ft = {
      el: el,
      timer: duration || 1.5,
      startY: y,
      totalDuration: duration || 1.5
    };
    floatingTexts.push(ft);

    // 强制回流后开始动画
    el.offsetHeight;
    el.classList.add('animate');
  }

  /**
   * 更新浮动文本位置和透明度
   */
  function updateFloatingTexts(dt) {
    for (var i = floatingTexts.length - 1; i >= 0; i--) {
      var ft = floatingTexts[i];
      ft.timer -= dt;
      var progress = 1 - (ft.timer / ft.totalDuration);

      // 向上飘动并淡出
      ft.el.style.top = (ft.startY - progress * 60) + 'px';
      ft.el.style.opacity = String(Math.max(0, 1 - progress));

      if (ft.timer <= 0) {
        ft.el.remove();
        floatingTexts.splice(i, 1);
      }
    }
  }

  // --- Screen shake feedback (CSS-based) ---

  var shakeTimer = 0;
  var shakeIntensity = 0;

  /**
   * 触发屏幕震动效果（通过 CSS class）
   * @param {number} intensity - 震动强度 1-5
   * @param {number} duration - 持续时间(秒)
   */
  function triggerScreenShake(intensity, duration) {
    shakeIntensity = Math.min(5, Math.max(1, intensity || 1));
    shakeTimer = duration || 0.3;

    var canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.classList.add('shake-' + shakeIntensity);
    }
  }

  /**
   * 更新屏幕震动状态
   */
  function updateScreenShake(dt) {
    if (shakeTimer <= 0) return;
    shakeTimer -= dt;
    if (shakeTimer <= 0) {
      shakeTimer = 0;
      var canvas = document.getElementById('gameCanvas');
      if (canvas) {
        canvas.classList.remove('shake-1', 'shake-2', 'shake-3', 'shake-4', 'shake-5');
      }
    }
  }

  return {
    init: init,
    showTitleScreen: showTitleScreen,
    hideTitleScreen: hideTitleScreen,
    onTitleStart: onTitleStart,
    showGameControls: showGameControls,
    hideGameControls: hideGameControls,
    onUndo: onUndo,
    onReset: onReset,
    showLevelTitle: showLevelTitle,
    hideLevelTitle: hideLevelTitle,
    updateHUD: updateHUD,
    setHint: setHint,
    clearHint: clearHint,
    showToast: showToast,
    showNarrative: showNarrative,
    showModal: showModal,
    hideModal: hideModal,
    showCompletion: showCompletion,
    showGameComplete: showGameComplete,
    updateProgress: updateProgress,
    updateProgressAnimated: updateProgressAnimated,
    getAnimatedProgress: getAnimatedProgress,
    resetProgress: resetProgress,
    showTutorial: showTutorial,
    hideTutorial: hideTutorial,
    hasTutorialBeenShown: hasTutorialBeenShown,
    showLevelSelect: showLevelSelect,
    showLevelSelectEnhanced: showLevelSelectEnhanced,
    hideLevelSelect: hideLevelSelect,
    showNodeInfo: showNodeInfo,
    hideNodeInfo: hideNodeInfo,
    setScore: setScore,
    getScore: getScore,
    addScore: addScore,
    resetScore: resetScore,
    triggerCombo: triggerCombo,
    getCombo: getCombo,
    clearCombo: clearCombo,
    setStars: setStars,
    getStars: getStars,
    setLevelStars: setLevelStars,
    getLevelStars: getLevelStars,
    getTotalStars: getTotalStars,
    showSettings: showSettings,
    hideSettings: hideSettings,
    toggleSettings: toggleSettings,
    getSettings: getSettings,
    applySetting: applySetting,
    wireSettings: wireSettings,
    queueStagger: queueStagger,
    recordBestScore: recordBestScore,
    getBestScore: getBestScore,
    showBadge: showBadge,
    hideBadge: hideBadge,
    showOverlay: showOverlay,
    hideOverlay: hideOverlay,
    showAchievement: showAchievement,
    hideAchievement: hideAchievement,
    showAchievementPanel: showAchievementPanel,
    hideAchievementPanel: hideAchievementPanel,
    showDialogue: showDialogue,
    advanceDialogue: advanceDialogue,
    hideDialogue: hideDialogue,
    isDialogueActive: isDialogueActive,
    skipDialogueTyping: skipDialogueTyping,
    showStatsPanel: showStatsPanel,
    hideStatsPanel: hideStatsPanel,
    isStatsVisible: isStatsVisible,
    formatTime: formatTime,
    getTutorialSteps: getTutorialSteps,
    getCurrentTutorialStep: getCurrentTutorialStep,
    showTutorialStep: showTutorialStep,
    showEnhancedTutorial: showEnhancedTutorial,
    addFloatingText: addFloatingText,
    triggerScreenShake: triggerScreenShake,
    update: update
  };
})();
