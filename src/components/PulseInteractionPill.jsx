import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

// Pastille d'interaction d'un PlaceCheck (« Qui est chaud pour un verre ?! »…), sur la carte BibaPulse. Avec `onClick`, c'est un bouton : il
// ouvre les commentaires de la carte pour y répondre (`active` = les commentaires sont ouverts : la pastille se remplit de rose fluo, texte blanc).
// Sans `onClick`, c'est un simple rappel, affiché en tête des commentaires pour voir à quoi l'on répond. L'icône est celle du bouton de commentaire.
export function PulseInteractionPill({ label, active = false, onClick, wrap = false }) {
  // Petite, bord et icône en rose fluo. Par défaut le texte reste sur UNE ligne (si l'écran est vraiment trop étroit, il se termine par « … »).
  // Avec `wrap` (colonne de texte à côté d'une photo à moitié de la largeur), il peut passer sur deux lignes plutôt que d'être coupé.
  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    maxWidth: "100%",
    boxSizing: "border-box",
    background: active ? COLORS.pinkFluo : "none",
    color: active ? "#FFFFFF" : COLORS.ink,
    border: `1.5px solid ${COLORS.pinkFluo}`,
    borderRadius: wrap ? "10px" : "999px",
    padding: "2px 6px",
    textAlign: "left",
    font: "inherit",
    fontSize: "9.5px",
    lineHeight: 1.3,
    fontWeight: 800,
    whiteSpace: wrap ? "normal" : "nowrap",
    cursor: onClick ? "pointer" : "default",
  };
  const content = (
    <>
      <span style={{ display: "flex", flexShrink: 0 }}>
        <NavIcon name="comment" size={10} color={active ? "#FFFFFF" : COLORS.pinkFluo} />
      </span>
      <span style={wrap ? { minWidth: 0 } : { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} style={style}>
      {content}
    </button>
  ) : (
    <span style={style}>{content}</span>
  );
}
