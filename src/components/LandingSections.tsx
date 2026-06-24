"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

const RELEASES = "https://github.com/Mason363/Pathstitch/releases/latest";
const REPO = "https://github.com/Mason363/Pathstitch";
const DISCUSSIONS = "https://github.com/Mason363/Pathstitch/discussions";
const ISSUES = "https://github.com/Mason363/Pathstitch/issues";
const COFFEE = "https://buymeacoffee.com/masonchen";

/* Reveal-on-scroll: adds `.in` to any `.reveal` element when it enters view. */
function useScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* Video that only plays while visible (saves CPU with several clips on one page). */
function LazyVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const vid = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        });
      },
      { threshold: 0.35 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <div className="media-frame">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
      />
    </div>
  );
}

function FrameImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="media-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

interface Feature {
  tag: string;
  title: string;
  body: React.ReactNode;
  bullets: string[];
  media: { type: "video" | "image"; src: string; poster?: string; label: string };
  reverse?: boolean;
}

const FEATURES: Feature[] = [
  {
    tag: "01 / DRAW",
    title: "Sketch with CAD precision, at the speed of a pencil.",
    body: (
      <>
        Line, circle, rectangle, polygon, text, and an Illustrator-style{" "}
        <strong>pen tool</strong> — all with point, edge, and grid snapping and{" "}
        <strong>dimensions as you draw</strong>. Type a width, <code>Tab</code>, type a
        height, <code>Enter</code>. Done. No hunting through panels.
      </>
    ),
    bullets: [
      "Point / edge / grid snapping while you draw",
      "On-creation dimensions — exact sizes, never eyeballed",
      "Import & trace reference images right on the canvas",
    ],
    media: { type: "video", src: "/media/demo-draw.mp4", poster: "/media/poster-draw.jpg", label: "pathstitch — draw" },
  },
  {
    tag: "02 / EDIT",
    title: "Every corner stays editable. Forever.",
    body: (
      <>
        <strong>Parametric fillets and chamfers</strong> you can drag to size and tweak
        forever — they even grow until adjacent fillets meet. Fusion-style trim shows
        exactly what gets cut before you click. Real booleans on a real geometry kernel.
      </>
    ),
    bullets: [
      "Per-corner parametric fillet & chamfer (G1/G2)",
      "Hover-to-preview trim, boolean union / subtract / intersect",
      "Offset, mirror, scale, array — with live ghost previews",
    ],
    media: { type: "video", src: "/media/demo-edit.mp4", poster: "/media/shot-edit.png", label: "pathstitch — edit" },
    reverse: true,
  },
  {
    tag: "03 / STITCH",
    title: "Saddle-stitch holes, laid out for you.",
    body: (
      <>
        The thing that started it all. Drop <strong>evenly-spaced stitch holes</strong>{" "}
        down any edge with spacing and corner controls and a live, draggable preview — and
        tell it to <strong>keep out</strong> around snaps, rivets, and D-rings so the line
        gaps cleanly.
      </>
    ),
    bullets: [
      "Saddle & single-row stitch generation along any path",
      "Keep-out avoidance around tagged hardware",
      "Offsets, hatch fills, perforated lines, glue-tab folding",
    ],
    media: { type: "video", src: "/media/demo-make.mp4", poster: "/media/shot-make.png", label: "pathstitch — stitch" },
  },
  {
    tag: "04 / UNFOLD",
    title: "Take a 3D model and lay it flat.",
    body: (
      <>
        Import <strong>STEP, STL, and OBJ</strong>, pull a face right off the model — even
        curved, non-planar ones — and <strong>unfold it into a flat, cuttable pattern</strong>.
        The thing most pattern tools simply can&apos;t do.
      </>
    ),
    bullets: [
      "STEP / STL / OBJ import into a Three.js viewport",
      "Unfold developable surfaces; conformal flatten (LSCM) for curved faces",
      "Cross-section any plane to sketch against",
    ],
    media: { type: "video", src: "/media/demo-3d.mp4", poster: "/media/shot-3d.png", label: "pathstitch — unfold" },
    reverse: true,
  },
  {
    tag: "05 / EXPORT",
    title: "Cut-ready files, in every format you need.",
    body: (
      <>
        Export to <strong>DXF, SVG, PDF, or high-res PNG</strong> — ready for your laser,
        your plotter, or your stitching pony. Native <code>.stch</code> projects, plus
        Finder QuickLook previews that show the real geometry, not a generic icon.
      </>
    ),
    bullets: [
      "DXF / SVG / PDF / PNG export with selected-only filters",
      "Native .stch project files, batch mode over many files",
      "Finder QuickLook previews & thumbnails for DXF and STEP",
    ],
    media: { type: "video", src: "/media/demo-export.mp4", poster: "/media/shot-3d2.png", label: "pathstitch — export" },
  },
];

