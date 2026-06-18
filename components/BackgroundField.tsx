"use client";

import { useEffect } from "react";

/* Cursor glow. Writes the pointer position (--mx/--my) and an intensity (--glow)
 * onto :root every frame; the .cursor-glow layer (globals.css) reads them to reveal
 * a soft blue pool of the grid under the cursor. Eases toward the pointer (slight
 * trail) and fades the blue in while moving. */
export function BackgroundField() {
  useEffect(() => {
    const root = document.documentElement;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let energy = 0;
    let lastMove = 0;
    let raf = 0;

    // Define the vars up front so the layer has a valid state before the first move.
    root.style.setProperty("--mx", `${x}px`);
    root.style.setProperty("--my", `${y}px`);
    root.style.setProperty("--glow", "0");

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      lastMove = performance.now();
    };

    const tick = (now: number) => {
      x += (targetX - x) * 0.3;
      y += (targetY - y) * 0.3;

      const moving = now - lastMove < 150 ? 1 : 0;
      energy += (moving - energy) * 0.08;

      const breath = 0.1 + 0.05 * Math.sin(now / 1500);
      root.style.setProperty("--mx", `${x}px`);
      root.style.setProperty("--my", `${y}px`);
      root.style.setProperty("--glow", (breath + energy * 0.8).toFixed(3));

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div className="cursor-glow" aria-hidden="true" />;
}
