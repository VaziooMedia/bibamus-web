import React from "react";
import aiIconGreenUrl from "../assets/brand/ai_icon_green.svg";

// Icône « AI » de la plateforme (même fichier que celui de la gestion), utilisée à la place de l'ancienne icône de scan
// pour les entrées qui ouvrent la lecture d'une étiquette par IA.
//   tone="dark" : le même dessin en noir, pour les fonds vert fluo (où l'icône verte serait invisible).
//   bleed       : plus grande que la ligne de texte qui la contient, sans agrandir la barre (marge négative : une ligne fait ~20 px).
export function AiIcon({ size = 22, tone = "green", bleed = false }) {
  const style = { height: `${size}px`, width: "auto", display: "block" };
  if (tone === "dark") style.filter = "brightness(0)";
  if (bleed) style.margin = `${-Math.max(0, Math.round((size - 20) / 2))}px 0`;
  return <img src={aiIconGreenUrl} alt="IA" style={style} />;
}