const CAPABILITIES: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: "Native, not a web wrapper",
    body: "A fast SwiftUI app backed by a real geometry kernel — ezdxf, shapely, OpenCASCADE. Curves stay curves.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8M12 18v3" /></svg>
    ),
  },
  {
    title: "Keyboard-first workflow",
    body: "Single-key Fusion/Photoshop-style shortcuts, a ⌘K command palette, and a rearrangeable toolbar.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" /></svg>
    ),
  },
  {
    title: "Layers & precise dimensions",
    body: "Organize geometry on layers; measure and dimension with a parameter engine — formulas, variables, units.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></svg>
    ),
  },
  {
    title: "Trace photos to vectors",
    body: "Drop in a photo or logo and trace it into clean vectors — no Illustrator, no round-trip required.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L7 19" /></svg>
    ),
  },
  {
    title: "Light & dark themes",
    body: "A clean workspace that matches your Mac, with customizable keybinds that take effect immediately.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
    ),
  },
  {
    title: "Self-contained app",
    body: "The whole geometry engine ships inside the .app. Download, drag to Applications, and you're running.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></svg>
    ),
  },
];

function StickyNav() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={`nav ${visible ? "visible" : ""}`} aria-hidden={!visible}>
      <div className="nav-brand">
        <Image src="/logo.png" alt="" width={24} height={24} />
        Pathstitch
      </div>
      <div className="nav-actions">
        <a className="nav-link" href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a>
        <a className="nav-link" href={DISCUSSIONS} target="_blank" rel="noopener noreferrer">Discussions</a>
        <a className="nav-dl" href={RELEASES} target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </a>
      </div>
    </nav>
  );
}

