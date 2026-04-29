/* global CanvasEngine */
var CanvasEngine = (function () {
  'use strict';

  var canvas, ctx;
  var dpr = 1;
  var running = false;
  var lastTime = 0;
  var rafId = null;

  var mouse = {
    x: 0,
    y: 0,
    isDown: false,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
  };

  // Screen shake state
  var shakeIntensity = 0;
  var shakeDuration = 0;
  var shakeTimer = 0;
  var shakeOffsetX = 0;
  var shakeOffsetY = 0;

  // Fade transition state
  var fadeAlpha = 0;
  var fadeTarget = 0;
  var fadeSpeed = 2;
  var fadeColor = '#000000';
  var fadeCallback = null;

  // Screen flash state
  var flashAlpha = 0;
  var flashColor = '#ffffff';
  var flashDuration = 0.3;
  var flashTimer = 0;

  // 屏幕擦除转场状态
  var wipeProgress = 0;
  var wipeTarget = 0;
  var wipeSpeed = 2;
  var wipeColor = '#000000';
  var wipeCallback = null;
  var wipeDirection = 'left';

  // 屏幕缩放转场状态
  var zoomScale = 1;
  var zoomTarget = 1;
  var zoomSpeed = 3;
  var zoomCallback = null;
  var zoomCenterX = 0;
  var zoomCenterY = 0;

  // 后处理效果状态
  var bloomEnabled = false;
  var bloomIntensity = 0.4;
  var bloomThreshold = 200;

  // Placeholder callbacks — overwritten by game modules
  var update = function () {};
  var render = function () {};

  var onMouseDown = null;
  var onMouseMove = null;
  var onMouseUp = null;
  var onResizeCallback = null;

  // --- Coordinate conversion ---

  function worldPos(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  // --- Input handlers ---

  function handleDown(e) {
    e.preventDefault();
    var pos = worldPos(e);
    mouse.x = pos.x;
    mouse.y = pos.y;
    mouse.isDown = true;
    mouse.isDragging = false;
    mouse.dragStartX = pos.x;
    mouse.dragStartY = pos.y;

    if (onMouseDown) onMouseDown(pos.x, pos.y);
  }

  function handleMove(e) {
    e.preventDefault();
    var pos = worldPos(e);
    mouse.x = pos.x;
    mouse.y = pos.y;

    if (mouse.isDown) {
      var dx = pos.x - mouse.dragStartX;
      var dy = pos.y - mouse.dragStartY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        mouse.isDragging = true;
      }
    }

    if (onMouseMove) onMouseMove(pos.x, pos.y);
  }

  function handleUp(e) {
    e.preventDefault();
    var pos = worldPos(e);
    mouse.x = pos.x;
    mouse.y = pos.y;
    mouse.isDown = false;
    mouse.isDragging = false;

    if (onMouseUp) onMouseUp(pos.x, pos.y);
  }

  // --- Main loop ---

  function loop(now) {
    if (!running) return;

    var dt = (now - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = now;

    // Update screen shake
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      var progress = shakeTimer / shakeDuration;
      var currentIntensity = shakeIntensity * progress;
      shakeOffsetX = (Math.random() - 0.5) * 2 * currentIntensity;
      shakeOffsetY = (Math.random() - 0.5) * 2 * currentIntensity;
      if (shakeTimer <= 0) {
        shakeOffsetX = 0;
        shakeOffsetY = 0;
      }
    }

    // Update fade transition
    if (fadeAlpha !== fadeTarget) {
      if (fadeAlpha < fadeTarget) {
        fadeAlpha = Math.min(fadeTarget, fadeAlpha + fadeSpeed * dt);
      } else {
        fadeAlpha = Math.max(fadeTarget, fadeAlpha - fadeSpeed * dt);
      }
      if (fadeAlpha === fadeTarget && fadeCallback) {
        var cb = fadeCallback;
        fadeCallback = null;
        cb();
      }
    }

    // Update screen flash
    if (flashTimer > 0) {
      flashTimer -= dt;
      flashAlpha = (flashTimer / flashDuration) * 0.3;
      if (flashTimer <= 0) {
        flashAlpha = 0;
      }
    }

    // 更新擦除转场
    if (wipeProgress !== wipeTarget) {
      if (wipeProgress < wipeTarget) {
        wipeProgress = Math.min(wipeTarget, wipeProgress + wipeSpeed * dt);
      } else {
        wipeProgress = Math.max(wipeTarget, wipeProgress - wipeSpeed * dt);
      }
      if (wipeProgress === wipeTarget && wipeCallback) {
        var wcb = wipeCallback;
        wipeCallback = null;
        wcb();
      }
    }

    // 更新缩放转场
    if (zoomScale !== zoomTarget) {
      if (zoomScale < zoomTarget) {
        zoomScale = Math.min(zoomTarget, zoomScale + zoomSpeed * dt);
      } else {
        zoomScale = Math.max(zoomTarget, zoomScale - zoomSpeed * dt);
      }
      if (zoomScale === zoomTarget && zoomCallback) {
        var zcb = zoomCallback;
        zoomCallback = null;
        zcb();
      }
    }

    update(dt);

    // 应用缩放变换
    if (zoomScale !== 1) {
      ctx.save();
      var cw = canvas.clientWidth;
      var ch = canvas.clientHeight;
      ctx.translate(zoomCenterX || cw / 2, zoomCenterY || ch / 2);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-(zoomCenterX || cw / 2), -(zoomCenterY || ch / 2));
    }

    // Apply shake offset
    ctx.save();
    ctx.translate(shakeOffsetX, shakeOffsetY);

    render(ctx);

    ctx.restore();

    if (zoomScale !== 1) {
      ctx.restore();
    }

    // Render fade overlay
    if (fadeAlpha > 0.001) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = fadeAlpha;
      ctx.fillStyle = fadeColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Render flash overlay
    if (flashAlpha > 0.001) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // 渲染擦除转场覆盖层
    if (wipeProgress > 0.001) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = wipeColor;
      var ww = canvas.width;
      var wh = canvas.height;
      var wipePx = ww * wipeProgress;
      if (wipeDirection === 'left') {
        ctx.fillRect(0, 0, wipePx, wh);
      } else if (wipeDirection === 'right') {
        ctx.fillRect(ww - wipePx, 0, wipePx, wh);
      } else if (wipeDirection === 'top') {
        ctx.fillRect(0, 0, ww, wh * wipeProgress);
      } else if (wipeDirection === 'bottom') {
        ctx.fillRect(0, wh - wh * wipeProgress, ww, wh * wipeProgress);
      }
      ctx.restore();
    }

    rafId = requestAnimationFrame(loop);
  }

  // --- Public API ---

  var engine = {
    // Canvas references (read-only after init)
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,

    mouse: mouse,

    init: function (canvasId) {
      canvas = document.getElementById(canvasId);
      ctx = canvas.getContext('2d');

      engine.canvas = canvas;
      engine.ctx = ctx;

      dpr = window.devicePixelRatio || 1;

      engine.resize();

      // Mouse events
      canvas.addEventListener('mousedown', handleDown);
      canvas.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);

      // Touch events
      canvas.addEventListener('touchstart', handleDown, { passive: false });
      canvas.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp, { passive: false });
      window.addEventListener('touchcancel', handleUp, { passive: false });

      window.addEventListener('resize', function () {
        engine.resize();
      });
    },

    resize: function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      var w = canvas.clientWidth;
      var h = canvas.clientHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;

      engine.width = canvas.width;
      engine.height = canvas.height;

      // Reset transform to scale for DPR
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (onResizeCallback) onResizeCallback();
    },

    start: function () {
      if (running) return;
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    },

    stop: function () {
      running = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    // --- Drawing helpers ---

    clear: function (color) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = color || '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    },

    drawCircle: function (x, y, r, fillColor, strokeColor, lineWidth) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);

      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth || 1;
        ctx.stroke();
      }
    },

    drawLine: function (x1, y1, x2, y2, color, width, dash) {
      ctx.beginPath();
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = width || 1;

      if (dash) {
        ctx.setLineDash(dash);
      } else {
        ctx.setLineDash([]);
      }

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    drawText: function (text, x, y, font, color, align, baseline) {
      ctx.font = font || '14px sans-serif';
      ctx.fillStyle = color || '#ffffff';
      ctx.textAlign = align || 'center';
      ctx.textBaseline = baseline || 'middle';
      ctx.fillText(text, x, y);
    },

    drawGlow: function (x, y, radius, color, intensity) {
      var r = Math.max(0.01, radius);
      var innerR = r * 0.1;

      var gradient = ctx.createRadialGradient(x, y, innerR, x, y, r);
      var alpha = Math.min(1, Math.max(0, intensity || 0.5));

      // Parse color to extract rgb for alpha blending
      var rgb = parseColor(color || '#ffffff');
      gradient.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')');
      gradient.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    },

    drawRoundedRect: function (x, y, w, h, r, fillColor, strokeColor, lineWidth) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();

      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth || 1;
        ctx.stroke();
      }
    },

    drawBezier: function (x1, y1, cx1, cy1, cx2, cy2, x2, y2, color, width, dash) {
      ctx.beginPath();
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = width || 1;

      if (dash) {
        ctx.setLineDash(dash);
      } else {
        ctx.setLineDash([]);
      }

      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    drawWrappedText: function (text, x, y, maxWidth, font, color, lineH) {
      ctx.font = font || '14px sans-serif';
      ctx.fillStyle = color || '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      var words = text.split('');
      var line = '';
      var currentY = y;

      for (var i = 0; i < words.length; i++) {
        var testLine = line + words[i];
        var metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
          ctx.fillText(line, x, currentY);
          line = words[i];
          currentY += (lineH || 20);
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
      return currentY + (lineH || 20);
    },

    drawArc: function (x, y, r, startAngle, endAngle, color, width) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.01, r), startAngle, endAngle);
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = width || 2;
      ctx.stroke();
    },

    drawVignette: function () {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      var cx = w / 2;
      var cy = h / 2;
      var outerR = Math.sqrt(cx * cx + cy * cy);

      var gradient = ctx.createRadialGradient(cx, cy, outerR * 0.5, cx, cy, outerR);
      gradient.addColorStop(0, 'rgba(26,26,46,0)');
      gradient.addColorStop(1, 'rgba(26,26,46,0.6)');

      ctx.save();
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },

    drawStar: function (x, y, r, points, fillColor, strokeColor, lineWidth) {
      points = points || 5;
      ctx.beginPath();
      for (var i = 0; i < points * 2; i++) {
        var angle = (i * Math.PI) / points - Math.PI / 2;
        var radius = i % 2 === 0 ? r : r * 0.45;
        var px = x + Math.cos(angle) * radius;
        var py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
      if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
    },

    drawHexagon: function (x, y, r, fillColor, strokeColor, lineWidth) {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var angle = (Math.PI / 3) * i - Math.PI / 6;
        var px = x + Math.cos(angle) * r;
        var py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
      if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
    },

    drawHeart: function (x, y, r, fillColor, strokeColor, lineWidth) {
      ctx.beginPath();
      var topY = y - r * 0.4;
      ctx.moveTo(x, y + r * 0.7);
      ctx.bezierCurveTo(x - r * 1.2, y - r * 0.1, x - r * 0.7, topY - r * 0.7, x, topY);
      ctx.bezierCurveTo(x + r * 0.7, topY - r * 0.7, x + r * 1.2, y - r * 0.1, x, y + r * 0.7);
      ctx.closePath();
      if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
      if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
    },

    drawDiamond: function (x, y, r, fillColor, strokeColor, lineWidth) {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.7, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r * 0.7, y);
      ctx.closePath();
      if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
      if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
    },

    drawArrow: function (x1, y1, x2, y2, color, width) {
      var headLen = 10;
      var angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = width || 2;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    },

    drawGradientBg: function (colors) {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      var gradient = ctx.createLinearGradient(0, 0, 0, h);
      for (var i = 0; i < colors.length; i++) {
        gradient.addColorStop(i / (colors.length - 1), colors[i]);
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    },

    drawTextShadow: function (text, x, y, font, color, shadowColor, offsetX, offsetY) {
      ctx.font = font || '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      offsetX = offsetX || 1;
      offsetY = offsetY || 1;
      ctx.fillStyle = shadowColor || 'rgba(0,0,0,0.5)';
      ctx.fillText(text, x + offsetX, y + offsetY);
      ctx.fillStyle = color || '#ffffff';
      ctx.fillText(text, x, y);
    },

    // --- Polygon drawing ---
    drawPolygon: function (x, y, r, sides, fillColor, strokeColor, lineWidth, rotation) {
      sides = sides || 6;
      rotation = rotation || 0;
      ctx.beginPath();
      for (var i = 0; i < sides; i++) {
        var angle = (Math.PI * 2 / sides) * i + rotation - Math.PI / 2;
        var px = x + Math.cos(angle) * r;
        var py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
      if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
    },

    drawStarPolygon: function (x, y, outerR, innerR, points, fillColor, strokeColor, lineWidth) {
      points = points || 5;
      innerR = innerR || outerR * 0.45;
      ctx.beginPath();
      for (var i = 0; i < points * 2; i++) {
        var angle = (i * Math.PI) / points - Math.PI / 2;
        var r = i % 2 === 0 ? outerR : innerR;
        var px = x + Math.cos(angle) * r;
        var py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
      if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
    },

    drawCross: function (x, y, size, color, lineWidth) {
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = lineWidth || 2;
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.moveTo(x, y - size);
      ctx.lineTo(x, y + size);
      ctx.stroke();
    },

    drawTriangle: function (x, y, r, fillColor, strokeColor, lineWidth, rotation) {
      rotation = rotation || 0;
      ctx.beginPath();
      for (var i = 0; i < 3; i++) {
        var angle = (Math.PI * 2 / 3) * i + rotation - Math.PI / 2;
        var px = x + Math.cos(angle) * r;
        var py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
      if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
    },

    // --- Gradient fills ---
    drawGradientCircle: function (x, y, r, colorInner, colorOuter) {
      r = Math.max(0.01, r);
      var gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, colorInner || '#ffffff');
      gradient.addColorStop(1, colorOuter || 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    },

    drawGradientRect: function (x, y, w, h, colorTop, colorBottom) {
      var gradient = ctx.createLinearGradient(x, y, x, y + h);
      gradient.addColorStop(0, colorTop || '#ffffff');
      gradient.addColorStop(1, colorBottom || '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, w, h);
    },

    drawGradientLine: function (x1, y1, x2, y2, color1, color2, width) {
      var gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, color1 || '#ffffff');
      gradient.addColorStop(1, color2 || 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = width || 2;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    },

    // --- Screen effects ---
    shakeScreen: function (intensity, duration) {
      shakeIntensity = intensity || 5;
      shakeDuration = duration || 0.3;
      shakeTimer = shakeDuration;
    },

    fadeIn: function (speed, color, callback) {
      fadeAlpha = 1;
      fadeTarget = 0;
      fadeSpeed = speed || 2;
      fadeColor = color || '#000000';
      fadeCallback = callback || null;
    },

    fadeOut: function (speed, color, callback) {
      fadeAlpha = 0;
      fadeTarget = 1;
      fadeSpeed = speed || 2;
      fadeColor = color || '#000000';
      fadeCallback = callback || null;
    },

    flash: function (color, duration) {
      flashColor = color || '#ffffff';
      flashDuration = duration || 0.3;
      flashTimer = flashDuration;
      flashAlpha = 0.3;
    },

    getShakeOffset: function () {
      return { x: shakeOffsetX, y: shakeOffsetY };
    },

    getFadeAlpha: function () {
      return fadeAlpha;
    },

    isFading: function () {
      return fadeAlpha !== fadeTarget;
    },

    // --- Batch rendering helpers ---
    drawDashedCircle: function (x, y, r, color, width, dashPattern) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = width || 1;
      ctx.setLineDash(dashPattern || [5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    drawDottedLine: function (x1, y1, x2, y2, color, dotSpacing, dotRadius) {
      var dx = x2 - x1;
      var dy = y2 - y1;
      var dist = Math.sqrt(dx * dx + dy * dy);
      dotSpacing = dotSpacing || 8;
      dotRadius = dotRadius || 1.5;
      var steps = Math.floor(dist / dotSpacing);

      ctx.fillStyle = color || '#ffffff';
      for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var px = x1 + dx * t;
        var py = y1 + dy * t;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.01, dotRadius), 0, Math.PI * 2);
        ctx.fill();
      }
    },

    drawArcWedge: function (x, y, innerR, outerR, startAngle, endAngle, fillColor) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.01, outerR), startAngle, endAngle);
      ctx.arc(x, y, Math.max(0.01, innerR), endAngle, startAngle, true);
      ctx.closePath();
      if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
    },

    drawProgressBar: function (x, y, w, h, progress, fillColor, bgColor, borderColor) {
      progress = Math.max(0, Math.min(1, progress));

      // Background
      if (bgColor) {
        ctx.fillStyle = bgColor;
        engine.drawRoundedRect(x, y, w, h, h / 2, bgColor);
      }

      // Fill
      if (progress > 0 && fillColor) {
        var fillW = w * progress;
        ctx.save();
        ctx.beginPath();
        engine.drawRoundedRect(x, y, w, h, h / 2);
        ctx.clip();
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, fillW, h);
        ctx.restore();
      }

      // Border
      if (borderColor) {
        engine.drawRoundedRect(x, y, w, h, h / 2, null, borderColor, 1);
      }
    },

    // --- Measurement helpers ---
    measureText: function (text, font) {
      ctx.font = font || '14px sans-serif';
      return ctx.measureText(text);
    },

    getTextWidth: function (text, font) {
      return engine.measureText(text, font).width;
    },

    // --- Clipping helpers ---
    clipCircle: function (x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);
      ctx.clip();
    },

    clipRect: function (x, y, w, h) {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
    },

    clipRoundedRect: function (x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.clip();
    },

    // --- Color utilities ---
    colorWithAlpha: function (hex, alpha) {
      var rgb = parseColor(hex);
      return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
    },

    lerpColor: function (color1, color2, t) {
      var c1 = parseColor(color1);
      var c2 = parseColor(color2);
      var r = Math.round(c1.r + (c2.r - c1.r) * t);
      var g = Math.round(c1.g + (c2.g - c1.g) * t);
      var b = Math.round(c1.b + (c2.b - c1.b) * t);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    // --- 高级绘制原语 ---

    /** 绘制螺旋线 */
    drawSpiral: function (x, y, maxR, turns, color, width) {
      turns = turns || 3;
      var steps = turns * 60;
      ctx.beginPath();
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = width || 1;
      for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var angle = t * turns * Math.PI * 2;
        var r = t * maxR;
        var px = x + Math.cos(angle) * r;
        var py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    },

    /** 绘制波浪线 */
    drawWave: function (x1, y1, x2, y2, amplitude, frequency, color, width) {
      amplitude = amplitude || 10;
      frequency = frequency || 0.05;
      var dx = x2 - x1;
      var dy = y2 - y1;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var angle = Math.atan2(dy, dx);
      var steps = Math.max(10, Math.floor(dist / 2));

      ctx.save();
      ctx.translate(x1, y1);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = width || 2;
      for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var px = t * dist;
        var py = Math.sin(t * dist * frequency) * amplitude;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    },

    /** 绘制虚线贝塞尔曲线 */
    drawDashedBezier: function (x1, y1, cx1, cy1, cx2, cy2, x2, y2, color, width, dashPattern) {
      ctx.beginPath();
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = width || 1;
      ctx.setLineDash(dashPattern || [8, 4]);
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    /** 绘制多段折线 */
    drawPolyline: function (points, color, width) {
      if (!points || points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = width || 2;
      ctx.moveTo(points[0].x, points[0].y);
      for (var i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    },

    /** 绘制平滑曲线穿过多个点 */
    drawSmoothCurve: function (points, color, width) {
      if (!points || points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = width || 2;
      ctx.moveTo(points[0].x, points[0].y);
      if (points.length === 2) {
        ctx.lineTo(points[1].x, points[1].y);
      } else {
        for (var i = 1; i < points.length - 1; i++) {
          var cx = (points[i].x + points[i + 1].x) / 2;
          var cy = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, cx, cy);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      }
      ctx.stroke();
    },

    /** 绘制光环（发光圆环） */
    drawGlowRing: function (x, y, innerR, outerR, color, intensity) {
      var rgb = parseColor(color || '#ffffff');
      var alpha = Math.min(1, Math.max(0, intensity || 0.5));
      var midR = (innerR + outerR) / 2;
      var gradient = ctx.createRadialGradient(x, y, innerR, x, y, outerR);
      gradient.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
      gradient.addColorStop(0.3, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (alpha * 0.6) + ')');
      gradient.addColorStop(0.5, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')');
      gradient.addColorStop(0.7, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (alpha * 0.6) + ')');
      gradient.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.01, outerR), 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    },

    // --- 转场效果 ---

    /** 擦除进入 */
    wipeIn: function (speed, color, direction, callback) {
      wipeProgress = 1;
      wipeTarget = 0;
      wipeSpeed = speed || 2;
      wipeColor = color || '#000000';
      wipeDirection = direction || 'left';
      wipeCallback = callback || null;
    },

    /** 擦除退出 */
    wipeOut: function (speed, color, direction, callback) {
      wipeProgress = 0;
      wipeTarget = 1;
      wipeSpeed = speed || 2;
      wipeColor = color || '#000000';
      wipeDirection = direction || 'left';
      wipeCallback = callback || null;
    },

    /** 缩放进入 */
    zoomIn: function (speed, centerX, centerY, callback) {
      zoomScale = 0.01;
      zoomTarget = 1;
      zoomSpeed = speed || 3;
      zoomCenterX = centerX || 0;
      zoomCenterY = centerY || 0;
      zoomCallback = callback || null;
    },

    /** 缩放退出 */
    zoomOut: function (speed, centerX, centerY, callback) {
      zoomScale = 1;
      zoomTarget = 3;
      zoomSpeed = speed || 3;
      zoomCenterX = centerX || 0;
      zoomCenterY = centerY || 0;
      zoomCallback = callback || null;
    },

    getWipeProgress: function () {
      return wipeProgress;
    },

    getZoomScale: function () {
      return zoomScale;
    },

    isWiping: function () {
      return wipeProgress !== wipeTarget;
    },

    isZooming: function () {
      return zoomScale !== zoomTarget;
    },

    // --- 后处理效果 ---

    /** 启用/关闭辉光效果 */
    setBloom: function (enabled, intensity, threshold) {
      bloomEnabled = enabled;
      if (intensity !== undefined) bloomIntensity = intensity;
      if (threshold !== undefined) bloomThreshold = threshold;
    },

    /** 渲染简易辉光（用多层模糊圆模拟） */
    renderBloom: function (brightSpots) {
      if (!bloomEnabled || !brightSpots) return;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (var i = 0; i < brightSpots.length; i++) {
        var spot = brightSpots[i];
        var r = (spot.radius || 20) * 2;
        var gradient = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, Math.max(0.01, r));
        var rgb = parseColor(spot.color || '#ffffff');
        gradient.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (bloomIntensity * 0.4) + ')');
        gradient.addColorStop(0.5, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (bloomIntensity * 0.15) + ')');
        gradient.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, Math.max(0.01, r), 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      ctx.restore();
    },

    /** 渲染径向模糊叠加 */
    renderRadialBlur: function (cx, cy, radius, intensity) {
      if (!intensity || intensity <= 0) return;
      var rgb = parseColor('#000000');
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      var gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(0.01, radius));
      gradient.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
      gradient.addColorStop(0.7, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (intensity * 0.3) + ')');
      gradient.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + intensity + ')');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.restore();
    },

    /** 渲染光线效果 */
    renderLightRays: function (cx, cy, radius, rays, color, intensity) {
      rays = rays || 8;
      intensity = intensity || 0.2;
      var rgb = parseColor(color || '#FFD700');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (var i = 0; i < rays; i++) {
        var angle = (Math.PI * 2 / rays) * i;
        var endX = cx + Math.cos(angle) * radius;
        var endY = cy + Math.sin(angle) * radius;
        var gradient = ctx.createLinearGradient(cx, cy, endX, endY);
        gradient.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + intensity + ')');
        gradient.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        ctx.beginPath();
        var perpX = Math.cos(angle + Math.PI / 2) * 8;
        var perpY = Math.sin(angle + Math.PI / 2) * 8;
        ctx.moveTo(cx + perpX, cy + perpY);
        ctx.lineTo(cx - perpX, cy - perpY);
        ctx.lineTo(endX, endY);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      ctx.restore();
    },

    // --- Screen info ---
    getScreenCenter: function () {
      return { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
    },

    getScreenBounds: function () {
      return { x: 0, y: 0, w: canvas.clientWidth, h: canvas.clientHeight };
    },

    getPixelRatio: function () {
      return dpr;
    }
  };

  // --- Color parsing helper ---

  function parseColor(hex) {
    var r = 255, g = 255, b = 255;

    if (hex.charAt(0) === '#') {
      var h = hex.slice(1);
      if (h.length === 3) {
        r = parseInt(h.charAt(0) + h.charAt(0), 16);
        g = parseInt(h.charAt(1) + h.charAt(1), 16);
        b = parseInt(h.charAt(2) + h.charAt(2), 16);
      } else if (h.length >= 6) {
        r = parseInt(h.slice(0, 2), 16);
        g = parseInt(h.slice(2, 4), 16);
        b = parseInt(h.slice(4, 6), 16);
      }
    }

    return { r: r, g: g, b: b };
  }

  // Expose update/render as settable properties via defineProperty
  Object.defineProperty(engine, 'update', {
    get: function () { return update; },
    set: function (fn) { update = fn; }
  });

  Object.defineProperty(engine, 'render', {
    get: function () { return render; },
    set: function (fn) { render = fn; }
  });

  Object.defineProperty(engine, 'onMouseDown', {
    get: function () { return onMouseDown; },
    set: function (fn) { onMouseDown = fn; }
  });

  Object.defineProperty(engine, 'onMouseMove', {
    get: function () { return onMouseMove; },
    set: function (fn) { onMouseMove = fn; }
  });

  Object.defineProperty(engine, 'onMouseUp', {
    get: function () { return onMouseUp; },
    set: function (fn) { onMouseUp = fn; }
  });

  Object.defineProperty(engine, 'onResize', {
    get: function () { return onResizeCallback; },
    set: function (fn) { onResizeCallback = fn; }
  });

  return engine;
})();
