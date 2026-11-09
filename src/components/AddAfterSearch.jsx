// ============================================================
// Bloc « Tu ne trouves pas … ? Ajoute-le » — le seul endroit d'où l'on peut proposer un
// Produit ou un Lieu depuis BibAtlas : il n'apparaît qu'après une recherche, sous les
// résultats (ou à la place d'eux quand il n'y en a aucun), pour inciter à vérifier d'abord
// que la fiche n'existe pas déjà. Le nom tapé est repris tel quel dans le formulaire.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";

export function AddAfterSearch({ query, onAdd, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "6px", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: "14px", color: COLORS.inkSoft, wordBreak: "break-word" }}>
        Tu ne trouves pas « <strong style={{ color: COLORS.ink }}>{query}</strong> » ? Ajoute-le
      </p>
      <button
        onClick={() => onAdd(query)}
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: COLORS.amber,
          border: "none",
          color: COLORS.paper,
          fontSize: "32px",
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          lineHeight: 1,
          boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
        }}
        title={label}
        aria-label={label}
      >
        +
      </button>
    </div>
  );
}
