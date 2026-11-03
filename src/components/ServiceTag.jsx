import React from "react";
import { COLORS } from "../constants.js";

// Le type de service d'un verre @Home (Bouteille, Canette, On Tap, Au verre), en petite pastille fine sur sa
// propre ligne, juste sous le nom et le volume : même orthographe que la fiche produit de Gestion et que la
// liste « Type de service » de BibAtlas. Rien si le verre n'a pas de type de service.
// Un verre pris en shot (`shot`) porte en plus une pastille « Shot », du même style, avant le type de service
// (seule, s'il n'y a pas de type de service) : c'est ce qui distingue un shot d'un spiritueux de même volume.
// « Au verre » n'est pas répété à côté de « Shot » : un shot est d'office servi au verre.
const SERVICE_LABELS = { bouteille: "Bouteille", canette: "Canette", fut: "On Tap", verre: "Au verre" };

const pillStyle = { display: "inline-block", whiteSpace: "nowrap", padding: "0 6px", fontSize: "9.5px", lineHeight: "13px", fontWeight: 500, color: COLORS.inkSoft, border: `1px solid ${COLORS.inkSoft}55`, borderRadius: "999px" };

export function ServiceTag({ mode, shot = false }) {
  const known = typeof mode === "string" && Object.prototype.hasOwnProperty.call(SERVICE_LABELS, mode) ? SERVICE_LABELS[mode] : null;
  const label = shot && mode === "verre" ? null : known;
  if (!label && !shot) return null;
  return (
    <span data-testid="service-tag" style={{ display: "block", paddingLeft: "10px", marginTop: "2px", lineHeight: 0 }}>
      {shot && (
        <span data-testid="shot-tag" style={{ ...pillStyle, marginRight: label ? "4px" : 0 }}>
          Shot
        </span>
      )}
      {label && <span style={pillStyle}>{label}</span>}
    </span>
  );
}
