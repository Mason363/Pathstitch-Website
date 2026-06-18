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
      const letterSpacing = 145; // Clean spacing between letters
      const letters = ["P", "a", "t", "h", "s", "t", "i", "t", "c", "h"];
      // Center word box: total width is letters.length * letterSpacing
      const totalWordWidth = letters.length * letterSpacing;
      const startX = (w - totalWordWidth) / 2;
      
      // Position startY so that the bottom of the letters touches the bottom of the viewport
      // With fontSize=200px and lineHeight=0.8, startY = h - 150 ensures the letters sit exactly on the bottom edge
      const startY = h - 150; 

      setLettersData((prev) => {
        return letters.map((char, index) => {
          const existing = prev[index];
          // If the user has already dragged this letter, preserve its custom position
          if (existing && existing.hasDragged) {
            return existing;
          }
          return {
            char,
            x: startX + index * letterSpacing,
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

  // Handle letter dragging via window mousemove/mouseup
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfo.current) return;
      const { index, startX, startY, startLeft, startTop } = dragInfo.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

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

    const handleMouseUp = () => {
      dragInfo.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
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

  return (
    <div style={styles.footerContainer}>
      {/* Background click overlay for drafting CAD measurements */}
      <div
        style={styles.measurementOverlay}
        onMouseDown={(e) => {
          onBackgroundClick({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => {
          onBackgroundMouseMove({ x: e.clientX, y: e.clientY });
        }}
      />

      {/* Pure HTML/CSS Draggable Letters */}
      {lettersData.map((item, index) => (
        <div
          key={index}
          onMouseDown={(e) => handleMouseDown(index, e)}
          style={{
            position: "absolute",
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: "145px", // Match letterSpacing for horizontal centering
            textAlign: "center", // Center align each letter inside its slot
            fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
            fontSize: "200px",
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
