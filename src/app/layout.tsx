import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Montserrat } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["700", "900"],
});

export const metadata: Metadata = {
  title: "Pathstitch | Native 2D CAD & 3D CAM for Leathercraft & Pattern Making",
  description: "Pathstitch is a high-performance vector sketching engine and 3D unfold viewport for leathercraft, sewing patterns, and sheet materials. Design with precise offset stitching, crease lines, and smart dimensions.",
  keywords: ["leathercraft CAD", "sewing pattern design", "3D CAM unfold", "vector sketching", "ezdxf shapely pattern maker"],
  openGraph: {
    title: "Pathstitch | Professional CAD/CAM for Leathercraft",
    description: "High-performance native macOS CAD vector engine with precise stitch spacing, sheet folds, and 3D unfolds.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${montserrat.variable}`}>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
