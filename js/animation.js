/* global Animation */
var Animation = (function () {
  'use strict';

  var activeTweens = [];

  // --- Easing functions ---

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function easeInQuad(t) {
    return t * t;
  }

  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function easeOutElastic(t) {
    if (t === 0 || t === 1) return t;
    var c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  function easeInOutElastic(t) {
    if (t === 0 || t === 1) return t;
    var c5 = (2 * Math.PI) / 4.5;
    if (t < 0.5) {
      return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
    }
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  }

  function easeOutBounce(t) {
    var n1 = 7.5625;
    var d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    }
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }

  function easeInCubic(t) {
    return t * t * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function easeInBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  }

  function easeInOutBack(t) {
    var c1 = 1.70158;
    var c2 = c1 * 1.525;
    if (t < 0.5) {
      return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2;
    }
    return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  }

  function easeInElastic(t) {
    if (t === 0 || t === 1) return t;
    var c4 = (2 * Math.PI) / 3;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  }

  function easeInBounce(t) {
    return 1 - easeOutBounce(1 - t);
  }

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function easeInExpo(t) {
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  }

  function easeInOutExpo(t) {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) {
      return Math.pow(2, 20 * t - 10) / 2;
    }
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  }

  function easeOutSine(t) {
    return Math.sin(t * Math.PI / 2);
  }

  function easeInSine(t) {
    return 1 - Math.cos(t * Math.PI / 2);
  }

  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function easeLinear(t) {
    return t;
  }

  function easeInQuart(t) {
    return t * t * t * t;
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function easeInOutQuart(t) {
    return t < 0.5
      ? 8 * t * t * t * t
      : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
  }

  function easeInOutQuint(t) {
    return t < 0.5
      ? 16 * t * t * t * t * t
      : 1 - Math.pow(-2 * t + 2, 5) / 2;
  }

  function easeInCirc(t) {
    return 1 - Math.sqrt(1 - t * t);
  }

  function easeOutCirc(t) {
    return Math.sqrt(1 - Math.pow(t - 1, 2));
  }

  function easeInOutCirc(t) {
    return t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
  }

  // --- Spring physics system ---

  var activeSprings = [];

  function spring(obj, props, stiffness, damping) {
    var handle = {
      obj: obj,
      targetValues: props,
      velocities: {},
      stiffness: stiffness || 120,
      damping: damping || 12,
      completed: false,
      cancelled: false,
      onComplete: null
    };

    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i++) {
      handle.velocities[keys[i]] = 0;
    }

    activeSprings.push(handle);
    return handle;
  }

  function updateSprings(dt) {
    for (var i = activeSprings.length - 1; i >= 0; i--) {
      var sp = activeSprings[i];

      if (sp.cancelled) {
        activeSprings.splice(i, 1);
        continue;
      }

      var allSettled = true;
      var keys = Object.keys(sp.targetValues);

      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        var current = sp.obj[key];
        var target = sp.targetValues[key];
        var velocity = sp.velocities[key];

        var force = (target - current) * sp.stiffness;
        var dampingForce = velocity * sp.damping;
        var acceleration = force - dampingForce;

        velocity += acceleration * dt;
        sp.velocities[key] = velocity;
        sp.obj[key] += velocity * dt;

        // Check if settled
        if (Math.abs(target - sp.obj[key]) > 0.01 || Math.abs(velocity) > 0.01) {
          allSettled = false;
        }
      }

      if (allSettled) {
        // Snap to final values
        for (var j = 0; j < keys.length; j++) {
          sp.obj[keys[j]] = sp.targetValues[keys[j]];
        }
        sp.completed = true;
        if (sp.onComplete) sp.onComplete();
        activeSprings.splice(i, 1);
      }
    }
  }

  // --- Path animation ---

  function animateAlongPath(obj, points, duration, easing) {
    if (points.length < 2) return null;

    var handle = {
      obj: obj,
      points: points,
      duration: duration,
      easing: easing || easeInOutCubic,
      elapsed: 0,
      completed: false,
      cancelled: false,
      onComplete: null
    };

    activeTweens.push(handle);
    return handle;
  }

  // --- Color cycling ---

  var colorCycles = [];

  function cycleColor(obj, prop, colors, duration, loop) {
    var handle = {
      obj: obj,
      prop: prop,
      colors: colors,
      duration: duration,
      loop: loop !== false,
      elapsed: 0,
      completed: false,
      cancelled: false,
      onComplete: null
    };

    colorCycles.push(handle);
    return handle;
  }

  function updateColorCycles(dt) {
    for (var i = colorCycles.length - 1; i >= 0; i--) {
      var cc = colorCycles[i];
      if (cc.cancelled) {
        colorCycles.splice(i, 1);
        continue;
      }

      cc.elapsed += dt;
      var totalDuration = cc.duration * (cc.colors.length - 1);
      var t;

      if (cc.loop) {
        t = (cc.elapsed % totalDuration) / totalDuration * (cc.colors.length - 1);
      } else {
        t = cc.elapsed / cc.duration;
        if (t >= cc.colors.length - 1) {
          t = cc.colors.length - 1;
          cc.completed = true;
          if (cc.onComplete) cc.onComplete();
          colorCycles.splice(i, 1);
        }
      }

      if (t < cc.colors.length - 1) {
        var index = Math.floor(t);
        var frac = t - index;
        cc.obj[cc.prop] = colorLerp(cc.colors[index], cc.colors[index + 1], frac);
      } else {
        cc.obj[cc.prop] = cc.colors[cc.colors.length - 1];
      }
    }
  }

  // --- Wave animation ---

  function wave(time, amplitude, frequency, phase) {
    return amplitude * Math.sin(time * frequency + (phase || 0));
  }

  // --- Bezier interpolation ---

  function bezierPoint(p0, p1, p2, p3, t) {
    var it = 1 - t;
    return {
      x: it*it*it*p0.x + 3*it*it*t*p1.x + 3*it*t*t*p2.x + t*t*t*p3.x,
      y: it*it*it*p0.y + 3*it*it*t*p1.y + 3*it*t*t*p2.y + t*t*t*p3.y
    };
  }

  // --- Random range ---

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  // --- Smooth step ---

  function smoothStep(edge0, edge1, x) {
    var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // --- Interpolation ---

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function colorLerp(color1, color2, t) {
    function hexToRgb(hex) {
      var r = 0, g = 0, b = 0;
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
    function toHex(n) {
      var s = Math.round(n).toString(16);
      return s.length < 2 ? '0' + s : s;
    }
    var c1 = hexToRgb(color1);
    var c2 = hexToRgb(color2);
    var r = lerp(c1.r, c2.r, t);
    var g = lerp(c1.g, c2.g, t);
    var b = lerp(c1.b, c2.b, t);
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  // --- Tween ---

  function tween(obj, props, duration, easing) {
    var startValues = {};
    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i++) {
      startValues[keys[i]] = obj[keys[i]];
    }

    var handle = {
      obj: obj,
      props: props,
      startValues: startValues,
      keys: keys,
      duration: duration,
      easing: easing || easeInOutCubic,
      elapsed: 0,
      completed: false,
      cancelled: false,
      onComplete: null
    };

    activeTweens.push(handle);
    return handle;
  }

  // --- Update ---

  function update(dt) {
    for (var i = activeTweens.length - 1; i >= 0; i--) {
      var tw = activeTweens[i];

      if (tw.cancelled) {
        activeTweens.splice(i, 1);
        continue;
      }

      tw.elapsed += dt;
      var rawT = tw.elapsed / tw.duration;
      var t = Math.min(rawT, 1);
      var easedT = tw.easing(t);

      for (var k = 0; k < tw.keys.length; k++) {
        var key = tw.keys[k];
        tw.obj[key] = tw.startValues[key] + (tw.props[key] - tw.startValues[key]) * easedT;
      }

      if (t >= 1) {
        tw.completed = true;
        if (tw.onComplete) {
          tw.onComplete();
        }
        activeTweens.splice(i, 1);
      }
    }
  }

  // --- Pulse ---

  function pulse(base, amplitude, time, speed) {
    return base + amplitude * Math.sin(time * speed);
  }

  // --- Shake ---

  function shake(obj, amplitude, duration) {
    var origX = obj.x;
    var origY = obj.y;
    var elapsed = 0;
    var handle = {
      obj: obj,
      props: {},
      startValues: {},
      keys: [],
      duration: duration,
      easing: function () { return 1; },
      elapsed: 0,
      completed: false,
      cancelled: false,
      onComplete: null
    };

    // Override update via a special marker
    handle._shake = {
      origX: origX,
      origY: origY,
      amplitude: amplitude,
      duration: duration,
      elapsed: 0
    };

    activeTweens.push(handle);
    return handle;
  }

  // Extend update to handle shake, path animation, springs, and color cycles
  var _baseUpdate = update;
  update = function (dt) {
    for (var i = activeTweens.length - 1; i >= 0; i--) {
      var tw = activeTweens[i];
      if (tw._shake) {
        if (tw.cancelled) {
          tw.obj.x = tw._shake.origX;
          tw.obj.y = tw._shake.origY;
          activeTweens.splice(i, 1);
          continue;
        }
        tw._shake.elapsed += dt;
        var progress = tw._shake.elapsed / tw._shake.duration;
        if (progress >= 1) {
          tw.obj.x = tw._shake.origX;
          tw.obj.y = tw._shake.origY;
          tw.completed = true;
          if (tw.onComplete) tw.onComplete();
          activeTweens.splice(i, 1);
        } else {
          var decay = 1 - progress;
          tw.obj.x = tw._shake.origX + (Math.random() * 2 - 1) * tw._shake.amplitude * decay;
          tw.obj.y = tw._shake.origY + (Math.random() * 2 - 1) * tw._shake.amplitude * decay;
        }
      }
      // Path animation handling
      if (tw.points && tw.points.length >= 2) {
        if (tw.cancelled) {
          activeTweens.splice(i, 1);
          continue;
        }
        tw.elapsed += dt;
        var rawT = tw.elapsed / tw.duration;
        var t = Math.min(rawT, 1);
        var easedT = tw.easing(t);
        var totalSegments = tw.points.length - 1;
        var segmentT = easedT * totalSegments;
        var segIndex = Math.min(Math.floor(segmentT), totalSegments - 1);
        var segFrac = segmentT - segIndex;
        var p0 = tw.points[segIndex];
        var p1 = tw.points[Math.min(segIndex + 1, tw.points.length - 1)];
        tw.obj.x = lerp(p0.x, p1.x, segFrac);
        tw.obj.y = lerp(p0.y, p1.y, segFrac);
        if (t >= 1) {
          tw.completed = true;
          var lastPt = tw.points[tw.points.length - 1];
          tw.obj.x = lastPt.x;
          tw.obj.y = lastPt.y;
          if (tw.onComplete) tw.onComplete();
          activeTweens.splice(i, 1);
        }
      }
    }
    _baseUpdate(dt);
    updateSprings(dt);
    updateColorCycles(dt);
  };

  // --- Sequence ---

  function sequence(tweens) {
    var index = 0;
    function next() {
      if (index >= tweens.length) return;
      var tw = tweens[index];
      index++;
      if (index < tweens.length) {
        tw.onComplete = next;
      }
    }
    if (tweens.length > 0) next();
  }

  // --- Delay ---

  function delay(duration, callback) {
    var handle = {
      obj: {},
      props: {},
      startValues: {},
      keys: [],
      duration: duration,
      easing: function () { return 1; },
      elapsed: 0,
      completed: false,
      cancelled: false,
      onComplete: callback
    };
    activeTweens.push(handle);
    return handle;
  }

  // --- Repeat ---

  function repeat(tweenFn, count) {
    var remaining = count;
    function runNext() {
      if (remaining <= 0) return;
      remaining--;
      var tw = tweenFn();
      if (tw && remaining > 0) {
        tw.onComplete = runNext;
      }
    }
    runNext();
  }

  // --- 动画预设配置 ---
  var PRESETS = {
    bounceIn: { easing: easeOutBounce, duration: 0.6 },
    bounceOut: { easing: easeInBounce, duration: 0.6 },
    fadeIn: { easing: easeOutCubic, duration: 0.4 },
    fadeOut: { easing: easeInCubic, duration: 0.4 },
    slideIn: { easing: easeOutQuart, duration: 0.5 },
    slideOut: { easing: easeInQuart, duration: 0.5 },
    popIn: { easing: easeOutBack, duration: 0.4 },
    popOut: { easing: easeInBack, duration: 0.35 },
    elasticIn: { easing: easeOutElastic, duration: 0.8 },
    gentle: { easing: easeInOutCubic, duration: 0.7 },
    snappy: { easing: easeOutQuint, duration: 0.3 },
    smooth: { easing: easeInOutQuart, duration: 0.5 },
    overshoot: { easing: easeOutBack, duration: 0.5 },
    graceful: { easing: easeInOutCirc, duration: 0.6 },
    sparkle: { easing: easeOutElastic, duration: 0.5 }
  };

  /** 按预设创建补间 */
  function fromPreset(presetName, obj, props) {
    var preset = PRESETS[presetName];
    if (!preset) preset = PRESETS.gentle;
    return tween(obj, props, preset.duration, preset.easing);
  }

  /** 依次启动多个补间（间隔 stagger 秒） */
  function stagger(tweenFns, staggerDelay) {
    staggerDelay = staggerDelay || 0.08;
    for (var i = 0; i < tweenFns.length; i++) {
      (function (idx) {
        delay(idx * staggerDelay, function () {
          tweenFns[idx]();
        });
      })(i);
    }
  }

  /** 同时启动多个补间，全部完成后回调 */
  function parallel(tweenFns, onComplete) {
    var remaining = tweenFns.length;
    for (var i = 0; i < tweenFns.length; i++) {
      var tw = tweenFns[i]();
      if (tw) {
        tw.onComplete = (function (original) {
          return function () {
            if (original) original();
            remaining--;
            if (remaining <= 0 && onComplete) onComplete();
          };
        })(tw.onComplete);
      } else {
        remaining--;
      }
    }
    if (remaining <= 0 && onComplete) onComplete();
  }

  /** 竞速：最先完成的回调触发 */
  function race(tweenFns, onComplete) {
    var done = false;
    for (var i = 0; i < tweenFns.length; i++) {
      var tw = tweenFns[i]();
      if (tw) {
        tw.onComplete = (function (original) {
          return function () {
            if (original) original();
            if (!done) {
              done = true;
              if (onComplete) onComplete();
            }
          };
        })(tw.onComplete);
      }
    }
  }

  /** 永久循环补间（乒乓式） */
  function pingPong(obj, props, duration, easing) {
    var forward = true;
    function run() {
      if (forward) {
        tween(obj, props, duration, easing).onComplete = function () {
          forward = false;
          run();
        };
      } else {
        var reverseProps = {};
        var keys = Object.keys(props);
        for (var k = 0; k < keys.length; k++) {
          reverseProps[keys[k]] = obj[keys[k]] - (props[keys[k]] - obj[keys[k]]);
        }
        tween(obj, reverseProps, duration, easing).onComplete = function () {
          forward = true;
          run();
        };
      }
    }
    run();
  }

  // --- Public API ---

  return {
    easeInOutCubic: easeInOutCubic,
    easeOutQuad: easeOutQuad,
    easeInQuad: easeInQuad,
    easeOutBack: easeOutBack,
    easeOutElastic: easeOutElastic,
    easeInOutElastic: easeInOutElastic,
    easeOutBounce: easeOutBounce,
    easeInCubic: easeInCubic,
    easeOutCubic: easeOutCubic,
    easeInOutQuad: easeInOutQuad,
    easeInBack: easeInBack,
    easeInOutBack: easeInOutBack,
    easeInElastic: easeInElastic,
    easeInBounce: easeInBounce,
    easeOutExpo: easeOutExpo,
    easeInExpo: easeInExpo,
    easeInOutExpo: easeInOutExpo,
    easeOutSine: easeOutSine,
    easeInSine: easeInSine,
    easeInOutSine: easeInOutSine,
    easeLinear: easeLinear,
    easeInQuart: easeInQuart,
    easeOutQuart: easeOutQuart,
    easeInOutQuart: easeInOutQuart,
    easeOutQuint: easeOutQuint,
    easeInOutQuint: easeInOutQuint,
    easeInCirc: easeInCirc,
    easeOutCirc: easeOutCirc,
    easeInOutCirc: easeInOutCirc,
    PRESETS: PRESETS,
    fromPreset: fromPreset,
    stagger: stagger,
    parallel: parallel,
    race: race,
    pingPong: pingPong,
    lerp: lerp,
    colorLerp: colorLerp,
    tween: tween,
    spring: spring,
    animateAlongPath: animateAlongPath,
    cycleColor: cycleColor,
    wave: wave,
    bezierPoint: bezierPoint,
    randomRange: randomRange,
    smoothStep: smoothStep,
    update: update,
    pulse: pulse,
    shake: shake,
    sequence: sequence,
    delay: delay,
    repeat: repeat
  };
})();
