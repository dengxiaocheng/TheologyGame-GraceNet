/* global Rules */
var Rules = (function () {
  'use strict';

  // --- Node type definitions ---

  var NODE_TYPES = {
    source:  { color: '#FFD700', label: 'Grace Source' },
    emotion: { color: '#FF6B9D', label: 'Emotion' },
    action:  { color: '#4ECDC4', label: 'Action' },
    virtue:  { color: '#A78BFA', label: 'Virtue' },
    state:   { color: '#60A5FA', label: 'State' },
    person:  { color: '#F97316', label: 'Person' }
  };

  // --- Scoring system ---

  var SCORE_BASE = {
    grace: 100,
    healing: 150,
    bridge: 75
  };

  var SCORE_BONUSES = {
    firstConnection: 50,
    allNodesConnected: 200,
    noUndosUsed: 100,
    speedUnderPar: 50,
    perfectCombo: 200,
    unblockChain: 75
  };

  var PAR_TIME_PER_NODE = 4;

  var COMBO_THRESHOLDS = [1, 2, 3, 5, 8];
  var COMBO_MULTIPLIERS = [1.0, 1.2, 1.5, 2.0, 2.5];

  // --- Difficulty weight tables ---

  var DIFFICULTY_WEIGHTS = {
    baseNode: 1,
    blockedNode: 3,
    chainDepth: 2,
    nodeTypeVariety: 0.5,
    crossChainLinks: 1.5
  };

  // --- Combo tracking state ---

  var comboState = {
    count: 0,
    maxCombo: 0,
    lastConnectionTime: 0,
    active: false,
    comboTimeout: 5.0
  };

  function resetCombo() {
    comboState.count = 0;
    comboState.maxCombo = 0;
    comboState.lastConnectionTime = 0;
    comboState.active = false;
  }

  function recordCombo(now) {
    var timeSinceLast = now - comboState.lastConnectionTime;
    if (comboState.count === 0 || timeSinceLast > comboState.comboTimeout) {
      comboState.count = 1;
      comboState.active = true;
    } else {
      comboState.count++;
    }
    comboState.lastConnectionTime = now;
    if (comboState.count > comboState.maxCombo) {
      comboState.maxCombo = comboState.count;
    }
    return comboState.count;
  }

  function getComboMultiplier() {
    var count = comboState.count;
    for (var i = COMBO_THRESHOLDS.length - 1; i >= 0; i--) {
      if (count >= COMBO_THRESHOLDS[i]) {
        return COMBO_MULTIPLIERS[i];
      }
    }
    return 1.0;
  }

  function getComboCount() {
    return comboState.count;
  }

  function getMaxCombo() {
    return comboState.maxCombo;
  }

  // --- Connection validation ---

  function canConnect(fromNode, toNode, existingEdges) {
    // No self-connection
    if (fromNode.id === toNode.id) return false;

    // No duplicate edges (either direction)
    for (var i = 0; i < existingEdges.length; i++) {
      var e = existingEdges[i];
      if ((e.from === fromNode.id && e.to === toNode.id) ||
          (e.from === toNode.id && e.to === fromNode.id)) {
        return false;
      }
    }

    // Check allowedTargets (with wildcard support)
    var allowed = fromNode.allowedTargets;
    if (!allowed) return false;

    var typeAllowed = false;
    for (var j = 0; j < allowed.length; j++) {
      if (allowed[j] === '*' || allowed[j] === toNode.type) {
        typeAllowed = true;
        break;
      }
    }
    if (!typeAllowed) return false;

    // If target is blocked, check that fromNode is a valid unblocker
    if (toNode.blocked) {
      var unblockers = toNode.unblockers;
      if (!unblockers) return false;

      var canUnblock = false;
      for (var k = 0; k < unblockers.length; k++) {
        if (unblockers[k] === fromNode.type) {
          canUnblock = true;
          break;
        }
      }
      if (!canUnblock) return false;
    }

    return true;
  }

  // --- Connection type classification ---

  function getConnectionType(fromNode, toNode) {
    // Grace: originates from or connects to a source
    if (fromNode.type === 'source' || toNode.type === 'source') {
      return 'grace';
    }

    // Healing: toNode was blocked (unblocking connection)
    if (toNode.blocked) {
      return 'healing';
    }

    // Bridge: two normal nodes
    return 'bridge';
  }

  // --- Reachability (BFS) ---

  function findReachable(sourceId, edges) {
    var visited = {};
    var queue = [sourceId];
    visited[sourceId] = true;

    while (queue.length > 0) {
      var current = queue.shift();

      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        // Edges are treated as bidirectional for reachability
        var neighbor = null;
        if (e.from === current && !visited[e.to]) {
          neighbor = e.to;
        } else if (e.to === current && !visited[e.from]) {
          neighbor = e.from;
        }

        if (neighbor !== null) {
          visited[neighbor] = true;
          queue.push(neighbor);
        }
      }
    }

    return Object.keys(visited);
  }

  // --- Level completion check ---

  function isLevelComplete(nodes, edges, sourceId) {
    if (nodes.length === 0) return false;

    // No node may still be blocked
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].blocked) return false;
    }

    // Build a set of all node IDs
    var nodeIds = {};
    for (var n = 0; n < nodes.length; n++) {
      nodeIds[nodes[n].id] = true;
    }

    // Every non-source node must have at least one incoming edge
    for (var j = 0; j < nodes.length; j++) {
      if (nodes[j].id === sourceId) continue;

      var hasIncoming = false;
      for (var e = 0; e < edges.length; e++) {
        if (edges[e].to === nodes[j].id || edges[e].from === nodes[j].id) {
          hasIncoming = true;
          break;
        }
      }
      if (!hasIncoming) return false;
    }

    // Source must be able to reach every other node
    var reachable = findReachable(sourceId, edges);
    for (var id in nodeIds) {
      var found = false;
      for (var r = 0; r < reachable.length; r++) {
        if (reachable[r] === id) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }

    return true;
  }

  // --- Hint system ---

  function getHintForLevel(level, nodes, edges) {
    if (!level) return '';

    // Check if level is already complete
    if (isLevelComplete(nodes, edges, level.sourceId)) {
      return '所有连接已完成！';
    }

    // Find blocked nodes still remaining
    var blockedNodes = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].blocked) {
        blockedNodes.push(nodes[i]);
      }
    }

    // If there are blocked nodes, hint about unblockers
    if (blockedNodes.length > 0) {
      var blocked = blockedNodes[0];
      var unblockerNames = [];
      for (var u = 0; u < blocked.unblockers.length; u++) {
        for (var n = 0; n < nodes.length; n++) {
          if (nodes[n].type === blocked.unblockers[u] && nodes[n].id !== blocked.id) {
            unblockerNames.push(nodes[n].name);
          }
        }
      }
      if (unblockerNames.length > 0) {
        return '尝试用「' + unblockerNames[0] + '」来化解「' + blocked.name + '」';
      }
    }

    // Find unconnected nodes
    for (var j = 0; j < nodes.length; j++) {
      if (nodes[j].id === level.sourceId) continue;
      var hasEdge = false;
      for (var e = 0; e < edges.length; e++) {
        if (edges[e].from === nodes[j].id || edges[e].to === nodes[j].id) {
          hasEdge = true;
          break;
        }
      }
      if (!hasEdge) {
        return '尝试将恩典连接到「' + nodes[j].name + '」';
      }
    }

    return level.hint || '连接所有节点，让恩典流遍。';
  }

  function getValidTargets(fromNode, allNodes, edges) {
    var targets = [];
    if (!fromNode) return targets;
    for (var i = 0; i < allNodes.length; i++) {
      if (allNodes[i].id !== fromNode.id && canConnect(fromNode, allNodes[i], edges)) {
        targets.push(allNodes[i]);
      }
    }
    return targets;
  }

  function getConnectionDescription(fromNode, toNode) {
    var type = getConnectionType(fromNode, toNode);
    switch (type) {
      case 'grace':
        return '恩典从「' + fromNode.name + '」流向「' + toNode.name + '」';
      case 'healing':
        return '「' + fromNode.name + '」治愈了「' + toNode.name + '」';
      case 'bridge':
        return '「' + fromNode.name + '」与「' + toNode.name + '」建立了连结';
      default:
        return '建立了新的连接';
    }
  }

  // --- Connection chain (BFS path) ---

  function getConnectionChain(sourceId, targetId, edges) {
    var visited = {};
    var parent = {};
    var queue = [sourceId];
    visited[sourceId] = true;

    while (queue.length > 0) {
      var current = queue.shift();
      if (current === targetId) {
        // Reconstruct path
        var path = [];
        var node = targetId;
        while (node !== undefined) {
          path.unshift(node);
          node = parent[node];
        }
        return path;
      }

      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        var neighbor = null;
        if (e.from === current && !visited[e.to]) neighbor = e.to;
        else if (e.to === current && !visited[e.from]) neighbor = e.from;

        if (neighbor !== null) {
          visited[neighbor] = true;
          parent[neighbor] = current;
          queue.push(neighbor);
        }
      }
    }
    return null;
  }

  // --- Level statistics ---

  function getLevelStats(nodes, edges, sourceId) {
    var totalNodes = nodes.length;
    var connectedNodes = 0;
    var blockedRemaining = 0;
    var nodeIds = {};

    for (var n = 0; n < nodes.length; n++) {
      nodeIds[nodes[n].id] = true;
      if (nodes[n].blocked) blockedRemaining++;
    }

    // Count nodes that have at least one edge
    var connectedSet = {};
    for (var e = 0; e < edges.length; e++) {
      connectedSet[edges[e].from] = true;
      connectedSet[edges[e].to] = true;
    }

    for (var id in connectedSet) {
      if (nodeIds[id]) connectedNodes++;
    }

    var complete = isLevelComplete(nodes, edges, sourceId);

    return {
      totalNodes: totalNodes,
      connectedNodes: connectedNodes,
      blockedRemaining: blockedRemaining,
      totalEdges: edges.length,
      complete: complete,
      progress: totalNodes > 0 ? connectedNodes / totalNodes : 0
    };
  }

  // --- Completion message ---

  function getCompletionMessage(level, stats) {
    if (!stats) return '关卡完成！';

    var messages = [
      '恩典已经流遍整个网络。',
      '所有的连结都已建立，恩典如水，润泽万物。',
      '每一个节点都被恩典触摸，黑暗中的光已经照亮。',
      '误解化为理解，伤痛化为治愈。恩典之网已织就。'
    ];

    if (level && level.completionMessage) {
      return level.completionMessage;
    }

    // Pick message based on level id for variety
    var idx = (level && level.id) ? (level.id - 1) % messages.length : 0;
    return messages[idx];
  }

  // --- Level data validation ---

  function validateLevel(levelData) {
    var errors = [];
    if (!levelData) { errors.push('Level data is null'); return errors; }
    if (!levelData.id) errors.push('Missing level id');
    if (!levelData.title) errors.push('Missing level title');
    if (!levelData.sourceId) errors.push('Missing sourceId');
    if (!levelData.nodes || levelData.nodes.length === 0) {
      errors.push('No nodes defined');
    } else {
      var hasSource = false;
      var nodeIds = {};
      for (var i = 0; i < levelData.nodes.length; i++) {
        var nd = levelData.nodes[i];
        if (!nd.id) errors.push('Node at index ' + i + ' missing id');
        if (nodeIds[nd.id]) errors.push('Duplicate node id: ' + nd.id);
        nodeIds[nd.id] = true;
        if (nd.type === 'source') hasSource = true;
      }
      if (!hasSource) errors.push('No source node defined');
    }
    return errors;
  }

  // --- Score calculation ---

  function calculateScore(level, nodes, edges, timeSpent, undoCount) {
    if (!level || !nodes) return { total: 0, breakdown: {} };

    var score = 0;
    var breakdown = {
      connectionPoints: 0,
      comboBonus: 0,
      speedBonus: 0,
      undoPenalty: 0,
      efficiencyBonus: 0,
      total: 0
    };

    for (var i = 0; i < edges.length; i++) {
      var fromNode = null;
      var toNode = null;
      for (var n = 0; n < nodes.length; n++) {
        if (nodes[n].id === edges[i].from) fromNode = nodes[n];
        if (nodes[n].id === edges[i].to) toNode = nodes[n];
      }
      if (fromNode && toNode) {
        var connType = getConnectionType(fromNode, toNode);
        breakdown.connectionPoints += SCORE_BASE[connType] || SCORE_BASE.bridge;
      }
    }

    score += breakdown.connectionPoints;

    if (comboState.maxCombo >= 3) {
      breakdown.comboBonus = comboState.maxCombo * 25;
      score += breakdown.comboBonus;
    }

    var parTime = getTimePar(level);
    if (timeSpent && timeSpent < parTime) {
      var timeDiff = parTime - timeSpent;
      breakdown.speedBonus = Math.round(timeDiff * SCORE_BONUSES.speedUnderPar);
      score += breakdown.speedBonus;
    }

    if (undoCount && undoCount > 0) {
      breakdown.undoPenalty = -Math.min(undoCount * 20, score * 0.3);
      score += breakdown.undoPenalty;
    }

    var optimal = getOptimalEdgeCount(level, nodes);
    if (optimal > 0 && edges.length <= optimal * 1.5) {
      breakdown.efficiencyBonus = 50;
      score += breakdown.efficiencyBonus;
    }

    score = Math.max(0, score);
    breakdown.total = score;

    return { total: score, breakdown: breakdown };
  }

  // --- Star rating ---

  function calculateStars(level, nodes, edges, timeSpent, undoCount) {
    var score = calculateScore(level, nodes, edges, timeSpent, undoCount || 0);
    var total = score.total;

    var difficulty = level.difficulty || 1;
    var baseTarget = difficulty * 200;

    var stars = 1;
    if (total >= baseTarget * 1.5) stars = 2;
    if (total >= baseTarget * 2.5) stars = 3;

    return {
      stars: stars,
      score: total,
      breakdown: score.breakdown,
      nextStarAt: stars === 1 ? baseTarget * 1.5 : (stars === 2 ? baseTarget * 2.5 : -1)
    };
  }

  // --- Par time ---

  function getTimePar(level) {
    if (!level || !level.nodes) return 60;
    return level.nodes.length * PAR_TIME_PER_NODE + 5;
  }

  // --- Optimal edge count ---

  function getOptimalEdgeCount(level, nodes) {
    if (!level || !nodes) return 0;
    return nodes.length - 1;
  }

  // --- Connection value ---

  function getConnectionValue(fromNode, toNode) {
    if (!fromNode || !toNode) return 0;

    var baseValue = SCORE_BASE[getConnectionType(fromNode, toNode)] || SCORE_BASE.bridge;
    var multiplier = 1.0;

    if (fromNode.type === 'source') multiplier += 0.2;
    if (toNode.blocked) multiplier += 0.3;
    if (fromNode.type === 'virtue' && toNode.type === 'action') multiplier += 0.15;
    if (fromNode.type === 'action' && toNode.type === 'state') multiplier += 0.15;

    return Math.round(baseValue * multiplier);
  }

  // --- Tutorial level detection ---

  function isTutorialLevel(level) {
    if (!level) return false;
    return (level.difficulty || 0) <= 1 && level.nodes && level.nodes.length <= 5;
  }

  // --- Node relationship classification ---

  var RELATIONSHIP_TYPES = {
    grants: '恩赐',
    heals: '治愈',
    transforms: '转化',
    guides: '引导',
    inspires: '激励',
    connects: '连结',
    supports: '扶持',
    sustains: '维系',
    restores: '恢复',
    empowers: '赋能',
    reveals: '启示',
    purifies: '净化',
    unifies: '合一',
    uplifts: '提升'
  };

  function getNodeRelationship(fromNode, toNode) {
    if (!fromNode || !toNode) return 'connects';

    if (fromNode.type === 'source') {
      if (toNode.type === 'emotion') return 'inspires';
      if (toNode.type === 'action') return 'guides';
      if (toNode.type === 'virtue') return 'grants';
      if (toNode.type === 'state') return 'transforms';
      if (toNode.type === 'person') return 'heals';
      return 'grants';
    }

    if (toNode.blocked) return 'heals';

    if (fromNode.type === 'emotion' && toNode.type === 'action') return 'inspires';
    if (fromNode.type === 'emotion' && toNode.type === 'virtue') return 'transforms';
    if (fromNode.type === 'action' && toNode.type === 'state') return 'transforms';
    if (fromNode.type === 'action' && toNode.type === 'virtue') return 'supports';
    if (fromNode.type === 'virtue' && toNode.type === 'action') return 'inspires';
    if (fromNode.type === 'virtue' && toNode.type === 'state') return 'sustains';
    if (fromNode.type === 'person' && toNode.type === 'emotion') return 'connects';
    if (fromNode.type === 'person' && toNode.type === 'person') return 'supports';
    if (fromNode.type === 'state' && toNode.type === 'emotion') return 'transforms';
    if (fromNode.type === 'state' && toNode.type === 'action') return 'guides';

    if (fromNode.type === 'virtue' && toNode.type === 'person') return 'restores';
    if (fromNode.type === 'person' && toNode.type === 'virtue') return 'empowers';
    if (fromNode.type === 'source' && toNode.type === 'person') return 'reveals';
    if (fromNode.type === 'state' && toNode.type === 'virtue') return 'purifies';
    if (fromNode.type === 'person' && toNode.type === 'state') return 'unifies';
    if (fromNode.type === 'emotion' && toNode.type === 'state') return 'uplifts';

    return 'connects';
  }

  // --- Level difficulty calculation ---

  function calculateDifficulty(level) {
    if (!level || !level.nodes) return 1;

    var nodes = level.nodes;
    var score = 0;

    score += nodes.length * DIFFICULTY_WEIGHTS.baseNode;

    var blockedCount = 0;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].blocked) blockedCount++;
    }
    score += blockedCount * DIFFICULTY_WEIGHTS.blockedNode;

    var types = {};
    for (var j = 0; j < nodes.length; j++) {
      types[nodes[j].type] = true;
    }
    var typeCount = Object.keys(types).length;
    score += typeCount * DIFFICULTY_WEIGHTS.nodeTypeVariety * 2;

    var maxDepth = getUnblockChainDepth(level);
    score += maxDepth * DIFFICULTY_WEIGHTS.chainDepth;

    if (score <= 15) return 1;
    if (score <= 25) return 2;
    if (score <= 35) return 3;
    if (score <= 50) return 4;
    return 5;
  }

  // --- Unblock chain depth ---

  function getUnblockChainDepth(level) {
    if (!level || !level.nodes) return 0;

    var nodes = level.nodes;
    var maxDepth = 0;

    function getDepth(nodeId, visited) {
      var node = null;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].id === nodeId) { node = nodes[i]; break; }
      }
      if (!node || !node.unblockers) return 0;

      var depth = 1;
      visited[nodeId] = true;

      for (var u = 0; u < node.unblockers.length; u++) {
        var unblockerType = node.unblockers[u];
        for (var n = 0; n < nodes.length; n++) {
          if (nodes[n].type === unblockerType && nodes[n].blocked && !visited[nodes[n].id]) {
            var subDepth = getDepth(nodes[n].id, visited);
            if (subDepth + 1 > depth) depth = subDepth + 1;
          }
        }
      }

      return depth;
    }

    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].blocked) {
        var visited = {};
        var d = getDepth(nodes[i].id, visited);
        if (d > maxDepth) maxDepth = d;
      }
    }

    return maxDepth;
  }

  // --- Edge efficiency ---

  function getEdgeEfficiency(level, nodes, edges) {
    if (!nodes || nodes.length === 0) return { ratio: 0, redundant: 0, total: 0 };

    var optimal = getOptimalEdgeCount(level, nodes);
    var total = edges.length;

    if (total === 0) return { ratio: 0, redundant: 0, total: 0 };

    var redundant = Math.max(0, total - optimal);
    var ratio = optimal > 0 ? Math.min(1, optimal / total) : 0;

    return { ratio: ratio, redundant: redundant, total: total, optimal: optimal };
  }

  // --- Redundant edge detection ---

  function isRedundantEdge(edge, allEdges) {
    var filteredEdges = [];
    for (var i = 0; i < allEdges.length; i++) {
      if (allEdges[i] !== edge) filteredEdges.push(allEdges[i]);
    }

    var visited = {};
    var queue = [edge.from];
    visited[edge.from] = true;

    while (queue.length > 0) {
      var current = queue.shift();
      for (var j = 0; j < filteredEdges.length; j++) {
        var e = filteredEdges[j];
        var neighbor = null;
        if (e.from === current && !visited[e.to]) neighbor = e.to;
        else if (e.to === current && !visited[e.from]) neighbor = e.from;

        if (neighbor !== null) {
          if (neighbor === edge.to) return true;
          visited[neighbor] = true;
          queue.push(neighbor);
        }
      }
    }

    return false;
  }

  // --- Network analysis ---

  function analyzeNetwork(sourceId, nodes, edges) {
    if (!nodes || nodes.length === 0) {
      return { clusters: 0, bridges: [], hubs: [], density: 0 };
    }

    var edgeCounts = {};
    for (var i = 0; i < nodes.length; i++) {
      edgeCounts[nodes[i].id] = 0;
    }
    for (var e = 0; e < edges.length; e++) {
      edgeCounts[edges[e].from] = (edgeCounts[edges[e].from] || 0) + 1;
      edgeCounts[edges[e].to] = (edgeCounts[edges[e].to] || 0) + 1;
    }

    var hubs = [];
    for (var id in edgeCounts) {
      if (edgeCounts[id] >= 3) {
        var hubNode = null;
        for (var h = 0; h < nodes.length; h++) {
          if (nodes[h].id === id) { hubNode = nodes[h]; break; }
        }
        if (hubNode) {
          hubs.push({ node: hubNode, edgeCount: edgeCounts[id] });
        }
      }
    }

    var maxEdges = nodes.length * (nodes.length - 1) / 2;
    var density = maxEdges > 0 ? edges.length / maxEdges : 0;

    var bridges = [];
    for (var b = 0; b < edges.length; b++) {
      if (!isRedundantEdge(edges[b], edges)) {
        bridges.push(edges[b]);
      }
    }

    var parent = {};
    for (var c = 0; c < nodes.length; c++) {
      parent[nodes[c].id] = nodes[c].id;
    }

    function findRoot(x) {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }

    for (var ue = 0; ue < edges.length; ue++) {
      var rootA = findRoot(edges[ue].from);
      var rootB = findRoot(edges[ue].to);
      if (rootA !== rootB) parent[rootA] = rootB;
    }

    var roots = {};
    for (var cn = 0; cn < nodes.length; cn++) {
      roots[findRoot(nodes[cn].id)] = true;
    }
    var clusters = Object.keys(roots).length;

    return {
      clusters: clusters,
      bridges: bridges,
      hubs: hubs,
      density: density,
      edgeCounts: edgeCounts
    };
  }

  // --- Level metrics ---

  function getLevelMetrics(level, nodes, edges) {
    if (!level) return null;

    var stats = getLevelStats(nodes, edges, level.sourceId);
    var efficiency = getEdgeEfficiency(level, nodes, edges);
    var network = analyzeNetwork(level.sourceId, nodes, edges);
    var par = getTimePar(level);

    return {
      stats: stats,
      efficiency: efficiency,
      network: network,
      parTime: par,
      difficulty: calculateDifficulty(level),
      chainDepth: getUnblockChainDepth(level)
    };
  }

  // --- Recommended next connection ---

  function getRecommendedNext(level, nodes, edges) {
    if (!level || !nodes) return null;

    var source = null;
    for (var s = 0; s < nodes.length; s++) {
      if (nodes[s].id === level.sourceId) { source = nodes[s]; break; }
    }

    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].blocked) {
        for (var j = 0; j < nodes.length; j++) {
          if (canConnect(nodes[j], nodes[i], edges)) {
            return { from: nodes[j], to: nodes[i], reason: 'unblock' };
          }
        }
      }
    }

    if (source) {
      for (var k = 0; k < nodes.length; k++) {
        if (nodes[k].id !== source.id && canConnect(source, nodes[k], edges)) {
          var hasEdge = false;
          for (var e = 0; e < edges.length; e++) {
            if (edges[e].from === nodes[k].id || edges[e].to === nodes[k].id) {
              hasEdge = true;
              break;
            }
          }
          if (!hasEdge) {
            return { from: source, to: nodes[k], reason: 'connect_source' };
          }
        }
      }
    }

    var reachable = findReachable(level.sourceId, edges);
    var reachableSet = {};
    for (var r = 0; r < reachable.length; r++) {
      reachableSet[reachable[r]] = true;
    }

    for (var m = 0; m < nodes.length; m++) {
      if (reachableSet[nodes[m].id]) {
        for (var n = 0; n < nodes.length; n++) {
          if (!reachableSet[nodes[n].id] && canConnect(nodes[m], nodes[n], edges)) {
            return { from: nodes[m], to: nodes[n], reason: 'extend_reach' };
          }
        }
      }
    }

    return null;
  }

  // --- Enriched hint generation ---

  function getEnrichedHint(level, nodes, edges) {
    if (!level || !nodes) return level ? (level.hint || '') : '';

    if (isLevelComplete(nodes, edges, level.sourceId)) {
      return '所有连接已完成！';
    }

    var rec = getRecommendedNext(level, nodes, edges);
    if (rec) {
      switch (rec.reason) {
        case 'unblock':
          return '尝试用「' + rec.from.name + '」来化解「' + rec.to.name + '」的障碍';
        case 'connect_source':
          return '让恩典之源流向「' + rec.to.name + '」';
        case 'extend_reach':
          return '通过「' + rec.from.name + '」将恩典延伸到「' + rec.to.name + '」';
      }
    }

    var stats = getLevelStats(nodes, edges, level.sourceId);
    if (stats.blockedRemaining > 0) {
      return '还有 ' + stats.blockedRemaining + ' 个节点等待被治愈';
    }

    var remaining = stats.totalNodes - stats.connectedNodes;
    if (remaining > 0) {
      return '还有 ' + remaining + ' 个节点等待连接';
    }

    return level.hint || '让恩典流遍所有节点。';
  }

  // --- Enriched connection description ---

  function getEnrichedConnectionDescription(fromNode, toNode) {
    var relationship = getNodeRelationship(fromNode, toNode);
    var relLabel = RELATIONSHIP_TYPES[relationship] || '连结';
    return '「' + fromNode.name + '」' + relLabel + '了「' + toNode.name + '」';
  }

  // --- Score formatting ---

  function formatScore(score) {
    if (score >= 1000) {
      return (score / 1000).toFixed(1) + 'K';
    }
    return score.toString();
  }

  // --- Star display ---

  function getStarDisplay(stars) {
    var result = '';
    for (var i = 0; i < 3; i++) {
      result += i < stars ? '\u2605' : '\u2606';
    }
    return result;
  }

  // --- Achievement system ---

  var ACHIEVEMENTS = {
    first_light: {
      id: 'first_light',
      name: '初光',
      desc: '完成第一个关卡',
      icon: '\u2728',
      category: 'progress',
      check: function (ctx) { return ctx.levelsCompleted >= 1; }
    },
    grace_chain: {
      id: 'grace_chain',
      name: '恩典之链',
      desc: '在一次连击中达到5连击',
      icon: '\uD83D\uDD17',
      category: 'combo',
      check: function (ctx) { return ctx.maxCombo >= 5; }
    },
    no_undo: {
      id: 'no_undo',
      name: '完美执行',
      desc: '完成一关而不使用撤销',
      icon: '\u2714',
      category: 'precision',
      check: function (ctx) { return ctx.undoCount === 0 && ctx.levelsCompleted >= 1; }
    },
    speed_runner: {
      id: 'speed_runner',
      name: '闪电之手',
      desc: '在半数标准时间内完成一关',
      icon: '\u26A1',
      category: 'speed',
      check: function (ctx) { return ctx.timeRatio <= 0.5 && ctx.levelsCompleted >= 1; }
    },
    perfect_star: {
      id: 'perfect_star',
      name: '完美之星',
      desc: '获得一颗三星评价',
      icon: '\u2B50',
      category: 'excellence',
      check: function (ctx) { return ctx.maxStars >= 3; }
    },
    all_connected: {
      id: 'all_connected',
      name: '万物相连',
      desc: '完成5个关卡',
      icon: '\uD83C\uDF0D',
      category: 'progress',
      check: function (ctx) { return ctx.levelsCompleted >= 5; }
    },
    bridge_builder: {
      id: 'bridge_builder',
      name: '桥梁建造者',
      desc: '建立10个桥接连接',
      icon: '\uD83C\uDF09',
      category: 'connections',
      check: function (ctx) { return ctx.bridgeCount >= 10; }
    },
    healer: {
      id: 'healer',
      name: '治愈者',
      desc: '化解20个被封锁的节点',
      icon: '\uD83D\uDC9A',
      category: 'connections',
      check: function (ctx) { return ctx.healCount >= 20; }
    },
    explorer: {
      id: 'explorer',
      name: '探索者',
      desc: '完成10个关卡',
      icon: '\uD83D\uDDFA',
      category: 'progress',
      check: function (ctx) { return ctx.levelsCompleted >= 10; }
    },
    master: {
      id: 'master',
      name: '恩典大师',
      desc: '获得30颗星星',
      icon: '\uD83D\uDC51',
      category: 'excellence',
      check: function (ctx) { return ctx.totalStars >= 30; }
    },
    marathon: {
      id: 'marathon',
      name: '马拉松',
      desc: '完成所有15个关卡',
      icon: '\uD83C\uDFC3',
      category: 'progress',
      check: function (ctx) { return ctx.levelsCompleted >= 15; }
    },
    grace_overflow: {
      id: 'grace_overflow',
      name: '恩典满溢',
      desc: '累计得分超过10000',
      icon: '\uD83D\uDC8E',
      category: 'excellence',
      check: function (ctx) { return ctx.totalScore >= 10000; }
    }
  };

  var unlockedAchievements = {};

  function checkAchievement(achievementId, context) {
    var ach = ACHIEVEMENTS[achievementId];
    if (!ach) return false;
    if (unlockedAchievements[achievementId]) return false;
    if (ach.check(context)) {
      unlockedAchievements[achievementId] = {
        id: achievementId,
        name: ach.name,
        desc: ach.desc,
        icon: ach.icon,
        unlockedAt: Date.now()
      };
      return true;
    }
    return false;
  }

  function checkAllAchievements(context) {
    var newlyUnlocked = [];
    for (var id in ACHIEVEMENTS) {
      if (checkAchievement(id, context)) {
        newlyUnlocked.push(unlockedAchievements[id]);
      }
    }
    return newlyUnlocked;
  }

  function getAchievementProgress(achievementId, context) {
    var ach = ACHIEVEMENTS[achievementId];
    if (!ach) return 0;
    if (unlockedAchievements[achievementId]) return 1;
    // Estimate progress for certain achievements
    switch (achievementId) {
      case 'first_light': return context.levelsCompleted >= 1 ? 1 : 0;
      case 'grace_chain': return Math.min(1, (context.maxCombo || 0) / 5);
      case 'no_undo': return context.undoCount === 0 && context.levelsCompleted >= 1 ? 1 : 0;
      case 'speed_runner': return context.timeRatio <= 0.5 && context.levelsCompleted >= 1 ? 1 : 0;
      case 'perfect_star': return context.maxStars >= 3 ? 1 : 0;
      case 'all_connected': return Math.min(1, (context.levelsCompleted || 0) / 5);
      case 'bridge_builder': return Math.min(1, (context.bridgeCount || 0) / 10);
      case 'healer': return Math.min(1, (context.healCount || 0) / 20);
      case 'explorer': return Math.min(1, (context.levelsCompleted || 0) / 10);
      case 'master': return Math.min(1, (context.totalStars || 0) / 30);
      case 'marathon': return Math.min(1, (context.levelsCompleted || 0) / 15);
      case 'grace_overflow': return Math.min(1, (context.totalScore || 0) / 10000);
      default: return 0;
    }
  }

  function getUnlockedAchievements() {
    var list = [];
    for (var id in unlockedAchievements) {
      list.push(unlockedAchievements[id]);
    }
    return list;
  }

  function getAchievementList() {
    var list = [];
    for (var id in ACHIEVEMENTS) {
      list.push({
        id: id,
        name: ACHIEVEMENTS[id].name,
        desc: ACHIEVEMENTS[id].desc,
        icon: ACHIEVEMENTS[id].icon,
        category: ACHIEVEMENTS[id].category,
        unlocked: !!unlockedAchievements[id]
      });
    }
    return list;
  }

  function loadAchievements(data) {
    if (data && typeof data === 'object') {
      unlockedAchievements = data;
    }
  }

  function saveAchievements() {
    return unlockedAchievements;
  }

  function resetAchievements() {
    unlockedAchievements = {};
  }

  // --- Difficulty breakdown ---

  function getDifficultyBreakdown(level) {
    if (!level || !level.nodes) return null;
    var nodes = level.nodes;

    var nodeCount = nodes.length;
    var blockedCount = 0;
    var types = {};
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].blocked) blockedCount++;
      types[nodes[i].type] = true;
    }
    var typeVariety = Object.keys(types).length;
    var chainDepth = getUnblockChainDepth(level);

    var nodeScore = nodeCount * DIFFICULTY_WEIGHTS.baseNode;
    var blockedScore = blockedCount * DIFFICULTY_WEIGHTS.blockedNode;
    var chainScore = chainDepth * DIFFICULTY_WEIGHTS.chainDepth;
    var varietyScore = typeVariety * DIFFICULTY_WEIGHTS.nodeTypeVariety * 2;
    var totalRawScore = nodeScore + blockedScore + chainScore + varietyScore;

    return {
      nodeCount: nodeCount,
      blockedCount: blockedCount,
      typeVariety: typeVariety,
      chainDepth: chainDepth,
      rawScore: totalRawScore,
      difficulty: calculateDifficulty(level),
      breakdown: {
        nodes: nodeScore,
        blocked: blockedScore,
        chain: chainScore,
        variety: varietyScore
      }
    };
  }

  // --- Wrapper functions for compatibility ---

  function getConnectionScore(fromNode, toNode) {
    return getConnectionValue(fromNode, toNode);
  }

  function getStarRating(level, nodes, edges, timeSpent, undoCount) {
    return calculateStars(level, nodes, edges, timeSpent, undoCount);
  }

  // --- Network health analysis ---

  function analyzeNetworkHealth(nodes, edges, sourceId) {
    if (!nodes || nodes.length === 0) {
      return { health: 0, issues: [], grade: 'F' };
    }

    var issues = [];
    var health = 100;

    // Check for disconnected nodes
    var connectedSet = {};
    for (var e = 0; e < edges.length; e++) {
      connectedSet[edges[e].from] = true;
      connectedSet[edges[e].to] = true;
    }
    var disconnectedCount = 0;
    for (var d = 0; d < nodes.length; d++) {
      if (!connectedSet[nodes[d].id]) {
        disconnectedCount++;
        issues.push({ type: 'disconnected', nodeId: nodes[d].id, message: '节点「' + nodes[d].name + '」尚未连接' });
      }
    }
    health -= disconnectedCount * 15;

    // Check for blocked nodes remaining
    var blockedCount = 0;
    for (var b = 0; b < nodes.length; b++) {
      if (nodes[b].blocked) {
        blockedCount++;
        issues.push({ type: 'blocked', nodeId: nodes[b].id, message: '节点「' + nodes[b].name + '」仍被封锁' });
      }
    }
    health -= blockedCount * 20;

    // Check reachability from source
    if (sourceId) {
      var reachable = findReachable(sourceId, edges);
      var reachableSet = {};
      for (var r = 0; r < reachable.length; r++) {
        reachableSet[reachable[r]] = true;
      }
      var unreachableCount = 0;
      for (var u = 0; u < nodes.length; u++) {
        if (!reachableSet[nodes[u].id]) {
          unreachableCount++;
          var alreadyFlagged = false;
          for (var iss = 0; iss < issues.length; iss++) {
            if (issues[iss].nodeId === nodes[u].id) { alreadyFlagged = true; break; }
          }
          if (!alreadyFlagged) {
            issues.push({ type: 'unreachable', nodeId: nodes[u].id, message: '节点「' + nodes[u].name + '」无法从源头到达' });
          }
        }
      }
      health -= unreachableCount * 10;
    }

    // Check for redundant edges
    var redundantCount = 0;
    for (var re = 0; re < edges.length; re++) {
      if (isRedundantEdge(edges[re], edges)) {
        redundantCount++;
      }
    }
    if (redundantCount > 0) {
      issues.push({ type: 'redundant', count: redundantCount, message: '有 ' + redundantCount + ' 条冗余连接' });
      health -= redundantCount * 2;
    }

    health = Math.max(0, Math.min(100, health));

    var grade = 'F';
    if (health >= 95) grade = 'S';
    else if (health >= 85) grade = 'A';
    else if (health >= 70) grade = 'B';
    else if (health >= 50) grade = 'C';
    else if (health >= 30) grade = 'D';

    var stats = getLevelStats(nodes, edges, sourceId);

    return {
      health: health,
      issues: issues,
      grade: grade,
      disconnectedCount: disconnectedCount,
      blockedCount: blockedCount,
      redundantCount: redundantCount,
      progress: stats.progress,
      isComplete: stats.complete
    };
  }

  // --- Public API ---

  return {
    NODE_TYPES: NODE_TYPES,
    SCORE_BASE: SCORE_BASE,
    RELATIONSHIP_TYPES: RELATIONSHIP_TYPES,
    canConnect: canConnect,
    getConnectionType: getConnectionType,
    isLevelComplete: isLevelComplete,
    findReachable: findReachable,
    getHintForLevel: getHintForLevel,
    getValidTargets: getValidTargets,
    getConnectionDescription: getConnectionDescription,
    getConnectionChain: getConnectionChain,
    getLevelStats: getLevelStats,
    getCompletionMessage: getCompletionMessage,
    validateLevel: validateLevel,
    resetCombo: resetCombo,
    recordCombo: recordCombo,
    getComboMultiplier: getComboMultiplier,
    getComboCount: getComboCount,
    getMaxCombo: getMaxCombo,
    calculateScore: calculateScore,
    calculateStars: calculateStars,
    calculateDifficulty: calculateDifficulty,
    getTimePar: getTimePar,
    getOptimalEdgeCount: getOptimalEdgeCount,
    getConnectionValue: getConnectionValue,
    isTutorialLevel: isTutorialLevel,
    getNodeRelationship: getNodeRelationship,
    getEdgeEfficiency: getEdgeEfficiency,
    isRedundantEdge: isRedundantEdge,
    analyzeNetwork: analyzeNetwork,
    getLevelMetrics: getLevelMetrics,
    getRecommendedNext: getRecommendedNext,
    getEnrichedHint: getEnrichedHint,
    getEnrichedConnectionDescription: getEnrichedConnectionDescription,
    formatScore: formatScore,
    getStarDisplay: getStarDisplay,
    getUnblockChainDepth: getUnblockChainDepth,
    ACHIEVEMENTS: ACHIEVEMENTS,
    checkAchievement: checkAchievement,
    checkAllAchievements: checkAllAchievements,
    getAchievementProgress: getAchievementProgress,
    getUnlockedAchievements: getUnlockedAchievements,
    getAchievementList: getAchievementList,
    loadAchievements: loadAchievements,
    saveAchievements: saveAchievements,
    resetAchievements: resetAchievements,
    getDifficultyBreakdown: getDifficultyBreakdown,
    getConnectionScore: getConnectionScore,
    getStarRating: getStarRating,
    analyzeNetworkHealth: analyzeNetworkHealth
  };
})();
