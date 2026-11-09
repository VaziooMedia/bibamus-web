// ============================================================
// Bloc « Ce produit n'est pas encore présent sur BibAtlas ? Aucun problème. Tu peux l'ajouter
// rapidement. » — le seul endroit d'où l'on peut proposer un
// Produit ou un Lieu depuis BibAtlas : il n'apparaît qu'après une recherche, sous les
// résultats (ou à la place d'eux quand il n'y en a aucun), pour inciter à vérifier d'abord
// que la fiche n'existe pas déjà. Le nom tapé est repris tel quel dans le formulaire.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";

export function AddAfterSearch({ query, onAdd, noun, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "6px", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: "14px", color: COLORS.inkSoft }}>
        Ce {noun} n'est pas encore présent sur BibAtlas ?
        <br />
        Aucun problème. Tu peux l'ajouter rapidement.
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
