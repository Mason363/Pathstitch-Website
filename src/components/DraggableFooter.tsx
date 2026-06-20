"use client";

import React, { useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

interface DraggableFooterProps {
  onBackgroundClick: (point: Point) => void;
  onBackgroundMouseMove: (point: Point) => void;
}

interface LetterState {
  char: string;
  x: number;
  y: number;
  hasDragged: boolean;
}

export default function DraggableFooter({
  onBackgroundClick,
  onBackgroundMouseMove,
}: DraggableFooterProps) {
  const [lettersData, setLettersData] = useState<LetterState[]>([]);
  const [letterSpacing, setLetterSpacing] = useState(145);
  const [fontSize, setFontSize] = useState(200);
  
  const dragInfo = useRef<{
    index: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  // Initialize and reposition letters on mount and resize
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isMobileRatio = w < h;
      
      let spacing = 145; // Clean spacing between letters
      let fSize = 200;
      
      if (isMobileRatio) {
        // Fit letters inside screen width with a small margin
        spacing = Math.min(145, (w * 0.92) / 10);
        fSize = spacing / 0.725;
      }
      
      setLetterSpacing(spacing);
      setFontSize(fSize);
      
      const letters = ["P", "a", "t", "h", "s", "t", "i", "t", "c", "h"];
      // Center word box: total width is letters.length * letterSpacing
      const totalWordWidth = letters.length * spacing;
      const startX = (w - totalWordWidth) / 2;
      
      // Position startY so that the bottom of the letters touches the bottom of the viewport
      // With dynamic fontSize and lineHeight=0.8, startY = h - fSize * 0.75 ensures the letters sit exactly on the bottom edge
      const startY = h - fSize * 0.75; 

      setLettersData((prev) => {
        return letters.map((char, index) => {
          const existing = prev[index];
          // If the user has already dragged this letter, preserve its custom position
          if (existing && existing.hasDragged) {
            return existing;
          }
          return {
            char,
            x: startX + index * spacing,
            y: startY,
            hasDragged: false,
          };
        });
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle letter dragging via window mouse/touch events
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!dragInfo.current) return;
      const { index, startX, startY, startLeft, startTop } = dragInfo.current;
      const dx = clientX - startX;
      const dy = clientY - startY;

      setLettersData((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          x: startLeft + dx,
          y: startTop + dy,
          hasDragged: true,
        };
        return next;
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragInfo.current || e.touches.length !== 1) return;
      // Prevent scrolling while dragging letters
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      dragInfo.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, []);

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const letter = lettersData[index];
    dragInfo.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: letter.x,
      startTop: letter.y,
    };
  };

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation(); // Avoid triggering drafting on the background overlay
    const touch = e.touches[0];
    const letter = lettersData[index];
    dragInfo.current = {
      index,
      startX: touch.clientX,
      startY: touch.clientY,
      startLeft: letter.x,
      startTop: letter.y,
    };
  };

  return (
    <div style={styles.footerContainer}>
      {/* Background click overlay for drafting CAD measurements */}
      <div
        id="measurement-overlay"
        style={styles.measurementOverlay}
        onMouseDown={(e) => {
          onBackgroundClick({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => {
          onBackgroundMouseMove({ x: e.clientX, y: e.clientY });
        }}
        onTouchStart={(e) => {
          if (e.touches.length !== 1) return;
          const touch = e.touches[0];
          onBackgroundClick({ x: touch.clientX, y: touch.clientY });
        }}
        onTouchMove={(e) => {
          if (e.touches.length !== 1) return;
          const touch = e.touches[0];
          onBackgroundMouseMove({ x: touch.clientX, y: touch.clientY });
        }}
      />

      {/* Pure HTML/CSS Draggable Letters */}
      {lettersData.map((item, index) => (
        <div
          key={index}
          onMouseDown={(e) => handleMouseDown(index, e)}
          onTouchStart={(e) => handleTouchStart(index, e)}
          style={{
            position: "absolute",
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: `${letterSpacing}px`, // Match letterSpacing for horizontal centering
            textAlign: "center", // Center align each letter inside its slot
            fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
            fontSize: `${fontSize}px`,
            fontWeight: 900, // Montserrat Black
            color: "#ffffff",
            userSelect: "none",
            cursor: "move",
            lineHeight: "0.8", // Aligns characters to the bottom boundary cleanly
            WebkitTextStroke: "0.5px rgba(255, 255, 255, 0.15)",
            zIndex: 20,
            touchAction: "none",
          }}
        >
          {item.char}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 5,
    overflow: "hidden",
    pointerEvents: "auto",
  },
  measurementOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
    cursor: "crosshair",
  },
};
