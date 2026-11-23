// ============================================================
// Bouton « BibaMap » des annuaires Lieux, Shops et Producteurs (et libellé réutilisé par le bloc de la page BibAtlas) : l'icône de carte, puis « Biba » en blanc et
// « Map » en vert fluo (comme le titre de l'écran BibaMap), et la flèche ronde à droite. Même présentation que « Lieux proches de moi ».
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

// Le nom « BibaMap » écrit en deux couleurs : « Biba » dans la couleur du texte qui l'entoure (ou `bibaColor`), « Map » en vert fluo.
export function BibaMapName({ bibaColor }) {
  return (
    <>
      <span style={bibaColor ? { color: bibaColor } : undefined}>Biba</span>
      <span style={{ color: COLORS.amber }}>Map</span>
    </>
  );
}

export function BibaMapButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      data-biba-map-button
      style={{
        background: COLORS.surfaceAlt,
        border: "none",
        borderRadius: "12px",
        padding: "14px 16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        marginBottom: "16px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, fontSize: "14.5px", color: COLORS.chalkWhite }}>
          <span style={{ width: "36px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <NavIcon name="map" size={24} color={COLORS.amber} />
          </span>
          <span>
            <BibaMapName />
          </span>
        </span>
        <span style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <NavIcon name="arrow-right-circle" size={20} color={COLORS.amber} />
        </span>
      </div>
    </button>
  );
}
