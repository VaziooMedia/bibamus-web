// ============================================================
// Choix « Spiritueux / Shot » d'un spiritueux dont la fiche a la case « Shot » cochée, dans les fenêtres d'ajout de BibAtlas
// (nouvelle commande d'une tournée, « Next Drink » @Home). Même aspect que les deux boutons de la ligne produit de la carte boissons
// d'un salon : le bouton choisi est vert fluo, l'autre reste sombre. Le parent n'affiche ce choix que pour un spiritueux qui peut être un shot.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";

export function SpiritKindToggle({ asShot, onChange, style }) {
  return (
    <div
      data-spirit-kind="1"
      role="group"
      aria-label="Spiritueux ou Shot"
      style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "1fr", width: "max-content", gap: "8px", ...style }}
    >
      {[
        { label: "Spiritueux", active: !asShot, value: false },
        { label: "Shot", active: asShot, value: true },
      ].map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.active}
          style={{
            padding: "6px 16px",
            borderRadius: "8px",
            border: `1.5px solid ${opt.active ? COLORS.ink : COLORS.paperAlt}`,
            background: opt.active ? COLORS.amber : COLORS.surface,
            color: opt.active ? COLORS.paper : COLORS.ink,
            fontWeight: 700,
            fontSize: "12.5px",
            lineHeight: 1.3,
            cursor: "pointer",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
