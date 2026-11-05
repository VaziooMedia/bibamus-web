import React from "react";
import { COLORS } from "../constants.js";

// Écran de chargement : le logo Bibamus s'anime (la bouteille monte, tremble et saute le
// bouchon, les rayons jaillissent, les lettres apparaissent) puis la séquence recommence
// tant que l'app charge. Le logo est dessiné en SVG et animé en CSS plutôt qu'avec un GIF :
// il reste net sur tous les écrans et se pose exactement sur le fond de l'app.
// Tracés : ceux de public/bibamus-logo.svg, découpés lettre par lettre.

const LOOP_SECONDS = 5;
const POP_SECONDS = 1.05; // Moment où la bouteille saute le bouchon.
const BOTTLE_CX = 368;

const LETTERS = [
  { id: "b1", cx: 143, fill: "#F2F2E8", d: "M 17 177 L 13 181 L 10 188 L 10 436 L 14 444 L 23 449 L 198 449 L 214 446 L 229 440 L 251 424 L 265 406 L 272 391 L 276 375 L 276 355 L 271 337 L 266 327 L 258 316 L 245 305 L 257 289 L 263 277 L 268 257 L 268 240 L 263 221 L 247 197 L 226 182 L 213 177 L 197 174 L 24 174 Z M 62 222 L 194 222 L 203 226 L 211 233 L 216 243 L 216 258 L 210 269 L 204 275 L 193 281 L 114 283 L 104 292 L 102 298 L 102 317 L 106 326 L 116 332 L 197 333 L 211 339 L 221 350 L 225 362 L 223 377 L 213 391 L 200 399 L 190 401 L 65 401 L 60 398 L 60 224 Z" },
  { id: "b2", cx: 608, fill: "#F2F2E8", d: "M 485 176 L 477 186 L 477 436 L 481 444 L 490 449 L 662 449 L 686 443 L 708 430 L 721 417 L 728 407 L 735 392 L 739 376 L 739 355 L 733 334 L 722 317 L 708 305 L 725 282 L 732 259 L 732 240 L 729 226 L 724 214 L 715 201 L 696 185 L 677 177 L 662 174 L 490 174 Z M 529 222 L 658 222 L 664 224 L 675 233 L 680 242 L 681 255 L 675 268 L 664 278 L 650 282 L 580 282 L 570 289 L 566 298 L 567 320 L 570 326 L 578 331 L 596 333 L 661 333 L 678 342 L 686 353 L 688 360 L 688 371 L 683 383 L 674 393 L 663 399 L 653 401 L 536 401 L 529 400 L 527 398 L 527 224 Z" },
  { id: "a", cx: 901, fill: "#F2F2E8", d: "M 839 398 L 839 402 L 843 406 L 962 406 L 967 400 L 951 369 L 943 362 L 862 362 L 856 367 Z M 888 178 L 878 189 L 748 426 L 743 437 L 745 446 L 752 450 L 786 450 L 791 448 L 796 443 L 904 247 L 1008 444 L 1018 450 L 1048 450 L 1054 448 L 1059 441 L 1058 433 L 928 185 L 919 177 L 910 174 L 899 174 Z" },
  { id: "m", cx: 1236, fill: "#39FF66", d: "M 1076 180 L 1072 189 L 1072 436 L 1075 444 L 1079 448 L 1085 451 L 1112 451 L 1117 449 L 1124 441 L 1126 269 L 1216 385 L 1229 393 L 1244 393 L 1253 389 L 1259 383 L 1348 268 L 1349 440 L 1356 449 L 1361 451 L 1388 451 L 1393 449 L 1398 444 L 1401 437 L 1401 187 L 1393 176 L 1388 174 L 1361 174 L 1353 178 L 1237 327 L 1120 177 L 1113 174 L 1085 174 Z" },
  { id: "u", cx: 1566, fill: "#39FF66", d: "M 1448 176 L 1441 186 L 1441 361 L 1446 385 L 1461 413 L 1470 423 L 1488 437 L 1514 448 L 1533 451 L 1601 451 L 1615 449 L 1629 445 L 1647 436 L 1658 428 L 1673 412 L 1683 396 L 1690 377 L 1692 366 L 1692 184 L 1690 180 L 1685 175 L 1680 173 L 1651 173 L 1642 180 L 1639 187 L 1639 362 L 1630 381 L 1619 391 L 1605 397 L 1536 398 L 1523 395 L 1513 390 L 1503 380 L 1495 363 L 1494 184 L 1488 176 L 1481 173 L 1455 173 Z" },
  { id: "s", cx: 1841, fill: "#39FF66", d: "M 1765 182 L 1752 191 L 1738 206 L 1729 221 L 1724 237 L 1723 263 L 1725 274 L 1733 293 L 1746 310 L 1765 324 L 1793 334 L 1885 336 L 1895 341 L 1903 349 L 1908 362 L 1908 370 L 1904 381 L 1896 390 L 1878 398 L 1741 398 L 1729 407 L 1725 416 L 1725 433 L 1728 440 L 1733 446 L 1744 451 L 1877 451 L 1896 448 L 1922 436 L 1929 431 L 1949 409 L 1960 383 L 1960 347 L 1955 332 L 1944 314 L 1932 302 L 1917 292 L 1892 283 L 1878 281 L 1805 282 L 1793 279 L 1788 276 L 1779 266 L 1776 260 L 1776 247 L 1779 239 L 1786 231 L 1801 224 L 1918 224 L 1924 222 L 1933 214 L 1936 207 L 1936 188 L 1933 181 L 1926 174 L 1917 171 L 1801 171 L 1781 175 Z" },
];

