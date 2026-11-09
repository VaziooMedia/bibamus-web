// ============================================================
// Éléments communs aux avertissements de doublon des assistants d'ajout d'un Produit et d'un Lieu :
// la boîte rose, la ligne cliquable d'une fiche déjà existante (qui ouvre cette fiche) et la case
// « Ce n'est pas le même … » qu'il faut cocher pour continuer malgré une fiche très proche.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";

export function DuplicateBox({ title, children, style }) {
  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.pinkFluo}`, borderRadius: "12px", padding: "10px 12px", ...style }}>
      <p style={{ fontSize: "11.5px", color: COLORS.pinkFluo, fontWeight: 700, margin: "0 0 6px 0" }}>{title}</p>
      {children}
    </div>
  );
}

// Ligne d'une fiche existante : photo, nom (avec une pastille facultative), détails, flèche. Toucher la ligne ouvre la fiche.
export function ExistingEntityRow({ photoUrl, photoEmoji, fallbackIcon, title, subtitle, tag, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "6px 0", background: "none", border: "none", textAlign: "left", cursor: "pointer", color: COLORS.ink }}
    >
      <EntityAvatar photoUrl={photoUrl} photoEmoji={photoEmoji} size={36} fallbackIcon={fallbackIcon} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "13px", fontWeight: 700 }}>
          {title}
          {tag && (
            <span style={{ fontSize: "9.5px", fontWeight: 700, color: COLORS.paper, background: COLORS.pinkFluo, borderRadius: "999px", padding: "1px 7px", whiteSpace: "nowrap" }}>{tag}</span>
          )}
        </span>
        {subtitle && <span style={{ display: "block", fontSize: "11px", color: COLORS.inkSoft }}>{subtitle}</span>}
      </span>
      <NavIcon name="arrow-right-circle" size={18} color={COLORS.amber} />
    </button>
  );
}

export function NotSameCheckbox({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: 600, color: COLORS.ink, cursor: "pointer", marginTop: "10px" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: "18px", height: "18px", accentColor: COLORS.pinkFluo, flexShrink: 0 }} />
      {label}
    </label>
  );
}

export const duplicateNoteStyle = { fontSize: "12px", color: COLORS.ink, margin: "8px 0 0 0", lineHeight: 1.5 };
