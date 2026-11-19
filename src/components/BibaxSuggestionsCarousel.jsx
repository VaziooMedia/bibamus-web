// ============================================================
// Carrousel des « Suggestions rapides » de l'accueil (décision de Mehdi, 2026-11-18) : une rangée de cartes verticales (230 px de large) qu'on fait défiler vers la gauche.
// Chaque carte : un grand rond de profil cerclé de vert fluo, avec un petit « + » vert pour ajouter en un tap, un « × » gris (`inkSoft`) dans le coin pour supprimer la suggestion
// (la suivante prend sa place), le nom, deux lignes de détails (@nom + surnom ; commune + drapeau — `BibaxDetailLines`) et une pastille de raison (« 4 Bibax en commun », « 0 » compris). Une carte « Voir tout » ferme la rangée.
// La page Mes Bibax, elle, garde des listes (onglet « Suggestions »).
//
// `suggestions` : les suggestions à afficher (voir `loadBibaxSuggestions`) ; `onOpen(bibroCode)` ouvre le profil ; `onAdd(bibroCode)` envoie la demande ;
// `onDismiss(suggestion)` supprime la suggestion ; `busyCode` : le code en cours d'ajout ; `onSeeAll` : la carte « Voir tout » (absente si non fourni).
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar, MutualPill } from "./ui.jsx";
import { BibaxDetailLines } from "./BibaxLines.jsx";

// Largeur d'une carte (Mehdi, 2026-11-19) : 230 px, pour qu'un nom long (2 lignes) et la plus longue commune (« Ottignies-Louvain-la-Neuve » + drapeau) tiennent en entier, même à 320 px d'écran ;
// à 390 px on voit une carte entière et un bout de la suivante, ce qui indique qu'on peut faire défiler.
const CARD_WIDTH = 230;

export function BibaxSuggestionsCarousel({ suggestions, onOpen, onAdd, onDismiss, busyCode, onSeeAll }) {
  const card = { background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "16px", cursor: "pointer", boxSizing: "border-box" };
  return (
    <div style={{ display: "flex", gap: "10px", overflowX: "auto", scrollSnapType: "x mandatory", scrollPaddingLeft: "20px", margin: "0 -20px", padding: "4px 20px 10px", scrollbarWidth: "none" }}>
      {suggestions.map((s) => {
        const fullName = [s.name, s.lastName].filter(Boolean).join(" ") || "Bibax";
        return (
          <div
            key={s.userId}
            onClick={() => onOpen(s.bibroCode)}
            style={{ ...card, position: "relative", flex: `0 0 ${CARD_WIDTH}px`, scrollSnapAlign: "start", padding: "16px 10px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}
          >
            <span
              role="button"
              aria-label="Supprimer cette suggestion"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(s);
              }}
              style={{ position: "absolute", top: "6px", right: "6px", width: "26px", height: "26px", borderRadius: "50%", background: COLORS.surface, border: `1.5px solid ${COLORS.inkSoft}`, boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <NavIcon name="x" size={13} color={COLORS.inkSoft} />
            </span>

            <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
              <span style={{ display: "inline-flex", padding: "3px", borderRadius: "50%", border: `2px solid ${COLORS.amber}` }}>
                <EntityAvatar photoUrl={s.avatarUrl} size={72} />
              </span>
              <span
                role="button"
                aria-label="Ajouter"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(s.bibroCode);
                }}
                style={{ position: "absolute", right: "-4px", bottom: "-2px", width: "28px", height: "28px", borderRadius: "50%", background: COLORS.amber, border: `3px solid ${COLORS.surface}`, display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: busyCode === s.bibroCode ? 0.5 : 1, cursor: "pointer", boxSizing: "content-box" }}
              >
                <NavIcon name="plus" size={16} color={COLORS.paper} />
              </span>
            </span>

            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: 0, width: "100%" }}>
              <span style={{ fontWeight: 700, fontSize: "13.5px", color: COLORS.ink, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>{fullName}</span>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "2px", marginTop: "3px" }}>
                <BibaxDetailLines username={s.username} nickname={s.nickname} city={s.city} locality={s.locality} country={s.country} center />
              </div>
            </span>

            {/* Raison de la suggestion : toujours le nombre de Bibax en commun, « 0 Bibax en commun » compris (Mehdi, 2026-11-18 ; la distance n'est plus affichée, trop intrusive). */}
            <MutualPill n={s.mutualCount || 0} />
          </div>
        );
      })}

      {onSeeAll && (
        <div
          onClick={onSeeAll}
          style={{ ...card, flex: "0 0 110px", scrollSnapAlign: "start", border: `2px dashed ${COLORS.paperAlt}`, background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: COLORS.amber, fontSize: "12.5px", fontWeight: 700 }}
        >
          <NavIcon name="chevron-right" size={22} color={COLORS.amber} />
          Voir tout
        </div>
      )}
    </div>
  );
}
