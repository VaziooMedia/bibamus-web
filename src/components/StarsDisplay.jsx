import React from "react";
import { COLORS } from "../constants.js";

// Une étoile pleine, dessinée une fois et réutilisée pour les deux calques (gris en fond,
// vert fluo par-dessus, découpé à la bonne largeur pour un remplissage partiel au quart d'étoile).
function StarShape({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2.5l2.95 6.28 6.93.74-5.16 4.73 1.4 6.85L12 17.77l-6.12 3.33 1.4-6.85L2.12 9.52l6.93-.74z" />
    </svg>
  );
}

// Affiche N étoiles remplies proportionnellement à `value` (précision au quart d'étoile) —
// purement visuel, pas interactif. Utilisé pour la moyenne communautaire ou pour figer la note
// personnelle une fois donnée.
export function StarsDisplay({ value, size = 22, max = 5, emptyColor = COLORS.paperAlt, fillColor = COLORS.amber }) {
  const clamped = Math.max(0, Math.min(max, value || 0));
  return (
    <div style={{ display: "inline-flex", gap: "2px" }}>
      {Array.from({ length: max }).map((_, i) => {
        const fillRatio = Math.max(0, Math.min(1, clamped - i));
        return (
          <div key={i} style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <StarShape size={size} color={emptyColor} />
            </div>
            <div style={{ position: "absolute", inset: 0, width: `${fillRatio * 100}%`, overflow: "hidden" }}>
              <StarShape size={size} color={fillColor} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
