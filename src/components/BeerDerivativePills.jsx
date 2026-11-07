// ============================================================
// Choix du dérivé d'un produit (bière : Mazout, Tango… ; spiritueux : Coca, Tonic… ; thé : Citron, Lait…) dans le formulaire « Ajouter un Produit » de BibaSolo : une rangée de pastilles arrondies posée au même
// endroit que le choix Spiritueux / Shot (SpiritKindToggle), avec le même aspect que les pastilles de dérivés de la carte de commande de BibaRoom
// (RoundComposeScreen) : inactive, grise comme les volumes ; active, rose fluo. Aucune pastille active = la bière telle quelle (pas de pastille
// « Nature »), et un second appui sur la pastille active la désactive. La rangée est centrée et défile à l'horizontale quand il y en a trop.
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
      style={{ display: "flex", flexWrap: "nowrap", gap: "5px", width: "max-content", maxWidth: "100%", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", ...style }}
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
              background: on ? COLORS.pinkFluo : "transparent",
              color: on ? COLORS.chalkWhite : COLORS.inkSoft,
              border: `1.5px solid ${on ? COLORS.pinkFluo : COLORS.inkSoft}`,
              borderRadius: "999px",
              padding: "2px 8px",
              fontSize: "11.5px",
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
