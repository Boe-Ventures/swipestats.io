"use client";

import Typewriter from "typewriter-effect";

/**
 * The rotating dating-app name in the hero headline (Tinder → Hinge → Bumble).
 *
 * The transparent placeholder reserves a fixed slot sized to the widest word,
 * so the centered H1 never reflows as the word changes — and it gives the
 * heading real text server-side / with JS off, keeping it crawlable. The
 * animated typewriter is an absolutely-positioned, decorative overlay.
 */
export function HeroAppWord() {
  return (
    <span className="relative inline-block text-left align-baseline text-rose-600">
      <span className="opacity-0">Bumble</span>
      <span aria-hidden className="absolute top-0 left-0">
        <Typewriter
          options={{
            strings: ["Tinder", "Hinge", "Bumble"],
            autoStart: true,
            loop: true,
            delay: 70,
            deleteSpeed: 35,
          }}
        />
      </span>
    </span>
  );
}
