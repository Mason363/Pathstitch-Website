# Pathstitch Web Landing Page

This repository contains the interactive landing page and web showcase for **Pathstitch**—the professional vector geometry sketching engine for leathercrafting and pattern design.

> [!NOTE]
> This is the landing page website. The main Pathstitch application (SwiftUI/Python native core) is located at [github.com/Mason363/Pathstitch](https://github.com/Mason363/Pathstitch).

---

## Interactive Features

* **CAD Grid & Canvas**: Click-click measurement tool directly on the background. First click sets the origin, cursor displays live measurement offsets in `mm`, and the second click commits the dashed layout line.
* **Centered Vector Viewport**: Visualizes the Pathstitch app interface. Includes:
  * **90-Second Stitching Animation**: Evenly spaced circles (sewing holes) appear one-by-one, disappear one-by-one, and are replaced by a dashed crease line in a continuous loop.
  * **Adjustable Fillet Gizmo**: Click on the screenshot to focus, revealing a drag handle. Drag the orange handle to dynamically round all four corners of the screenshot and watch the sewing animation adapt live.
* **Fabric Draggable letters**: The branding text **Pathstitch** at the bottom is individual draggable letters rendered directly on the grid canvas using Fabric.js. They start off aligned and clipped by the bottom edge.

---

## Technical Stack

* **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
* **Interactive Canvas**: [Fabric.js v7](http://fabricjs.com/) (rendered client-side with full-screen event forwarding)
* **Styling**: Modern CSS variables & Google Fonts (Montserrat)
* **Measurements Overlay**: Responsive absolute SVG coordinate mapping

---

## Getting Started

First, install dependencies:
```bash
npm install
```

Then, run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the active port shown in your terminal) in your browser to view the interactive showcase.
