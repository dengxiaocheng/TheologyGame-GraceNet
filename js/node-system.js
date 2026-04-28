/* global NodeSystem */
var NodeSystem = (function () {
  'use strict';

  var nodes = [];
  var selectedNode = null;
  var hoverNode = null;
  var time = 0;

  function createNode(config) {
    var node = {
      id: config.id,
      name: config.name,
      type: config.type,
      x: config.x,
      y: config.y,
      blocked: config.blocked || false,
      unblockers: config.unblockers || [],
      allowedTargets: config.allowedTargets || [],

      // Derived / runtime state
      radius: config.type === 'source' ? 30 : 20,
      glowRadius: config.type === 'source' ? 60 : 40,
      alpha: 1,
      scale: 1,
      state: 'idle' // idle | hover | selected | activated
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
    return nodes;
  }

  function findNodeAt(x, y) {
    // Iterate back-to-front for z-order
    for (var i = nodes.length - 1; i >= 0; i--) {
      var node = nodes[i];
      var dx = x - node.x;
      var dy = y - node.y;
      var hitRadius = node.radius * node.scale;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return node;
      }
    }
    return null;
  }

  function update(dt) {
    time += dt;

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var isHover = (node === hoverNode);
      var isSelected = (node === selectedNode);

      // State transitions
      if (isSelected) {
        node.state = 'selected';
      } else if (isHover) {
        node.state = 'hover';
      } else {
        node.state = 'idle';
      }

      // Source nodes get a gentle breathing pulse
      if (node.type === 'source') {
        node.scale = Animation.pulse(1.0, 0.06, time, 2.0);
        node.glowRadius = Animation.pulse(60, 8, time, 1.5);
      }
    }
  }

  function render(ctx) {
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var typeInfo = Rules.NODE_TYPES[node.type] || { color: '#888888', label: node.type };
      var color = typeInfo.color;
      var hasEdges = EdgeSystem.getEdgesForNode(node.id).length > 0;

      ctx.save();
      ctx.globalAlpha = node.alpha;

      var r = node.radius * node.scale;

      // Glow
      var glowIntensity = 0.3;
      if (node.state === 'hover') glowIntensity = 0.5;
      if (node.state === 'selected') glowIntensity = 0.6;
      if (node.type === 'source') glowIntensity = Animation.pulse(0.4, 0.15, time, 1.5);

      var glowColor = node.blocked ? '#FF4444' : color;
      CanvasEngine.drawGlow(node.x, node.y, node.glowRadius * node.scale, glowColor, glowIntensity);

      // Main circle
      var fillAlpha = node.state === 'idle' ? 0.85 : 1.0;
      ctx.globalAlpha = node.alpha * fillAlpha;
      CanvasEngine.drawCircle(node.x, node.y, r, color, '#ffffff', 2);

      // Blocked overlay: red dashed ring + X
      if (node.blocked) {
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
      }

      // Connected inner glow
      if (hasEdges) {
        ctx.globalAlpha = node.alpha * 0.25;
        CanvasEngine.drawCircle(node.x, node.y, r * 0.7, '#ffffff', null, 0);
      }

      // Label
      ctx.globalAlpha = node.alpha;
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

    // Scale animation: shrink to 0.9 then back to 1.0
    node.scale = 0.9;
    var tween1 = Animation.tween(node, { scale: 1.0 }, 0.3, Animation.easeOutQuad);
    tween1.onComplete = function () {
      node.scale = 1.0;
    };
  }

  function reset() {
    nodes = [];
    selectedNode = null;
    hoverNode = null;
    time = 0;
  }

  return {
    get nodes() { return nodes; },
    get selectedNode() { return selectedNode; },
    set selectedNode(v) { selectedNode = v; },
    get hoverNode() { return hoverNode; },
    set hoverNode(v) { hoverNode = v; },
    createNode: createNode,
    loadNodes: loadNodes,
    findNodeAt: findNodeAt,
    update: update,
    render: render,
    unblockNode: unblockNode,
    reset: reset
  };
})();
