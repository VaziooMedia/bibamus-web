import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

// Résultat d'un scan de code-barres depuis BibAtlas — contrairement au scan standard qui va
// directement à la fiche produit, celui-ci montre toutes les fiches liées (produit, marque,
// brasseur/producteur) pour laisser la personne choisir laquelle elle veut consulter.
const KIND_LABELS = { drink: "Produit", brand: "Marque", producer: "Brasseur / Producteur" };

export function LinkedScanResultsModal({ results, onClose, onSelect }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ width: "100%", maxWidth: "480px", background: "#0D1B2A", borderRadius: "20px 20px 0 0", padding: "24px 20px", borderTop: `2px solid ${COLORS.paperAlt}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.ink, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
            Résultats liés
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "20px", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: 0, marginBottom: "16px" }}>Choisis la fiche que tu veux consulter.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {results.map((r) => (
            <button
              key={`${r.kind}-${r.id}`}
              onClick={() => onSelect(r.kind, r.id)}
              style={{
                textAlign: "left",
                background: COLORS.surface,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "12px",
                padding: "14px 16px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "11px", color: COLORS.amber, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>{KIND_LABELS[r.kind]}</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: COLORS.ink, marginTop: "2px" }}>{r.name}</div>
              </div>
              <NavIcon name="chevron-right" size={16} color={COLORS.inkSoft} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
