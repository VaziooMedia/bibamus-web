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
// `medium` : taille intermédiaire entre la normale et la fine (voir MEDIUM_PILL) — les trois onglets de Mon Profil.
// STATS_PILL (exportée) : la taille des trois rangées de pastilles de l'onglet Biba360 de Mon Profil, entre la intermédiaire et la fine (22 px de haut).
// `fine`  : pastilles plus fines (contour de 1 px, texte de 11,5 px, moins de hauteur) — voir FINE_PILL, qu'une autre rangée de pastilles peut reprendre pour avoir
//           exactement la même taille (la page « DrinkChecks » : ses catégories et ses classements ; Mon Profil : ses trois onglets). Sans `fine`, l'aspect est celui de toute l'app.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";

// Taille des pastilles fines : contour, marges intérieures et taille du texte.
export const FINE_PILL = { borderWidth: "1px", padding: "2px 10px", fontSize: "11.5px" };
const NORMAL_PILL = { borderWidth: "2px", padding: "6px 12px", fontSize: "13px" };
// Taille intermédiaire entre la normale et la fine (Mon Profil : ses trois onglets, Mehdi 2026-11-17 : la taille fine était « un peu trop fine »).
export const MEDIUM_PILL = { borderWidth: "1.5px", padding: "4px 11px", fontSize: "12.5px" };
// Taille des pastilles de l'onglet Biba360 de Mon Profil (périodes, catégories, modes du suivi hebdo), un peu plus fine que la taille intermédiaire : 22 px de haut (Mehdi 2026-11-17).
export const STATS_PILL = { borderWidth: "1.5px", padding: "3px 10px", fontSize: "12px" };

export function PillTabs({ tabs, active, onChange, marginBottom = "16px", fine = false, medium = false }) {
  const size = fine ? FINE_PILL : medium ? MEDIUM_PILL : NORMAL_PILL;
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

// Pastille rouge du nombre d'éléments non lus / à traiter, posée à cheval sur la bordure d'une pastille d'onglet (passée dans `badge` de `tabs`) :
// BibaPulse et BibaPing d'un salon, « Demandes » de Mes Bibax. Rien si le nombre est nul ; « 9+ » au-delà de 9. Rouge à texte blanc par défaut ; `background` et `color` pour une autre teinte (« Demandes » de Mes Bibax : rose fluo, texte noir).
export function TabBadge({ count, background = "#FF3B3B", color = "#fff" }) {
  if (!count) return null;
  return (
    <span
      style={{
        // À cheval sur la bordure du bouton, comme le badge "EN COURS" d'un BibaLive.
        position: "absolute",
        top: "-8px",
        right: "6px",
        minWidth: "17px",
        height: "17px",
        borderRadius: "999px",
        background,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
        boxSizing: "border-box",
        fontSize: "9.5px",
        fontWeight: 700,
        color,
        lineHeight: 1,
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
