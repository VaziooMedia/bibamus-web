// ============================================================
// Choix du dérivé d'une bière (Mazout, Tango…) dans le formulaire « Ajouter un Produit » de BibaSolo : une rangée de pastilles posée au même endroit
// que le choix Spiritueux / Shot (SpiritKindToggle), avec les mêmes boutons fins. Inactive, une pastille est sombre avec un filet gris, comme le
// bouton non choisi de Spiritueux / Shot ; active, elle est rose fluo. Aucune pastille active = la bière telle quelle (pas de pastille « Nature »),
// et un second appui sur la pastille active la désactive. La rangée est centrée et défile à l'horizontale quand il y en a trop pour la largeur.
// Les dérivés viennent de useBeerDerivatives (voir beerDerivatives.js) ; le parent n'affiche cette rangée que s'il y en a.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";

export function BeerDerivativePills({ derivatives, activeCode, onChange, style }) {
  return (
    <div
      data-beer-derivatives="1"
      role="group"
      aria-label="Dérivé"
      style={{ display: "flex", flexWrap: "nowrap", gap: "8px", width: "max-content", maxWidth: "100%", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", ...style }}
    >
      {derivatives.map((d) => {
        const on = d.code === activeCode;
        return (
          <button
            key={d.code}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? null : d.code)}
            style={{
              boxSizing: "border-box",
              height: "24px",
              padding: "0 14px",
              fontSize: "10.5px",
              lineHeight: 1,
              borderRadius: "8px",
              border: `1.5px solid ${on ? COLORS.pinkFluo : COLORS.paperAlt}`,
              background: on ? COLORS.pinkFluo : COLORS.surface,
              color: on ? COLORS.chalkWhite : COLORS.ink,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {d.name}
          </button>
        );
      })}
    </div>
  );
}
