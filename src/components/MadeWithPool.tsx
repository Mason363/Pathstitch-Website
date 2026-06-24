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
  r: number; // base collision radius (before scale)
  halfW: number; // base drawn half-width (before scale)
  halfH: number; // base drawn half-height (before scale)
  size: number; // target longest side
  scale: number; // current render/physics scale (animates)
  scaleTarget: number; // 1 normally, 1.5 when focused by a click
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
    let stir = 0; // 0..1 — how strongly the cursor is stirring; ramps with motion
    let lock = 0; // 0..1 — 0 = free motion, 1 = fully frozen. Eases up gradually.
    let calm = 0; // consecutive calm frames before the lock starts easing in
    let selected: Body | null = null; // the clicked piece — front + 1.5x

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

    // shuffle so the pile is varied
    const order = Array.from({ length: COUNT }, (_, i) => i + 1);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    const FEATURED = 1; // img-1.png = IMG_7802 — the hero piece, drawn twice as big

    const buildBodies = () => {
      bodies.length = 0;
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      // Scale tile size with sqrt(width) so the *pile height* stays roughly
      // constant across screens — desktop stays ~the same, while narrow phones
      // get proportionally smaller tiles that fit instead of overflowing.
      const base = Math.max(34, Math.min(96, Math.sqrt(W) * 2.15));
      for (let i = 0; i < COUNT; i++) {
        const size = order[i] === FEATURED ? base * 2 : rand(base * 0.82, base * 1.18);
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
          scale: 1,
          scaleTarget: 1,
          img: null,
          sx: 0,
          sy: 0,
          sw: 1,
          sh: 1,
        };
        bodies.push(b);
      }
    };
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
      lock = 0; // re-settle after a layout change
      calm = 0;
    };

    // ---- Physics (calm) ----
    const GRAV = 0.15;
    const AIR = 0.985;
    const MAX_SPEED = 8;
    // Baumgarte-style collision softening — leaves a tiny stable overlap and
    // corrects gradually, which keeps stacks calm while they settle.
    const SLOP = 0.6;
    const CORRECT = 0.5;
    const IDLE_DAMP = 0.85; // damping when idle so creep dies and it settles
    const FREEZE_SPEED2 = 0.3; // every tile slower than ~0.55px/frame = calm
    const FREEZE_AFTER = 8; // calm frames before the lock starts easing in
    const LOCK_RAMP = 0.06; // how fast the lock eases to a full stop (gradual)

    const step = () => {
      // smoothed pointer velocity
      if (ptr.active) {
        const rawvx = ptr.x - ptr.px;
        const rawvy = ptr.y - ptr.py;
        ptr.vx = ptr.vx * 0.72 + rawvx * 0.28;
        ptr.vy = ptr.vy * 0.72 + rawvy * 0.28;
      } else {
        ptr.vx *= 0.85;
        ptr.vy *= 0.85;
      }
      ptr.px = ptr.x;
      ptr.py = ptr.y;

      // The stir only builds while the cursor is moving, and eases in/out — so
      // a still cursor does nothing and motion feels like flowing through water.
      const speed = Math.hypot(ptr.vx, ptr.vy);
      const targetStir = ptr.active ? Math.min(1, speed / 5.5) : 0;
      stir += (targetStir - stir) * (targetStir > stir ? 0.06 : 0.03);

      const stirring = ptr.active && stir > 0.01;

      // Any stir instantly thaws the pool.
      if (stirring) {
        lock = 0;
        calm = 0;
      }
      if (lock >= 1) return; // fully frozen — zero motion

      // `flow` scales all motion. As the lock eases in (after the pool goes
      // calm) flow glides 1 -> 0, so the pile slows to a gentle stop instead of
      // snapping still.
      const flow = 1 - lock;

      for (const b of bodies) {
        // ease the focus scale (click → 1.5x) — smooth grow/shrink
        b.scale += (b.scaleTarget - b.scale) * 0.14;

        b.vy += GRAV * flow;
        b.vx *= AIR;
        b.vy *= AIR;
        // When idle, bleed energy so the pool settles; skipped while stirring so
        // motion stays free and fluid.
        if (!stirring) {
          b.vx *= IDLE_DAMP;
          b.vy *= IDLE_DAMP;
        }

        // fluid cursor stir — drags tiles along with the motion, ramped by `stir`
        if (stirring) {
          const dx = b.x - ptr.x;
          const dy = b.y - ptr.y;
          const reach = 135 + b.r;
          const d2c = dx * dx + dy * dy;
          if (d2c < reach * reach) {
            const d = Math.sqrt(d2c) || 0.0001;
            const nx = dx / d;
            const ny = dy / d;
            const influence = (1 - d / reach) * stir;
            // carry the tile along with the cursor (the "current")
            b.vx += ptr.vx * 0.22 * influence;
            b.vy += ptr.vy * 0.22 * influence;
            // gentle parting so the cursor opens a path through the pool
            b.vx += nx * 0.85 * influence;
            b.vy += ny * 0.85 * influence;
            // a touch of swirl
            b.av += (ptr.vx * ny - ptr.vy * nx) * 0.0005 * influence;
          }
        }

        // clamp speed so nothing ever bursts into a frenzy
        const sp2 = b.vx * b.vx + b.vy * b.vy;
        if (sp2 > MAX_SPEED * MAX_SPEED) {
          const sp = Math.sqrt(sp2);
          b.vx = (b.vx / sp) * MAX_SPEED;
          b.vy = (b.vy / sp) * MAX_SPEED;
        }

        b.x += b.vx * flow;
        b.y += b.vy * flow;
        b.angle += b.av * flow;
        b.av *= 0.84; // spin dies quickly — no perpetual spinning
        if (b.av > 0.12) b.av = 0.12;
        else if (b.av < -0.12) b.av = -0.12;

        // Firm, inelastic containment. The walls sit a full tile-extent inside
        // the canvas, so the image never reaches the edge to be clipped — any
        // clipping would be *beyond* this wall. Stopping the inward velocity (no
        // bounce) is what lets the pool actually come to rest. Bottom = ground.
        const ext = Math.hypot(b.halfW, b.halfH) * b.scale;
        const br = b.r * b.scale;
        if (b.x < ext) { b.x = ext; if (b.vx < 0) b.vx = 0; }
        else if (b.x > W - ext) { b.x = W - ext; if (b.vx > 0) b.vx = 0; }
        if (b.y < ext) { b.y = ext; if (b.vy < 0) b.vy = 0; }
        if (b.y > H - br) { b.y = H - br; if (b.vy > 0) b.vy = 0; }
      }

      // collisions: soft slop correction + inelastic impulse
      for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < bodies.length; i++) {
          const a = bodies[i];
          for (let k = i + 1; k < bodies.length; k++) {
            const c = bodies[k];
            const dx = c.x - a.x;
            const dy = c.y - a.y;
            const min = a.r * a.scale + c.r * c.scale;
            const d2 = dx * dx + dy * dy;
            if (d2 > 0 && d2 < min * min) {
              const d = Math.sqrt(d2);
              const nx = dx / d;
              const ny = dy / d;
              const corr = (Math.max(min - d - SLOP, 0) * CORRECT * flow) / 2;
              a.x -= nx * corr;
              a.y -= ny * corr;
              c.x += nx * corr;
              c.y += ny * corr;
              const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
              if (vn < 0) {
                const j = -vn * 0.5;
                a.vx -= nx * j;
                a.vy -= ny * j;
                c.vx += nx * j;
                c.vy += ny * j;
              }
            }
          }
        }
      }

      // Final containment pass — re-seat sides/top/floor so nothing ever clips.
      let maxV2 = 0;
      let animating = false;
      for (const b of bodies) {
        const ext = Math.hypot(b.halfW, b.halfH) * b.scale;
        const br = b.r * b.scale;
        if (b.x < ext) { b.x = ext; if (b.vx < 0) b.vx = 0; }
        else if (b.x > W - ext) { b.x = W - ext; if (b.vx > 0) b.vx = 0; }
        if (b.y < ext) { b.y = ext; if (b.vy < 0) b.vy = 0; }
        if (b.y > H - br) { b.y = H - br; if (b.vy > 0) b.vy = 0; }
        const v2 = b.vx * b.vx + b.vy * b.vy;
        if (v2 > maxV2) maxV2 = v2;
        if (Math.abs(b.scale - b.scaleTarget) > 0.004) animating = true;
      }

      // Once the pool is calm and not stirred (and no piece is still growing or
      // shrinking), ease the lock in so motion glides to a stop, then snap the
      // last sliver to a true zero-motion rest.
      if (!stirring && !animating && maxV2 < FREEZE_SPEED2) {
        if (++calm > FREEZE_AFTER) {
          lock += (1 - lock) * LOCK_RAMP;
          if (lock > 0.985) {
            lock = 1;
            for (const b of bodies) {
              b.vx = 0;
              b.vy = 0;
              b.av = 0;
            }
          }
        }
      } else {
        calm = 0;
      }
    };

    const drawBody = (b: Body, lifted: boolean) => {
      if (!b.img || !b.img.complete) return;
      const sc = b.scale;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      // a lifted (focused) piece gets a deeper shadow so it clearly reads as
      // being in front of the pile
      ctx.shadowColor = lifted ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.42)";
      ctx.shadowBlur = lifted ? 22 : 9;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = lifted ? 8 : 3;
      // transparent image, trimmed — no square, no background
      ctx.drawImage(b.img, b.sx, b.sy, b.sw, b.sh, -b.halfW * sc, -b.halfH * sc, b.halfW * 2 * sc, b.halfH * 2 * sc);
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // pieces that are focused or still growing/shrinking draw on top, so the
      // clicked one comes to the front (and stays there while it animates).
      for (const b of bodies) {
        if (b === selected || b.scale > 1.02) continue;
        drawBody(b, false);
      }
      for (const b of bodies) {
        if (b === selected || b.scale > 1.02) drawBody(b, b === selected);
      }
    };

    let raf = 0;
    let running = false;
    const loop = () => {
      if (!running) return;
      const wasFrozen = lock >= 1;
      step();
      // Redraw while live (including the whole gradual lock ramp), plus the
      // single frame on which it fully freezes. Once frozen, skip drawing.
      if (lock < 1 || !wasFrozen) draw();
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

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      // re-entering after leaving: reset history so we don't register a velocity spike
      if (!ptr.active) {
        ptr.px = nx;
        ptr.py = ny;
        ptr.vx = 0;
        ptr.vy = 0;
      }
      ptr.x = nx;
      ptr.y = ny;
      ptr.active = true;
    };
    const onLeave = () => {
      ptr.active = false;
      ptr.x = -9999;
      ptr.y = -9999;
    };

    // topmost piece under a point (front-drawn pieces win), rotated hit-test
    const hitTest = (px: number, py: number): Body | null => {
      let best: Body | null = null;
      let bestRank = -1;
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (!b.img || !b.img.complete) continue;
        const dx = px - b.x;
        const dy = py - b.y;
        const cos = Math.cos(-b.angle);
        const sin = Math.sin(-b.angle);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.abs(lx) <= b.halfW * b.scale && Math.abs(ly) <= b.halfH * b.scale) {
          const rank = (b === selected || b.scale > 1.02 ? 1e6 : 0) + i;
          if (rank > bestRank) {
            bestRank = rank;
            best = b;
          }
        }
      }
      return best;
    };

    const focusAt = (px: number, py: number) => {
      const hit = hitTest(px, py);
      if (!hit) return; // clicking empty space leaves the focus as-is
      if (hit === selected) {
        hit.scaleTarget = 1; // clicking the focused piece again releases it
        selected = null;
      } else {
        if (selected) selected.scaleTarget = 1;
        selected = hit;
        hit.scaleTarget = 1.5;
      }
      lock = 0; // thaw so the grow/shrink animates and neighbours get nudged
      calm = 0;
    };

    // distinguish a click (focus a piece) from a drag (stir the pool)
    let downX = 0;
    let downY = 0;
    let downT = 0;
    let pending = false;
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const onDown = (e: PointerEvent) => {
      onMove(e);
      const rect = canvas.getBoundingClientRect();
      downX = e.clientX - rect.left;
      downY = e.clientY - rect.top;
      downT = now();
      pending = true;
    };
    const onUp = (e: PointerEvent) => {
      if (!pending) return;
      pending = false;
      const rect = canvas.getBoundingClientRect();
      const ux = e.clientX - rect.left;
      const uy = e.clientY - rect.top;
      if (Math.hypot(ux - downX, uy - downY) < 6 && now() - downT < 500) focusAt(ux, uy);
    };
    const onCancel = () => {
      pending = false;
    };

    buildBodies();
    resize();
    loadImages();

    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerdown", onDown, { passive: true });
    canvas.addEventListener("pointerup", onUp, { passive: true });
    canvas.addEventListener("pointercancel", onCancel, { passive: true });
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
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
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