const BOTTLE = "M 349 126 L 345 128 L 342 134 L 343 139 L 347 143 L 347 149 L 349 152 L 338 244 L 323 265 L 317 284 L 317 437 L 320 443 L 330 450 L 407 450 L 414 446 L 419 438 L 419 283 L 412 263 L 398 244 L 388 160 L 388 150 L 390 142 L 394 137 L 394 132 L 388 126 Z";

const RAYS = [
  { id: "left", x: -67, y: 100, cx: 320, cy: 77, d: "M 301 48 L 297 54 L 299 63 L 323 103 L 328 108 L 337 108 L 343 101 L 341 91 L 316 50 L 310 46 Z" },
  { id: "center", x: 0, y: 120, cx: 370, cy: 52, d: "M 367 10 L 363 12 L 359 18 L 359 86 L 363 92 L 372 94 L 379 89 L 381 84 L 381 24 L 379 15 L 373 10 Z" },
  { id: "right", x: 67, y: 100, cx: 420, cy: 77, d: "M 439 48 L 435 46 L 427 47 L 420 56 L 397 94 L 397 102 L 401 107 L 411 108 L 418 101 L 443 59 L 442 52 Z" },
];

const percent = (seconds) => `${((seconds / LOOP_SECONDS) * 100).toFixed(2)}%`;

// Chaque lettre apparaît d'autant plus tard qu'elle est loin de la bouteille.
function letterKeyframes({ id, cx }) {
  const start = POP_SECONDS + 0.05 + (Math.abs(cx - BOTTLE_CX) / 1972) * 0.6;
  return `@keyframes bibaLoad-${id} {
    0%, ${percent(start)} { opacity: 0; transform: translateY(165px); }
    ${percent(start + 0.17)} { opacity: 1; }
    ${percent(start + 0.27)} { transform: translateY(-14px); }
    ${percent(start + 0.42)} { transform: translateY(0); }
    94% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(0); }
  }`;
}

function rayKeyframes({ id, x, y }) {
  return `@keyframes bibaLoad-ray-${id} {
    0%, ${percent(POP_SECONDS)} { opacity: 0; transform: translate(${x}px, ${y}px) scale(.35); }
    ${percent(POP_SECONDS + 0.11)} { opacity: 1; }
    ${percent(POP_SECONDS + 0.2)} { transform: translate(${-x * 0.1}px, ${-y * 0.1}px) scale(1.06); }
    ${percent(POP_SECONDS + 0.32)} { transform: translate(0, 0) scale(1); }
    94% { opacity: 1; transform: translate(0, 0) scale(1); }
    100% { opacity: 0; transform: translate(0, 0) scale(1); }
  }`;
}

const STYLES = `
  .biba-load-part { animation: ${LOOP_SECONDS}s linear infinite both; }
  .biba-load-bottle { animation-name: bibaLoad-bottle; transform-origin: ${BOTTLE_CX}px 450px; }
  ${LETTERS.map((l) => `.biba-load-${l.id} { animation-name: bibaLoad-${l.id}; }`).join("\n  ")}
  ${RAYS.map((r) => `.biba-load-ray-${r.id} { animation-name: bibaLoad-ray-${r.id}; transform-origin: ${r.cx}px ${r.cy}px; }`).join("\n  ")}
  ${LETTERS.map(letterKeyframes).join("\n  ")}
  ${RAYS.map(rayKeyframes).join("\n  ")}
  @keyframes bibaLoad-bottle {
    0% { opacity: 0; transform: translateY(520px); }
    5% { opacity: 1; }
    8% { transform: translateY(-20px); }
    11% { transform: translateY(0) rotate(0); }
    12.5% { transform: rotate(-3deg); }
    14% { transform: rotate(4deg); }
    15.5% { transform: rotate(-5deg); }
    17% { transform: rotate(6deg); }
    18.5% { transform: rotate(-7deg); }
    20% { transform: rotate(8deg); }
    21% { transform: translateY(0) rotate(0); }
    23% { transform: translateY(-34px) rotate(-4deg); }
    25% { transform: translateY(-20px) rotate(3deg); }
    27% { transform: translateY(-6px) rotate(-1.5deg); }
    30% { transform: translateY(0) rotate(0); }
    94% { opacity: 1; transform: translateY(0) rotate(0); }
    100% { opacity: 0; transform: translateY(0) rotate(0); }
  }
  /* Sans animation demandée par le système : logo complet, immobile. */
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
      <svg viewBox="0 0 1972 462" aria-hidden="true" style={{ display: "block", width: "min(78vw, 340px)", height: "auto", overflow: "visible" }}>
        <g fillRule="evenodd" stroke="none">
          {LETTERS.map((l) => (
            <path key={l.id} className={`biba-load-part biba-load-${l.id}`} d={l.d} fill={l.fill} />
          ))}
          {RAYS.map((r) => (
            <path key={r.id} className={`biba-load-part biba-load-ray-${r.id}`} d={r.d} fill={COLORS.ink} />
          ))}
          <path className="biba-load-part biba-load-bottle" d={BOTTLE} fill="#39FF66" />
        </g>
      </svg>
    </div>
  );
}
