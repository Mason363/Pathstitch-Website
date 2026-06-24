"use client";

import React, { useEffect, useRef } from "react";

const COUNT = 81; // /public/pool/img-1.jpg .. img-81.jpg

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  av: number; // angular velocity
  r: number;
  img: HTMLImageElement | null;
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

    // Pointer state (mouse + touch), tracked in canvas-space pixels
    const pointer = { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, active: false };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

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
      // Keep bodies inside after a resize
      for (const b of bodies) {
        b.x = Math.max(b.r, Math.min(W - b.r, b.x));
        b.y = Math.max(b.r, Math.min(H - b.r, b.y));
      }
    };

    // Build bodies (sizes scale with viewport so tiles stay "relatively small")
    const buildBodies = () => {
      bodies.length = 0;
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      const base = Math.max(22, Math.min(38, W / 32));
      for (let i = 0; i < COUNT; i++) {
        const r = rand(base * 0.82, base * 1.15);
        bodies.push({
          x: rand(r, Math.max(r + 1, W - r)),
          y: rand(-H, -r), // drop in from above for a nice fill
          vx: rand(-1, 1),
          vy: rand(0, 1),
          angle: rand(-0.4, 0.4),
          av: rand(-0.04, 0.04),
          r,
          img: null,
        });
      }
    };

    // Lazy-load the thumbnails (shuffled so the pile is varied)
    const order = Array.from({ length: COUNT }, (_, i) => i + 1);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const loadImages = () => {
      bodies.forEach((b, i) => {
        const im = new Image();
        im.src = `/pool/img-${order[i]}.jpg`;
        im.onload = () => {
          b.img = im;
        };
      });
    };

    // ---- Physics ----
    const GRAV = 0.32;
    const AIR = 0.992;
    const WALL_REST = 0.42;
    const FLOOR_FRICTION = 0.9;
    const PAIR_REST = 0.2;

    const step = () => {
      pointer.vx = pointer.x - pointer.px;
      pointer.vy = pointer.y - pointer.py;
      pointer.px = pointer.x;
      pointer.py = pointer.y;

      for (const b of bodies) {
        b.vy += GRAV;
        b.vx *= AIR;
        b.vy *= AIR;

        // Cursor interaction — push tiles away and fling them with the swipe
        if (pointer.active) {
          const dx = b.x - pointer.x;
          const dy = b.y - pointer.y;
          const reach = 130 + b.r;
          const d = Math.hypot(dx, dy) || 0.0001;
          if (d < reach) {
            const nx = dx / d;
            const ny = dy / d;
            const f = (1 - d / reach) * 4.2;
            b.vx += nx * f + pointer.vx * 0.16;
            b.vy += ny * f + pointer.vy * 0.16;
            b.av += (pointer.vx * ny - pointer.vy * nx) * 0.002;
          }
        }

        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.av;
        b.av *= 0.95;

        // Walls
        if (b.x < b.r) { b.x = b.r; b.vx = -b.vx * WALL_REST; b.av += b.vy * 0.004; }
        else if (b.x > W - b.r) { b.x = W - b.r; b.vx = -b.vx * WALL_REST; b.av -= b.vy * 0.004; }
        if (b.y < b.r) { b.y = b.r; b.vy = -b.vy * WALL_REST; }
        else if (b.y > H - b.r) {
          b.y = H - b.r;
          b.vy = -b.vy * WALL_REST;
          b.vx *= FLOOR_FRICTION;
          b.av *= 0.85;
        }
      }

      // Pairwise collisions (positional correction + light elastic impulse)
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
              // relative velocity along normal
              const rvx = c.vx - a.vx;
              const rvy = c.vy - a.vy;
              const vn = rvx * nx + rvy * ny;
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
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        const s = b.r * 1.78; // square tile inscribed in the collision circle
        const half = s / 2;
        const rad = Math.max(4, s * 0.14);
        // rounded-square clip
        ctx.beginPath();
        ctx.moveTo(-half + rad, -half);
        ctx.arcTo(half, -half, half, half, rad);
        ctx.arcTo(half, half, -half, half, rad);
        ctx.arcTo(-half, half, -half, -half, rad);
        ctx.arcTo(-half, -half, half, -half, rad);
        ctx.closePath();
        if (b.img && b.img.complete) {
          ctx.save();
          ctx.clip();
          // cover-fit the image into the square
          const iw = b.img.naturalWidth || 1;
          const ih = b.img.naturalHeight || 1;
          const scale = Math.max(s / iw, s / ih);
          const dw = iw * scale;
          const dh = ih * scale;
          ctx.drawImage(b.img, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        } else {
          ctx.fillStyle = "#26262b";
          ctx.fill();
        }
        // subtle border for depth
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.stroke();
        ctx.restore();
      }
    };

    let raf = 0;
    let running = false;
    const loop = () => {
      step();
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Pointer handlers (canvas-space)
    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = clientX - rect.left;
      pointer.y = clientY - rect.top;
    };
    const onMove = (e: PointerEvent) => {
      toLocal(e.clientX, e.clientY);
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    // Init
    buildBodies();
    resize();
    loadImages();

    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerdown", onMove, { passive: true });
    canvas.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("resize", resize);

    // Only run while the pool is on screen
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
      },
      { threshold: 0.05 }
    );
    io.observe(wrap);

    return () => {
      stop();
      io.disconnect();
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
          A pool of real projects cut, stitched, and built by makers. Give it a stir.
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
