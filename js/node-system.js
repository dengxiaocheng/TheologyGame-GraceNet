/* global NodeSystem */
var NodeSystem = (function () {
  'use strict';

  var nodes = [];
  var selectedNode = null;
  var hoverNode = null;
  var time = 0;

  // Drag highlight state
  var validTargets = [];
  var invalidTargets = [];

  // Press animation state
  var pressNode = null;
  var pressTimer = 0;
  var PRESS_DURATION = 0.15;

  // Shape drawing per type
  var SHAPE_MAP = {
    source: 'star',
    emotion: 'heart',
    action: 'triangle',
    virtue: 'ring',
    state: 'hexagon',
    person: 'circle'
  };

  // Inner symbols per type (single character)
  var SYMBOL_MAP = {
    source: '\u2726', // ✦
    emotion: '\u2665', // ♥
    action: '\u25B2', // ▲
    virtue: '\u2741', // ❁
    state: '\u25C6', // ◆
    person: '\u2606'  // ☆
  };

  // --- Node state constants ---

  var NODE_STATES = {
    IDLE: 'idle',
    HOVER: 'hover',
    SELECTED: 'selected',
    ACTIVATED: 'activated',
    RECEIVING: 'receiving',
    PULSING: 'pulsing',
    DIMMED: 'dimmed',
    HIGHLIGHTED: 'highlighted',
    ENTERING: 'entering',
    EXITING: 'exiting'
  };

  // --- State transition map ---

  var STATE_TRANSITIONS = {
    idle: ['hover', 'selected', 'activated', 'dimmed', 'highlighted', 'pulsing', 'exiting'],
    hover: ['idle', 'selected', 'activated', 'dimmed'],
    selected: ['idle', 'activated', 'receiving'],
    activated: ['idle', 'receiving', 'pulsing', 'dimmed'],
    receiving: ['idle', 'activated'],
    pulsing: ['idle', 'activated'],
    dimmed: ['idle', 'highlighted'],
    highlighted: ['idle', 'dimmed'],
    entering: ['idle'],
    exiting: []
  };

  // --- Per-type animation configs ---

  var TYPE_ANIM_CONFIG = {
    source: { breatheSpeed: 1.5, breatheAmount: 0.06, glowPulse: 0.15, orbitCount: 3 },
    emotion: { breatheSpeed: 2.0, breatheAmount: 0.04, glowPulse: 0.1, orbitCount: 0 },
    action: { breatheSpeed: 1.8, breatheAmount: 0.03, glowPulse: 0.08, orbitCount: 1 },
    virtue: { breatheSpeed: 1.2, breatheAmount: 0.05, glowPulse: 0.12, orbitCount: 2 },
    state: { breatheSpeed: 1.0, breatheAmount: 0.02, glowPulse: 0.06, orbitCount: 0 },
    person: { breatheSpeed: 1.6, breatheAmount: 0.04, glowPulse: 0.1, orbitCount: 1 }
  };

  // --- Connection tracking ---

  var nodeConnections = {};

  function rebuildConnectionMap(edges) {
    nodeConnections = {};
    for (var i = 0; i < nodes.length; i++) {
      nodeConnections[nodes[i].id] = [];
    }
    for (var e = 0; e < edges.length; e++) {
      var edge = edges[e];
      if (nodeConnections[edge.from]) {
        nodeConnections[edge.from].push(edge.to);
      }
      if (nodeConnections[edge.to]) {
        nodeConnections[edge.to].push(edge.from);
      }
    }
  }

  function createNode(config) {
    var node = {
      id: config.id,
      name: config.name,
      type: config.type,
      description: config.description || '',
      x: config.x,
      y: config.y,
      blocked: config.blocked || false,
      unblockers: config.unblockers || [],
      allowedTargets: config.allowedTargets || [],

      // Derived / runtime state
      radius: config.type === 'source' ? 35 : 24,
      glowRadius: config.type === 'source' ? 70 : 50,
      alpha: 1,
      scale: 0, // start at 0 for intro animation
      state: 'idle', // idle | hover | selected | activated | receiving
      receiving: false,
      receivingTimer: 0,
      pressScale: 1.0
    };

    return node;
  }

  function loadNodes(nodeConfigs) {
    nodes = [];
    for (var i = 0; i < nodeConfigs.length; i++) {
      nodes.push(createNode(nodeConfigs[i]));
    }
    selectedNode = null;
    hoverNode = null;
    validTargets = [];
    invalidTargets = [];

    // Staggered intro animation
    for (var j = 0; j < nodes.length; j++) {
      (function (node, delay) {
        Animation.delay(delay, function () {
          Animation.tween(node, { scale: 1.0 }, 0.5, Animation.easeOutBack);
        });
      })(nodes[j], j * 0.1);
    }

    return nodes;
  }

  function findNodeAt(x, y) {
    for (var i = nodes.length - 1; i >= 0; i--) {
      var node = nodes[i];
      var dx = x - node.x;
      var dy = y - node.y;
      var hitRadius = Math.max(node.radius * node.scale, 30);
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return node;
      }
    }
    return null;
  }

  function setDragHighlights(fromNode) {
    validTargets = [];
    invalidTargets = [];
    if (!fromNode) return;

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.id === fromNode.id) continue;
      if (Rules.canConnect(fromNode, node, EdgeSystem.edges)) {
        validTargets.push(node.id);
      } else {
        invalidTargets.push(node.id);
      }
    }
  }

  function clearDragHighlights() {
    validTargets = [];
    invalidTargets = [];
  }

  function triggerReceive(nodeId) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) {
        nodes[i].receiving = true;
        nodes[i].receivingTimer = 0.6;
        break;
      }
    }
  }

  function triggerPress(nodeId) {
    pressNode = nodeId;
    pressTimer = PRESS_DURATION;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) {
        nodes[i].pressScale = 0.85;
        break;
      }
    }
  }

  function getDescription(nodeId) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) return nodes[i].description;
    }
    return '';
  }

  // --- Connection query helpers ---

  function getNodeConnections(nodeId) {
    return nodeConnections[nodeId] || [];
  }

  function getConnectedNodeIds(nodeId) {
    return nodeConnections[nodeId] || [];
  }

  function getConnectionCount(nodeId) {
    return (nodeConnections[nodeId] || []).length;
  }

  function areConnected(nodeA, nodeB) {
    var conns = nodeConnections[nodeA];
    if (!conns) return false;
    return conns.indexOf(nodeB) >= 0;
  }

  // --- State machine helpers ---

  function canTransitionTo(node, newState) {
    var allowed = STATE_TRANSITIONS[node.state];
    if (!allowed) return false;
    return allowed.indexOf(newState) >= 0;
  }

  function transitionState(node, newState) {
    if (canTransitionTo(node, newState)) {
      node.state = newState;
      return true;
    }
    return false;
  }

  // --- Node query utilities ---

  function getNodeById(id) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return nodes[i];
    }
    return null;
  }

  function getNodesByType(type) {
    var result = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].type === type) result.push(nodes[i]);
    }
    return result;
  }

  function getNodesByState(state) {
    var result = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].state === state) result.push(nodes[i]);
    }
    return result;
  }

  function getBlockedNodes() {
    var result = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].blocked) result.push(nodes[i]);
    }
    return result;
  }

  function getActivatedNodes() {
    var result = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].state === 'activated' || nodes[i].state === 'receiving') {
        result.push(nodes[i]);
      }
    }
    return result;
  }

  function getNodesNear(x, y, maxDist) {
    var result = [];
    for (var i = 0; i < nodes.length; i++) {
      var dx = nodes[i].x - x;
      var dy = nodes[i].y - y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= maxDist) {
        result.push({ node: nodes[i], distance: dist });
      }
    }
    result.sort(function (a, b) { return a.distance - b.distance; });
    return result;
  }

  function getNearestNode(x, y) {
    var nearest = null;
    var nearestDist = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var dx = nodes[i].x - x;
      var dy = nodes[i].y - y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = nodes[i];
      }
    }
    return nearest;
  }

  function getDistanceBetween(nodeA, nodeB) {
    var a = getNodeById(nodeA);
    var b = getNodeById(nodeB);
    if (!a || !b) return Infinity;
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // --- Bulk state operations ---

  function highlightAll() {
    for (var i = 0; i < nodes.length; i++) {
      transitionState(nodes[i], 'highlighted');
    }
  }

  function dimAll() {
    for (var i = 0; i < nodes.length; i++) {
      transitionState(nodes[i], 'dimmed');
    }
  }

  function resetAllStates() {
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].state = 'idle';
      nodes[i].receiving = false;
      nodes[i].receivingTimer = 0;
    }
  }

  function activateNode(nodeId) {
    var node = getNodeById(nodeId);
    if (node) transitionState(node, 'activated');
  }

  function deactivateNode(nodeId) {
    var node = getNodeById(nodeId);
    if (node) transitionState(node, 'idle');
  }

  function highlightNode(nodeId) {
    var node = getNodeById(nodeId);
    if (node) transitionState(node, 'highlighted');
  }

  // --- Statistics helpers ---

  function getNodeStats() {
    var stats = { total: nodes.length, byType: {}, byState: {}, blocked: 0, connected: 0 };
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      stats.byState[n.state] = (stats.byState[n.state] || 0) + 1;
      if (n.blocked) stats.blocked++;
      if (getConnectionCount(n.id) > 0) stats.connected++;
    }
    return stats;
  }

  function getNodeCenter() {
    if (nodes.length === 0) return { x: 0, y: 0 };
    var sx = 0, sy = 0;
    for (var i = 0; i < nodes.length; i++) {
      sx += nodes[i].x;
      sy += nodes[i].y;
    }
    return { x: sx / nodes.length, y: sy / nodes.length };
  }

  function getBoundingBox() {
    if (nodes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].x < minX) minX = nodes[i].x;
      if (nodes[i].y < minY) minY = nodes[i].y;
      if (nodes[i].x > maxX) maxX = nodes[i].x;
      if (nodes[i].y > maxY) maxY = nodes[i].y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function getTypeDistribution() {
    var dist = {};
    for (var i = 0; i < nodes.length; i++) {
      dist[nodes[i].type] = (dist[nodes[i].type] || 0) + 1;
    }
    return dist;
  }

  // --- Node animation effects ---

  var shakeStates = {};

  function shakeNode(nodeId, intensity, duration) {
    var node = getNodeById(nodeId);
    if (!node) return;
    intensity = intensity || 4;
    duration = duration || 0.4;
    shakeStates[nodeId] = {
      intensity: intensity,
      timer: duration,
      duration: duration,
      origX: node.x,
      origY: node.y
    };
  }

  function bounceNode(nodeId) {
    var node = getNodeById(nodeId);
    if (!node) return;
    var origScale = node.scale;
    node.scale = origScale * 0.7;
    Animation.tween(node, { scale: origScale * 1.15 }, 0.15, Animation.easeOutQuad);
    Animation.delay(0.15, function () {
      Animation.tween(node, { scale: origScale }, 0.2, Animation.easeOutBack);
    });
  }

  function pulseNode(nodeId, count) {
    var node = getNodeById(nodeId);
    if (!node) return;
    count = count || 3;
    var origRadius = node.glowRadius;
    for (var i = 0; i < count; i++) {
      (function (delay) {
        Animation.delay(delay, function () {
          Animation.tween(node, { glowRadius: origRadius * 1.4 }, 0.15, Animation.easeOutQuad);
          Animation.delay(0.15, function () {
            Animation.tween(node, { glowRadius: origRadius }, 0.15, Animation.easeInQuad);
          });
        });
      })(i * 0.3);
    }
  }

  function update(dt) {
    time += dt;

    // Update press animation
    if (pressTimer > 0) {
      pressTimer -= dt;
      if (pressTimer <= 0) {
        pressTimer = 0;
        for (var p = 0; p < nodes.length; p++) {
          if (nodes[p].id === pressNode) {
            nodes[p].pressScale = 1.0;
            break;
          }
        }
        pressNode = null;
      }
    }

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      // Skip animation if intro not started
      if (node.scale <= 0) continue;

      var isHover = (node === hoverNode);
      var isSelected = (node === selectedNode);

      // Receiving timer
      if (node.receiving) {
        node.receivingTimer -= dt;
        if (node.receivingTimer <= 0) {
          node.receiving = false;
          node.receivingTimer = 0;
        }
      }

      // State transitions
      if (node.receiving) {
        node.state = 'receiving';
      } else if (isSelected) {
        node.state = 'selected';
      } else if (isHover) {
        node.state = 'hover';
      } else {
        node.state = 'idle';
      }

      // Source nodes get a gentle breathing pulse
      if (node.type === 'source' && node.scale > 0.5) {
        node.scale = Animation.pulse(1.0, 0.06, time, 2.0);
        node.glowRadius = Animation.pulse(70, 8, time, 1.5);
      }
    }
  }

  function render(ctx) {
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.scale <= 0.01) continue;

      var typeInfo = Rules.NODE_TYPES[node.type] || { color: '#888888', label: node.type };
      var color = typeInfo.color;
      var hasEdges = EdgeSystem.getEdgesForNode(node.id).length > 0;

      // Determine alpha for drag highlighting
      var nodeAlpha = node.alpha;
      var isValidTarget = validTargets.indexOf(node.id) >= 0;
      var isInvalidTarget = invalidTargets.indexOf(node.id) >= 0;
      if (invalidTargets.length > 0 || validTargets.length > 0) {
        if (!isValidTarget && !isInvalidTarget) {
          // Not a relevant target, keep normal
        } else if (isInvalidTarget) {
          nodeAlpha = 0.4;
        }
      }

      ctx.save();
      ctx.globalAlpha = nodeAlpha;

      var r = node.radius * node.scale * node.pressScale;
      var shape = SHAPE_MAP[node.type] || 'circle';

      // Glow
      var glowIntensity = 0.3;
      if (node.state === 'hover') glowIntensity = 0.5;
      if (node.state === 'selected') glowIntensity = 0.6;
      if (node.receiving) glowIntensity = Animation.pulse(0.7, 0.2, time, 6);
      if (node.type === 'source') glowIntensity = Animation.pulse(0.4, 0.15, time, 1.5);

      var glowColor = node.blocked ? '#FF4444' : color;
      CanvasEngine.drawGlow(node.x, node.y, node.glowRadius * node.scale, glowColor, glowIntensity);

      // Valid target pulse outline
      if (isValidTarget) {
        var pulseR = r + 8 + Math.sin(time * 4) * 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = nodeAlpha * (0.3 + Math.sin(time * 4) * 0.2);
        ctx.stroke();
        ctx.globalAlpha = nodeAlpha;
      }

      // Draw type-specific shape
      var fillAlpha = node.state === 'idle' ? 0.85 : 1.0;
      if (node.receiving) fillAlpha = 1.0;
      ctx.globalAlpha = nodeAlpha * fillAlpha;

      switch (shape) {
        case 'star':
          CanvasEngine.drawStar(node.x, node.y, r, 6, color, '#ffffff', 2);
          break;
        case 'heart':
          CanvasEngine.drawHeart(node.x, node.y, r, color, '#ffffff', 2);
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(node.x, node.y - r);
          ctx.lineTo(node.x + r * 0.87, node.y + r * 0.5);
          ctx.lineTo(node.x - r * 0.87, node.y + r * 0.5);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        case 'ring':
          CanvasEngine.drawCircle(node.x, node.y, r, null, color, 3);
          CanvasEngine.drawCircle(node.x, node.y, r * 0.65, color, null, 0);
          break;
        case 'hexagon':
          CanvasEngine.drawHexagon(node.x, node.y, r, color, '#ffffff', 2);
          break;
        default:
          CanvasEngine.drawCircle(node.x, node.y, r, color, '#ffffff', 2);
      }

      // Inner symbol
      ctx.globalAlpha = nodeAlpha * 0.9;
      CanvasEngine.drawText(
        SYMBOL_MAP[node.type] || '',
        node.x,
        node.y,
        (node.type === 'source' ? 'bold 18px' : '13px') + ' sans-serif',
        '#ffffff',
        'center',
        'middle'
      );
      ctx.globalAlpha = nodeAlpha;

      // Blocked overlay: pulsing red ring + X
      if (node.blocked) {
        var blockedPulse = 0.5 + Math.sin(time * 3) * 0.3;
        ctx.globalAlpha = nodeAlpha * blockedPulse;

        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // X mark
        var xSize = r * 0.4;
        ctx.beginPath();
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = 2;
        ctx.moveTo(node.x - xSize, node.y - xSize);
        ctx.lineTo(node.x + xSize, node.y + xSize);
        ctx.moveTo(node.x + xSize, node.y - xSize);
        ctx.lineTo(node.x - xSize, node.y + xSize);
        ctx.stroke();
        ctx.globalAlpha = nodeAlpha;
      }

      // Receiving inner glow pulse
      if (node.receiving) {
        ctx.globalAlpha = nodeAlpha * (0.3 + Math.sin(time * 10) * 0.2);
        CanvasEngine.drawCircle(node.x, node.y, r * 0.8, '#ffffff', null, 0);
      }

      // Connected inner glow
      if (hasEdges && !node.receiving) {
        ctx.globalAlpha = nodeAlpha * 0.25;
        CanvasEngine.drawCircle(node.x, node.y, r * 0.7, '#ffffff', null, 0);
      }

      // Label
      ctx.globalAlpha = nodeAlpha;
      CanvasEngine.drawText(
        node.name,
        node.x,
        node.y + r + 12,
        '12px sans-serif',
        node.blocked ? '#FF6666' : color,
        'center',
        'top'
      );

      ctx.restore();
    }
  }

  // --- Enhanced node unblock ---

  function unblockNode(nodeId) {
    var node = null;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) {
        node = nodes[i];
        break;
      }
    }
    if (!node) return;

    node.blocked = false;

    node.scale = 0.9;
    var tween1 = Animation.tween(node, { scale: 1.0 }, 0.3, Animation.easeOutQuad);
    tween1.onComplete = function () {
      node.scale = 1.0;
    };

    // Trigger receive animation on unblocked node
    triggerReceive(nodeId);
  }

  // --- Extended find utilities ---

  function findNodeAtTolerance(x, y, toleranceMultiplier) {
    toleranceMultiplier = toleranceMultiplier || 1.5;
    for (var i = nodes.length - 1; i >= 0; i--) {
      var node = nodes[i];
      var dx = x - node.x;
      var dy = y - node.y;
      var hitRadius = Math.max(node.radius * node.scale, 30) * toleranceMultiplier;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return node;
      }
    }
    return null;
  }

  function getNodeByName(name) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].name === name) return nodes[i];
    }
    return null;
  }

  // --- Render enhancement helpers ---

  function renderConnectionBadge(ctx, node, count) {
    if (count <= 0) return;
    var badgeX = node.x + node.radius * node.scale * 0.8;
    var badgeY = node.y - node.radius * node.scale * 0.8;
    var badgeR = 8;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B9D';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(count), badgeX, badgeY);
    ctx.restore();
  }

  function renderAuraRing(ctx, node, color, phase) {
    var r = node.radius * node.scale * 1.5;
    var alpha = 0.15 + Math.sin(phase) * 0.1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function renderEnhancements(ctx) {
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.scale <= 0.01) continue;

      var connCount = getConnectionCount(node.id);
      if (connCount > 0) {
        renderConnectionBadge(ctx, node, connCount);
      }

      // Aura ring for source nodes
      if (node.type === 'source') {
        var typeInfo = Rules.NODE_TYPES[node.type];
        renderAuraRing(ctx, node, typeInfo ? typeInfo.color : '#FFD700', time * 2 + i);
      }
    }
  }

  // --- Shake state query ---

  function isNodeShaking(nodeId) {
    return !!shakeStates[nodeId];
  }

  // --- Completion tracking ---

  function getCompletionPercentage(edges, sourceId) {
    if (nodes.length === 0) return 0;
    var reachable = Rules.getReachableNodes(sourceId, edges);
    var total = nodes.length;
    var reached = 0;
    for (var i = 0; i < nodes.length; i++) {
      if (reachable[nodes[i].id]) reached++;
    }
    return reached / total;
  }

  // --- Enhanced reset ---

  function reset() {
    nodes = [];
    selectedNode = null;
    hoverNode = null;
    validTargets = [];
    invalidTargets = [];
    pressNode = null;
    pressTimer = 0;
    shakeStates = {};
    nodeConnections = {};
    time = 0;
  }

  // --- Type-specific entry animations ---

  var ENTRY_ANIMATIONS = {
    source: function (node) {
      Animation.tween(node, { scale: 1.2 }, 0.3, Animation.easeOutQuad);
      Animation.delay(0.3, function () {
        Animation.tween(node, { scale: 1.0 }, 0.2, Animation.easeOutBack);
      });
      pulseNode(node.id, 2);
    },
    emotion: function (node) {
      node.scale = 0.3;
      Animation.tween(node, { scale: 1.1 }, 0.4, Animation.easeOutBack);
      Animation.delay(0.4, function () {
        Animation.tween(node, { scale: 1.0 }, 0.15, Animation.easeInQuad);
      });
    },
    action: function (node) {
      node.scale = 1.5;
      Animation.tween(node, { scale: 0.9 }, 0.2, Animation.easeInQuad);
      Animation.delay(0.2, function () {
        Animation.tween(node, { scale: 1.0 }, 0.25, Animation.easeOutBack);
      });
    },
    virtue: function (node) {
      node.scale = 0.5;
      Animation.tween(node, { scale: 1.0 }, 0.6, Animation.easeOutBack);
    },
    state: function (node) {
      node.scale = 0.1;
      Animation.tween(node, { scale: 1.05 }, 0.5, Animation.easeOutQuad);
      Animation.delay(0.5, function () {
        Animation.tween(node, { scale: 1.0 }, 0.1, Animation.easeInQuad);
      });
    },
    person: function (node) {
      node.scale = 0.6;
      Animation.tween(node, { scale: 1.15 }, 0.35, Animation.easeOutBack);
      Animation.delay(0.35, function () {
        Animation.tween(node, { scale: 1.0 }, 0.2, Animation.easeInOutQuad);
      });
    }
  };

  function playEntryAnimation(node) {
    if (!node) return;
    var animFn = ENTRY_ANIMATIONS[node.type];
    if (animFn) {
      animFn(node);
    } else {
      Animation.tween(node, { scale: 1.0 }, 0.5, Animation.easeOutBack);
    }
  }

  // --- Connect animation triggers ---

  function triggerConnectAnimation(nodeId) {
    var node = getNodeById(nodeId);
    if (!node) return;

    bounceNode(nodeId);
    triggerReceive(nodeId);

    var typeInfo = Rules.NODE_TYPES[node.type];
    if (typeInfo && typeInfo.color) {
      pulseNode(nodeId, 2);
    }
  }

  function triggerUnlockAnimation(nodeId) {
    var node = getNodeById(nodeId);
    if (!node) return;

    // Dramatic unlock sequence
    shakeNode(nodeId, 6, 0.3);
    Animation.delay(0.3, function () {
      node.blocked = false;
      node.scale = 1.3;
      Animation.tween(node, { scale: 1.0 }, 0.4, Animation.easeOutBack);
      triggerReceive(nodeId);
      pulseNode(nodeId, 3);
    });
  }

  // --- Per-type halo rendering ---

  var HALO_CONFIGS = {
    source: { rings: 3, speed: 1.5, color: 'rgba(255,215,0,', maxRadius: 1.8 },
    emotion: { rings: 2, speed: 2.0, color: 'rgba(255,107,157,', maxRadius: 1.5 },
    action: { rings: 1, speed: 1.8, color: 'rgba(78,205,196,', maxRadius: 1.4 },
    virtue: { rings: 2, speed: 1.2, color: 'rgba(167,139,250,', maxRadius: 1.6 },
    state: { rings: 1, speed: 1.0, color: 'rgba(96,165,250,', maxRadius: 1.3 },
    person: { rings: 1, speed: 1.6, color: 'rgba(249,115,22,', maxRadius: 1.4 }
  };

  function renderTypeHalo(ctx, node) {
    var config = HALO_CONFIGS[node.type];
    if (!config) return;
    if (node.scale <= 0.01) return;

    var baseR = node.radius * node.scale;
    ctx.save();

    for (var ring = 0; ring < config.rings; ring++) {
      var phase = time * config.speed + ring * (Math.PI * 2 / config.rings);
      var expandT = (Math.sin(phase) + 1) / 2; // 0 to 1
      var ringR = baseR * (1.2 + expandT * (config.maxRadius - 1.2));
      var alpha = 0.15 * (1 - expandT);

      ctx.beginPath();
      ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = config.color + alpha.toFixed(2) + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  function renderAllHalos(ctx) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].type === 'source' || getConnectionCount(nodes[i].id) > 0) {
        renderTypeHalo(ctx, nodes[i]);
      }
    }
  }

  // --- Node statistics utilities ---

  function getNodeTypeStats() {
    var stats = {};
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].type;
      if (!stats[t]) {
        stats[t] = { count: 0, connected: 0, blocked: 0 };
      }
      stats[t].count++;
      if (getConnectionCount(nodes[i].id) > 0) stats[t].connected++;
      if (nodes[i].blocked) stats[t].blocked++;
    }
    return stats;
  }

  function getMostConnectedNode() {
    var best = null;
    var bestCount = -1;
    for (var i = 0; i < nodes.length; i++) {
      var count = getConnectionCount(nodes[i].id);
      if (count > bestCount) {
        bestCount = count;
        best = nodes[i];
      }
    }
    return best ? { node: best, connections: bestCount } : null;
  }

  function getIsolatedNodes() {
    var isolated = [];
    for (var i = 0; i < nodes.length; i++) {
      if (getConnectionCount(nodes[i].id) === 0) {
        isolated.push(nodes[i]);
      }
    }
    return isolated;
  }

  return {
    get nodes() { return nodes; },
    get selectedNode() { return selectedNode; },
    set selectedNode(v) { selectedNode = v; },
    get hoverNode() { return hoverNode; },
    set hoverNode(v) { hoverNode = v; },
    NODE_STATES: NODE_STATES,
    STATE_TRANSITIONS: STATE_TRANSITIONS,
    TYPE_ANIM_CONFIG: TYPE_ANIM_CONFIG,
    createNode: createNode,
    loadNodes: loadNodes,
    findNodeAt: findNodeAt,
    findNodeAtTolerance: findNodeAtTolerance,
    getNodeByName: getNodeByName,
    setDragHighlights: setDragHighlights,
    clearDragHighlights: clearDragHighlights,
    triggerReceive: triggerReceive,
    triggerPress: triggerPress,
    getDescription: getDescription,
    getNodeConnections: getNodeConnections,
    getConnectedNodeIds: getConnectedNodeIds,
    getConnectionCount: getConnectionCount,
    areConnected: areConnected,
    canTransitionTo: canTransitionTo,
    transitionState: transitionState,
    getNodeById: getNodeById,
    getNodesByType: getNodesByType,
    getNodesByState: getNodesByState,
    getBlockedNodes: getBlockedNodes,
    getActivatedNodes: getActivatedNodes,
    getNodesNear: getNodesNear,
    getNearestNode: getNearestNode,
    getDistanceBetween: getDistanceBetween,
    highlightAll: highlightAll,
    dimAll: dimAll,
    resetAllStates: resetAllStates,
    activateNode: activateNode,
    deactivateNode: deactivateNode,
    highlightNode: highlightNode,
    getNodeStats: getNodeStats,
    getNodeCenter: getNodeCenter,
    getBoundingBox: getBoundingBox,
    getTypeDistribution: getTypeDistribution,
    shakeNode: shakeNode,
    bounceNode: bounceNode,
    pulseNode: pulseNode,
    isNodeShaking: isNodeShaking,
    getCompletionPercentage: getCompletionPercentage,
    renderConnectionBadge: renderConnectionBadge,
    renderAuraRing: renderAuraRing,
    renderEnhancements: renderEnhancements,
    rebuildConnectionMap: rebuildConnectionMap,
    update: update,
    render: render,
    unblockNode: unblockNode,
    reset: reset,
    playEntryAnimation: playEntryAnimation,
    triggerConnectAnimation: triggerConnectAnimation,
    triggerUnlockAnimation: triggerUnlockAnimation,
    renderTypeHalo: renderTypeHalo,
    renderAllHalos: renderAllHalos,
    getNodeTypeStats: getNodeTypeStats,
    getMostConnectedNode: getMostConnectedNode,
    getIsolatedNodes: getIsolatedNodes,
    ENTRY_ANIMATIONS: ENTRY_ANIMATIONS,
    HALO_CONFIGS: HALO_CONFIGS
  };
})();
