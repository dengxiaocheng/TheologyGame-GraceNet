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

  // --- Interpolation ---

  function lerp(a, b, t) {
    return a + (b - a) * t;
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

  // --- Public API ---

  return {
    easeInOutCubic: easeInOutCubic,
    easeOutQuad: easeOutQuad,
    easeInQuad: easeInQuad,
    lerp: lerp,
    tween: tween,
    update: update,
    pulse: pulse
  };
})();
