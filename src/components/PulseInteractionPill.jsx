import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

// Pastille d'interaction d'un PlaceCheck (« Qui est chaud pour un verre ?! »…), sur la carte BibaPulse. Avec `onClick`, c'est un bouton : il
// ouvre les commentaires de la carte pour y répondre (`active` = les commentaires sont ouverts : la pastille se remplit de rose fluo, texte blanc).
// Sans `onClick`, c'est un simple rappel, affiché en tête des commentaires pour voir à quoi l'on répond. L'icône est celle du bouton de commentaire.
export function PulseInteractionPill({ label, active = false, onClick }) {
  // Petite, sur UNE ligne (même à côté d'une photo) : bord et icône en rose fluo. Le texte reste sur une ligne ; si l'écran est vraiment trop étroit,
  // il se termine par « … » plutôt que de passer à la ligne.
  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    maxWidth: "100%",
    boxSizing: "border-box",
    background: active ? COLORS.pinkFluo : "none",
    color: active ? "#FFFFFF" : COLORS.ink,
    border: `1.5px solid ${COLORS.pinkFluo}`,
    borderRadius: "999px",
    padding: "2px 6px",
    textAlign: "left",
    font: "inherit",
    fontSize: "9.5px",
    lineHeight: 1.3,
    fontWeight: 800,
    whiteSpace: "nowrap",
    cursor: onClick ? "pointer" : "default",
  };
  const content = (
    <>
      <span style={{ display: "flex", flexShrink: 0 }}>
        <NavIcon name="comment" size={10} color={active ? "#FFFFFF" : COLORS.pinkFluo} />
      </span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
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
