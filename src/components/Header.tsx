"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

export default function Header() {
  const [isMobileRatio, setIsMobileRatio] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileRatio(window.innerWidth < window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={{
      ...styles.header,
      top: isMobileRatio ? "16px" : "24px",
      left: isMobileRatio ? "16px" : "24px"
    }}>
      {/* Logo and App Name branding */}
      <div style={styles.logoBrand}>
        <div style={styles.logoInnerContainer}>
          <Image
            src="/logo.png"
            alt="Pathstitch Logo"
            width={28}
            height={28}
            style={styles.logoImage}
          />
        </div>
        <span style={styles.appName}>Pathstitch</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: "absolute",
    top: "24px",
    left: "24px",
    zIndex: 100,
    userSelect: "none",
  },
  logoBrand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoInnerContainer: {
    borderRadius: "6px",
    padding: "3px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16161a",
  },
  logoImage: {
    objectFit: "contain",
    borderRadius: "4px",
  },
  appName: {
    fontSize: "16px",
    fontWeight: "700", // Montserrat Bold
    color: "var(--text-primary)",
    letterSpacing: "0.2px",
    fontFamily: "var(--font-montserrat), sans-serif",
  },
};
