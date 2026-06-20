"use client";

import { useEffect } from "react";

/* Cursor glow. Writes the pointer position (--mx/--my) and a movement-driven intensity
 * (--glow) onto :root every frame; the .cursor-glow layer (globals.css) reads them to
 * polish the grid LINES under the cursor (gaps stay dark — see globals.css). Eases toward
 * the pointer for a slight premium trail, and fades fully out when the mouse stops, so it's
 * noticed only while moving — never a permanent distraction. */
export function BackgroundField() {
  useEffect(() => {
    // Respect reduced motion: don't attach listeners or run the loop at all.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let energy = 0;
    let lastMove = 0;
    let raf = 0;

    // Define the vars up front so the layer has a valid (invisible) state before the first move.
    root.style.setProperty("--mx", `${x}px`);
    root.style.setProperty("--my", `${y}px`);
    root.style.setProperty("--glow", "0");

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      lastMove = performance.now();
    };

    const tick = (now: number) => {
      // Slight trail toward the pointer — soft, no jitter.
      x += (targetX - x) * 0.18;
      y += (targetY - y) * 0.18;

      // Intensity is purely movement-driven: rises while moving, eases back to 0 when idle.
      const moving = now - lastMove < 150 ? 1 : 0;
      energy += (moving - energy) * 0.08;

      root.style.setProperty("--mx", `${x}px`);
      root.style.setProperty("--my", `${y}px`);
      root.style.setProperty("--glow", (energy * 0.85).toFixed(3));

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
