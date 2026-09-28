// ============================================================
// Icône du bouton de confirmation d'un check (DrinkCheck et PlaceCheck) : un rond noir avec une coche
// vert fluo. Fichier à part pour être partagé par les deux fenêtres.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

export function CheckButtonIcon() {
  return (
    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#000", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <NavIcon name="check" size={14} color={COLORS.amber} />
    </span>
  );
}
