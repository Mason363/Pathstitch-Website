"use client";

import React, { useState, useEffect, useRef } from "react";

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

interface MeasurementCanvasProps {
  lines: MeasurementLine[];
  draftStart: Point | null;
  mousePos: Point;
}

export default function MeasurementCanvas({
  lines,
  draftStart,
  mousePos,
}: MeasurementCanvasProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle window resizing to make sure canvas spans the full workspace
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const calculateDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Render text label centered and rotated along the line
  const renderLineLabel = (start: Point, end: Point, lengthValue: number) => {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    // Calculate line angle for text rotation
    let angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
    
    // Normalize angle so text is never upside down (between -90 and 90 degrees)
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;

    const labelText = `${lengthValue.toFixed(2)} mm`;

    return (
      <g transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
        {/* Background rectangle for readability against grid lines */}
        <rect
          x={-40}
          y={-10}
          width={80}
          height={16}
          rx={3}
          fill="#121214"
          stroke="var(--color-accent-orange)"
          strokeWidth="0.75"
        />
        <text
          y={2}
          textAnchor="middle"
          fill="var(--color-accent-orange)"
          fontFamily="monospace"
          fontSize="9px"
          fontWeight="bold"
        >
          {labelText}
        </text>
      </g>
    );
  };

  return (
    <div ref={containerRef} style={styles.canvasContainer}>
      <svg 
        width={canvasSize.width} 
        height={canvasSize.height} 
        style={styles.svg}
      >
        {/* Draw committed measurement lines */}
        {lines.map((line) => (
          <g key={line.id}>
            {/* Orange dashed line */}
            <line
              x1={line.start.x}
              y1={line.start.y}
              x2={line.end.x}
              y2={line.end.y}
              stroke="var(--color-accent-orange)"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            {/* End points */}
            <circle cx={line.start.x} cy={line.start.y} r="3.5" fill="var(--color-accent-orange)" />
            <circle cx={line.end.x} cy={line.end.y} r="3.5" fill="var(--color-accent-orange)" />
            {/* Length label */}
            {renderLineLabel(line.start, line.end, line.length)}
          </g>
        ))}

        {/* Draw live draft measurement line */}
        {draftStart && (
          <g>
            {/* Pulsing draft line */}
            <line
              x1={draftStart.x}
              y1={draftStart.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="var(--color-accent-orange)"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              style={{ opacity: 0.8 }}
            />
            <circle cx={draftStart.x} cy={draftStart.y} r="3.5" fill="var(--color-accent-orange)" />
            <circle cx={mousePos.x} cy={mousePos.y} r="4" fill="none" stroke="var(--color-accent-orange)" strokeWidth="1.5" />
            {renderLineLabel(draftStart, mousePos, calculateDistance(draftStart, mousePos))}
          </g>
        )}
      </svg>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  canvasContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, // Layered below the interactive Fabric canvas (5)
    overflow: "hidden",
    pointerEvents: "none", // Let mouse events fall through
  },
  svg: {
    display: "block",
  },
};
