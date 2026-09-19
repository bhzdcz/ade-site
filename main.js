(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function readyHero() {
    var hero = document.getElementById('hero');
    if (!hero) return;
    if (reduceMotion) {
      hero.classList.add('reduce-motion', 'is-ready');
      return;
    }
    // Next frame so CSS transitions see the class change
    requestAnimationFrame(function () {
      hero.classList.add('is-ready');
    });
  }

  function setupChain() {
    var rail = document.querySelector('[data-chain-rail]');
    if (!rail) return;
    var nodes = Array.prototype.slice.call(rail.querySelectorAll('.chain-node'));

    function lightAll() {
      rail.classList.add('is-drawn', 'reduce-motion');
      nodes.forEach(function (n) {
        n.classList.add('is-lit');
      });
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      lightAll();
      return;
    }

    var lit = false;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (lit || !entry.isIntersecting) return;
          if (entry.intersectionRatio < 0.4) return;
          lit = true;
          observer.disconnect();
          rail.classList.add('is-drawn');
          nodes.forEach(function (node, i) {
            window.setTimeout(function () {
              node.classList.add('is-lit');
            }, i * 140);
          });
        });
      },
      { threshold: [0, 0.4, 0.6, 1] }
    );

    observer.observe(rail);
  }

  /**
   * Quiet ADE-token pixel field behind #hero only.
   * Faint --line grid + sparse --accent / --accent-2 lit cells (~5–12%),
   * slow integer-step drift, rare gate pulses, grid breath. Static when
   * prefers-reduced-motion; paused via IntersectionObserver when off-screen.
   */
  function setupPixelField() {
    var hero = document.getElementById('hero');
    var canvas = document.getElementById('hero-pixel-field');
    if (!hero || !canvas) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var rootStyles = getComputedStyle(document.documentElement);
    var BG = rootStyles.getPropertyValue('--bg').trim() || '#0B0D12';
    var LINE = rootStyles.getPropertyValue('--line').trim() || '#2A3142';
    var ACCENT = rootStyles.getPropertyValue('--accent').trim() || '#5CFF9A';
    var ACCENT2 = rootStyles.getPropertyValue('--accent-2').trim() || '#6BCBFF';
    var texelCss = parseFloat(rootStyles.getPropertyValue('--texel')) || 4;
    var TEXEL = Math.max(4, Math.round(texelCss));
    // Grid step = 2× texel (8px) — multiples of the 4px system
    var STEP = TEXEL * 2;

    var dpr = 1;
    var cssW = 0;
    var cssH = 0;
    var cols = 0;
    var rows = 0;
    var cells = [];
    var pulses = [];
    var visible = true;
    var running = false;
    var rafId = 0;
    var lastTs = 0;
    var nextPulseAt = 0;

    function mulberry32(a) {
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function hexToRgb(hex) {
      var h = hex.replace('#', '');
      if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      }
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16)
      };
    }

    var lineRgb = hexToRgb(LINE);
    var accentRgb = hexToRgb(ACCENT);
    var accent2Rgb = hexToRgb(ACCENT2);

    function rgba(rgb, a) {
      return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')';
    }

    function rebuildCells() {
      cols = Math.max(1, Math.ceil(cssW / STEP));
      rows = Math.max(1, Math.ceil(cssH / STEP));
      var total = cols * rows;
      // Target ~8% occupancy (within 5–12%); cap count on large viewports
      var target = Math.round(total * 0.08);
      target = Math.max(12, Math.min(target, 220));

      var rng = mulberry32((cols * 73856093) ^ (rows * 19349663) ^ 0xade5);
      cells = [];
      var occupied = Object.create(null);
      var attempts = 0;
      var sizes = [1, 1, 1, 1, 2, 2, 4];

      while (cells.length < target && attempts < target * 20) {
        attempts += 1;
        var size = sizes[(rng() * sizes.length) | 0];
        var c = (rng() * (cols - size + 1)) | 0;
        var r = (rng() * (rows - size + 1)) | 0;
        var key = c + ',' + r + ',' + size;
        if (occupied[key]) continue;
        // Bias slightly toward the right half (mock: field denser right of copy)
        if (c / cols < 0.28 && rng() > 0.35) continue;
        occupied[key] = 1;
        var isAccent2 = rng() > 0.55;
        cells.push({
          c: c,
          r: r,
          size: size,
          // Drift: ~20–40s to cross hero width → cells/sec
          vx: (0.012 + rng() * 0.018) * (rng() > 0.15 ? 1 : -1),
          baseAlpha: 0.18 + rng() * 0.32,
          color: isAccent2 ? accent2Rgb : accentRgb,
          phase: rng() * Math.PI * 2
        });
      }
    }

    function resize() {
      var rect = hero.getBoundingClientRect();
      cssW = Math.max(1, Math.floor(rect.width));
      cssH = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildCells();
      drawFrame(0, true);
    }

    function drawGrid(breathAlpha) {
      var a = 0.12 + breathAlpha * 0.1;
      ctx.strokeStyle = rgba(lineRgb, a);
      ctx.lineWidth = 1;
      ctx.beginPath();
      var x;
      var y;
      for (x = 0; x <= cssW; x += STEP) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, cssH);
      }
      for (y = 0; y <= cssH; y += STEP) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(cssW, y + 0.5);
      }
      ctx.stroke();
    }

    function drawCells(t, staticMode) {
      var i;
      var cell;
      var px;
      var py;
      var alpha;
      var pulseBoost;
      var j;
      var p;

      for (i = 0; i < cells.length; i++) {
        cell = cells[i];
        if (staticMode) {
          px = cell.c * STEP;
          py = cell.r * STEP;
          alpha = cell.baseAlpha;
        } else {
          // Integer texel-step drift (snap to STEP)
          var driftCols = cell.c + cell.vx * t;
          // Wrap horizontally
          driftCols = ((driftCols % cols) + cols) % cols;
          px = Math.floor(driftCols) * STEP;
          py = cell.r * STEP;
          alpha = cell.baseAlpha * (0.85 + 0.15 * Math.sin(t * 0.4 + cell.phase));
        }

        pulseBoost = 0;
        for (j = 0; j < pulses.length; j++) {
          p = pulses[j];
          if (p.i === i) {
            // Envelope 0→1→0 over ~1.2s
            var u = (t - p.start) / p.dur;
            if (u >= 0 && u <= 1) {
              pulseBoost = Math.sin(u * Math.PI) * 0.55;
            }
          }
        }

        ctx.fillStyle = rgba(cell.color, Math.min(0.85, alpha + pulseBoost));
        ctx.fillRect(px, py, cell.size * STEP, cell.size * STEP);
      }
    }

    function drawFrame(t, staticMode) {
      ctx.clearRect(0, 0, cssW, cssH);
      // Clear to transparent — page --bg shows through
      var breath = staticMode ? 0.5 : 0.5 + 0.5 * Math.sin((t / 8) * Math.PI * 2);
      // Grid breath cycle ~8s (within 6–10s)
      drawGrid(breath);
      drawCells(t, staticMode);
    }

    function spawnPulse(t) {
      if (cells.length === 0) return;
      var count = 1 + ((Math.random() * 3) | 0); // 1–3
      var i;
      for (i = 0; i < count; i++) {
        pulses.push({
          i: (Math.random() * cells.length) | 0,
          start: t,
          dur: 1.0 + Math.random() * 0.6
        });
      }
      // Rare: next pulse in 4–12s
      nextPulseAt = t + 4 + Math.random() * 8;
    }

    function prunePulses(t) {
      pulses = pulses.filter(function (p) {
        return t - p.start < p.dur;
      });
    }

    function tick(now) {
      if (!running) return;
      if (!lastTs) lastTs = now;
      var t = (now - startWall) / 1000;
      lastTs = now;

      if (t >= nextPulseAt) {
        spawnPulse(t);
      }
      prunePulses(t);
      drawFrame(t, false);
      rafId = requestAnimationFrame(tick);
    }

    var startWall = performance.now();

    function start() {
      if (running || reduceMotion) return;
      running = true;
      lastTs = 0;
      startWall = performance.now();
      nextPulseAt = 3 + Math.random() * 4;
      rafId = requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    resize();

    if (reduceMotion) {
      drawFrame(0, true);
    } else {
      start();
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            visible = entry.isIntersecting && entry.intersectionRatio > 0.05;
            if (reduceMotion) return;
            if (visible) {
              if (!running) start();
            } else {
              stop();
            }
          });
        },
        { threshold: [0, 0.05, 0.2, 1] }
      );
      io.observe(hero);
    }

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        var wasRunning = running;
        stop();
        resize();
        if (!reduceMotion && (wasRunning || visible)) {
          start();
        }
      }, 120);
    });

    // Live toggle if user changes OS preference mid-session
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    function onMotionChange(e) {
      reduceMotion = e.matches;
      stop();
      if (reduceMotion) {
        hero.classList.add('reduce-motion');
        drawFrame(0, true);
      } else {
        hero.classList.remove('reduce-motion');
        if (visible) start();
      }
    }
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onMotionChange);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(onMotionChange);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      readyHero();
      setupChain();
      setupPixelField();
    });
  } else {
    readyHero();
    setupChain();
    setupPixelField();
  }
})();
