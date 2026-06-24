"use client";

import React, { useEffect, useRef } from "react";

const COUNT = 81; // /public/pool/img-1.png .. img-81.png

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  av: number; // angular velocity
  r: number; // collision radius
  halfW: number; // drawn half-width
  halfH: number; // drawn half-height
  size: number; // target longest side
  img: HTMLImageElement | null;
  // alpha-trimmed source rect (set once the image decodes)
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export default function MadeWithPool() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bodies: Body[] = [];

    // smoothed pointer (mouse + touch), canvas-space pixels
    const ptr = { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, active: false };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    // offscreen canvas for trimming transparent margins
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d", { willReadFrequently: true });

    const computeTrim = (img: HTMLImageElement) => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (!offCtx || !iw || !ih) return { sx: 0, sy: 0, sw: iw || 1, sh: ih || 1 };
      off.width = iw;
      off.height = ih;
      offCtx.clearRect(0, 0, iw, ih);
      offCtx.drawImage(img, 0, 0);
      let data: Uint8ClampedArray;
      try {
        data = offCtx.getImageData(0, 0, iw, ih).data;
      } catch {
        return { sx: 0, sy: 0, sw: iw, sh: ih };
      }
      let minX = iw, minY = ih, maxX = 0, maxY = 0, found = false;
      for (let y = 0; y < ih; y++) {
        for (let x = 0; x < iw; x++) {
          if (data[(y * iw + x) * 4 + 3] > 24) {
            found = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (!found) return { sx: 0, sy: 0, sw: iw, sh: ih };
      const pad = 2;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(iw - 1, maxX + pad);
      maxY = Math.min(ih - 1, maxY + pad);
      return { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 };
    };

    const applySize = (b: Body) => {
      const aspect = b.sw / b.sh;
      if (aspect >= 1) {
        b.halfW = b.size / 2;
        b.halfH = b.size / aspect / 2;
      } else {
        b.halfH = b.size / 2;
        b.halfW = (b.size * aspect) / 2;
      }
      b.r = ((b.halfW + b.halfH) / 2) * 0.9;
    };

    const buildBodies = () => {
      bodies.length = 0;
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      const base = Math.max(46, Math.min(72, W / 22));
      for (let i = 0; i < COUNT; i++) {
        const size = rand(base * 0.82, base * 1.18);
        const b: Body = {
          x: rand(size, Math.max(size + 1, W - size)),
          y: rand(-H * 1.1, -size),
          vx: rand(-0.4, 0.4),
          vy: rand(0, 0.6),
          angle: rand(-0.35, 0.35),
          av: 0,
          r: size * 0.42,
          halfW: size / 2,
          halfH: size / 2,
          size,
          img: null,
          sx: 0,
          sy: 0,
          sw: 1,
          sh: 1,
        };
        bodies.push(b);
      }
    };

    // shuffle so the pile is varied
    const order = Array.from({ length: COUNT }, (_, i) => i + 1);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const loadImages = () => {
      bodies.forEach((b, i) => {
        const im = new Image();
        im.src = `/pool/img-${order[i]}.png`;
        im.onload = () => {
          const t = computeTrim(im);
          b.sx = t.sx;
          b.sy = t.sy;
          b.sw = t.sw;
          b.sh = t.sh;
          b.img = im;
          applySize(b);
        };
      });
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // keep bodies horizontally inside; allow them to remain above the pool
      // (they drop in from above on first load)
      for (const b of bodies) {
        b.x = Math.max(0, Math.min(W, b.x));
        if (b.y > H) b.y = H;
      }
    };

    // ---- Physics (calm) ----
    const GRAV = 0.17;
    const AIR = 0.987;
    const BOUND_K = 0.14; // soft containment spring
    const PAIR_REST = 0.12;
    const MAX_SPEED = 8;

    const step = () => {
      // smoothed pointer velocity (kills the "small move = frenzy" feel)
      const rawvx = ptr.x - ptr.px;
      const rawvy = ptr.y - ptr.py;
      ptr.vx = ptr.vx * 0.7 + rawvx * 0.3;
      ptr.vy = ptr.vy * 0.7 + rawvy * 0.3;
      ptr.px = ptr.x;
      ptr.py = ptr.y;

      for (const b of bodies) {
        b.vy += GRAV;
        b.vx *= AIR;
        b.vy *= AIR;

        // gentle cursor interaction
        if (ptr.active) {
          const dx = b.x - ptr.x;
          const dy = b.y - ptr.y;
          const reach = 100 + b.r;
          const d = Math.hypot(dx, dy) || 0.0001;
          if (d < reach) {
            const nx = dx / d;
            const ny = dy / d;
            const f = (1 - d / reach) * 1.4;
            b.vx += nx * f + ptr.vx * 0.05;
            b.vy += ny * f + ptr.vy * 0.05;
            b.av += (ptr.vx * ny - ptr.vy * nx) * 0.0004;
          }
        }

        // soft containment — an invisible "force" instead of hard walls
        if (b.x < b.r) b.vx += (b.r - b.x) * BOUND_K;
        else if (b.x > W - b.r) b.vx -= (b.x - (W - b.r)) * BOUND_K;
        if (b.y < b.r) b.vy += (b.r - b.y) * BOUND_K;
        else if (b.y > H - b.r) b.vy -= (b.y - (H - b.r)) * BOUND_K;

        // clamp speed so nothing ever bursts into a frenzy
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > MAX_SPEED) {
          b.vx = (b.vx / sp) * MAX_SPEED;
          b.vy = (b.vy / sp) * MAX_SPEED;
        }

        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.av;
        b.av *= 0.86; // spin dies quickly — no perpetual spinning
        if (b.av > 0.12) b.av = 0.12;
        else if (b.av < -0.12) b.av = -0.12;

        // hard backstop so a tile can never fully leave the pool
        if (b.x < 0) b.x = 0;
        else if (b.x > W) b.x = W;
        if (b.y < 0) b.y = 0;
        else if (b.y > H) b.y = H;
      }

      // collisions: positional correction + light impulse
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < bodies.length; i++) {
          const a = bodies[i];
          for (let k = i + 1; k < bodies.length; k++) {
            const c = bodies[k];
            const dx = c.x - a.x;
            const dy = c.y - a.y;
            const min = a.r + c.r;
            const d2 = dx * dx + dy * dy;
            if (d2 > 0 && d2 < min * min) {
              const d = Math.sqrt(d2);
              const nx = dx / d;
              const ny = dy / d;
              const overlap = (min - d) * 0.5;
              a.x -= nx * overlap;
              a.y -= ny * overlap;
              c.x += nx * overlap;
              c.y += ny * overlap;
              const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
              if (vn < 0) {
                const j = -(1 + PAIR_REST) * vn * 0.5;
                a.vx -= nx * j;
                a.vy -= ny * j;
                c.vx += nx * j;
                c.vy += ny * j;
              }
            }
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const b of bodies) {
        if (!b.img || !b.img.complete) continue;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.shadowColor = "rgba(0,0,0,0.42)";
        ctx.shadowBlur = 9;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;
        // transparent image, trimmed — no square, no background
        ctx.drawImage(
          b.img,
          b.sx,
          b.sy,
          b.sw,
          b.sh,
          -b.halfW,
          -b.halfH,
          b.halfW * 2,
          b.halfH * 2
        );
        ctx.restore();
      }
    };

    let raf = 0;
    let running = false;
    const loop = () => {
      if (!running) return;
      step();
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      ptr.px = ptr.x;
      ptr.py = ptr.y;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      ptr.x = clientX - rect.left;
      ptr.y = clientY - rect.top;
    };
    const onMove = (e: PointerEvent) => {
      toLocal(e.clientX, e.clientY);
      ptr.active = true;
    };
    const onLeave = () => {
      ptr.active = false;
      ptr.x = -9999;
      ptr.y = -9999;
    };

    buildBodies();
    resize();
    loadImages();

    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerdown", onMove, { passive: true });
    canvas.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("resize", resize);

    // Run continuously (81 bodies is cheap); pause only when the tab is hidden.
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section className="pool-section">
      <div className="section" style={{ paddingBottom: 0 }}>
        <h2 className="headline reveal" style={{ textAlign: "center" }}>
          Made with Pathstitch.
        </h2>
        <p className="lede reveal" style={{ textAlign: "center", margin: "22px auto 0" }}>
          Every piece here was designed, cut, and stitched by me — all of it made with
          Pathstitch. Give it a stir.
        </p>
      </div>
      <div
        ref={wrapRef}
        className="pool"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} className="pool-canvas" />
      </div>
    </section>
  );
}