export default function LandingSections() {
  useScrollReveal();

  return (
    <>
      <StickyNav />

      {/* ---------- Statement ---------- */}
      <section className="statement">
        <div className="section">
          <p className="statement-text reveal">
            A fast, native Mac studio for <strong>leather patterns</strong>,{" "}
            <strong>saddle-stitch holes</strong>, and <strong>unfolding 3D models</strong>{" "}
            into flat, cuttable panels.
          </p>
          <div className="statement-tag reveal d1">
            Free&nbsp;&nbsp;·&nbsp;&nbsp;Open-source&nbsp;&nbsp;·&nbsp;&nbsp;Native&nbsp;macOS
          </div>
        </div>
      </section>

      {/* ---------- Origin story ---------- */}
      <section className="story">
        <div className="section">
          <h2 className="headline reveal">It started with a hole.<br />A lot of holes, actually.</h2>
          <div className="story-body">
            <p className="reveal">
              I do leatherwork, and I just wanted an easy way to add evenly-spaced
              stitching holes to a <code>.dxf</code> file. But every tool I found was locked
              behind a subscription, buried in a CAD program with a three-week learning
              curve, or just&hellip; didn&apos;t exist. So I built a little thing for myself.
              Give it an offset and a spacing, and it laid the stitch holes down the edge of
              my pattern. That was it.
            </p>
            <p className="reveal">
              Then the friction crept in. I needed to round a corner — where&apos;s the free
              fillet tool? I wanted to drop in a rectangle, trace a logo from a photo, or
              pull a flat face off a 3D model. Every one was its own rabbit hole of clunky
              software and paywalls. None were <strong>free</strong>, <strong>intuitive</strong>,
              and <strong>fast</strong> all at once.
            </p>
            <p className="reveal">
              So I stopped building a hole-puncher and started building the tool I actually
              wished existed — and made it for <strong>everyone</strong>. The rule was simple:
              free and open-source, intuitive enough to use without a manual, and fast — the
              kind of fast where you forget you&apos;re using software at all.
            </p>
            <p className="reveal em-line">And it grew.</p>
            <p className="story-sign reveal">
              Today, Pathstitch opens just about anything you throw at it — and gives you one
              clean, native Mac workspace to make real things in.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Feature rows ---------- */}
      {FEATURES.map((f) => (
        <section className="section" key={f.tag}>
          <div className={`feature ${f.reverse ? "reverse" : ""}`}>
            <div className="feature-copy reveal">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
              <ul className="feature-bullets">
                {f.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="feature-media reveal d1">
              {f.media.type === "video" ? (
                <LazyVideo src={f.media.src} poster={f.media.poster!} label={f.media.label} />
              ) : (
                <FrameImage src={f.media.src} alt={f.title} />
              )}
            </div>
          </div>
        </section>
      ))}

      {/* ---------- Capability band ---------- */}
      <section className="band">
        <div className="section overlay">
          <h2 className="headline reveal">Opens anything. Exports everything.</h2>
          <p className="lede reveal">
            Drag in a file and start working. Pathstitch reads vectors, 3D models, PDFs,
            and even raster images — no converters, no round-trips.
          </p>
          <div className="formats reveal d1">
            {["DXF", "SVG", "STEP", "STL", "OBJ", "PDF", "PNG", "Images"].map((fmt) => (
              <span className="format-chip" key={fmt}>
                <span className="arrow">→</span> {fmt}
              </span>
            ))}
          </div>

          <div className="cap-grid">
            {CAPABILITIES.map((c, i) => (
              <div className={`cap-card reveal d${(i % 3) + 1}`} key={c.title}>
                <div className="ico">{c.icon}</div>
                <h4>{c.title}</h4>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Trust / open source ---------- */}
      <section className="trust">
        <div className="section">
          <h2 className="headline reveal">Free. Open-source. Yours.</h2>
          <p className="lede reveal">
            No subscription. No gatekeeping. No account. Pathstitch is <strong>GPLv3 and
            fully auditable</strong> — built by one maker who got tired of doing this by hand,
            and would rather it outlive him than make a buck.
          </p>
          <div className="trust-grid">
            <div className="trust-pill reveal">
              <div className="big">$0</div>
              <div className="sub">Free forever. No trial, no upsell, no account.</div>
            </div>
            <div className="trust-pill reveal d1">
              <div className="big">GPLv3</div>
              <div className="sub">100% open-source. The whole codebase is public.</div>
            </div>
            <div className="trust-pill reveal d2">
              <div className="big">Native</div>
              <div className="sub">SwiftUI over a real geometry kernel — not Electron.</div>
            </div>
            <div className="trust-pill reveal d3">
              <div className="big">macOS 14+</div>
              <div className="sub">Apple-Silicon Mac. Drag to Applications and run.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="final">
        <h2 className="reveal">Pathstitch is for makers who&apos;d rather be making.</h2>
        <p className="reveal d1">
          No subscription. No fighting the software instead of making the thing. Just draw
          it, stitch it, unfold it, and cut it.
        </p>
        <div className="cta-row reveal d2">
          <a className="btn-primary" href={RELEASES} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Latest Release
          </a>
          <a className="btn-secondary" href={REPO} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            View on GitHub
          </a>
        </div>
        <div className="cta-note reveal d3">
          Apple-Silicon Mac · macOS 14 (Sonoma)+ · one-time Gatekeeper approval on first launch
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-brand">
              <Image src="/logo.png" alt="" width={26} height={26} />
              Pathstitch
            </div>
            <p className="footer-tag">
              Free, open-source Mac CAD/CAM for leather, patterns &amp; laser cutting.
              Draw it, stitch it, unfold it, cut it.
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h5>Product</h5>
              <a href={RELEASES} target="_blank" rel="noopener noreferrer">Download</a>
              <a href={REPO} target="_blank" rel="noopener noreferrer">Source code</a>
              <a href={`${REPO}#feature-list`} target="_blank" rel="noopener noreferrer">Features</a>
            </div>
            <div className="footer-col">
              <h5>Community</h5>
              <a href={DISCUSSIONS} target="_blank" rel="noopener noreferrer">Discussions</a>
              <a href={ISSUES} target="_blank" rel="noopener noreferrer">Report a bug</a>
              <a href={COFFEE} target="_blank" rel="noopener noreferrer">Buy me a coffee</a>
            </div>
          </div>
        </div>
        <div className="footer-base">
          <span>Built with care by Mason Chen.</span>
          <span>
            Licensed under{" "}
            <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">GPLv3</a>.
          </span>
        </div>
      </footer>
    </>
  );
}
