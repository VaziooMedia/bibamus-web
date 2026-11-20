// ============================================================
// Carte « Notes » (tout en haut de l'onglet Biba360 d'une fiche produit ou d'une fiche marque) : la note étoilée en trois
// lignes — You (ma note), Bibax (la moyenne de mes Bibax), Bibamus (la moyenne de tous les utilisateurs, exactement celle de la
// bannière de la fiche). Les trois mots sont ceux du bloc « Checks » de la fiche produit, juste en dessous.
//
// Chaque ligne reçoit soit rien (lecture en cours, échouée, ou personne n'a noté : un tiret), soit une valeur sur 5 ; Bibax et
// Bibamus reçoivent en plus le nombre d'avis. Les étoiles se remplissent au quart d'étoile (comme les notes elles-mêmes).
//
// Accessibilité : les étoiles sont décoratives (masquées aux lecteurs d'écran) ; la note s'écrit aussi en chiffres (« 4,30 / 5 »).
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { BlockTitle } from "./ui.jsx";
import { formatCount } from "../utils.js";

// « 3,25 / 5 » : deux décimales, virgule, une espace de chaque côté du « / ». Les notes se donnent au quart d'étoile (0,25 ; 3,25…) : avec une seule décimale,
// 3,25 s'afficherait « 3,3 » et 0,25 « 0,3 ». C'est aussi le format de la bannière de la fiche (elle l'utilise), pour que les
// deux ne puissent jamais différer (la bannière passe par RatingFraction, juste en dessous).
export const formatRating = (value) => `${value.toFixed(2).replace(".", ",")} / 5`;

// La même note pour la bannière de la couverture, avec le « / » en vert fluo (« 3,25 / 5 »). Mêmes chiffres et mêmes espaces que
// formatRating : on le coupe au « / » plutôt que de refaire l'arrondi.
export function RatingFraction({ value }) {
  const [number, max] = formatRating(value).split(" / ");
  return (
    <>
      {number}
      <span style={{ color: COLORS.amber }}> / </span>
      {max}
    </>
  );
}

// Cadre commun d'une ligne de la carte : le mot à gauche (You / Bibax / Bibamus), la valeur à droite (`children`), un filet entre deux lignes.
function NoteRowShell({ label, first = false, children }) {
  return (
    <div
      data-note={label}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", ...(first ? {} : { borderTop: `1px solid ${COLORS.paperAlt}`, paddingTop: "10px", marginTop: "10px" }) }}
    >
      <span style={{ flex: 1, minWidth: 0, fontSize: "14px", color: COLORS.ink, overflowWrap: "anywhere" }}>{label}</span>
      {children}
    </div>
  );
}

function NoteRow({ label, value, count = null, first = false }) {
  const has = typeof value === "number" && isFinite(value);
  return (
    <NoteRowShell label={label} first={first}>
      {has ? (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span aria-hidden="true" style={{ display: "flex" }}>
              <StarsDisplay value={value} size={14} />
            </span>
            {/* Les chiffres en blanc (`COLORS.ink`) et le « / » en vert fluo — Mehdi, 2026-11-20 (essai : d'abord le « / » blanc et les chiffres verts, puis l'inverse) ; comme la bannière de la couverture (`RatingFraction`). */}
            <span data-note-value style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.ink, minWidth: "72px", textAlign: "right" }}>
              <RatingFraction value={value} />
            </span>
          </span>
          {count != null && (
            <span data-note-count style={{ fontSize: "12px", color: COLORS.inkSoft }}>
              {formatCount(count)} avis
            </span>
          )}
        </span>
      ) : (
        <span data-note-value style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.amber, flexShrink: 0 }}>
          —
        </span>
      )}
    </NoteRowShell>
  );
}

// mine : ma note (nombre) ou null ; bibax / everyone : { average, count } ou null.
export function NotesCard({ mine, bibax, everyone }) {
  const some = (r) => r && r.count > 0 && typeof r.average === "number" && isFinite(r.average);
  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
      <BlockTitle>Notes</BlockTitle>
      <NoteRow first label="You" value={mine} />
      <NoteRow label="Bibax" value={some(bibax) ? bibax.average : null} count={some(bibax) ? bibax.count : null} />
      <NoteRow label="Bibamus" value={some(everyone) ? everyone.average : null} count={some(everyone) ? everyone.count : null} />
    </div>
  );
}

// ------------------------------------------------------------
// Fiche Lieu (onglet Biba360, Mehdi, 2026-11-21) : la même carte « Notes », mêmes mots (You / Bibax / Bibamus), mais l'appréciation d'un lieu n'est pas une note étoilée : c'est un des
// 5 paliers positifs (« Sympa » à « Incontournable », voir RATING_LABELS), sans étoiles ni chiffres. Chaque ligne montre donc une flamme et le mot du palier, comme la ligne d'appréciation
// des cartes PlaceCheck de BibaPulse. Chaque ligne reçoit `{ text, count? }` (le mot déjà choisi par l'appelant) ou null (lecture en cours ou échouée, personne n'a apprécié : un tiret).
// ------------------------------------------------------------
function VenueNoteRow({ label, rating, first = false }) {
  const has = !!(rating && rating.text);
  return (
    <NoteRowShell label={label} first={first}>
      {has ? (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <span aria-hidden="true" style={{ display: "flex", flexShrink: 0 }}>
              <NavIcon name="flame" size={16} color={COLORS.amber} filled />
            </span>
            <span data-note-value style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "16px", color: COLORS.ink, textAlign: "right", overflowWrap: "anywhere" }}>
              {rating.text}
            </span>
          </span>
          {rating.count != null && (
            <span data-note-count style={{ fontSize: "12px", color: COLORS.inkSoft }}>
              {formatCount(rating.count)} avis
            </span>
          )}
        </span>
      ) : (
        <span data-note-value style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px", color: COLORS.amber, flexShrink: 0 }}>
          —
        </span>
      )}
    </NoteRowShell>
  );
}

export function VenueNotesCard({ mine, bibax, everyone }) {
  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
      <BlockTitle>Notes</BlockTitle>
      <VenueNoteRow first label="You" rating={mine} />
      <VenueNoteRow label="Bibax" rating={bibax} />
      <VenueNoteRow label="Bibamus" rating={everyone} />
    </div>
  );
}
