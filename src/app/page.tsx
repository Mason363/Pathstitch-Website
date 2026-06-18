"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import ImageViewer from "@/components/ImageViewer";
import MeasurementCanvas from "@/components/MeasurementCanvas";

interface Point {
  x: number;
  y: number;
}

interface MeasurementLine {
  id: string;
  start: Point;
  end: Point;
  length: number;
}

// Signed Distance Field (SDF) of a rounded rectangle centered at (0, 0)
function sdRoundedRect(x: number, y: number, w: number, h: number, r: number): number {
  const halfW = w / 2;
  const halfH = h / 2;
  const dx = Math.abs(x) - halfW + r;
  const dy = Math.abs(y) - halfH + r;
  
  const mx = Math.max(dx, 0);
  const my = Math.max(dy, 0);
  const outerDist = Math.sqrt(mx * mx + my * my) - r;
  
  const innerDist = Math.min(Math.max(dx, dy), 0);
  return outerDist + innerDist;
}

// Import DraggableFooter with ssr: false to prevent hydration/SSR window issues
const DraggableFooter = dynamic(() => import("@/components/DraggableFooter"), {
  ssr: false,
});

export default function Home() {
  const [lines, setLines] = useState<MeasurementLine[]>([]);
  const [draftStart, setDraftStart] = useState<Point | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [radius, setRadius] = useState(40); // Lifted corner radius state
  
  const glowCanvasRef = useRef<HTMLCanvasElement>(null);

  // De-select the image when clicking outside of it (but ignore the background overlay)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const imgContainer = document.getElementById("image-container");
      if (imgContainer && !imgContainer.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        const isOverlay = target.id === "measurement-overlay";
        // If it's not the measurement overlay, we de-select the image here
        if (!isOverlay) {
          setIsImageSelected(false);
        }
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Render the dithered white ASCII dot glow on the full-screen canvas
  useEffect(() => {
    const canvas = glowCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      
      drawGlow(w, h);
    };

    const drawGlow = (w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);

      const W = 720;
      const H = 480;
      const R = Math.max(0, Math.min(radius, H / 2));
      const gridSize = 6; // Tight grid spacing for dense dots

      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)"; // Dim white glow dither

      // Center of the main image is centered horizontally (0.5w) and positioned at 0.4h
      const centerX = w * 0.5;
      const centerY = h * 0.4;

      // Scan local bounding box to optimize performance: only draw dither where it has opacity (d < 150px)
      const halfBoxW = W / 2 + 150;
      const halfBoxH = H / 2 + 150;

      const colStart = Math.max(0, Math.floor((centerX - halfBoxW) / gridSize));
      const colEnd = Math.min(Math.ceil(w / gridSize), Math.ceil((centerX + halfBoxW) / gridSize));
      const rowStart = Math.max(0, Math.floor((centerY - halfBoxH) / gridSize));
      const rowEnd = Math.min(Math.ceil(h / gridSize), Math.ceil((centerY + halfBoxH) / gridSize));

      for (let r = rowStart; r < rowEnd; r++) {
        for (let c = colStart; c < colEnd; c++) {
          // Grid coordinate in viewport pixels
          const px = c * gridSize + gridSize / 2;
          const py = r * gridSize + gridSize / 2;

          // Position relative to the center of the image
          const rx = px - centerX;
          const ry = py - centerY;

          // Signed distance to the image rounded rectangle
          const d = sdRoundedRect(rx, ry, W, H, R);

          let density = 0;
          if (d <= 0) {
            // Decays slowly inside the image bounds
            density = Math.exp(-(d * d) / 900);
          } else {
            // Decays outside the image (2500 makes the dither gradient extend beautifully behind the buttons)
            density = Math.exp(-(d * d) / 2500);
          }

          // Apply dither noise for high-fidelity retro grain
          const dither = density + (Math.random() - 0.5) * 0.22;

          let char = "";
          if (dither > 0.75) {
            char = "●";
          } else if (dither > 0.45) {
            char = "•";
          } else if (dither > 0.20) {
            char = "·";
          } else if (dither > 0.05) {
            char = ".";
          }

          if (char) {
            ctx.fillText(char, px, py);
          }
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [radius]);

  const handleBackgroundClick = (pt: Point) => {
    if (isImageSelected) {
      // Click on the background overlay while selected simply de-selects the image and does not start a measurement
      setIsImageSelected(false);
      return;
    }

    if (!draftStart) {
      setDraftStart(pt);
      setMousePos(pt);
    } else {
      const dist = Math.sqrt(Math.pow(pt.x - draftStart.x, 2) + Math.pow(pt.y - draftStart.y, 2));
      if (dist > 5) {
        const newLine: MeasurementLine = {
          id: Math.random().toString(36).substring(2, 9),
          start: draftStart,
          end: pt,
          length: dist,
        };
        setLines((prev) => [...prev, newLine]);
      }
      setDraftStart(null);
    }
  };

  const handleBackgroundMouseMove = (pt: Point) => {
    setMousePos(pt);
  };

  return (
    <div style={styles.appContainer}>
      {/* Background CAD grid */}
      <div className="cad-grid" />

      {/* Measurement Canvas (Z-index 1, renders SVG lines, pointer-events: none) */}
      <MeasurementCanvas 
        lines={lines} 
        draftStart={draftStart} 
        mousePos={mousePos} 
      />

      {/* Infinite ASCII Dot Glow Canvas (Z-index 2, covers full viewport behind image and buttons) */}
      <canvas
        ref={glowCanvasRef}
        style={styles.glowCanvas}
      />

      {/* Header Overlay (Z-index 100, top-left) */}
      <Header />

      {/* Main Content Layout (Z-index 10, centers image and handles buttons absolutely below) */}
      <div style={styles.contentLayout}>
        <div style={styles.imageWrapper}>
          {/* Centered Image Viewer (Stitches Animation around Single Screenshot) */}
          <ImageViewer 
            isSelected={isImageSelected} 
            setIsSelected={setIsImageSelected}
            radius={radius}
            setRadius={setRadius}
          />
          
          {/* Action Panel / Download Buttons (placed absolutely below the image container) */}
          <div style={styles.actionPanel}>
            {/* Download Button */}
            <a
              href="https://github.com/Mason363/Pathstitch/releases"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.primaryButton}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "8px" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Latest Release
            </a>

            {/* GitHub Button */}
            <a
              href="https://github.com/Mason363/Pathstitch"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.secondaryButton}
            >
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: "8px" }}>
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Draggable Footer full-screen Fabric overlay (Z-index 5) */}
      <DraggableFooter 
        onBackgroundClick={handleBackgroundClick}
        onBackgroundMouseMove={handleBackgroundMouseMove}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "var(--bg-workspace)",
  },
  contentLayout: {
    position: "absolute",
    top: "40%", // Shifted further up to 40% height
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 10,
    pointerEvents: "none",
  },
  imageWrapper: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  actionPanel: {
    position: "absolute",
    top: "calc(100% + 24px)",
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    zIndex: 30,
    pointerEvents: "auto",
  },
  primaryButton: {
    backgroundColor: "var(--color-accent-blue)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "13px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 4px 16px rgba(47, 128, 237, 0.35)",
    transition: "background-color 0.15s, transform 0.1s",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "13px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    transition: "background-color 0.15s, border-color 0.15s, transform 0.1s",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  glowCanvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 2,
    pointerEvents: "none",
  },
};
