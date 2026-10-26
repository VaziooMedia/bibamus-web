// ============================================================
// Carte « Notes » (tout en haut de l'onglet Biba360 d'une fiche produit) : la note étoilée du produit en trois lignes —
// You (ma note), Bibax (la moyenne de mes Bibax), Bibamus (la moyenne de tous les utilisateurs, exactement celle de la
// bannière de la fiche). Les trois mots sont ceux du bloc « Checks », juste en dessous.
//
// Chaque ligne reçoit soit rien (lecture en cours, échouée, ou personne n'a noté : un tiret), soit une valeur sur 5 ; Bibax et
// Bibamus reçoivent en plus le nombre d'avis. Les étoiles se remplissent au quart d'étoile (comme les notes elles-mêmes).
//
// Accessibilité : les étoiles sont décoratives (masquées aux lecteurs d'écran) ; la note s'écrit aussi en chiffres (« 4,3/5 »).
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { BlockTitle } from "./ui.jsx";

// « 3,25/5 » : deux décimales, virgule. Les notes se donnent au quart d'étoile (0,25 ; 3,25…) : avec une seule décimale,
// 3,25 s'afficherait « 3,3 » et 0,25 « 0,3 ». C'est aussi le format de la bannière de la fiche (elle l'utilise), pour que les
// deux ne puissent jamais différer.
export const formatRating = (value) => `${value.toFixed(2).replace(".", ",")}/5`;

function NoteRow({ label, value, count = null, first = false }) {
  const has = typeof value === "number" && isFinite(value);
  return (
    <div
      data-note={label}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", ...(first ? {} : { borderTop: `1px solid ${COLORS.paperAlt}`, paddingTop: "10px", marginTop: "10px" }) }}
    >
      <span style={{ flex: 1, minWidth: 0, fontSize: "14px", color: COLORS.ink, overflowWrap: "anywhere" }}>{label}</span>
      {has ? (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span aria-hidden="true" style={{ display: "flex" }}>
              <StarsDisplay value={value} size={14} />
            </span>
            <span data-note-value style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.amber, minWidth: "60px", textAlign: "right" }}>
              {formatRating(value)}
            </span>
          </span>
          {count != null && (
            <span data-note-count style={{ fontSize: "12px", color: COLORS.inkSoft }}>
              {count} avis
            </span>
          )}
        </span>
      ) : (
        <span data-note-value style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.amber, flexShrink: 0 }}>
          —
        </span>
      )}
    </div>
  );
}

// mine : ma note (nombre) ou null ; bibax / everyone : { average, count } ou null.
export function NotesCard({ mine, bibax, everyone }) {
  const some = (r) => r && r.count > 0 && typeof r.average === "number" && isFinite(r.average);
  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
      <BlockTitle style={{ marginBottom: "12px" }}>Notes</BlockTitle>
      <NoteRow first label="You" value={mine} />
      <NoteRow label="Bibax" value={some(bibax) ? bibax.average : null} count={some(bibax) ? bibax.count : null} />
      <NoteRow label="Bibamus" value={some(everyone) ? everyone.average : null} count={some(everyone) ? everyone.count : null} />
    </div>
  );
}
