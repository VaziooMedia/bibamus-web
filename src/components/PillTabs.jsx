// ============================================================
// Barre d'onglets en pastilles — un seul aspect pour les fiches Produits et
// Lieux, les BibaClub et les BibaRoom (décision du 2026-10-30).
//
// Pastilles rondes de même largeur ; l'onglet actif est plein vert, les autres
// ont un simple contour. Un trait fin (même couleur que les autres séparateurs)
// court au-dessus et en dessous de la rangée.
//
// `tabs`  : [{ key, label, badge? }]
//   `label` : un texte (« Infos »), ou { prefix: "Biba", accent: "Pulse" } pour
//             un nom de marque en deux temps : l'accent est vert sur une pastille
//             inactive et prend la couleur du texte (sombre) sur la pastille
//             active, qui est déjà verte.
//   `badge` : élément facultatif posé à cheval sur la bordure (pastille rouge
//             de messages non lus).
// `active` / `onChange(key)` : l'onglet choisi et le rappel au clic.
// `marginBottom` : espace sous la barre (16 px par défaut).
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";

export function PillTabs({ tabs, active, onChange, marginBottom = "16px" }) {
  return (
    <div style={{ marginBottom }}>
      <div style={{ height: "1px", background: COLORS.paperAlt, marginBottom: "10px" }} />
      <div style={{ display: "flex", gap: "8px" }}>
        {tabs.map((t) => {
          const isActive = active === t.key;
          const { label } = t;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              style={{
                position: "relative",
                flex: 1,
                background: isActive ? COLORS.amber : "none",
                color: isActive ? COLORS.paper : COLORS.ink,
                border: `2px solid ${isActive ? COLORS.amber : COLORS.paperAlt}`,
                borderRadius: "999px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {typeof label === "string" ? (
                label
              ) : (
                <>
                  {label.prefix}
                  <span style={{ color: isActive ? undefined : COLORS.amber }}>{label.accent}</span>
                </>
              )}
              {t.badge}
            </button>
          );
        })}
      </div>
      <div style={{ height: "1px", background: COLORS.paperAlt, marginTop: "10px" }} />
    </div>
  );
}
