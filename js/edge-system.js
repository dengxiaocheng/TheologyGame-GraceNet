/* global EdgeSystem */
var EdgeSystem = (function () {
  'use strict';

  var edges = [];
  var isDragging = false;
  var dragFrom = null;

  // Color lookup by connection type
  var COLORS = {
    grace:   '#FFD700',
    healing: '#4ECDC4',
    bridge:  '#CCCCCC'
  };

  function tryCreateEdge(fromNode, toNode) {
    if (!Rules.canConnect(fromNode, toNode, edges)) {
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

    // Animate progress 0 -> 1
    var tw = Animation.tween(edge, { progress: 1 }, 0.4, Animation.easeOutQuad);
    tw.onComplete = function () {
      edge.progress = 1;
    };

    // Unblock target if it was blocked
    if (toNode.blocked) {
      NodeSystem.unblockNode(toNode.id);
    }

    return true;
  }

  function removeEdge(fromId, toId) {
    for (var i = edges.length - 1; i >= 0; i--) {
      if ((edges[i].from === fromId && edges[i].to === toId) ||
          (edges[i].from === toId && edges[i].to === fromId)) {
        edges.splice(i, 1);
        return true;
      }
    }
    return false;
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

  function update(dt) {
    // Edge animations are driven by tweens via Animation.update
    // Just handle alpha fading if needed
  }

  function render(ctx) {
    // Draw established edges
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var fromNode = getNodeById(edge.from);
      var toNode = getNodeById(edge.to);
      if (!fromNode || !toNode) continue;

      var color = COLORS[edge.type] || COLORS.bridge;
      var lineWidth = edge.type === 'grace' ? 4 : 3;

      // Partial draw based on progress
      var ex = fromNode.x + (toNode.x - fromNode.x) * edge.progress;
      var ey = fromNode.y + (toNode.y - fromNode.y) * edge.progress;

      ctx.save();
      ctx.globalAlpha = edge.alpha;

      // Main line
      CanvasEngine.drawLine(fromNode.x, fromNode.y, ex, ey, color, lineWidth);

      // Subtle dash overlay
      CanvasEngine.drawLine(fromNode.x, fromNode.y, ex, ey, color, 1, [6, 8]);

      ctx.restore();
    }

    // Draw drag preview line
    if (isDragging && dragFrom) {
      var mx = CanvasEngine.mouse.x;
      var my = CanvasEngine.mouse.y;

      ctx.save();
      ctx.globalAlpha = 0.5;

      var fromColor = Rules.NODE_TYPES[dragFrom.type];
      var lineColor = fromColor ? fromColor.color : '#ffffff';

      CanvasEngine.drawLine(dragFrom.x, dragFrom.y, mx, my, lineColor, 2, [6, 6]);
      ctx.restore();
    }
  }

  function startDrag(node) {
    isDragging = true;
    dragFrom = node;
  }

  function endDrag(x, y) {
    var target = NodeSystem.findNodeAt(x, y);
    var success = false;

    if (target && dragFrom && target.id !== dragFrom.id) {
      success = tryCreateEdge(dragFrom, target);
    }

    isDragging = false;
    dragFrom = null;
    return success;
  }

  function reset() {
    edges = [];
    isDragging = false;
    dragFrom = null;
  }

  return {
    get edges() { return edges; },
    get isDragging() { return isDragging; },
    get dragFrom() { return dragFrom; },
    tryCreateEdge: tryCreateEdge,
    removeEdge: removeEdge,
    getEdgesForNode: getEdgesForNode,
    update: update,
    render: render,
    startDrag: startDrag,
    endDrag: endDrag,
    reset: reset
  };
})();
