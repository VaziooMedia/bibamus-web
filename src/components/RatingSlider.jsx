import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { StarsDisplay } from "./StarsDisplay.jsx";

// Barre de notation horizontale, réglable au quart d'étoile (0,25 à 5) — la valeur choisie se
// reflète immédiatement au-dessus, sous forme d'étoiles vert fluo, plutôt que de ne pouvoir
// choisir qu'une note entière comme avant.
//
// Le déplacement met à jour l'affichage localement en instantané ; l'enregistrement réel
// (via onChange, qui déclenche une écriture réseau côté parent) n'a lieu qu'au relâchement —
// sinon chaque minuscule mouvement déclencherait sa propre écriture, ce qui sature et donne
// l'impression que le curseur reste bloqué.
export function RatingSlider({ value, onChange }) {
  const [localValue, setLocalValue] = useState(value || 0.25);

  useEffect(() => {
    setLocalValue(value || 0.25);
  }, [value]);

  const percent = ((localValue - 0.25) / (5 - 0.25)) * 100;

  const commit = () => {
    if (!isNaN(localValue)) onChange(localValue);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <StarsDisplay value={localValue} size={24} />
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", color: COLORS.amber }}>
          {localValue > 0 ? String(localValue).replace(".", ",") : "—"}
        </span>
      </div>
      <input
        type="range"
        min="0.25"
        max="5"
        step="0.25"
        value={localValue}
        onInput={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) setLocalValue(v);
        }}
        onMouseUp={commit}
        onTouchEnd={commit}
        onKeyUp={commit}
        style={{
          width: "100%",
          height: "8px",
          borderRadius: "999px",
          appearance: "none",
          background: `linear-gradient(to right, ${COLORS.amber} ${percent}%, ${COLORS.paperAlt} ${percent}%)`,
          outline: "none",
          cursor: "pointer",
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${COLORS.amber};
          border: 3px solid ${COLORS.paper};
          box-shadow: 0 0 0 2px ${COLORS.amber};
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${COLORS.amber};
          border: 3px solid ${COLORS.paper};
          box-shadow: 0 0 0 2px ${COLORS.amber};
          cursor: pointer;
        }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: COLORS.inkSoft, marginTop: "4px" }}>
        <span>0,25</span>
        <span>5</span>
      </div>
    </div>
  );
}
