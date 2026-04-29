/* global EdgeSystem */
var EdgeSystem = (function () {
  'use strict';

  var edges = [];
  var isDragging = false;
  var dragFrom = null;

  // Invalid feedback state
  var invalidFlash = null; // { x, y, timer }
  var shakeTarget = null;
  var shakeTimer = 0;

  // Color lookup by connection type
  var COLORS = {
    grace:   '#FFD700',
    healing: '#4ECDC4',
    bridge:  '#CCCCCC'
  };

  // Edge type particles
  var edgeParticles = [];
  var MAX_PARTICLES = 100;

  // Energy pulse state
  var energyPulses = [];

  // Animated flow dash offset
  var flowTime = 0;

  // Removing edges (fade-out animation)
  var removingEdges = [];

  // Edge creation history for analytics
  var edgeHistory = [];

  // --- Bezier geometry helpers ---

  function getControlPoints(fromNode, toNode) {
    var mx = (fromNode.x + toNode.x) / 2;
    var my = (fromNode.y + toNode.y) / 2;
    var dx = toNode.x - fromNode.x;
    var dy = toNode.y - fromNode.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    // Perpendicular offset proportional to distance
    var offset = dist * 0.15;
    var nx = -dy / (dist || 1);
    var ny = dx / (dist || 1);

    return {
      cx1: mx + nx * offset - dx * 0.1,
      cy1: my + ny * offset - dy * 0.1,
      cx2: mx + nx * offset + dx * 0.1,
      cy2: my + ny * offset + dy * 0.1
    };
  }

  function getPointOnBezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2, t) {
    var it = 1 - t;
    return {
      x: it * it * it * x1 + 3 * it * it * t * cx1 + 3 * it * t * t * cx2 + t * t * t * x2,
      y: it * it * it * y1 + 3 * it * it * t * cy1 + 3 * it * t * t * cy2 + t * t * t * y2
    };
  }

  function tryCreateEdge(fromNode, toNode) {
    if (!Rules.canConnect(fromNode, toNode, edges)) {
      // Invalid feedback: flash + shake
      invalidFlash = { x: toNode.x, y: toNode.y, timer: 0.4 };
      return false;
    }

    var type = Rules.getConnectionType(fromNode, toNode);

    var edge = {
      from: fromNode.id,
      to: toNode.id,
      type: type,
      progress: 0,
      flowActive: true,
      alpha: 1
    };

    edges.push(edge);

    // Record creation in history
    recordEdgeCreation(fromNode.id, toNode.id, type);

    // Animate progress 0 -> 1
    var tw = Animation.tween(edge, { progress: 1 }, 0.4, Animation.easeOutQuad);
    tw.onComplete = function () {
      edge.progress = 1;
    };

    // Unblock target if it was blocked
    if (toNode.blocked) {
      NodeSystem.unblockNode(toNode.id);
    }

    // Trigger receiving effect on target
    NodeSystem.triggerReceive(toNode.id);

    return true;
  }

  function removeEdge(fromId, toId) {
    for (var i = edges.length - 1; i >= 0; i--) {
      if ((edges[i].from === fromId && edges[i].to === toId) ||
          (edges[i].from === toId && edges[i].to === fromId)) {
        var edge = edges.splice(i, 1)[0];
        // Start fade-out animation
        edge.removeAlpha = 1.0;
        removingEdges.push(edge);
        return true;
      }
    }
    return false;
  }

  function removeLastEdge() {
    if (edges.length === 0) return false;
    var last = edges[edges.length - 1];
    edges.pop();
    return { from: last.from, to: last.to };
  }

  // --- Edge particle system ---

  function spawnEdgeParticles(edge, count) {
    count = count || 3;
    var fromNode = getNodeById(edge.from);
    var toNode = getNodeById(edge.to);
    if (!fromNode || !toNode) return;

    var color = COLORS[edge.type] || COLORS.bridge;
    var cp = getControlPoints(fromNode, toNode);

    for (var i = 0; i < count; i++) {
      if (edgeParticles.length >= MAX_PARTICLES) {
        edgeParticles.shift();
      }
      var t = Math.random();
      var pt = getPointOnBezier(
        fromNode.x, fromNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
        toNode.x, toNode.y, t
      );
      edgeParticles.push({
        x: pt.x,
        y: pt.y,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30 - 10,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        color: color,
        size: 2 + Math.random() * 2
      });
    }
  }

  // --- Energy pulse system ---

  function triggerEnergyPulse(edge) {
    energyPulses.push({
      edge: edge,
      t: 0,
      speed: 1.5 + Math.random() * 0.5,
      size: 6
    });
  }

  // --- Edge query utilities ---

  function getEdgeBetween(nodeA, nodeB) {
    for (var i = 0; i < edges.length; i++) {
      if ((edges[i].from === nodeA && edges[i].to === nodeB) ||
          (edges[i].from === nodeB && edges[i].to === nodeA)) {
        return edges[i];
      }
    }
    return null;
  }

  function getEdgeCount() {
    return edges.length;
  }

  function getEdgesByType(type) {
    var result = [];
    for (var i = 0; i < edges.length; i++) {
      if (edges[i].type === type) result.push(edges[i]);
    }
    return result;
  }

  function getEdgeTypes() {
    var types = {};
    for (var i = 0; i < edges.length; i++) {
      types[edges[i].type] = (types[edges[i].type] || 0) + 1;
    }
    return types;
  }

  function getEdgeLength(edge) {
    var fromNode = getNodeById(edge.from);
    var toNode = getNodeById(edge.to);
    if (!fromNode || !toNode) return 0;
    var dx = toNode.x - fromNode.x;
    var dy = toNode.y - fromNode.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getTotalEdgeLength() {
    var total = 0;
    for (var i = 0; i < edges.length; i++) {
      total += getEdgeLength(edges[i]);
    }
    return total;
  }

  function getAverageEdgeLength() {
    if (edges.length === 0) return 0;
    return getTotalEdgeLength() / edges.length;
  }

  function getShortestEdge() {
    if (edges.length === 0) return null;
    var shortest = edges[0];
    var shortestLen = getEdgeLength(edges[0]);
    for (var i = 1; i < edges.length; i++) {
      var len = getEdgeLength(edges[i]);
      if (len < shortestLen) {
        shortest = edges[i];
        shortestLen = len;
      }
    }
    return shortest;
  }

  function getLongestEdge() {
    if (edges.length === 0) return null;
    var longest = edges[0];
    var longestLen = getEdgeLength(edges[0]);
    for (var i = 1; i < edges.length; i++) {
      var len = getEdgeLength(edges[i]);
      if (len > longestLen) {
        longest = edges[i];
        longestLen = len;
      }
    }
    return longest;
  }

  // --- Edge history tracking ---

  function recordEdgeCreation(fromId, toId, type) {
    edgeHistory.push({
      from: fromId,
      to: toId,
      type: type,
      timestamp: Date.now()
    });
  }

  function getEdgeHistory() {
    return edgeHistory.slice();
  }

  function getLastEdge() {
    if (edges.length === 0) return null;
    return edges[edges.length - 1];
  }

  // --- Edge validation helpers ---

  function edgeExists(fromId, toId) {
    return !!getEdgeBetween(fromId, toId);
  }

  function getConnectedPairs() {
    var pairs = [];
    for (var i = 0; i < edges.length; i++) {
      pairs.push({ from: edges[i].from, to: edges[i].to, type: edges[i].type });
    }
    return pairs;
  }

  // --- Multi-layer edge rendering helpers ---

  function renderEdgeGlow(ctx, fromNode, toNode, color, width) {
    var cp = getControlPoints(fromNode, toNode);
    ctx.save();
    ctx.globalAlpha = 0.1;
    CanvasEngine.drawBezier(
      fromNode.x, fromNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
      toNode.x, toNode.y, color, width + 12
    );
    ctx.restore();
  }

  function renderEdgeCore(ctx, fromNode, toNode, color, width, progress) {
    var cp = getControlPoints(fromNode, toNode);
    var endPt = getPointOnBezier(
      fromNode.x, fromNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
      toNode.x, toNode.y, progress
    );
    CanvasEngine.drawBezier(
      fromNode.x, fromNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
      endPt.x, endPt.y, color, width
    );
  }

  function renderEdgeFlow(ctx, fromNode, toNode, color, offset) {
    var cp = getControlPoints(fromNode, toNode);
    ctx.lineDashOffset = -offset;
    CanvasEngine.drawBezier(
      fromNode.x, fromNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
      toNode.x, toNode.y, '#ffffff', 1, [4, 12]
    );
    ctx.lineDashOffset = 0;
  }

  function renderParticles(ctx) {
    for (var i = 0; i < edgeParticles.length; i++) {
      var p = edgeParticles[i];
      var alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      CanvasEngine.drawCircle(p.x, p.y, p.size, p.color, null, 0);
      ctx.restore();
    }
  }

  function renderEnergyPulses(ctx) {
    for (var i = 0; i < energyPulses.length; i++) {
      var pulse = energyPulses[i];
      var edge = pulse.edge;
      var fromNode = getNodeById(edge.from);
      var toNode = getNodeById(edge.to);
      if (!fromNode || !toNode) continue;

      var cp = getControlPoints(fromNode, toNode);
      var pt = getPointOnBezier(
        fromNode.x, fromNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
        toNode.x, toNode.y, pulse.t
      );

      var color = COLORS[edge.type] || COLORS.bridge;
      ctx.save();
      ctx.globalAlpha = 0.8;
      CanvasEngine.drawGlow(pt.x, pt.y, pulse.size * 3, color, 0.5);
      CanvasEngine.drawCircle(pt.x, pt.y, pulse.size, '#ffffff', null, 0);
      ctx.restore();
    }
  }

  // --- Batch edge operations ---

  function removeAllEdges() {
    while (edges.length > 0) {
      var edge = edges.pop();
      edge.removeAlpha = 1.0;
      removingEdges.push(edge);
    }
  }

  function removeEdgesForNode(nodeId) {
    for (var i = edges.length - 1; i >= 0; i--) {
      if (edges[i].from === nodeId || edges[i].to === nodeId) {
        var edge = edges.splice(i, 1)[0];
        edge.removeAlpha = 1.0;
        removingEdges.push(edge);
      }
    }
  }

  function getEdgesSortedByLength() {
    var sorted = edges.slice();
    sorted.sort(function (a, b) {
      return getEdgeLength(a) - getEdgeLength(b);
    });
    return sorted;
  }

  function getEdgeDensity(nodeId, radius) {
    var node = getNodeById(nodeId);
    if (!node) return 0;
    var count = 0;
    for (var i = 0; i < edges.length; i++) {
      var from = getNodeById(edges[i].from);
      var to = getNodeById(edges[i].to);
      if (!from || !to) continue;
      var midX = (from.x + to.x) / 2;
      var midY = (from.y + to.y) / 2;
      var dx = midX - node.x;
      var dy = midY - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) count++;
    }
    return count;
  }

  function getNetworkDensity() {
    var nodeCount = NodeSystem.nodes.length;
    if (nodeCount < 2) return 0;
    var maxEdges = nodeCount * (nodeCount - 1) / 2;
    return edges.length / maxEdges;
  }

  function getEdgesForNode(nodeId) {
    var result = [];
    for (var i = 0; i < edges.length; i++) {
      if (edges[i].from === nodeId || edges[i].to === nodeId) {
        result.push(edges[i]);
      }
    }
    return result;
  }

  function getNodeById(id) {
    var ns = NodeSystem.nodes;
    for (var i = 0; i < ns.length; i++) {
      if (ns[i].id === id) return ns[i];
    }
    return null;
  }

  function triggerShake() {
    shakeTimer = 0.3;
  }

  function update(dt) {
    flowTime += dt;

    // Update invalid flash
    if (invalidFlash) {
      invalidFlash.timer -= dt;
      if (invalidFlash.timer <= 0) {
        invalidFlash = null;
      }
    }

    // Update shake
    if (shakeTimer > 0) {
      shakeTimer -= dt;
    }

    // Update removing edges (fade out over 0.3s)
    for (var r = removingEdges.length - 1; r >= 0; r--) {
      removingEdges[r].removeAlpha -= dt / 0.3;
      if (removingEdges[r].removeAlpha <= 0) {
        removingEdges.splice(r, 1);
      }
    }

    // Update edge particles
    for (var p = edgeParticles.length - 1; p >= 0; p--) {
      var particle = edgeParticles[p];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 20 * dt; // gravity
      particle.life -= dt;
      if (particle.life <= 0) {
        edgeParticles.splice(p, 1);
      }
    }

    // Spawn particles on completed edges periodically
    if (edges.length > 0 && Math.random() < dt * 2) {
      var randomEdge = edges[Math.floor(Math.random() * edges.length)];
      if (randomEdge.progress >= 1) {
        spawnEdgeParticles(randomEdge, 1);
      }
    }

    // Update energy pulses
    for (var ep = energyPulses.length - 1; ep >= 0; ep--) {
      energyPulses[ep].t += dt * energyPulses[ep].speed;
      if (energyPulses[ep].t >= 1) {
        energyPulses.splice(ep, 1);
      }
    }
  }

  function render(ctx) {
    // --- Layer 1: Edge glow (background) ---
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var fromNode = getNodeById(edge.from);
      var toNode = getNodeById(edge.to);
      if (!fromNode || !toNode) continue;
      var color = COLORS[edge.type] || COLORS.bridge;
      var lineWidth = edge.type === 'grace' ? 4 : 3;
      renderEdgeGlow(ctx, fromNode, toNode, color, lineWidth);
    }

    // --- Layer 2: Edge cores ---
    for (var j = 0; j < edges.length; j++) {
      var e = edges[j];
      var fNode = getNodeById(e.from);
      var tNode = getNodeById(e.to);
      if (!fNode || !tNode) continue;

      var eColor = COLORS[e.type] || COLORS.bridge;
      var eWidth = e.type === 'grace' ? 4 : 3;

      ctx.save();
      ctx.globalAlpha = e.alpha;

      // Glow line underneath (wider, translucent)
      var cp = getControlPoints(fNode, tNode);
      var endPt = getPointOnBezier(
        fNode.x, fNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
        tNode.x, tNode.y, e.progress
      );

      CanvasEngine.drawBezier(
        fNode.x, fNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
        endPt.x, endPt.y, eColor, eWidth + 4
      );
      ctx.globalAlpha = e.alpha * 0.15;
      CanvasEngine.drawBezier(
        fNode.x, fNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
        endPt.x, endPt.y, eColor, eWidth + 8
      );

      ctx.globalAlpha = e.alpha;

      // Main bezier curve
      CanvasEngine.drawBezier(
        fNode.x, fNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
        endPt.x, endPt.y, eColor, eWidth
      );

      // Animated flow dash overlay
      var flowDashOffset = flowTime * 40;
      ctx.lineDashOffset = -flowDashOffset;
      CanvasEngine.drawBezier(
        fNode.x, fNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
        endPt.x, endPt.y, '#ffffff', 1, [4, 12]
      );
      ctx.lineDashOffset = 0;

      // Connection type label at midpoint
      if (e.progress >= 1) {
        var midT = 0.5;
        var midPt = getPointOnBezier(
          fNode.x, fNode.y, cp.cx1, cp.cy1, cp.cx2, cp.cy2,
          tNode.x, tNode.y, midT
        );
        var typeLabels = { grace: '恩典', healing: '治愈', bridge: '连结' };
        var label = typeLabels[e.type] || '';
        if (label) {
          CanvasEngine.drawText(
            label,
            midPt.x, midPt.y - 10,
            '10px sans-serif',
            eColor,
            'center', 'middle'
          );
        }
      }

      ctx.restore();
    }

    // --- Layer 3: Energy pulses ---
    renderEnergyPulses(ctx);

    // --- Layer 4: Edge particles ---
    renderParticles(ctx);

    // Draw removing edges (fading out)
    for (var ri = 0; ri < removingEdges.length; ri++) {
      var re = removingEdges[ri];
      var rFrom = getNodeById(re.from);
      var rTo = getNodeById(re.to);
      if (!rFrom || !rTo) continue;

      var rColor = COLORS[re.type] || COLORS.bridge;
      var rCp = getControlPoints(rFrom, rTo);

      ctx.save();
      ctx.globalAlpha = re.removeAlpha * 0.6;
      CanvasEngine.drawBezier(
        rFrom.x, rFrom.y, rCp.cx1, rCp.cy1, rCp.cx2, rCp.cy2,
        rTo.x, rTo.y, rColor, 3
      );
      ctx.restore();
    }

    // Draw drag preview bezier
    if (isDragging && dragFrom) {
      var mx = CanvasEngine.mouse.x;
      var my = CanvasEngine.mouse.y;

      ctx.save();
      ctx.globalAlpha = 0.7;

      var fromColor = Rules.NODE_TYPES[dragFrom.type];
      var lineColor = fromColor ? fromColor.color : '#ffffff';

      var midX = (dragFrom.x + mx) / 2;
      var midY = (dragFrom.y + my) / 2 - 30;

      CanvasEngine.drawBezier(
        dragFrom.x, dragFrom.y,
        midX - 10, midY, midX + 10, midY,
        mx, my, lineColor, 3, [6, 6]
      );

      // Drag preview endpoint glow
      CanvasEngine.drawGlow(mx, my, 15, lineColor, 0.4);

      ctx.restore();
    }

    // Invalid flash effect
    if (invalidFlash) {
      var flashAlpha = invalidFlash.timer / 0.4;
      ctx.save();
      ctx.globalAlpha = flashAlpha * 0.6;
      CanvasEngine.drawGlow(invalidFlash.x, invalidFlash.y, 50, '#FF4444', flashAlpha);
      CanvasEngine.drawCircle(invalidFlash.x, invalidFlash.y, 30, null, '#FF4444', 3);
      ctx.restore();
    }
  }

  function startDrag(node) {
    isDragging = true;
    dragFrom = node;
    NodeSystem.setDragHighlights(node);
  }

  function endDrag(x, y) {
    var target = NodeSystem.findNodeAt(x, y);
    var success = false;

    if (target && dragFrom && target.id !== dragFrom.id) {
      success = tryCreateEdge(dragFrom, target);
      if (!success) {
        triggerShake();
      }
    }

    isDragging = false;
    dragFrom = null;
    NodeSystem.clearDragHighlights();
    return success;
  }

  function reset() {
    edges = [];
    removingEdges = [];
    edgeParticles = [];
    energyPulses = [];
    edgeHistory = [];
    isDragging = false;
    dragFrom = null;
    invalidFlash = null;
    shakeTimer = 0;
    flowTime = 0;
  }

  // --- Edge type-specific rendering ---

  var EDGE_TYPE_RENDERERS = {
    grace: function (ctx, cp, alpha, t) {
      // Golden glow with sparkle particles
      ctx.save();
      ctx.globalAlpha = alpha * 0.3;
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(cp.p0.x, cp.p0.y);
      ctx.bezierCurveTo(cp.p1.x, cp.p1.y, cp.p2.x, cp.p2.y, cp.p3.x, cp.p3.y);
      ctx.stroke();
      ctx.restore();
    },
    healing: function (ctx, cp, alpha, t) {
      // Teal shimmer with wave effect
      ctx.save();
      ctx.globalAlpha = alpha * 0.25;
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#4ECDC4';
      ctx.setLineDash([2, 6]);
      ctx.lineDashOffset = t * -30;
      ctx.beginPath();
      ctx.moveTo(cp.p0.x, cp.p0.y);
      ctx.bezierCurveTo(cp.p1.x, cp.p1.y, cp.p2.x, cp.p2.y, cp.p3.x, cp.p3.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
    bridge: function (ctx, cp, alpha, t) {
      // Subtle neutral connection
      ctx.save();
      ctx.globalAlpha = alpha * 0.15;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#CCCCCC';
      ctx.beginPath();
      ctx.moveTo(cp.p0.x, cp.p0.y);
      ctx.bezierCurveTo(cp.p1.x, cp.p1.y, cp.p2.x, cp.p2.y, cp.p3.x, cp.p3.y);
      ctx.stroke();
      ctx.restore();
    }
  };

  function renderEdgeTypeEffect(ctx, edge, cp, alpha) {
    var fromNode = NodeSystem.getNodeById(edge.from);
    var toNode = NodeSystem.getNodeById(edge.to);
    if (!fromNode || !toNode) return;

    var type = Rules.getConnectionType(fromNode, toNode);
    var renderer = EDGE_TYPE_RENDERERS[type];
    if (renderer) {
      renderer(ctx, cp, alpha, flowTime);
    }
  }

  // --- Edge completion animation ---

  var completionAnims = [];

  function triggerEdgeCompletion(edgeId) {
    var edge = null;
    for (var i = 0; i < edges.length; i++) {
      if (edges[i] === edgeId || (edges[i].from + '-' + edges[i].to) === edgeId) {
        edge = edges[i];
        break;
      }
    }
    if (!edge) return;

    var fromNode = NodeSystem.getNodeById(edge.from);
    var toNode = NodeSystem.getNodeById(edge.to);
    if (!fromNode || !toNode) return;

    var cp = getControlPoints(fromNode, toNode);

    // Spawn sparkle particles along the edge
    for (var t = 0; t <= 1; t += 0.1) {
      var pt = getPointOnBezier(cp, t);
      edgeParticles.push({
        x: pt.x,
        y: pt.y,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 2 + Math.random() * 3,
        color: '#FFD700',
        type: 'SPARKLE'
      });
    }

    completionAnims.push({
      edge: edge,
      timer: 1.0,
      cp: cp
    });
  }

  // --- Advanced particle types ---

  function spawnSparkleParticle(x, y, color) {
    if (edgeParticles.length >= MAX_PARTICLES) return;
    edgeParticles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60 - 20,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 1.0,
      size: 2 + Math.random() * 2,
      color: color || '#FFD700',
      type: 'SPARKLE'
    });
  }

  function spawnRingParticle(x, y, color) {
    if (edgeParticles.length >= MAX_PARTICLES) return;
    edgeParticles.push({
      x: x, y: y,
      vx: 0, vy: 0,
      life: 0.8,
      maxLife: 0.8,
      size: 5,
      ringRadius: 5,
      maxRingRadius: 30,
      color: color || '#4ECDC4',
      type: 'RING'
    });
  }

  function spawnTrailParticle(x, y, color, dx, dy) {
    if (edgeParticles.length >= MAX_PARTICLES) return;
    edgeParticles.push({
      x: x, y: y,
      vx: dx * 20 + (Math.random() - 0.5) * 10,
      vy: dy * 20 + (Math.random() - 0.5) * 10,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      size: 1.5 + Math.random() * 1.5,
      color: color || '#FF6B9D',
      type: 'TRAIL'
    });
  }

  // --- Edge info hover display ---

  var hoverEdgeInfo = null;

  function updateEdgeHover(x, y) {
    hoverEdgeInfo = null;
    var closestDist = 15; // max hover distance in pixels

    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var fromNode = NodeSystem.getNodeById(edge.from);
      var toNode = NodeSystem.getNodeById(edge.to);
      if (!fromNode || !toNode) continue;

      var cp = getControlPoints(fromNode, toNode);

      // Check distance from point to bezier curve
      for (var t = 0; t <= 1; t += 0.05) {
        var pt = getPointOnBezier(cp, t);
        var dx = x - pt.x;
        var dy = y - pt.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          var connType = Rules.getConnectionType(fromNode, toNode);
          hoverEdgeInfo = {
            edge: edge,
            x: pt.x,
            y: pt.y,
            type: connType,
            fromName: fromNode.name,
            toName: toNode.name,
            description: Rules.getConnectionDescription(fromNode, toNode)
          };
        }
      }
    }
  }

  function getHoverEdgeInfo() {
    return hoverEdgeInfo;
  }

  function clearHoverEdge() {
    hoverEdgeInfo = null;
  }

  return {
    get edges() { return edges; },
    get isDragging() { return isDragging; },
    get dragFrom() { return dragFrom; },
    get shakeTimer() { return shakeTimer; },
    get edgeParticles() { return edgeParticles; },
    get energyPulses() { return energyPulses; },
    COLORS: COLORS,
    tryCreateEdge: tryCreateEdge,
    removeEdge: removeEdge,
    removeLastEdge: removeLastEdge,
    removeAllEdges: removeAllEdges,
    removeEdgesForNode: removeEdgesForNode,
    getEdgesForNode: getEdgesForNode,
    getEdgeBetween: getEdgeBetween,
    getEdgeCount: getEdgeCount,
    getEdgesByType: getEdgesByType,
    getEdgeTypes: getEdgeTypes,
    getEdgeLength: getEdgeLength,
    getTotalEdgeLength: getTotalEdgeLength,
    getAverageEdgeLength: getAverageEdgeLength,
    getShortestEdge: getShortestEdge,
    getLongestEdge: getLongestEdge,
    edgeExists: edgeExists,
    getConnectedPairs: getConnectedPairs,
    getEdgesSortedByLength: getEdgesSortedByLength,
    getEdgeDensity: getEdgeDensity,
    getNetworkDensity: getNetworkDensity,
    getEdgeHistory: getEdgeHistory,
    getLastEdge: getLastEdge,
    spawnEdgeParticles: spawnEdgeParticles,
    triggerEnergyPulse: triggerEnergyPulse,
    _getControlPoints: getControlPoints,
    _getPointOnBezier: getPointOnBezier,
    renderEdgeTypeEffect: renderEdgeTypeEffect,
    triggerEdgeCompletion: triggerEdgeCompletion,
    spawnSparkleParticle: spawnSparkleParticle,
    spawnRingParticle: spawnRingParticle,
    spawnTrailParticle: spawnTrailParticle,
    updateEdgeHover: updateEdgeHover,
    getHoverEdgeInfo: getHoverEdgeInfo,
    clearHoverEdge: clearHoverEdge,
    update: update,
    render: render,
    startDrag: startDrag,
    endDrag: endDrag,
    reset: reset
  };
})();
