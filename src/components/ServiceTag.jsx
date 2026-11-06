import React from "react";
import { COLORS } from "../constants.js";

// Le type de service d'un verre @Home (Bouteille, Canette, On Tap, Au verre, PET, Brique, Carton), en petite pastille fine sur sa
// propre ligne, juste sous le nom et le volume : même orthographe que la fiche produit de Gestion et que la
// liste « Type de service » de BibAtlas. Rien si le verre n'a pas de type de service.
// Un verre pris en shot (`shot`) porte en plus une pastille « Shot », du même style, avant le type de service
// (seule, s'il n'y a pas de type de service) : c'est ce qui distingue un shot d'un spiritueux de même volume.
// « Au verre » n'est pas répété à côté de « Shot » : un shot est d'office servi au verre.
const SERVICE_LABELS = { bouteille: "Bouteille", canette: "Canette", fut: "On Tap", verre: "Au verre", pet: "PET", brique: "Brique", carton: "Carton" };

const pillStyle = { display: "inline-block", whiteSpace: "nowrap", padding: "0 6px", fontSize: "9.5px", lineHeight: "13px", fontWeight: 500, color: COLORS.inkSoft, border: `1px solid ${COLORS.inkSoft}55`, borderRadius: "999px" };

// Le libellé d'un type de service connu, ou null (vide, NULL en base ou valeur inconnue).
export const serviceLabelOf = (mode) => (typeof mode === "string" && Object.prototype.hasOwnProperty.call(SERVICE_LABELS, mode) ? SERVICE_LABELS[mode] : null);

// La pastille « Shot » seule, réutilisée telle quelle par le journal de BibaSolo (ligne 3 d'un verre bu).
export function ShotPill({ style }) {
  return (
    <span data-testid="shot-tag" style={{ ...pillStyle, ...style }}>
      Shot
    </span>
  );
}

// La pastille du dérivé d'une bière (« Mazout », « Tango »…) dans le journal de BibaSolo (ligne 1, à droite du nom du produit) :
// grisée, du même style que celle du type de service. Rien sans nom de dérivé.
export function DerivativePill({ name }) {
  return name ? (
    <span data-testid="derivative-pill" style={pillStyle}>
      {name}
    </span>
  ) : null;
}

// La pastille de la ligne 3 du journal de BibaSolo (après le drapeau) : « Shot » seul pour un verre pris en shot, quel que soit son type de service
// (un shot est d'office servi au verre, inutile de le répéter) ; sinon le type de service ; rien s'il n'est pas défini.
export function ServicePill({ mode, shot = false }) {
  if (shot) return <ShotPill />;
  const label = serviceLabelOf(mode);
  return label ? (
    <span data-testid="service-pill" style={pillStyle}>
      {label}
    </span>
  ) : null;
}

export function ServiceTag({ mode, shot = false }) {
  const known = serviceLabelOf(mode);
  const label = shot && mode === "verre" ? null : known;
  if (!label && !shot) return null;
  return (
    <span data-testid="service-tag" style={{ display: "block", paddingLeft: "10px", marginTop: "2px", lineHeight: 0 }}>
      {shot && <ShotPill style={{ marginRight: label ? "4px" : 0 }} />}
      {label && <span style={pillStyle}>{label}</span>}
    </span>
  );
}
