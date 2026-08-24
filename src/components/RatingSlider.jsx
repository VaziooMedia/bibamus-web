import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { StarsDisplay } from "./StarsDisplay.jsx";

// Barre de notation horizontale, réglable au quart d'étoile (0,25 à 5) — la valeur choisie se
// reflète immédiatement au-dessus, sous forme d'étoiles vert fluo. Le déplacement ne fait que
// mettre à jour l'affichage local ; c'est un bouton "Valider" séparé, dans le composant parent,
// qui déclenche l'enregistrement réel — jamais automatiquement au relâchement.
export function RatingSlider({ value, onLocalChange }) {
  const [localValue, setLocalValue] = useState(value || 0.25);

  useEffect(() => {
    setLocalValue(value || 0.25);
  }, [value]);

  useEffect(() => {
    onLocalChange(localValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue]);

  const percent = ((localValue - 0.25) / (5 - 0.25)) * 100;

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
