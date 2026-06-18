"use client";

import React, { useState, useEffect, useRef } from "react";

const IMAGE_SRC = "/main-image.png";
const WIDTH = 720;
const HEIGHT = 480;
const OFFSET = 12; // Outward offset in pixels for the sewing/dashed animation ring

interface Point {
  x: number;
  y: number;
}

interface ImageViewerProps {
  isSelected: boolean;
  setIsSelected: (selected: boolean) => void;
}

export default function ImageViewer({ isSelected, setIsSelected }: ImageViewerProps) {
  const [radius, setRadius] = useState(40); // User-adjustable corner radius
  const [isDragging, setIsDragging] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0); // 0 to 90000 ms (1m 30s)
  
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

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

  // Compute points along the offset filleted rectangle perimeter for the animation ring
  const getPoints = (): { points: Point[]; perimeter: number } => {
    const R = Math.max(0, Math.min(radius, HEIGHT / 2));
    const R_ring = R + OFFSET;
    const W = WIDTH + 2 * OFFSET;
    const H = HEIGHT + 2 * OFFSET;

    // Segment lengths
    const L_top = W - 2 * R_ring;
    const L_tr = R_ring * (Math.PI / 2);
    const L_right = H - 2 * R_ring;
    const L_br = R_ring * (Math.PI / 2);
    const L_bottom = W - 2 * R_ring;
    const L_bl = R_ring * (Math.PI / 2);
    const L_left = H - 2 * R_ring;
    const L_tl = R_ring * (Math.PI / 2);

    const perimeter = 2 * (W - 2 * R_ring) + 2 * (H - 2 * R_ring) + 2 * Math.PI * R_ring;
    
    // Spacing of sewing holes (approx. 50px apart for wider spacing)
    const idealSpacing = 50;
    const numHoles = Math.max(8, Math.round(perimeter / idealSpacing));
    const spacing = perimeter / numHoles;

    const points: Point[] = [];

    for (let i = 0; i < numHoles; i++) {
      const d = i * spacing;

      if (d < L_top) {
        // Top line
        points.push({ x: R_ring + d, y: 0 });
      } else if (d < L_top + L_tr) {
        // Top-Right corner
        const s = d - L_top;
        const theta = -Math.PI / 2 + s / R_ring;
        points.push({
          x: W - R_ring + R_ring * Math.cos(theta),
          y: R_ring + R_ring * Math.sin(theta),
        });
      } else if (d < L_top + L_tr + L_right) {
        // Right line
        const s = d - L_top - L_tr;
        points.push({ x: W, y: R_ring + s });
      } else if (d < L_top + L_tr + L_right + L_br) {
        // Bottom-Right corner
        const s = d - L_top - L_tr - L_right;
        const theta = s / R_ring;
        points.push({
          x: W - R_ring + R_ring * Math.cos(theta),
          y: H - R_ring + R_ring * Math.sin(theta),
        });
      } else if (d < L_top + L_tr + L_right + L_br + L_bottom) {
        // Bottom line
        const s = d - L_top - L_tr - L_right - L_br;
        points.push({ x: W - R_ring - s, y: H });
      } else if (d < L_top + L_tr + L_right + L_br + L_bottom + L_bl) {
        // Bottom-Left corner
        const s = d - L_top - L_tr - L_right - L_br - L_bottom;
        const theta = Math.PI / 2 + s / R_ring;
        points.push({
          x: R_ring + R_ring * Math.cos(theta),
          y: H - R_ring + R_ring * Math.sin(theta),
        });
      } else if (d < L_top + L_tr + L_right + L_br + L_bottom + L_bl + L_left) {
        // Left line
        const s = d - L_top - L_tr - L_right - L_br - L_bottom - L_bl;
        points.push({ x: 0, y: H - R_ring - s });
      } else {
        // Top-Left corner
        const s = d - L_top - L_tr - L_right - L_br - L_bottom - L_bl - L_left;
        const theta = Math.PI + s / R_ring;
        points.push({
          x: R_ring + R_ring * Math.cos(theta),
          y: R_ring + R_ring * Math.sin(theta),
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

  // Bounding box path matching the offset filleted rect for the animation
  const R = Math.max(0, Math.min(radius, HEIGHT / 2));
  const R_ring = R + OFFSET;
  const W_ring = WIDTH + 2 * OFFSET;
  const H_ring = HEIGHT + 2 * OFFSET;

  const pathData = `
    M ${R_ring} 0
    H ${W_ring - R_ring}
    A ${R_ring} ${R_ring} 0 0 1 ${W_ring} ${R_ring}
    V ${H_ring - R_ring}
    A ${R_ring} ${R_ring} 0 0 1 ${W_ring - R_ring} ${H_ring}
    H ${R_ring}
    A ${R_ring} ${R_ring} 0 0 1 0 ${H_ring - R_ring}
    V ${R_ring}
    A ${R_ring} ${R_ring} 0 0 1 ${R_ring} 0
    Z
  `.trim().replace(/\s+/g, " ");

  // Path data for the selection highlight (aligned exactly with the image borders)
  const pathDataImage = `
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
        id="image-container"
        ref={containerRef}
        style={styles.imageContainer}
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

        {/* Vector SVG Animation Overlay (shifted outward by offset to frame the image) */}
        <svg 
          style={{
            ...styles.svgOverlay,
            top: -OFFSET,
            left: -OFFSET,
            width: WIDTH + 2 * OFFSET,
            height: HEIGHT + 2 * OFFSET,
          }} 
          width={WIDTH + 2 * OFFSET} 
          height={HEIGHT + 2 * OFFSET}
        >
          {/* CAD selection highlight (Only when selected, aligned with the image boundary) */}
          {isSelected && (
            <>
              {/* Blue outline tracing the exact filleted shape of the image */}
              <path
                d={pathDataImage}
                transform={`translate(${OFFSET}, ${OFFSET})`}
                fill="none"
                stroke="var(--color-accent-blue)"
                strokeWidth="1.5"
              />
              
              {/* Outer sharp corner bounding box */}
              <rect
                x={OFFSET}
                y={OFFSET}
                width={WIDTH}
                height={HEIGHT}
                fill="none"
                stroke="rgba(47, 128, 237, 0.35)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              
              {/* Bounding box corner squares */}
              <rect x={OFFSET - 3} y={OFFSET - 3} width="6" height="6" fill="#16161a" stroke="var(--color-accent-blue)" strokeWidth="1" />
              <rect x={WIDTH + OFFSET - 3} y={OFFSET - 3} width="6" height="6" fill="#16161a" stroke="var(--color-accent-blue)" strokeWidth="1" />
              <rect x={WIDTH + OFFSET - 3} y={HEIGHT + OFFSET - 3} width="6" height="6" fill="#16161a" stroke="var(--color-accent-blue)" strokeWidth="1" />
              <rect x={OFFSET - 3} y={HEIGHT + OFFSET - 3} width="6" height="6" fill="#16161a" stroke="var(--color-accent-blue)" strokeWidth="1" />

              {/* Fillet Drag Gizmo Diagonal Line */}
              <line
                x1={OFFSET}
                y1={OFFSET}
                x2={R + OFFSET}
                y2={R + OFFSET}
                stroke="var(--color-accent-orange)"
                strokeWidth="1.5"
              />
            </>
          )}

          {/* Sewing animation circles (holes) - spaced further apart */}
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

          {/* Sewing animation stitches (dashed lines) - dashes further spaced */}
          {(anim.phase === "dashed-draw" || anim.phase === "hold") && (
            <path
              d={pathData}
              fill="none"
              stroke="var(--color-accent-orange)"
              strokeWidth="1.75"
              strokeDasharray="12 16"
              mask="url(#sewing-mask)"
            />
          )}
        </svg>

        {/* HTML Fillet Handle overlay (placed on top of the image corner) */}
        {isSelected && (
          <div
            style={{
              position: "absolute",
              top: `${R}px`,
              left: `${R}px`,
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              backgroundColor: "var(--color-accent-orange)",
              border: "1.5px solid #fff",
              cursor: "nwse-resize",
              transform: "translate(-50%, -50%)",
              zIndex: 50,
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              pointerEvents: "auto",
            }}
            onMouseDown={handleMouseDown}
          />
        )}
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
    backgroundColor: "transparent",
    position: "relative",
    borderRadius: "16px",
    padding: "0",
    overflow: "visible",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    boxShadow: "none",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    overflow: "hidden",
  },
  svgOverlay: {
    position: "absolute",
    pointerEvents: "none",
    overflow: "visible",
  },
};
