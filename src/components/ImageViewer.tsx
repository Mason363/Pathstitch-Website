"use client";

import React, { useState, useEffect, useRef } from "react";

const IMAGE_SRC = "/main-image.png";
const WIDTH = 720;
const HEIGHT = 480;

interface Point {
  x: number;
  y: number;
}

export default function ImageViewer() {
  const [isSelected, setIsSelected] = useState(false);
  const [radius, setRadius] = useState(40); // User-adjustable corner radius
  const [isDragging, setIsDragging] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0); // 0 to 90000 ms (1m 30s)
  
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // De-select when clicking outside the image container
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Handle animation loop (90s total duration)
  useEffect(() => {
    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      setAnimationProgress((prev) => {
        const next = prev + delta;
        if (next >= 90000) {
          return 0; // Reset animation after 1m 30s
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Compute points along the filleted rectangle perimeter
  const getPoints = (): { points: Point[]; perimeter: number } => {
    const R = Math.max(0, Math.min(radius, HEIGHT / 2));
    const W = WIDTH;
    const H = HEIGHT;

    // Segment lengths
    const L_top = W - 2 * R;
    const L_tr = R * (Math.PI / 2);
    const L_right = H - 2 * R;
    const L_br = R * (Math.PI / 2);
    const L_bottom = W - 2 * R;
    const L_bl = R * (Math.PI / 2);
    const L_left = H - 2 * R;
    const L_tl = R * (Math.PI / 2);

    const perimeter = 2 * (W - 2 * R) + 2 * (H - 2 * R) + 2 * Math.PI * R;
    
    // Spacing of sewing holes (approx. 20px apart)
    const idealSpacing = 20;
    const numHoles = Math.max(12, Math.round(perimeter / idealSpacing));
    const spacing = perimeter / numHoles;

    const points: Point[] = [];

    for (let i = 0; i < numHoles; i++) {
      const d = i * spacing;

      if (d < L_top) {
        // Top line
        points.push({ x: R + d, y: 0 });
      } else if (d < L_top + L_tr) {
        // Top-Right corner
        const s = d - L_top;
        const theta = -Math.PI / 2 + s / R;
        points.push({
          x: W - R + R * Math.cos(theta),
          y: R + R * Math.sin(theta),
        });
      } else if (d < L_top + L_tr + L_right) {
        // Right line
        const s = d - L_top - L_tr;
        points.push({ x: W, y: R + s });
      } else if (d < L_top + L_tr + L_right + L_br) {
        // Bottom-Right corner
        const s = d - L_top - L_tr - L_right;
        const theta = s / R;
        points.push({
          x: W - R + R * Math.cos(theta),
          y: H - R + R * Math.sin(theta),
        });
      } else if (d < L_top + L_tr + L_right + L_br + L_bottom) {
        // Bottom line
        const s = d - L_top - L_tr - L_right - L_br;
        points.push({ x: W - R - s, y: H });
      } else if (d < L_top + L_tr + L_right + L_br + L_bottom + L_bl) {
        // Bottom-Left corner
        const s = d - L_top - L_tr - L_right - L_br - L_bottom;
        const theta = Math.PI / 2 + s / R;
        points.push({
          x: R + R * Math.cos(theta),
          y: H - R + R * Math.sin(theta),
        });
      } else if (d < L_top + L_tr + L_right + L_br + L_bottom + L_bl + L_left) {
        // Left line
        const s = d - L_top - L_tr - L_right - L_br - L_bottom - L_bl;
        points.push({ x: 0, y: H - R - s });
      } else {
        // Top-Left corner
        const s = d - L_top - L_tr - L_right - L_br - L_bottom - L_bl - L_left;
        const theta = Math.PI + s / R;
        points.push({
          x: R + R * Math.cos(theta),
          y: R + R * Math.sin(theta),
        });
      }
    }

    return { points, perimeter };
  };

  const { points, perimeter } = getPoints();

  // Determine what part of animation is currently active
  // Total 90s (90000 ms):
  // Phase 1: 0 - 30s (Holes appear one by one)
  // Phase 2: 30s - 60s (Holes disappear one by one)
  // Phase 3: 60s - 82s (Dashed line draws around)
  // Phase 4: 82s - 90s (Idle hold, reset)
  const getAnimationState = () => {
    const t = animationProgress;
    const numHoles = points.length;

    if (t < 30000) {
      const ratio = t / 30000;
      const count = Math.floor(numHoles * ratio);
      return { phase: "holes-appear", count, showLine: false, lineLengthRatio: 0 };
    } else if (t < 60000) {
      const ratio = (t - 30000) / 30000;
      const count = numHoles - Math.floor(numHoles * ratio);
      return { phase: "holes-disappear", count, showLine: false, lineLengthRatio: 0 };
    } else if (t < 82000) {
      const ratio = (t - 60000) / 22000;
      return { phase: "dashed-draw", count: 0, showLine: true, lineLengthRatio: ratio };
    } else {
      return { phase: "hold", count: 0, showLine: true, lineLengthRatio: 1 };
    }
  };

  const anim = getAnimationState();

  // Bounding box path matching the filleted rect
  const R = Math.max(0, Math.min(radius, HEIGHT / 2));
  const pathData = `
    M ${R} 0
    H ${WIDTH - R}
    A ${R} ${R} 0 0 1 ${WIDTH} ${R}
    V ${HEIGHT - R}
    A ${R} ${R} 0 0 1 ${WIDTH - R} ${HEIGHT}
    H ${R}
    A ${R} ${R} 0 0 1 0 ${HEIGHT - R}
    V ${R}
    A ${R} ${R} 0 0 1 ${R} 0
    Z
  `.trim().replace(/\s+/g, " ");

  // Handle fillet corner dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Project mouse position onto 45-deg diagonal
      const newRadius = Math.max(0, Math.min(HEIGHT / 2, (x + y) / 2));
      setRadius(Math.round(newRadius));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div style={styles.outerContainer}>
      <div 
        ref={containerRef}
        style={{
          ...styles.imageContainer,
          boxShadow: isSelected ? "0 0 24px rgba(47, 128, 237, 0.25)" : "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsSelected(true);
        }}
      >
        {/* Core Image Display */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMAGE_SRC}
          alt="Pathstitch Screen"
          style={{
            ...styles.image,
            borderRadius: `${R}px`,
          }}
          draggable={false}
        />

        {/* Vector SVG Animation Overlay */}
        <svg style={styles.svgOverlay} width={WIDTH} height={HEIGHT}>
          {/* CAD selection highlight (Only when selected) */}
          {isSelected && (
            <>
              {/* Blue outline tracing the exact filleted shape */}
              <path
                d={pathData}
                fill="none"
                stroke="var(--color-accent-blue)"
                strokeWidth="1.5"
              />
              
              {/* Outer sharp corner bounding box */}
              <rect
                x="0"
                y="0"
                width={WIDTH}
                height={HEIGHT}
                fill="none"
                stroke="rgba(47, 128, 237, 0.35)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              
              {/* Bounding box corner squares */}
              <rect x="-3" y="-3" width="6" height="6" fill="#16161a" stroke="var(--color-accent-blue)" strokeWidth="1" />
              <rect x={WIDTH - 3} y="-3" width="6" height="6" fill="#16161a" stroke="var(--color-accent-blue)" strokeWidth="1" />
              <rect x={WIDTH - 3} y={HEIGHT - 3} width="6" height="6" fill="#16161a" stroke="var(--color-accent-blue)" strokeWidth="1" />
              <rect x="-3" y={HEIGHT - 3} width="6" height="6" fill="#16161a" stroke="var(--color-accent-blue)" strokeWidth="1" />

              {/* Fillet Drag Gizmo (Yellow/Orange diagonal line and circular handle) */}
              <line
                x1="0"
                y1="0"
                x2={R}
                y2={R}
                stroke="var(--color-accent-orange)"
                strokeWidth="1.5"
              />
              <circle
                cx={R}
                cy={R}
                r="7"
                fill="var(--color-accent-orange)"
                stroke="#fff"
                strokeWidth="1.5"
                style={{
                  ...styles.filletHandle,
                  transform: isDragging ? "scale(1.25)" : "scale(1)",
                }}
                onMouseDown={handleMouseDown}
              />
            </>
          )}

          {/* Sewing animation circles (holes) */}
          {(anim.phase === "holes-appear" || anim.phase === "holes-disappear") && (
            <g>
              {points.slice(0, anim.count).map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="none"
                  stroke="var(--color-accent-orange)"
                  strokeWidth="0.75"
                />
              ))}
            </g>
          )}

          {/* Mask definition for the drawing animation */}
          <defs>
            <mask id="sewing-mask">
              <path
                d={pathData}
                fill="none"
                stroke="#ffffff"
                strokeWidth="10"
                strokeDasharray={perimeter}
                strokeDashoffset={perimeter * (1 - anim.lineLengthRatio)}
              />
            </mask>
          </defs>

          {/* Sewing animation stitches (dashed lines) */}
          {(anim.phase === "dashed-draw" || anim.phase === "hold") && (
            <path
              d={pathData}
              fill="none"
              stroke="var(--color-accent-orange)"
              strokeWidth="1.75"
              strokeDasharray="7 5"
              mask="url(#sewing-mask)"
            />
          )}
        </svg>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  outerContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: "auto",
    padding: "20px",
    zIndex: 10,
    position: "relative",
    pointerEvents: "auto",
  },
  imageContainer: {
    width: `${WIDTH}px`,
    height: `${HEIGHT}px`,
    backgroundColor: "#16161a",
    position: "relative",
    borderRadius: "16px",
    padding: "0",
    overflow: "visible",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    transition: "box-shadow 0.2s ease",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  svgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    overflow: "visible",
  },
  filletHandle: {
    pointerEvents: "auto",
    cursor: "nwse-resize",
    transition: "transform 0.1s ease",
  },
};
