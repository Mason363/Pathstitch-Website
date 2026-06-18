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

export default function DraggableFooter({
  onBackgroundClick,
  onBackgroundMouseMove,
}: DraggableFooterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const fabricRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !canvasRef.current || !containerRef.current) return;

    let isComponentActive = true;
    let canvasInstance: any = null;

    // Dynamically import fabric to prevent SSR window reference error
    import("fabric").then(({ Canvas, FabricText }) => {
      if (!isComponentActive || !canvasRef.current) return;

      // Prevent duplicate canvas initialization on the same element
      if (fabricRef.current) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      // Initialize fabric canvas spanning the full screen
      const canvas = new Canvas(canvasRef.current!, {
        width: width,
        height: height,
        backgroundColor: "transparent",
        selection: false, // Disable group selection box
        hoverCursor: "move",
      });

      canvasInstance = canvas;
      fabricRef.current = canvas;

      const letters = ["P", "a", "t", "h", "s", "t", "i", "t", "c", "h"];
      const fontSize = 200; // Extra large letters
      const letterSpacing = 150; // Spacing for 200px font size
      const wordWidth = (letters.length - 1) * letterSpacing;
      const startX = (width - wordWidth) / 2;
      const startY = height - (fontSize * (2 / 3)); // 1/3 clipped at bottom bounds

      letters.forEach((char, index) => {
        const textObj = new FabricText(char, {
          left: startX + index * letterSpacing,
          top: startY,
          fontFamily: "Montserrat",
          fontSize: fontSize,
          fontWeight: "900", // Montserrat Black
          fill: "#ffffff",
          stroke: "rgba(255, 255, 255, 0.15)",
          strokeWidth: 0.5,
          hasControls: false, // Remove scaling/rotating handles
          hasBorders: false, // Remove selection box border
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          padding: 0,
        });

        // Upright starting position (no rotation)
        textObj.rotate(0);

        canvas.add(textObj);
      });

      // Handle background clicks for drawing measurements
      canvas.on("mouse:down", (options) => {
        if (!options.target) {
          const pointer = options.scenePoint || (canvas as any).getScenePoint(options.e);
          onBackgroundClick({ x: pointer.x, y: pointer.y });
        }
      });

      // Handle background mouse move for live measurement preview
      canvas.on("mouse:move", (options) => {
        const pointer = options.scenePoint || (canvas as any).getScenePoint(options.e);
        onBackgroundMouseMove({ x: pointer.x, y: pointer.y });
      });

      // Handle window resizing
      const handleResize = () => {
        if (!fabricRef.current) return;
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        fabricRef.current.setDimensions({ width: newWidth, height: newHeight });
        fabricRef.current.renderAll();
      };

      window.addEventListener("resize", handleResize);
    });

    return () => {
      isComponentActive = false;
      if (canvasInstance) {
        canvasInstance.dispose();
        fabricRef.current = null;
      }
    };
  }, [isMounted, onBackgroundClick, onBackgroundMouseMove]);

  return (
    <div style={styles.footerContainer} ref={containerRef}>
      <canvas ref={canvasRef} />
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
};
