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
// `fine`  : pastilles plus fines (contour de 1 px, texte de 11,5 px, moins de hauteur) — voir FINE_PILL, qu'une autre rangée de pastilles peut reprendre pour avoir
//           exactement la même taille (la page « DrinkChecks » : ses catégories et ses classements). Sans `fine`, l'aspect est celui de toute l'app.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";

// Taille des pastilles fines : contour, marges intérieures et taille du texte.
export const FINE_PILL = { borderWidth: "1px", padding: "2px 10px", fontSize: "11.5px" };
const NORMAL_PILL = { borderWidth: "2px", padding: "6px 12px", fontSize: "13px" };

export function PillTabs({ tabs, active, onChange, marginBottom = "16px", fine = false }) {
  const size = fine ? FINE_PILL : NORMAL_PILL;
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
                border: `${size.borderWidth} solid ${isActive ? COLORS.amber : COLORS.paperAlt}`,
                borderRadius: "999px",
                padding: size.padding,
                fontSize: size.fontSize,
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
