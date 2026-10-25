/*
 * Hero background effect: a drifting network of "knowledge nodes" that reacts to the cursor.
 * Desktop-only by design: it never starts on small screens, touch devices or when the user prefers
 * reduced motion, and it pauses while the hero is off-screen or the tab is hidden.
 */
(() => {
  'use strict';

  const hero = document.querySelector('.hero');
  if (
    !hero ||
    typeof window.matchMedia !== 'function' ||
    typeof window.ResizeObserver !== 'function' ||
    typeof window.IntersectionObserver !== 'function' ||
    typeof Path2D !== 'function'
  ) return;

  const eligible = window.matchMedia(
    '(min-width: 901px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
  );
  const visual = hero.querySelector('.hero-visual');

  const LINK_DIST = 130;      // max distance between two nodes that still get a line
  const REACH = 200;          // cursor influence radius
  const HOLE = 46;            // nodes keep this far from the cursor, forming a soft ring
  const FRAME_INTERVAL = 1000 / 30;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const CELL = 68;            // matches the 68px CSS grid it replaces

  let canvas = null;
  let gridPath = null;
  let baseGrad = null;
  let ctx = null;
  let nodes = [];
  let w = 0;
  let h = 0;
  let raf = 0;
  let last = 0;
  let running = false;
  let inView = true;
  let resizeObserver = null;
  let intersectionObserver = null;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false, glow: 0 };
  const tilt = { x: 0, y: 0 };

  function seed() {
    const count = Math.min(60, Math.round((w * h) / 20000));
    nodes = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.16;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        bx: Math.cos(angle) * speed,
        by: Math.sin(angle) * speed,
        r: 0.8 + Math.random() * 1.1,
        hot: Math.random() < 0.12,
      };
    });
  }

  function buildGrid() {
    gridPath = new Path2D();
    for (let x = 0.5; x < w; x += CELL) { gridPath.moveTo(x, 0); gridPath.lineTo(x, h); }
    for (let y = 0.5; y < h; y += CELL) { gridPath.moveTo(0, y); gridPath.lineTo(w, y); }
    // Same left-to-right fade as the static CSS grid.
    baseGrad = ctx.createLinearGradient(0, 0, w, 0);
    baseGrad.addColorStop(0, 'rgba(255,255,255,0)');
    baseGrad.addColorStop(0.6, 'rgba(255,255,255,0.035)');
    baseGrad.addColorStop(1, 'rgba(255,255,255,0.035)');
  }

  // The grid cell under the cursor lights up softly, then fades out as the cursor moves on.
  // Lines stay straight; only the cell's fill and outline change.
  const cells = new Map();

  function drawGrid(now, dt) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = baseGrad;
    ctx.stroke(gridPath);

    // A soft diagonal light band passes over the grid every ~12s.
    const t = now % 12000;
    if (t < 7000) {
      const x0 = w * 0.2 + w * 0.9 * (t / 7000) - 160;
      const band = ctx.createLinearGradient(x0, 0, x0 + 320, 110);
      band.addColorStop(0, 'rgba(190,235,210,0)');
      band.addColorStop(0.5, 'rgba(190,235,210,0.1)');
      band.addColorStop(1, 'rgba(190,235,210,0)');
      ctx.strokeStyle = band;
      ctx.stroke(gridPath);
    }

    let activeKey = null;
    if (pointer.active) {
      const gx = Math.floor((pointer.tx - 0.5) / CELL);
      const gy = Math.floor((pointer.ty - 0.5) / CELL);
      activeKey = gx + ',' + gy;
      const level = cells.get(activeKey) || 0;
      cells.set(activeKey, level + (1 - level) * (1 - Math.pow(0.78, dt)));
    }

    for (const [key, level] of cells) {
      const [gx, gy] = key.split(',').map(Number);
      const x = gx * CELL + 0.5;
      const y = gy * CELL + 0.5;
      const a = level * fade(x + CELL / 2);
      ctx.fillStyle = `rgba(205,235,215,${0.055 * a})`;
      ctx.fillRect(x, y, CELL, CELL);
      ctx.strokeStyle = `rgba(205,235,215,${0.2 * a})`;
      ctx.strokeRect(x, y, CELL, CELL);
      if (key !== activeKey) {
        const next = level * Math.pow(0.96, dt);
        if (next < 0.01) cells.delete(key); else cells.set(key, next);
      }
    }
  }

  function resize() {
    if (!canvas) return;
    const rect = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = Math.round(rect.width);
    h = Math.round(rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGrid();
    seed();
  }

  // Keep the effect quieter behind the headline so copy stays easy to read.
  const fade = (x) => 0.5 + 0.5 * clamp((x / w - 0.2) / 0.4, 0, 1);

  function frame(now) {
    raf = window.requestAnimationFrame(frame);
    if (now - last < FRAME_INTERVAL) return;
    const dt = Math.min(now - last, 50) / 16.67;
    last = now;
    const ease = (rate) => 1 - Math.pow(1 - rate, dt);

    pointer.x += (pointer.tx - pointer.x) * ease(0.14);
    pointer.y += (pointer.ty - pointer.y) * ease(0.14);
    pointer.glow += ((pointer.active ? 1 : 0) - pointer.glow) * ease(0.08);
    const glow = pointer.glow;

    ctx.clearRect(0, 0, w, h);
    drawGrid(now, dt);

    for (const n of nodes) {
      let ax = 0;
      let ay = 0;
      if (glow > 0.02) {
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < REACH) {
          const f = (d < HOLE ? -(1 - d / HOLE) * 1.1 : (1 - d / REACH) * 0.5) * glow;
          ax = (dx / d) * f;
          ay = (dy / d) * f;
        }
      }
      n.x += (n.bx + ax) * dt;
      n.y += (n.by + ay) * dt;
      if (n.x < -10) n.x = w + 10; else if (n.x > w + 10) n.x = -10;
      if (n.y < -10) n.y = h + 10; else if (n.y > h + 10) n.y = -10;
    }

    ctx.lineWidth = 0.8;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let k = i + 1; k < nodes.length; k++) {
        const b = nodes[k];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (dx > LINK_DIST || dx < -LINK_DIST || dy > LINK_DIST || dy < -LINK_DIST) continue;
        const d = Math.hypot(dx, dy);
        if (d >= LINK_DIST) continue;
        const alpha = (1 - d / LINK_DIST) * 0.12 * fade((a.x + b.x) / 2);
        ctx.strokeStyle = `rgba(190,225,205,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Only the four closest nodes are tied to the cursor, which keeps the effect tidy.
    const linked = glow > 0.02
      ? new Set(nodes.map((n) => [Math.hypot(pointer.x - n.x, pointer.y - n.y), n])
          .filter(([d]) => d < REACH).sort((p, q) => p[0] - q[0]).slice(0, 4).map(([, n]) => n))
      : null;

    for (const n of nodes) {
      const near = glow > 0.02 ? clamp(1 - Math.hypot(pointer.x - n.x, pointer.y - n.y) / REACH, 0, 1) * glow : 0;
      const f = fade(n.x);
      if (linked && linked.has(n)) {
        ctx.strokeStyle = `rgba(255,120,72,${0.38 * near})`;
        ctx.beginPath();
        ctx.moveTo(pointer.x, pointer.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }
      ctx.fillStyle = n.hot ? `rgba(255,107,58,${(0.5 + near * 0.4) * f})` : `rgba(205,235,215,${(0.32 + near * 0.5) * f})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + near * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gentle parallax on the hero illustration.
    if (visual) {
      const nx = pointer.active ? (pointer.tx / w - 0.5) * 2 : 0;
      const ny = pointer.active ? (pointer.ty / h - 0.5) * 2 : 0;
      tilt.x += (nx - tilt.x) * ease(0.06);
      tilt.y += (ny - tilt.y) * ease(0.06);
      visual.style.translate = `${(-tilt.x * 14).toFixed(2)}px ${(-tilt.y * 10).toFixed(2)}px`;
    }
  }

  function sync() {
    const shouldRun = running && inView && !document.hidden;
    if (shouldRun && !raf) {
      last = performance.now();
      raf = window.requestAnimationFrame(frame);
    } else if (!shouldRun && raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function onMove(event) {
    const rect = hero.getBoundingClientRect();
    pointer.tx = event.clientX - rect.left;
    pointer.ty = event.clientY - rect.top;
    if (!pointer.active) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.active = true;
  }
  const onLeave = () => { pointer.active = false; };

  function start() {
    if (running) return;
    const nextCanvas = document.createElement('canvas');
    const nextContext = nextCanvas.getContext('2d');
    if (!nextContext) return;

    canvas = nextCanvas;
    ctx = nextContext;
    canvas.className = 'hero-fx';
    canvas.setAttribute('aria-hidden', 'true');
    hero.insertBefore(canvas, hero.querySelector('.hero-content'));
    resize();
    running = true;
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hero);
    intersectionObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
    intersectionObserver.observe(hero);
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', sync);
    hero.classList.add('fx-on');
    sync();
  }

  function stop() {
    if (!running) return;
    running = false;
    sync();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', sync);
    canvas?.remove();
    hero.classList.remove('fx-on');
    canvas = ctx = null;
    nodes = [];
    cells.clear();
    pointer.active = false;
    pointer.glow = 0;
    tilt.x = tilt.y = 0;
    if (visual) visual.style.translate = '';
  }

  const onEligibilityChange = (event) => (event.matches ? start() : stop());
  if (eligible.addEventListener) eligible.addEventListener('change', onEligibilityChange);
  else eligible.addListener?.(onEligibilityChange);
  if (eligible.matches) start();
})();
