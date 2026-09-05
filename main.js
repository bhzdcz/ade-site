(function () {
  'use strict';

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      readyHero();
      setupChain();
    });
  } else {
    readyHero();
    setupChain();
  }
})();
