// ============================================================
// Bloc « Ce produit n'est pas encore présent sur BibAtlas ? Aucun problème. Tu peux l'ajouter
// rapidement. » — le seul endroit d'où l'on peut proposer un
// Produit ou un Lieu depuis BibAtlas : il n'apparaît qu'après une recherche, sous les
// résultats (ou à la place d'eux quand il n'y en a aucun), pour inciter à vérifier d'abord
// que la fiche n'existe pas déjà. Le nom tapé est repris tel quel dans le formulaire.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";

// Le texte et le « + » sont toujours dans un cadre rose (même boîte rose que les avertissements de doublon : COLORS.surface, bordure pinkFluo de 2 px,
// 12 px de rayon) — sur tous les écrans qui proposent d'ajouter un produit ou un lieu (décidé par Mehdi, 2026-11-20) : listes Produits et Lieux de BibAtlas,
// recherche BibAtlas, BibaSolo, DrinkCheck, publication BibaPulse, BibaRoom.
// Trois lignes : la question, « Aucun problème. », « Tu peux l'ajouter rapidement. » (Mehdi, 2026-11-20) ; le cadre est large (marges réduites autour et dedans)
// pour que chaque phrase tienne sur une seule ligne, même « Ce produit n'est pas encore présent sur BibAtlas ? » (14 px sur grand écran, jusqu'à 12 px sur petit écran : `clamp`).
export function AddAfterSearch({ query, onAdd, noun, label }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        marginTop: "6px",
        textAlign: "center",
        background: COLORS.surface,
        border: `2px solid ${COLORS.pinkFluo}`,
        borderRadius: "12px",
        padding: "16px 8px",
        boxSizing: "border-box",
      }}
    >
      <p style={{ margin: 0, fontSize: "clamp(12px, 3.4vw, 14px)", color: COLORS.inkSoft }}>
        Ce {noun} n'est pas encore présent sur BibAtlas ?
        <br />
        Aucun problème.
        <br />
        Tu peux l'ajouter rapidement.
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
