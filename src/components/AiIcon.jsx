import React from "react";
import aiIconGreenUrl from "../assets/brand/ai_icon_green.svg";

// Icône « AI » de la plateforme (même fichier que celui de la gestion), utilisée à la place de l'ancienne icône de scan
// pour les entrées qui ouvrent la lecture d'une étiquette par IA.
export function AiIcon({ size = 22 }) {
  return <img src={aiIconGreenUrl} alt="IA" style={{ height: `${size}px`, width: "auto", display: "block" }} />;
}
