import React from "react";
import { COLORS } from "../constants.js";

// Écran de chargement : la bouteille du logo Bibamus, seule, au centre de l'écran. Elle monte,
// tremble et saute le bouchon, les éclats jaillissent, puis la séquence recommence tant que
// l'app charge. L'app s'ouvre dès qu'elle est prête, même en pleine animation.
// Dessinée en SVG et animée en CSS plutôt qu'avec un GIF : elle reste nette sur tous les
// écrans et se pose exactement sur le fond de l'app.
// Tracés : ceux de public/bibamus-logo.svg.

const LOOP_SECONDS = 3;
const POP_SECONDS = 1.05; // Moment où la bouteille saute le bouchon.
const FADE_FROM = 90; // Pourcentage de la boucle où l'ensemble commence à s'estomper.

const BOTTLE = "M 349 126 L 345 128 L 342 134 L 343 139 L 347 143 L 347 149 L 349 152 L 338 244 L 323 265 L 317 284 L 317 437 L 320 443 L 330 450 L 407 450 L 414 446 L 419 438 L 419 283 L 412 263 L 398 244 L 388 160 L 388 150 L 390 142 L 394 137 L 394 132 L 388 126 Z";

const RAYS = [
  { id: "left", x: -67, y: 100, cx: 320, cy: 77, d: "M 301 48 L 297 54 L 299 63 L 323 103 L 328 108 L 337 108 L 343 101 L 341 91 L 316 50 L 310 46 Z" },
  { id: "center", x: 0, y: 120, cx: 370, cy: 52, d: "M 367 10 L 363 12 L 359 18 L 359 86 L 363 92 L 372 94 L 379 89 L 381 84 L 381 24 L 379 15 L 373 10 Z" },
  { id: "right", x: 67, y: 100, cx: 420, cy: 77, d: "M 439 48 L 435 46 L 427 47 L 420 56 L 397 94 L 397 102 L 401 107 L 411 108 L 418 101 L 443 59 L 442 52 Z" },
];

const percent = (seconds) => `${((seconds / LOOP_SECONDS) * 100).toFixed(2)}%`;

function rayKeyframes({ id, x, y }) {
  return `@keyframes bibaLoad-ray-${id} {
    0%, ${percent(POP_SECONDS)} { opacity: 0; transform: translate(${x}px, ${y}px) scale(.35); }
    ${percent(POP_SECONDS + 0.11)} { opacity: 1; }
    ${percent(POP_SECONDS + 0.2)} { transform: translate(${-x * 0.1}px, ${-y * 0.1}px) scale(1.06); }
    ${percent(POP_SECONDS + 0.32)} { transform: translate(0, 0) scale(1); }
    ${FADE_FROM}% { opacity: 1; transform: translate(0, 0) scale(1); }
    100% { opacity: 0; transform: translate(0, 0) scale(1); }
  }`;
}

// Tremblement croissant jusqu'au « pop », puis petit saut qui retombe.
const BOTTLE_STEPS = [
  [0.55, "translateY(0) rotate(0)"],
  [0.62, "rotate(-3deg)"],
  [0.7, "rotate(4deg)"],
  [0.78, "rotate(-5deg)"],
  [0.86, "rotate(6deg)"],
  [0.94, "rotate(-7deg)"],
  [1.0, "rotate(8deg)"],
  [POP_SECONDS, "translateY(0) rotate(0)"],
  [1.15, "translateY(-34px) rotate(-4deg)"],
  [1.25, "translateY(-20px) rotate(3deg)"],
  [1.35, "translateY(-6px) rotate(-1.5deg)"],
  [1.5, "translateY(0) rotate(0)"],
];

const STYLES = `
  .biba-load-part { animation: ${LOOP_SECONDS}s linear infinite both; }
  .biba-load-bottle { animation-name: bibaLoad-bottle; transform-origin: 368px 450px; }
  ${RAYS.map((r) => `.biba-load-ray-${r.id} { animation-name: bibaLoad-ray-${r.id}; transform-origin: ${r.cx}px ${r.cy}px; }`).join("\n  ")}
  ${RAYS.map(rayKeyframes).join("\n  ")}
  @keyframes bibaLoad-bottle {
    0% { opacity: 0; transform: translateY(300px); }
    ${percent(0.25)} { opacity: 1; }
    ${percent(0.4)} { transform: translateY(-20px); }
    ${BOTTLE_STEPS.map(([t, transform]) => `${percent(t)} { transform: ${transform}; }`).join("\n    ")}
    ${FADE_FROM}% { opacity: 1; transform: translateY(0) rotate(0); }
    100% { opacity: 0; transform: translateY(0) rotate(0); }
  }
  /* Sans animation demandée par le système : bouteille et éclats complets, immobiles. */
  @media (prefers-reduced-motion: reduce) {
    .biba-load-part { animation: none; }
  }
`;

export function LoadingScreen() {
  return (
    <div
      role="status"
      aria-label="Chargement"
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.paper, overflow: "hidden" }}
    >
      <style>{STYLES}</style>
      <svg viewBox="290 5 158 450" aria-hidden="true" style={{ display: "block", height: "min(40vh, 300px)", width: "auto", overflow: "visible" }}>
        <g fillRule="evenodd" stroke="none">
          {RAYS.map((r) => (
            <path key={r.id} className={`biba-load-part biba-load-ray-${r.id}`} d={r.d} fill={COLORS.ink} />
          ))}
          <path className="biba-load-part biba-load-bottle" d={BOTTLE} fill="#39FF66" />
        </g>
      </svg>
    </div>
  );
}
