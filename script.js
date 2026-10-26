'use strict';

// Two triangulated surfaces. All waves share a period for a seamless loop.
(() => {
  const canvas = document.getElementById('mesh');
  const context = canvas?.getContext('2d');
  if (!context) return;

  const settings = { loopSeconds: 28, maxPixelRatio: 2, fps: 30, sparklePeriod: 14 };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const tau = Math.PI * 2;
  let width = 0;
  let height = 0;
  let mobileDetail = 0;
  let columns = 0;
  let rows = 0;
  let surfaces = [];
  const fadeMask = document.createElement('canvas');
  const maskContext = fadeMask.getContext('2d');
  let elapsed = 0;
  let frame = null;
  let previousTime = null;

  // Stable, irregular vertices keep triangles organic without flicker.
  function noise(seed) {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function updateSurface(points, side, phase) {
    for (const point of points) {
      const { u, v } = point;
      // A raised shoulder at the left folds into a broad, flowing surface.
      // Mirroring it places the second shoulder in the upper-right corner.
      const shoulder = Math.exp(-Math.pow((u - .16) / .15, 2));
      const breathing = Math.sin(phase + u * 5) * .025;
      const fold = Math.sin(v * 5 + u * 7 - phase) * .055 * Math.exp(-v * 2);
      const x = width * (-.18 + u * 1.4 + Math.sin(v * Math.PI) * .095 * Math.sin(u * 5 + phase));
      const innerEdge = .4 + u * .45 - shoulder * .19 + breathing;
      const spread = v * (.88 - u * .18);
      const y = height * (innerEdge + spread + fold);
      point.x = side ? width - x : x;
      point.y = side ? height - y : y;
      const ridge = Math.exp(-Math.pow((v - .17) / .22, 2));
      const light = .5 + .5 * Math.sin(u * 6 + v * 3 + phase);
      const cornerWeight = .3 + .7 * (1 - u);
      point.alpha = (.13 + ridge * .15 + light * .07) * cornerWeight * (.7 + point.shade * .3) * (1 + mobileDetail * .85);
    }
  }

  function line(a, b) {
    context.strokeStyle = `rgba(188, 183, 200, ${Math.min(a.alpha, b.alpha)})`;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  }

  function drawNode(point) {
    // Staggered, slow pulses: each intersection has its own timing.
    // Fourteen seconds divides the mesh loop exactly, avoiding a reset jump.
    const age = (elapsed + point.sparkleOffset) % settings.sparklePeriod;
    const pulse = !reducedMotion.matches && age < point.sparkleDuration
      ? Math.pow(Math.sin(Math.PI * age / point.sparkleDuration), 2)
      : 0;
    const strength = Math.min(1, point.alpha * 6) * pulse;

    if (strength > .02) {
      const radius = 6 + strength * 8;
      const halo = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      halo.addColorStop(0, `rgba(235, 226, 250, ${strength * .85})`);
      halo.addColorStop(.3, `rgba(196, 172, 230, ${strength * .32})`);
      halo.addColorStop(1, 'rgba(196, 172, 230, 0)');
      context.fillStyle = halo;
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, tau);
      context.fill();

      const ray = 2 + strength * 4;
      context.strokeStyle = `rgba(239, 232, 250, ${strength * .85})`;
      context.beginPath();
      context.moveTo(point.x - ray, point.y);
      context.lineTo(point.x + ray, point.y);
      context.moveTo(point.x, point.y - ray);
      context.lineTo(point.x, point.y + ray);
      context.stroke();
    }
    context.fillStyle = `rgba(235, 226, 247, ${Math.min(1, point.alpha * 2.4 + strength * .8)})`;
    context.beginPath();
    context.arc(point.x, point.y, .7 + point.shade * .6 + strength * .9, 0, tau);
    context.fill();
  }

  // A broad elliptical falloff has no straight edges or rectangular corners.
  // Its center follows the visible text rather than the empty section width.
  function updateFadeMask() {
    const section = document.querySelector('section');
    const bounds = section.getBoundingClientRect();
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    let right = section.querySelector('.status').getBoundingClientRect().right;
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
    }
    const centerX = (bounds.left + right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const radiusX = (right - bounds.left) / 2 + 55 - mobileDetail * 30;
    const radiusY = bounds.height / 2 + 55 - mobileDetail * 35;
    // Half-resolution mask is interpolated when composited, and only rebuilt
    // on layout changes, never per animation frame.
    fadeMask.width = Math.ceil(width / 2);
    fadeMask.height = Math.ceil(height / 2);
    const pixels = maskContext.createImageData(fadeMask.width, fadeMask.height);
    for (let y = 0; y < fadeMask.height; y++) {
      for (let x = 0; x < fadeMask.width; x++) {
        const px = (x + .5) * width / fadeMask.width;
        const py = (y + .5) * height / fadeMask.height;
        const distance = Math.hypot((px - centerX) / radiusX, (py - centerY) / radiusY);
        const opacity = 1 - Math.exp(-.16 * Math.pow(distance, 4));
        pixels.data[(y * fadeMask.width + x) * 4 + 3] = Math.round(255 * opacity);
      }
    }
    maskContext.putImageData(pixels, 0, 0);
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    const phase = elapsed / settings.loopSeconds * tau;
    context.lineWidth = .6 + mobileDetail * .25;
    surfaces.forEach((points, side) => {
      updateSurface(points, side, phase + side * .8);
      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= columns; col++) {
          const index = row * (columns + 1) + col;
          const point = points[index];
          if (col < columns) line(point, points[index + 1]);
          if (row < rows) {
            line(point, points[index + columns + 1]);
            if (col < columns) {
              if (point.shade > .5) line(point, points[index + columns + 2]);
              else line(points[index + 1], points[index + columns + 1]);
            }
          }
          if (point.shade > .94) drawNode(point);
        }
      }
    });
    // Fade whole line segments uniformly, instead of only their endpoints.
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(fadeMask, 0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
  }

  function animate(time) {
    if (previousTime === null || time - previousTime >= 1000 / settings.fps) {
      const seconds = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, .1);
      previousTime = time;
      elapsed = (elapsed + seconds) % settings.loopSeconds;
      draw();
    }
    frame = requestAnimationFrame(animate);
  }

  function syncMotion() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
    draw();
    if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(animate);
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    // Restore detail on narrow screens; desktop rendering stays identical.
    mobileDetail = Math.max(0, Math.min(1, (600 - width) / 160));
    const ratio = Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    columns = Math.max(18, Math.min(32, Math.round(width / 40)));
    rows = width < 600 ? 17 : 24;
    surfaces = Array.from({ length: 2 }, (_, side) =>
      Array.from({ length: (columns + 1) * (rows + 1) }, (_, index) => {
        const row = Math.floor(index / (columns + 1));
        const col = index % (columns + 1);
        const seed = index + side * 3000;
        return {
          u: (col + (col > 0 && col < columns ? (noise(seed) - .5) * .85 : 0)) / columns,
          v: (row + (row > 0 && row < rows ? (noise(seed + 1700) - .5) * .85 : 0)) / rows,
          shade: noise(seed + 800),
          sparkleOffset: noise(seed + 2900) * settings.sparklePeriod,
          sparkleDuration: 1.8 + noise(seed + 4100),
          x: 0, y: 0, alpha: 0,
        };
      })
    );
    updateFadeMask();
    syncMotion();
  }

  window.addEventListener('resize', resize, { passive: true });
  // Recompute the quiet zone if scrolling a short landscape viewport.
  window.addEventListener('scroll', () => {
    updateFadeMask();
    if (reducedMotion.matches) draw();
  }, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  resize();
  document.fonts.ready.then(resize);
})();
