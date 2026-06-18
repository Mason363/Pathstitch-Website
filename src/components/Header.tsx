"use client";

import React from "react";
import Image from "next/image";

export default function Header() {
  return (
    <div style={styles.header}>
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
    border: "1px solid var(--color-accent-blue)",
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
