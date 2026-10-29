import React from "react";
import { COLORS } from "../constants.js";

// Le type de service d'un verre @Home (Bouteille, Canette, On Tap, Au verre), en petite pastille fine sur sa
// propre ligne, juste sous le nom et le volume : même orthographe que la fiche produit de Gestion et que la
// liste « Type de service » de BibAtlas. Rien si le verre n'a pas de type de service.
const SERVICE_LABELS = { bouteille: "Bouteille", canette: "Canette", fut: "On Tap", verre: "Au verre" };

export function ServiceTag({ mode }) {
  const label = typeof mode === "string" && Object.prototype.hasOwnProperty.call(SERVICE_LABELS, mode) ? SERVICE_LABELS[mode] : null;
  if (!label) return null;
  return (
    <span data-testid="service-tag" style={{ display: "block", paddingLeft: "10px", marginTop: "2px", lineHeight: 0 }}>
      <span style={{ display: "inline-block", whiteSpace: "nowrap", padding: "0 6px", fontSize: "9.5px", lineHeight: "13px", fontWeight: 500, color: COLORS.inkSoft, border: `1px solid ${COLORS.inkSoft}55`, borderRadius: "999px" }}>{label}</span>
    </span>
  );
}
