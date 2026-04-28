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

  // --- Public API ---

  return {
    NODE_TYPES: NODE_TYPES,
    canConnect: canConnect,
    getConnectionType: getConnectionType,
    isLevelComplete: isLevelComplete,
    findReachable: findReachable
  };
})();
