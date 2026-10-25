/*
 * One particle on each hero orbit. Both run at the same angular rate and sit half a turn apart,
 * so they stay on opposite sides of the centre and never meet, even where the two ellipses cross.
 * Paused while the hero is off-screen or the tab is hidden; static when reduced motion is requested.
 */
(() => {
  'use strict';

  const visual = document.querySelector('.hero-visual');
  if (
    !visual ||
    typeof window.matchMedia !== 'function' ||
    typeof window.ResizeObserver !== 'function' ||
    typeof window.IntersectionObserver !== 'function'
  ) return;
  const orbits = [...visual.querySelectorAll('.visual-orbit')];
  const dots = orbits.map((orbit) => orbit.querySelector('.orbit-particle'));
  if (orbits.length !== 2 || dots.some((dot) => !dot)) return;

  const PERIOD = 32000; // ms per lap
  const TAU = Math.PI * 2;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let geometry = [];
  let phase = 0.9;
  let raf = 0;
  let last = 0;
  let inView = true;

  // Orbit sizes come from CSS (they change per breakpoint), so read them instead of hard-coding.
  function measure() {
    geometry = orbits.map((orbit) => ({
      cx: orbit.clientWidth / 2,
      cy: orbit.clientHeight / 2,
      rx: orbit.clientWidth / 2 + 0.5,
      ry: orbit.clientHeight / 2 + 0.5,
    }));
  }

  function place() {
    dots.forEach((dot, i) => {
      const g = geometry[i];
      const t = phase + i * Math.PI;
      const x = g.cx + g.rx * Math.cos(t);
      const y = g.cy + g.ry * Math.sin(t);
      dot.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });
  }

  function frame(now) {
    raf = window.requestAnimationFrame(frame);
    phase = (phase + (Math.min(now - last, 50) / PERIOD) * TAU) % TAU;
    last = now;
    place();
  }

  function sync() {
    const shouldRun = !motion.matches && inView && !document.hidden;
    if (shouldRun && !raf) {
      last = performance.now();
      raf = window.requestAnimationFrame(frame);
    } else if (!shouldRun && raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  measure();
  place();
  dots.forEach((dot) => dot.classList.add('is-live'));

  new ResizeObserver(() => { measure(); place(); }).observe(visual);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }).observe(visual);
  document.addEventListener('visibilitychange', sync);
  if (motion.addEventListener) motion.addEventListener('change', sync);
  else motion.addListener?.(sync);
  sync();
})();
