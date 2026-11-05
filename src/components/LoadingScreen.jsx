import React from "react";
import { COLORS } from "../constants.js";

// Écran de chargement : la bouteille du logo Bibamus, seule, au centre de l'écran. Elle monte,
// tremble et saute le bouchon, les éclats jaillissent, puis la séquence recommence tant que
// l'app charge. L'app s'ouvre dès qu'elle est prête, même en pleine animation.
// Dessinée en SVG et animée en CSS plutôt qu'avec un GIF : elle reste nette sur tous les
// écrans et se pose exactement sur le fond de l'app.
// Tracés : ceux de l'icône vectorielle Bibamus, avec les angles adoucis pour rester lisses en grand.

const LOOP_SECONDS = 3;
const POP_SECONDS = 1.05; // Moment où la bouteille saute le bouchon.
const FADE_FROM = 90; // Pourcentage de la boucle où l'ensemble commence à s'estomper.

const BOTTLE = "M 166 277 Q 150 277 147 278 L 147 278 Q 144 279 140 282.5 L 140 282.5 Q 136 286 134 291.5 L 134 291.5 Q 132 297 132.5 301.5 L 132.5 301.5 Q 133 306 134.5 309 L 134.5 309 Q 136 312 139 315 L 139 315 Q 142 318 147 320.5 L 147 320.5 Q 152 323 150.5 338.9 L 134.5 514.1 Q 133 530 132 534.5 L 132 534.5 Q 131 539 127.5 546 L 127.5 546 Q 124 553 116.5 560.5 L 116.5 560.5 Q 109 568 102.5 577 L 102.5 577 Q 96 586 92 598.5 L 92 598.5 Q 88 611 88 627 L 88 899 Q 88 915 90 921.5 L 90 921.5 Q 92 928 94 931 L 94 931 Q 96 934 101.5 939.5 L 101.5 939.5 Q 107 945 115 948.5 L 115 948.5 Q 123 952 139 952.1 L 234 952.9 Q 250 953 256 951.5 L 256 951.5 Q 262 950 267.5 947 L 267.5 947 Q 273 944 279 937.5 L 279 937.5 Q 285 931 288 923 L 288 923 Q 291 915 291 899 L 291 629 Q 291 613 290 607.5 L 290 607.5 Q 289 602 286 594 L 286 594 Q 283 586 278.5 579.5 L 278.5 579.5 Q 274 573 263.5 561.5 L 263.5 561.5 Q 253 550 250 543 L 250 543 Q 247 536 246 530.5 L 246 530.5 Q 245 525 243.6 509.1 L 228.4 338.9 Q 227 323 232 320.5 L 232 320.5 Q 237 318 239.5 315.5 L 239.5 315.5 Q 242 313 244.5 306 L 244.5 306 Q 247 299 246 294.5 L 246 294.5 Q 245 290 243 287 L 243 287 Q 241 284 235 280.5 L 235 280.5 Q 229 277 213 277 Z";

const RAYS = [
  { id: "left", x: -140, y: 210, cx: 69, cy: 166, d: "M 29 88 Q 24 90 21 92.5 L 21 92.5 Q 18 95 15.5 99.5 L 15.5 99.5 Q 13 104 12.5 110 L 12.5 110 Q 12 116 13.5 120.5 L 13.5 120.5 Q 15 125 23.5 138.5 L 76.5 222.5 Q 85 236 88 239 L 88 239 Q 91 242 94.5 243.5 L 94.5 243.5 Q 98 245 102 245.5 L 102 245.5 Q 106 246 111 244.5 L 111 244.5 Q 116 243 120 239.5 L 120 239.5 Q 124 236 125.5 233 L 125.5 233 Q 127 230 127 222.5 L 127 222.5 Q 127 215 119.3 200.9 L 79.7 128.1 Q 72 114 67 106 L 67 106 Q 62 98 58.5 94.5 L 58.5 94.5 Q 55 91 49 88.5 L 49 88.5 Q 43 86 38.5 86 L 38.5 86 Q 34 86 29 88 Z" },
  { id: "center", x: 0, y: 250, cx: 189, cy: 105, d: "M 191.5 12.5 Q 185 12 179 14.5 L 179 14.5 Q 173 17 169 21.5 L 169 21.5 Q 165 26 163.5 30 L 163.5 30 Q 162 34 162 50 L 162 159 Q 162 175 164 180 L 164 180 Q 166 185 168.5 188 L 168.5 188 Q 171 191 175 193.5 L 175 193.5 Q 179 196 184.5 197 L 184.5 197 Q 190 198 197.5 195.5 L 197.5 195.5 Q 205 193 208 190 L 208 190 Q 211 187 213.5 182 L 213.5 182 Q 216 177 216.1 161 L 216.9 58 Q 217 42 216 35.5 L 216 35.5 Q 215 29 211 23.5 L 211 23.5 Q 207 18 202.5 15.5 L 202.5 15.5 Q 198 13 191.5 12.5 Z" },
  { id: "right", x: 140, y: 210, cx: 309, cy: 166, d: "M 359 94 Q 355 90 352 88.5 L 352 88.5 Q 349 87 342.5 86.5 L 342.5 86.5 Q 336 86 331.5 87.5 L 331.5 87.5 Q 327 89 321 94.5 L 321 94.5 Q 315 100 307.3 114 L 260.7 198 Q 253 212 252 219.5 L 252 219.5 Q 251 227 252.5 231 L 252.5 231 Q 254 235 258.5 239 L 258.5 239 Q 263 243 270 244.5 L 270 244.5 Q 277 246 280.5 245 L 280.5 245 Q 284 244 289 240 L 289 240 Q 294 236 302.4 222.4 L 357.6 133.6 Q 366 120 366.5 114 L 366.5 114 Q 367 108 365 103 L 365 103 Q 363 98 359 94 Z" },
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
  [1.15, "translateY(-71px) rotate(-4deg)"],
  [1.25, "translateY(-42px) rotate(3deg)"],
  [1.35, "translateY(-13px) rotate(-1.5deg)"],
  [1.5, "translateY(0) rotate(0)"],
];

const STYLES = `
  .biba-load-part { animation: ${LOOP_SECONDS}s linear infinite both; }
  .biba-load-bottle { animation-name: bibaLoad-bottle; transform-origin: 189px 953px; }
  ${RAYS.map((r) => `.biba-load-ray-${r.id} { animation-name: bibaLoad-ray-${r.id}; transform-origin: ${r.cx}px ${r.cy}px; }`).join("\n  ")}
  ${RAYS.map(rayKeyframes).join("\n  ")}
  @keyframes bibaLoad-bottle {
    0% { opacity: 0; transform: translateY(627px); }
    ${percent(0.25)} { opacity: 1; }
    ${percent(0.4)} { transform: translateY(-42px); }
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
      <svg viewBox="0 0 380 966" aria-hidden="true" style={{ display: "block", height: "min(40vh, 300px)", width: "auto", overflow: "visible" }}>
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
