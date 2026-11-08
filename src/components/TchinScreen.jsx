import React, { useEffect } from "react";
import { COLORS } from "../constants.js";
import { LOGO_BOTTLE } from "./BibamusLogo.jsx";

// « Tchin ! » : le petit moment de fête juste après la création du compte. Deux bouteilles trinquent, quelques éclats jaillissent, puis l'écran suivant arrive tout seul
// (ou dès qu'on touche l'écran). Les bouteilles sont celle du logo Bibamus. Sans animation demandée par le système, cet écran n'est jamais montré (voir AuthScreen).

export const TCHIN_SECONDS = 2.1;

// Les deux bouteilles pivotent autour de leur pied : elles s'écartent, se penchent l'une vers l'autre jusqu'à ce que les goulots se touchent (c'est le « tchin »), rebondissent
// un peu, puis restent penchées. Les éclats et le texte apparaissent au moment du choc.
const STYLES = `
  .biba-tchin-bottle-left { transform-origin: 368px 450px; animation: bibaTchinLeft ${TCHIN_SECONDS}s cubic-bezier(.3,.7,.3,1) both; }
  .biba-tchin-bottle-right { transform-origin: 368px 450px; animation: bibaTchinRight ${TCHIN_SECONDS}s cubic-bezier(.3,.7,.3,1) both; }
  @keyframes bibaTchinLeft {
    0% { opacity: 0; transform: translateX(-175px) rotate(-8deg); }
    22% { opacity: 1; }
    46% { transform: translateX(-118px) rotate(19deg); }
    60% { transform: translateX(-128px) rotate(13deg); }
    100% { opacity: 1; transform: translateX(-121px) rotate(17deg); }
  }
  @keyframes bibaTchinRight {
    0% { opacity: 0; transform: translateX(175px) rotate(8deg); }
    22% { opacity: 1; }
    46% { transform: translateX(118px) rotate(-19deg); }
    60% { transform: translateX(128px) rotate(-13deg); }
    100% { opacity: 1; transform: translateX(121px) rotate(-17deg); }
  }
  .biba-tchin-spark { opacity: 0; animation: bibaTchinSpark .7s ease-out both; animation-delay: ${(TCHIN_SECONDS * 0.46).toFixed(2)}s; }
  @keyframes bibaTchinSpark {
    0% { opacity: 0; transform: translateY(-8px); }
    25% { opacity: 1; }
    100% { opacity: 0; transform: translateY(calc(var(--d) * -1)); }
  }
  .biba-tchin-text { opacity: 0; animation: bibaTchinText .5s cubic-bezier(.2,.9,.3,1.3) both; animation-delay: ${(TCHIN_SECONDS * 0.5).toFixed(2)}s; }
  @keyframes bibaTchinText { from { opacity: 0; transform: translateY(8px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @media (prefers-reduced-motion: reduce) {
    .biba-tchin-bottle-left, .biba-tchin-bottle-right, .biba-tchin-spark, .biba-tchin-text { animation: none; }
    .biba-tchin-bottle-left { opacity: 1; transform: translateX(-121px) rotate(17deg); }
    .biba-tchin-bottle-right { opacity: 1; transform: translateX(121px) rotate(-17deg); }
    .biba-tchin-text { opacity: 1; }
  }
`;

// Les éclats partent du point de contact des goulots, dans les directions du haut (angle en degrés, 0 = vers la droite, -90 = vers le haut) ; chacun s'éloigne de `distance`.
const SPARKS = [
  { angle: -160, distance: 62 },
  { angle: -125, distance: 66 },
  { angle: -90, distance: 76 },
  { angle: -55, distance: 66 },
  { angle: -20, distance: 62 },
];

export function TchinScreen({ firstName, onDone }) {
  // L'écran suivant arrive tout seul à la fin du petit film.
  useEffect(() => {
    const timer = setTimeout(onDone, TCHIN_SECONDS * 1000 + 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={onDone}
      style={{ minHeight: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", background: COLORS.paper, cursor: "pointer" }}
    >
      <style>{STYLES}</style>
      <svg viewBox="170 0 396 470" aria-hidden="true" style={{ width: "min(260px, 70vw)", height: "auto", display: "block", overflow: "visible" }}>
        <path className="biba-tchin-bottle-left" d={LOGO_BOTTLE} fill={COLORS.amber} />
        <path className="biba-tchin-bottle-right" d={LOGO_BOTTLE} fill={COLORS.ink} />
        <g transform="translate(368 128)">
          {SPARKS.map((s) => (
            <g key={s.angle} transform={`rotate(${s.angle + 90})`}>
              <rect className="biba-tchin-spark" x="-3" y="-14" width="6" height="22" rx="3" fill={COLORS.amber} style={{ "--d": `${s.distance}px` }} />
            </g>
          ))}
        </g>
      </svg>
      <div className="biba-tchin-text" style={{ textAlign: "center", marginTop: "18px" }}>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "34px", margin: "0 0 6px", color: COLORS.amber }}>Tchin !</h1>
        <p style={{ margin: 0, fontSize: "14px", color: COLORS.inkSoft }}>Bienvenue chez les Bibax{firstName ? `, ${firstName}` : ""}.</p>
      </div>
    </div>
  );
}
