/* global GraceFlow */
var GraceFlow = (function () {
  'use strict';

  var particles = [];
  var ambientParticles = [];
  var ripples = [];
  var burstParticles = [];
  var isFlowing = false;
  var spawnTimer = 0;
  var ambientTimer = 0;
  var time = 0;

  // Star field background
  var stars = [];
  var MAX_STARS = 60;
  var starSpawnTimer = 0;

  // Floating text effects
  var floatingTexts = [];
  var MAX_FLOATING_TEXTS = 10;

  // Celebration particles (level complete)
  var celebrationParticles = [];
  var MAX_CELEBRATION = 80;
  var isCelebrating = false;
  var celebrationTimer = 0;

  // Trail effects
  var trailPoints = [];
  var MAX_TRAIL_POINTS = 100;

  var AMBIENT_INTERVAL = 0.15;
  var MAX_PARTICLES = 200;
  var MAX_AMBIENT = 40;
  var MAX_RIPPLES = 20;
  var MAX_BURST = 60;
  var TRAIL_LENGTH = 6;

  var COLORS = {
    grace:   '#FFD700',
    healing: '#4ECDC4',
    bridge:  '#CCCCCC'
  };

  // Particle color palette for celebrations
  var CELEBRATION_COLORS = [
    '#FFD700', '#FF6B9D', '#4ECDC4', '#A78BFA', '#F97316',
    '#60A5FA', '#FF4444', '#44FF44', '#FF69B4', '#00CED1'
  ];

  // --- Helper: get nodes for an edge ---
  function getEdgeNodes(edge) {
    var fromNode = null, toNode = null;
    var ns = NodeSystem.nodes;
    for (var i = 0; i < ns.length; i++) {
      if (ns[i].id === edge.from) fromNode = ns[i];
      if (ns[i].id === edge.to) toNode = ns[i];
    }
    return { from: fromNode, to: toNode };
  }

  // --- Helper: get bezier point for edge at t ---
  function getEdgePoint(edge, t) {
    var nodes = getEdgeNodes(edge);
    if (!nodes.from || !nodes.to) return null;
    var cp = EdgeSystem._getControlPoints
      ? EdgeSystem._getControlPoints(nodes.from, nodes.to)
      : null;

    if (!cp) {
      return {
        x: nodes.from.x + (nodes.to.x - nodes.from.x) * t,
        y: nodes.from.y + (nodes.to.y - nodes.from.y) * t
      };
    }

    var it = 1 - t;
    return {
      x: it*it*it*nodes.from.x + 3*it*it*t*cp.cx1 + 3*it*t*t*cp.cx2 + t*t*t*nodes.to.x,
      y: it*it*it*nodes.from.y + 3*it*it*t*cp.cy1 + 3*it*t*t*cp.cy2 + t*t*t*nodes.to.y
    };
  }

  // --- Control points (duplicated from EdgeSystem for particle path) ---
  function getControlPoints(fromNode, toNode) {
    var mx = (fromNode.x + toNode.x) / 2;
    var my = (fromNode.y + toNode.y) / 2;
    var dx = toNode.x - fromNode.x;
    var dy = toNode.y - fromNode.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
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

  // --- Flow intensity ---
  function getFlowIntensity() {
    return Math.min(1, EdgeSystem.edges.length / 6);
  }

  // --- Spawn edge-following particle ---
  function spawnParticle(edge) {
    return {
      edgeFrom: edge.from,
      edgeTo: edge.to,
      type: edge.type,
      t: 0,
      speed: 0.3 + Math.random() * 0.25,
      size: 2.5 + Math.random() * 2,
      alpha: 0.9,
      color: COLORS[edge.type] || COLORS.bridge,
      trail: []
    };
  }

  // --- Spawn ambient particle orbiting a source node ---
  function spawnAmbient(node) {
    var angle = Math.random() * Math.PI * 2;
    var dist = 20 + Math.random() * 30;
    return {
      nodeId: node.id,
      angle: angle,
      dist: dist,
      speed: 0.5 + Math.random() * 0.8,
      size: 1.5 + Math.random() * 1.5,
      alpha: 0.3 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      life: 0,
      maxLife: 3 + Math.random() * 4
    };
  }

  // --- Ripple effect ---
  function addRipple(x, y, color) {
    if (ripples.length >= MAX_RIPPLES) {
      ripples.shift();
    }
    ripples.push({
      x: x,
      y: y,
      radius: 0,
      maxRadius: 50 + Math.random() * 20,
      alpha: 0.7,
      color: color || '#FFD700',
      speed: 80
    });
  }

  function triggerRipple(nodeId) {
    var ns = NodeSystem.nodes;
    for (var i = 0; i < ns.length; i++) {
      if (ns[i].id === nodeId) {
        var edges = EdgeSystem.getEdgesForNode(nodeId);
        var color = edges.length > 0 ? (COLORS[edges[0].type] || '#FFD700') : '#FFD700';
        addRipple(ns[i].x, ns[i].y, color);
        break;
      }
    }
  }

  // --- Burst particles on new connection ---
  function triggerBurst(nodeId, nodeColor) {
    var ns = NodeSystem.nodes;
    var node = null;
    for (var i = 0; i < ns.length; i++) {
      if (ns[i].id === nodeId) { node = ns[i]; break; }
    }
    if (!node) return;

    var count = 12;
    for (var b = 0; b < count; b++) {
      if (burstParticles.length >= MAX_BURST) break;
      var angle = (b / count) * Math.PI * 2;
      var speed = 40 + Math.random() * 60;
      burstParticles.push({
        x: node.x,
        y: node.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        alpha: 1.0,
        color: nodeColor || '#FFD700',
        life: 0,
        maxLife: 0.5 + Math.random() * 0.4
      });
    }
  }

  // --- Draw particle shape ---
  function drawParticleShape(ctx, x, y, size, type) {
    switch (type) {
      case 'grace':
        // Circle
        CanvasEngine.drawCircle(x, y, size, null, null, 0);
        break;
      case 'healing':
        // Diamond
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        break;
      case 'bridge':
        // Square
        ctx.beginPath();
        ctx.rect(x - size * 0.7, y - size * 0.7, size * 1.4, size * 1.4);
        ctx.fill();
        break;
      default:
        CanvasEngine.drawCircle(x, y, size, null, null, 0);
    }
  }

  // --- Activate / deactivate ---
  function activate() {
    isFlowing = true;
    spawnTimer = 0;
  }

  function deactivate() {
    isFlowing = false;
  }

  // --- Star field background ---

  function spawnStar() {
    var w = CanvasEngine.width || 800;
    var h = CanvasEngine.height || 600;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      size: 0.5 + Math.random() * 1.5,
      alpha: 0,
      targetAlpha: 0.2 + Math.random() * 0.5,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinklePhase: Math.random() * Math.PI * 2,
      life: 0,
      maxLife: 5 + Math.random() * 10
    };
  }

  function initStarField() {
    stars = [];
    for (var i = 0; i < MAX_STARS; i++) {
      var star = spawnStar();
      star.alpha = star.targetAlpha * Math.random();
      star.life = Math.random() * star.maxLife;
      stars.push(star);
    }
  }

  // --- Floating text effects ---

  function addFloatingText(x, y, text, color, duration) {
    if (floatingTexts.length >= MAX_FLOATING_TEXTS) {
      floatingTexts.shift();
    }
    floatingTexts.push({
      x: x,
      y: y,
      text: text,
      color: color || '#FFD700',
      alpha: 1.0,
      life: 0,
      maxLife: duration || 2.0,
      vy: -30,
      scale: 0.5
    });
  }

  function triggerScorePopup(x, y, score) {
    addFloatingText(x, y, '+' + score, '#FFD700', 1.5);
  }

  function triggerComboPopup(x, y, combo) {
    addFloatingText(x, y - 20, combo + 'x', '#FF6B9D', 1.2);
  }

  // --- Celebration effects ---

  function triggerCelebration(cx, cy) {
    isCelebrating = true;
    celebrationTimer = 3.0;
    celebrationParticles = [];

    for (var i = 0; i < MAX_CELEBRATION; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 50 + Math.random() * 150;
      var color = CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)];
      celebrationParticles.push({
        x: cx || (CanvasEngine.width || 800) / 2,
        y: cy || (CanvasEngine.height || 600) / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        size: 2 + Math.random() * 4,
        alpha: 1.0,
        color: color,
        gravity: 40 + Math.random() * 40,
        life: 0,
        maxLife: 1.5 + Math.random() * 1.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 5
      });
    }
  }

  // --- Trail effects ---

  function addTrailPoint(x, y, color) {
    if (trailPoints.length >= MAX_TRAIL_POINTS) {
      trailPoints.shift();
    }
    trailPoints.push({
      x: x,
      y: y,
      color: color || '#FFD700',
      alpha: 0.6,
      size: 3
    });
  }

  // --- Particle count queries ---

  function getParticleCount() {
    return particles.length + ambientParticles.length + burstParticles.length;
  }

  function getStarCount() {
    return stars.length;
  }

  function getCelebrationActive() {
    return isCelebrating;
  }

  // --- Intensity queries ---

  function getAmbientIntensity() {
    return ambientParticles.length / MAX_AMBIENT;
  }

  function getFlowSpeed() {
    return getFlowIntensity() * 0.6 + 0.4;
  }

  // --- Update ---
  function update(dt) {
    time += dt;
    var intensity = getFlowIntensity();

    // --- Update star field ---
    if (stars.length === 0) {
      initStarField();
    }
    starSpawnTimer += dt;
    if (starSpawnTimer > 0.5 && stars.length < MAX_STARS) {
      starSpawnTimer = 0;
      stars.push(spawnStar());
    }
    for (var si = stars.length - 1; si >= 0; si--) {
      var star = stars[si];
      star.life += dt;
      star.alpha = star.targetAlpha * (0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinklePhase));
      if (star.life >= star.maxLife) {
        stars.splice(si, 1);
      }
    }

    // --- Update floating texts ---
    for (var fi = floatingTexts.length - 1; fi >= 0; fi--) {
      var ft = floatingTexts[fi];
      ft.life += dt;
      ft.y += ft.vy * dt;
      ft.vy *= 0.95;
      ft.scale = Math.min(1.0, ft.scale + dt * 4);
      var lifeRatio = ft.life / ft.maxLife;
      if (lifeRatio > 0.6) {
        ft.alpha = 1 - ((lifeRatio - 0.6) / 0.4);
      }
      if (ft.life >= ft.maxLife) {
        floatingTexts.splice(fi, 1);
      }
    }

    // --- Update celebration ---
    if (isCelebrating) {
      celebrationTimer -= dt;
      if (celebrationTimer <= 0) {
        isCelebrating = false;
      }
      for (var ci = celebrationParticles.length - 1; ci >= 0; ci--) {
        var cp = celebrationParticles[ci];
        cp.life += dt;
        cp.x += cp.vx * dt;
        cp.y += cp.vy * dt;
        cp.vy += cp.gravity * dt;
        cp.vx *= 0.98;
        cp.rotation += cp.rotSpeed * dt;
        cp.alpha = 1 - (cp.life / cp.maxLife);
        if (cp.life >= cp.maxLife) {
          celebrationParticles.splice(ci, 1);
        }
      }
    }

    // --- Update trail points ---
    for (var ti = trailPoints.length - 1; ti >= 0; ti--) {
      trailPoints[ti].alpha -= dt * 0.8;
      trailPoints[ti].size -= dt * 2;
      if (trailPoints[ti].alpha <= 0 || trailPoints[ti].size <= 0) {
        trailPoints.splice(ti, 1);
      }
    }

    // Spawn ambient particles around source nodes
    ambientTimer += dt;
    if (ambientTimer >= AMBIENT_INTERVAL && ambientParticles.length < MAX_AMBIENT) {
      ambientTimer -= AMBIENT_INTERVAL;
      var ns = NodeSystem.nodes;
      for (var s = 0; s < ns.length; s++) {
        if (ns[s].type === 'source' && ns[s].scale > 0.5) {
          if (Math.random() < 0.3) {
            ambientParticles.push(spawnAmbient(ns[s]));
          }
        }
      }
    }

    // Update ambient particles
    for (var a = ambientParticles.length - 1; a >= 0; a--) {
      var ap = ambientParticles[a];
      ap.life += dt;
      ap.angle += ap.speed * dt;

      if (ap.life >= ap.maxLife) {
        ambientParticles.splice(a, 1);
        continue;
      }

      // Fade in/out
      var lifeRatio = ap.life / ap.maxLife;
      if (lifeRatio < 0.1) {
        ap.alpha = (lifeRatio / 0.1) * 0.4;
      } else if (lifeRatio > 0.8) {
        ap.alpha = ((1 - lifeRatio) / 0.2) * 0.4;
      }
    }

    // Spawn flow particles on completed edges
    if (isFlowing) {
      spawnTimer += dt;
      var interval = 0.25 - intensity * 0.1;
      if (spawnTimer >= interval) {
        spawnTimer -= interval;
        var edges = EdgeSystem.edges;
        for (var i = 0; i < edges.length; i++) {
          if (edges[i].progress >= 1 && particles.length < MAX_PARTICLES) {
            particles.push(spawnParticle(edges[i]));
          }
        }
      }
    }

    // Update flow particles
    for (var j = particles.length - 1; j >= 0; j--) {
      var p = particles[j];
      var speedMult = 0.7 + intensity * 0.6;
      p.t += p.speed * dt * speedMult;

      // Store trail position
      var pt = getEdgePosition(p);
      if (pt) {
        p.trail.push({ x: pt.x, y: pt.y });
        if (p.trail.length > TRAIL_LENGTH) {
          p.trail.shift();
        }
      }

      if (p.t > 1) {
        if (isFlowing) {
          p.t = 0;
          p.speed = 0.3 + Math.random() * 0.25;
          p.trail = [];
        } else {
          p.alpha -= dt * 2;
          if (p.alpha <= 0) {
            particles.splice(j, 1);
          }
        }
      }
    }

    // Update ripples
    for (var r = ripples.length - 1; r >= 0; r--) {
      var rp = ripples[r];
      rp.radius += rp.speed * dt;
      rp.alpha -= dt * 1.2;
      if (rp.alpha <= 0 || rp.radius >= rp.maxRadius) {
        ripples.splice(r, 1);
      }
    }

    // Update burst particles
    for (var bi = burstParticles.length - 1; bi >= 0; bi--) {
      var bp = burstParticles[bi];
      bp.life += dt;
      bp.x += bp.vx * dt;
      bp.y += bp.vy * dt;
      bp.vx *= 0.96;
      bp.vy *= 0.96;
      bp.alpha = 1 - (bp.life / bp.maxLife);
      if (bp.life >= bp.maxLife) {
        burstParticles.splice(bi, 1);
      }
    }
  }

  // --- Get position on edge bezier path ---
  function getEdgePosition(particle) {
    var fromNode = null, toNode = null;
    var ns = NodeSystem.nodes;
    for (var n = 0; n < ns.length; n++) {
      if (ns[n].id === particle.edgeFrom) fromNode = ns[n];
      if (ns[n].id === particle.edgeTo) toNode = ns[n];
    }
    if (!fromNode || !toNode) return null;

    var cp = getControlPoints(fromNode, toNode);
    var t = particle.t;
    var it = 1 - t;
    return {
      x: it*it*it*fromNode.x + 3*it*it*t*cp.cx1 + 3*it*t*t*cp.cx2 + t*t*t*toNode.x,
      y: it*it*it*fromNode.y + 3*it*it*t*cp.cy1 + 3*it*t*t*cp.cy2 + t*t*t*toNode.y
    };
  }

  // --- Render ---
  function render(ctx) {
    // --- Layer 0: Star field background ---
    renderStarField(ctx);

    // --- Layer 1: Trail points ---
    renderTrails(ctx);

    // --- Layer 2: Background network glow ---
    renderNetworkGlow(ctx);

    // Ambient particles
    for (var a = 0; a < ambientParticles.length; a++) {
      var ap = ambientParticles[a];
      var sourceNode = null;
      var ns = NodeSystem.nodes;
      for (var sn = 0; sn < ns.length; sn++) {
        if (ns[sn].id === ap.nodeId) { sourceNode = ns[sn]; break; }
      }
      if (!sourceNode) continue;

      var wobble = Math.sin(time * 2 + ap.phase) * 5;
      var ax = sourceNode.x + Math.cos(ap.angle) * (ap.dist + wobble);
      var ay = sourceNode.y + Math.sin(ap.angle) * (ap.dist + wobble);

      ctx.save();
      ctx.globalAlpha = ap.alpha;
      CanvasEngine.drawGlow(ax, ay, ap.size * 4, '#FFD700', 0.3);
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(ax, ay, Math.max(0.01, ap.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Source halo: rotating rays around source nodes
    var allNodes = NodeSystem.nodes;
    for (var si = 0; si < allNodes.length; si++) {
      if (allNodes[si].type === 'source' && allNodes[si].scale > 0.5) {
        var sx = allNodes[si].x;
        var sy = allNodes[si].y;
        var haloR = 55 + Math.sin(time * 1.5) * 5;
        ctx.save();
        ctx.globalAlpha = 0.12 + Math.sin(time * 1.5) * 0.04;
        for (var ray = 0; ray < 8; ray++) {
          var rayAngle = (ray / 8) * Math.PI * 2 + time * 0.3;
          var rayEndX = sx + Math.cos(rayAngle) * haloR;
          var rayEndY = sy + Math.sin(rayAngle) * haloR;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(rayEndX, rayEndY);
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Flow particles with trails
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var pos = getEdgePosition(p);
      if (!pos) continue;

      ctx.save();

      // Color-blended particle (blend edge color with target node color)
      var particleColor = p.color;
      var targetNode = null;
      var tns = NodeSystem.nodes;
      for (var tn = 0; tn < tns.length; tn++) {
        if (tns[tn].id === p.edgeTo) { targetNode = tns[tn]; break; }
      }
      if (targetNode && p.t > 0.5) {
        var nodeTypeInfo = Rules.NODE_TYPES[targetNode.type];
        if (nodeTypeInfo) {
          particleColor = Animation.colorLerp(p.color, nodeTypeInfo.color, (p.t - 0.5) * 2);
        }
      }

      // Draw trail with gradient (fade from transparent to particle color)
      if (p.trail.length > 1) {
        for (var tr = 0; tr < p.trail.length; tr++) {
          var trailAlpha = (tr / p.trail.length) * p.alpha * 0.4;
          var trailSize = p.size * (tr / p.trail.length) * 0.6;
          var trailColor = Animation.colorLerp('#ffffff', particleColor, tr / p.trail.length);
          ctx.globalAlpha = trailAlpha;
          ctx.fillStyle = trailColor;
          ctx.beginPath();
          ctx.arc(p.trail[tr].x, p.trail[tr].y, Math.max(0.01, trailSize), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw particle
      ctx.globalAlpha = p.alpha;

      // Glow
      CanvasEngine.drawGlow(pos.x, pos.y, p.size * 4, particleColor, 0.5);

      // Shape
      ctx.fillStyle = particleColor;
      drawParticleShape(ctx, pos.x, pos.y, p.size, p.type);

      ctx.restore();
    }

    // Burst particles
    for (var bi = 0; bi < burstParticles.length; bi++) {
      var bp = burstParticles[bi];
      ctx.save();
      ctx.globalAlpha = bp.alpha;
      CanvasEngine.drawGlow(bp.x, bp.y, bp.size * 3, bp.color, 0.4);
      ctx.fillStyle = bp.color;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, Math.max(0.01, bp.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Ripples
    for (var r = 0; r < ripples.length; r++) {
      var rp = ripples[r];
      ctx.save();
      ctx.globalAlpha = rp.alpha;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, Math.max(0.01, rp.radius), 0, Math.PI * 2);
      ctx.strokeStyle = rp.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // --- Layer: Floating texts ---
    renderFloatingTexts(ctx);

    // --- Layer: Celebration particles ---
    if (isCelebrating) {
      renderCelebration(ctx);
    }
  }

  // --- Render star field background ---
  function renderStarField(ctx) {
    if (stars.length === 0) return;
    ctx.save();
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      if (star.alpha <= 0.01) continue;
      ctx.globalAlpha = Math.max(0, star.alpha);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x / (window.devicePixelRatio || 1), star.y / (window.devicePixelRatio || 1), Math.max(0.01, star.size), 0, Math.PI * 2);
      ctx.fill();

      // Tiny cross sparkle on brighter stars
      if (star.alpha > 0.4 && star.size > 1) {
        ctx.globalAlpha = star.alpha * 0.3;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        var sx = star.x / (window.devicePixelRatio || 1);
        var sy = star.y / (window.devicePixelRatio || 1);
        var sparkleLen = star.size * 2;
        ctx.beginPath();
        ctx.moveTo(sx - sparkleLen, sy);
        ctx.lineTo(sx + sparkleLen, sy);
        ctx.moveTo(sx, sy - sparkleLen);
        ctx.lineTo(sx, sy + sparkleLen);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // --- Render trail points ---
  function renderTrails(ctx) {
    if (trailPoints.length === 0) return;
    ctx.save();
    for (var i = 0; i < trailPoints.length; i++) {
      var tp = trailPoints[i];
      if (tp.alpha <= 0.01 || tp.size <= 0.01) continue;
      ctx.globalAlpha = Math.max(0, tp.alpha);
      ctx.fillStyle = tp.color;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, Math.max(0.01, tp.size), 0, Math.PI * 2);
      ctx.fill();

      // Soft glow ring
      ctx.globalAlpha = Math.max(0, tp.alpha * 0.3);
      CanvasEngine.drawGlow(tp.x, tp.y, tp.size * 3, tp.color, 0.2);
    }
    ctx.restore();
  }

  // --- Render floating text effects ---
  function renderFloatingTexts(ctx) {
    if (floatingTexts.length === 0) return;
    ctx.save();
    for (var i = 0; i < floatingTexts.length; i++) {
      var ft = floatingTexts[i];
      if (ft.alpha <= 0.01) continue;
      ctx.globalAlpha = Math.max(0, ft.alpha);

      var fontSize = Math.round(16 * ft.scale);
      ctx.font = 'bold ' + fontSize + 'px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);

      // Main text
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);

      // Outline glow
      ctx.globalAlpha = Math.max(0, ft.alpha * 0.3);
      CanvasEngine.drawGlow(ft.x, ft.y, fontSize * 1.5, ft.color, 0.15);
    }
    ctx.restore();
  }

  // --- Render celebration particles ---
  function renderCelebration(ctx) {
    if (celebrationParticles.length === 0) return;
    ctx.save();
    for (var i = 0; i < celebrationParticles.length; i++) {
      var cp = celebrationParticles[i];
      if (cp.alpha <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, cp.alpha);
      ctx.translate(cp.x, cp.y);
      ctx.rotate(cp.rotation);

      // Draw as a small star shape
      ctx.fillStyle = cp.color;
      ctx.beginPath();
      var pts = 4;
      for (var p = 0; p < pts * 2; p++) {
        var angle = (p * Math.PI) / pts;
        var r = p % 2 === 0 ? cp.size : cp.size * 0.4;
        var px = Math.cos(angle) * r;
        var py = Math.sin(angle) * r;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Glow effect
      ctx.globalAlpha = Math.max(0, cp.alpha * 0.4);
      CanvasEngine.drawGlow(0, 0, cp.size * 3, cp.color, 0.2);

      ctx.restore();
    }
    ctx.restore();
  }

  // --- Background glow for connected network ---
  function renderNetworkGlow(ctx) {
    var edges = EdgeSystem.edges;
    if (edges.length === 0) return;

    var intensity = getFlowIntensity();
    if (intensity < 0.1) return;

    // Find bounding box of connected nodes
    var ns = NodeSystem.nodes;
    var connectedIds = {};
    for (var e = 0; e < edges.length; e++) {
      if (edges[e].progress >= 1) {
        connectedIds[edges[e].from] = true;
        connectedIds[edges[e].to] = true;
      }
    }

    var cx = 0, cy = 0, count = 0;
    for (var i = 0; i < ns.length; i++) {
      if (connectedIds[ns[i].id]) {
        cx += ns[i].x;
        cy += ns[i].y;
        count++;
      }
    }

    if (count === 0) return;
    cx /= count;
    cy /= count;

    ctx.save();
    ctx.globalAlpha = intensity * 0.08;
    CanvasEngine.drawGlow(cx, cy, 200 + intensity * 100, '#FFD700', 0.15);
    ctx.restore();
  }

  // --- Reset ---
  function reset() {
    particles = [];
    ambientParticles = [];
    ripples = [];
    burstParticles = [];
    isFlowing = false;
    spawnTimer = 0;
    ambientTimer = 0;
    time = 0;
    stars = [];
    starSpawnTimer = 0;
    floatingTexts = [];
    celebrationParticles = [];
    isCelebrating = false;
    celebrationTimer = 0;
    trailPoints = [];
  }

  // --- Advanced particle queries ---
  function getActiveParticleCount() {
    return particles.length + ambientParticles.length + burstParticles.length +
      celebrationParticles.length;
  }

  function getTotalEffectCount() {
    return getActiveParticleCount() + ripples.length + floatingTexts.length +
      trailPoints.length + stars.length;
  }

  function getSystemLoad() {
    return getTotalEffectCount() / (MAX_PARTICLES + MAX_AMBIENT + MAX_BURST +
      MAX_CELEBRATION + MAX_RIPPLES + MAX_FLOATING_TEXTS + MAX_TRAIL_POINTS + MAX_STARS);
  }

  function isSystemHealthy() {
    return getSystemLoad() < 0.8;
  }

  function getEdgeFlowRate(edgeId) {
    var count = 0;
    for (var i = 0; i < particles.length; i++) {
      if (particles[i].edgeFrom + '-' + particles[i].edgeTo === edgeId) {
        count++;
      }
    }
    return count;
  }

  function getDominantParticleColor() {
    var colorCount = {};
    var allTypes = {};
    for (var i = 0; i < particles.length; i++) {
      var c = particles[i].color;
      colorCount[c] = (colorCount[c] || 0) + 1;
    }
    var maxColor = '#FFD700';
    var maxCount = 0;
    for (var key in colorCount) {
      if (colorCount[key] > maxCount) {
        maxCount = colorCount[key];
        maxColor = key;
      }
    }
    return maxColor;
  }

  function getParticleSystemStats() {
    return {
      flowParticles: particles.length,
      ambientParticles: ambientParticles.length,
      burstParticles: burstParticles.length,
      ripples: ripples.length,
      stars: stars.length,
      floatingTexts: floatingTexts.length,
      celebrationParticles: celebrationParticles.length,
      trailPoints: trailPoints.length,
      isFlowing: isFlowing,
      isCelebrating: isCelebrating,
      flowIntensity: getFlowIntensity(),
      systemLoad: getSystemLoad()
    };
  }

  function throttleEffects() {
    // Reduce particles if system is overloaded
    while (particles.length > MAX_PARTICLES * 0.7) {
      particles.shift();
    }
    while (ambientParticles.length > MAX_AMBIENT * 0.7) {
      ambientParticles.shift();
    }
    while (trailPoints.length > MAX_TRAIL_POINTS * 0.7) {
      trailPoints.shift();
    }
  }

  function triggerMultiBurst(positions, color) {
    for (var i = 0; i < positions.length; i++) {
      triggerBurst(positions[i].id, color || '#FFD700');
    }
  }

  function createFirework(x, y) {
    var colors = CELEBRATION_COLORS;
    var color = colors[Math.floor(Math.random() * colors.length)];
    for (var i = 0; i < 20; i++) {
      if (burstParticles.length >= MAX_BURST) break;
      var angle = (i / 20) * Math.PI * 2;
      var speed = 60 + Math.random() * 80;
      burstParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        color: color,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6
      });
    }
  }

  // --- Theme-specific ambient particles ---

  var THEME_AMBIENT_CONFIGS = {
    default: { color: '#FFD700', count: 15, speed: 15, size: 2 },
    garden: { color: '#90EE90', count: 20, speed: 10, size: 3 },
    storm: { color: '#7B8FA1', count: 25, speed: 30, size: 2 },
    temple: { color: '#DAA520', count: 12, speed: 8, size: 2.5 },
    wilderness: { color: '#8FBC8F', count: 18, speed: 12, size: 2 },
    wedding: { color: '#FF69B4', count: 22, speed: 10, size: 3 },
    eternity: { color: '#E0E0FF', count: 30, speed: 5, size: 2 }
  };

  var currentThemeConfig = null;

  function setThemeAmbient(themeName) {
    currentThemeConfig = THEME_AMBIENT_CONFIGS[themeName] || THEME_AMBIENT_CONFIGS['default'];
  }

  function spawnThemeParticle(canvasW, canvasH) {
    if (!currentThemeConfig) return;
    if (ambientParticles.length >= MAX_AMBIENT) return;

    var cfg = currentThemeConfig;
    ambientParticles.push({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
      vx: (Math.random() - 0.5) * cfg.speed,
      vy: -Math.random() * cfg.speed * 0.5 - 2,
      life: 2 + Math.random() * 3,
      maxLife: 5,
      size: cfg.size * (0.5 + Math.random()),
      alpha: 0.3 + Math.random() * 0.3,
      color: cfg.color
    });
  }

  // --- Multi-stage celebration ---

  var CELEBRATION_STAGES = {
    sparkles: { duration: 1.0, particleCount: 15 },
    rings: { duration: 0.8, particleCount: 8 },
    fireworks: { duration: 1.5, fireworkCount: 5 },
    finale: { duration: 1.0, particleCount: 25 }
  };

  var celebrationStage = 0;
  var celebrationStageTimer = 0;

  function triggerMultiStageCelebration(centerX, centerY) {
    isCelebrating = true;
    celebrationStage = 0;
    celebrationStageTimer = 0;
    triggerCelebration();
  }

  function updateCelebrationStages(dt) {
    if (!isCelebrating) return;

    celebrationStageTimer += dt;

    var stageKeys = Object.keys(CELEBRATION_STAGES);
    if (celebrationStage >= stageKeys.length) {
      isCelebrating = false;
      return;
    }

    var stageName = stageKeys[celebrationStage];
    var stageConfig = CELEBRATION_STAGES[stageName];

    if (celebrationStageTimer >= stageConfig.duration) {
      celebrationStage++;
      celebrationStageTimer = 0;

      // Spawn next stage effects
      if (celebrationStage < stageKeys.length) {
        var nextStage = stageKeys[celebrationStage];
        if (nextStage === 'fireworks') {
          var w = CanvasEngine.getWidth();
          var h = CanvasEngine.getHeight();
          for (var f = 0; f < stageConfig.fireworkCount || f < 5; f++) {
            Animation.delay(f * 0.3, function () {
              createFirework(
                w * 0.2 + Math.random() * w * 0.6,
                h * 0.2 + Math.random() * h * 0.4
              );
            });
          }
        }
      }
    }
  }

  // --- Enhanced ripple effects ---

  function triggerEnhancedRipple(x, y, color, intensity) {
    intensity = intensity || 1;
    var count = Math.ceil(3 * intensity);
    for (var i = 0; i < count; i++) {
      ripples.push({
        x: x,
        y: y,
        radius: 5 + i * 10,
        maxRadius: 60 + i * 20 * intensity,
        alpha: 0.6 - i * 0.15,
        color: color || '#FFD700',
        speed: 40 + i * 15
      });
    }
  }

  function triggerNodeRipple(nodeId, color) {
    var node = NodeSystem.getNodeById(nodeId);
    if (!node) return;
    triggerEnhancedRipple(node.x, node.y, color, 1.5);
  }

  // --- Source node halo with scripture fragments ---

  var SCRIPTURE_FRAGMENTS = [
    '\u6069\u5178\u591f\u7528', // 恩典够用
    '\u4FE1\u5C31\u662F\u6240\u671B\u4E4B\u4E8B\u7684\u5B9E\u5E95', // 信就是所望之事的实底
    '\u6069\u5178\u4E0E\u7231\u6C38\u4E0D\u79BB\u5F00', // 恩典与爱永不离开
    '\u5728\u6069\u5178\u4E2D\u521A\u5F3A', // 在恩典中刚强
    '\u6069\u5178\u5145\u6EA2', // 恩典溢出
    '\u767D\u767D\u5F97\u5230\u6069\u5178' // 白白得到恩典
  ];

  var scriptureIndex = 0;
  var scriptureAlpha = 0;
  var scriptureTimer = 0;
  var SCRIPTURE_CYCLE = 6.0; // seconds per fragment

  function renderSourceHalo(ctx, sourceNode) {
    if (!sourceNode) return;

    // Rotating golden rings
    ctx.save();
    ctx.globalAlpha = 0.15;

    for (var ring = 0; ring < 3; ring++) {
      var angle = flowTime * (0.5 + ring * 0.3);
      var radius = sourceNode.radius * (1.5 + ring * 0.4);

      ctx.beginPath();
      ctx.arc(sourceNode.x, sourceNode.y, radius * sourceNode.scale, angle, angle + Math.PI * 1.5);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();

    // Scripture fragment display
    scriptureTimer += 0.016; // ~60fps
    if (scriptureTimer >= SCRIPTURE_CYCLE) {
      scriptureTimer = 0;
      scriptureIndex = (scriptureIndex + 1) % SCRIPTURE_FRAGMENTS.length;
    }

    // Fade in/out
    var fadeT = scriptureTimer / SCRIPTURE_CYCLE;
    if (fadeT < 0.15) scriptureAlpha = fadeT / 0.15;
    else if (fadeT > 0.85) scriptureAlpha = (1 - fadeT) / 0.15;
    else scriptureAlpha = 1;

    ctx.save();
    ctx.globalAlpha = scriptureAlpha * 0.6;
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(
      SCRIPTURE_FRAGMENTS[scriptureIndex],
      sourceNode.x,
      sourceNode.y + sourceNode.radius * sourceNode.scale + 28
    );
    ctx.restore();
  }

  return {
    get particles() { return particles; },
    get ambientParticles() { return ambientParticles; },
    get ripples() { return ripples; },
    get burstParticles() { return burstParticles; },
    get isFlowing() { return isFlowing; },
    get stars() { return stars; },
    get floatingTexts() { return floatingTexts; },
    get celebrationParticles() { return celebrationParticles; },
    get trailPoints() { return trailPoints; },
    get isCelebrating() { return isCelebrating; },
    activate: activate,
    deactivate: deactivate,
    addRipple: addRipple,
    triggerRipple: triggerRipple,
    triggerBurst: triggerBurst,
    triggerScorePopup: triggerScorePopup,
    triggerComboPopup: triggerComboPopup,
    triggerCelebration: triggerCelebration,
    triggerMultiBurst: triggerMultiBurst,
    createFirework: createFirework,
    addTrailPoint: addTrailPoint,
    addFloatingText: addFloatingText,
    initStarField: initStarField,
    getParticleCount: getParticleCount,
    getStarCount: getStarCount,
    getCelebrationActive: getCelebrationActive,
    getAmbientIntensity: getAmbientIntensity,
    getFlowSpeed: getFlowSpeed,
    getActiveParticleCount: getActiveParticleCount,
    getTotalEffectCount: getTotalEffectCount,
    getSystemLoad: getSystemLoad,
    isSystemHealthy: isSystemHealthy,
    getEdgeFlowRate: getEdgeFlowRate,
    getDominantParticleColor: getDominantParticleColor,
    getParticleSystemStats: getParticleSystemStats,
    throttleEffects: throttleEffects,
    getFlowIntensity: getFlowIntensity,
    /* 主题环境粒子 */
    THEME_AMBIENT_CONFIGS: THEME_AMBIENT_CONFIGS,
    setThemeAmbient: setThemeAmbient,
    spawnThemeParticle: spawnThemeParticle,
    /* 多阶段庆祝 */
    CELEBRATION_STAGES: CELEBRATION_STAGES,
    triggerMultiStageCelebration: triggerMultiStageCelebration,
    updateCelebrationStages: updateCelebrationStages,
    /* 增强涟漪 */
    triggerEnhancedRipple: triggerEnhancedRipple,
    triggerNodeRipple: triggerNodeRipple,
    /* 源头光环与经文 */
    SCRIPTURE_FRAGMENTS: SCRIPTURE_FRAGMENTS,
    renderSourceHalo: renderSourceHalo,
    update: update,
    render: render,
    reset: reset
  };
})();
