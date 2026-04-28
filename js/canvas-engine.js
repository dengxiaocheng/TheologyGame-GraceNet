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

  // Placeholder callbacks — overwritten by game modules
  var update = function () {};
  var render = function () {};

  var onMouseDown = null;
  var onMouseMove = null;
  var onMouseUp = null;

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
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr
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

    update(dt);
    render(ctx);

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
      window.addEventListener('touchend', handleUp);

      window.addEventListener('resize', function () {
        engine.resize();
      });
    },

    resize: function () {
      dpr = window.devicePixelRatio || 1;

      var w = canvas.clientWidth;
      var h = canvas.clientHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;

      engine.width = canvas.width;
      engine.height = canvas.height;

      // Reset transform to scale for DPR
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  return engine;
})();
