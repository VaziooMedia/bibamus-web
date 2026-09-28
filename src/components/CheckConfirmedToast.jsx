// ============================================================
// Petite popup de confirmation d'un check (parcours depuis l'accueil). Disparaît toute seule après
// 2,5 secondes ; un tap la ferme tout de suite.
// ============================================================
import React, { useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

export function CheckConfirmedToast({ name, onDone, durationMs = 2500 }) {
  // onDone est relu à chaque rendu sans relancer le minuteur : App se redessine souvent, et le minuteur
  // ne doit pas repartir de zéro à chaque fois (la popup ne disparaîtrait jamais).
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const timer = setTimeout(() => doneRef.current && doneRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return (
    <div
      role="status"
      onClick={() => onDone && onDone()}
      style={{
        position: "fixed",
        top: "calc(16px + env(safe-area-inset-top, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: COLORS.surface,
        border: `2px solid ${COLORS.pinkFluo}`,
        borderRadius: "14px",
        padding: "10px 18px 10px 12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        maxWidth: "calc(100vw - 32px)",
        boxSizing: "border-box",
        cursor: "pointer",
      }}
    >
      <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: COLORS.pinkFluo, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <NavIcon name="check" size={16} color="#000" />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 800, fontSize: "14px", color: COLORS.ink }}>Check confirmé</span>
        {name && <span style={{ display: "block", fontSize: "12.5px", color: COLORS.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>}
      </span>
    </div>
  );
}
