import React, { useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { LoadingBottle, LOOP_SECONDS, POP_SECONDS, FADE_FROM } from "./LoadingScreen.jsx";

// « Tchin ! » : le petit moment de fête juste après la création du compte. C'est l'animation de l'écran de chargement, reprise telle quelle (la bouteille du logo monte,
// tremble et saute le bouchon, les éclats jaillissent) ; le texte apparaît au moment du « pop ». L'écran suivant arrive tout seul à la fin de l'animation, juste avant
// qu'elle ne s'estompe pour recommencer (ou dès qu'on touche l'écran). Sans animation demandée par le système, cet écran n'est jamais montré (voir AuthScreen).

const SHOW_SECONDS = (LOOP_SECONDS * FADE_FROM) / 100;

const STYLES = `
  .biba-tchin-text { opacity: 0; animation: bibaTchinText .5s cubic-bezier(.2,.9,.3,1.3) both; animation-delay: ${POP_SECONDS}s; }
  @keyframes bibaTchinText { from { opacity: 0; transform: translateY(8px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @media (prefers-reduced-motion: reduce) { .biba-tchin-text { animation: none; opacity: 1; } }
`;

export function TchinScreen({ firstName, onDone }) {
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const timer = setTimeout(finish, SHOW_SECONDS * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calé sur la zone réellement visible, comme l'écran de chargement (100vh dépasse l'écran sur iPhone).
  return (
    <div
      onClick={finish}
      style={{ position: "fixed", inset: 0, boxSizing: "border-box", padding: "0 24px 8vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLORS.paper, overflow: "hidden", cursor: "pointer" }}
    >
      <style>{STYLES}</style>
      <LoadingBottle />
      <div className="biba-tchin-text" style={{ textAlign: "center", marginTop: "22px" }}>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "34px", margin: "0 0 6px", color: COLORS.amber }}>Tchin !</h1>
        <p style={{ margin: 0, fontSize: "14px", color: COLORS.inkSoft }}>Bienvenue chez les Bibax{firstName ? `, ${firstName}` : ""}.</p>
      </div>
    </div>
  );
}
