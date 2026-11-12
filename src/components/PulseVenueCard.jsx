import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";
import { venueRatingText } from "./VenueRatingDisplay.jsx";
import { formatAddress } from "../utils.js";
import { loadVenueListsOnce, loadVenueRatingSummary } from "../data/sharedDirectories.js";
import { VENUE_TYPE_LIST_KEY, registerVenueTypeNames, venueTypeDisplayName } from "../venueLists.js";

// Appréciation des lieux « checkés » (PlaceCheck) dans un fil BibaPulse, par identifiant de lieu : la même lecture que la bannière de la
// fiche du lieu (`get_venue_rating_summary`), faite UNE seule fois par lieu et par session (jamais deux fois le même lieu, même si
// plusieurs cartes parlent de lui). Une lecture qui échoue donne « pas d'appréciation », sans nouvel essai. Partagé par le fil général
// et par la section Pulse des fiches (même carte, mêmes données).
export function usePulseVenueRatingsById(entries) {
  const [ratingsById, setRatingsById] = useState({});
  const requested = useRef(new Set());
  useEffect(() => {
    const ids = new Set();
    (entries || []).forEach((e) => {
      if ((e.eventType === "venue_visit" || e.eventType === "database_contribution") && e.objectType === "venue" && e.objectId && !requested.current.has(e.objectId)) ids.add(e.objectId);
    });
    ids.forEach((id) => {
      requested.current.add(id);
      loadVenueRatingSummary(id).then((summary) => setRatingsById((prev) => ({ ...prev, [id]: summary || null })));
    });
  }, [entries]);
  return ratingsById;
}

// Fiche lieu en petit, dans une carte du fil BibaPulse (PlaceCheck). Même cadre et même mise en page que la fiche produit d'un
// DrinkCheck (PulseProductCard) : le rond-profil (photo du lieu, ou son emoji, ou l'icône « lieu » (épingle) à défaut — comme la recherche) est centré sur les TROIS
// premières lignes ; les suivantes reviennent sous lui, contre le bord gauche du bloc.
//   1. le nom ;
//   2. le sous-titre, en italique avec le petit point vert fluo de 6 px devant — comme sur les listes et le cadre de la carte du BibAtlas ;
//   3. l'adresse postale (même écriture que les listes du BibAtlas : « Rue Haute, 8 - B-4000 Liège ») ;
//   4. les types d'établissement, en petites pastilles (les mêmes que celles des styles d'un produit) — sur une ou plusieurs lignes ;
//   5. l'appréciation du lieu (« Excellent - 12 avis », même texte que la bannière de sa fiche), en pastille noire à bord vert comme la note
//      moyenne du produit — rien tant que le lieu n'a aucun avis (ou tant que la lecture n'est pas arrivée).
// Une ligne sans donnée n'est pas affichée. Toute la fiche est un bouton qui ouvre le lieu. Les données viennent du lieu lui-même
// (jamais copiées dans la carte). Les noms de types modifiés depuis la plateforme de gestion sont chargés comme sur la fiche du lieu
// (une seule lecture par session) ; un type dont le nom n'est pas connu n'est pas montré (jamais son code technique).
export function PulseVenueCard({ venue, rating = null, onOpen }) {
  const [, setTypeNamesTick] = useState(0);
  const hasTypes = (venue.venueTypes || []).length > 0;
  useEffect(() => {
    if (!hasTypes) return undefined;
    let cancelled = false;
    loadVenueListsOnce().then((lists) => {
      if (lists && registerVenueTypeNames(lists[VENUE_TYPE_LIST_KEY].rows) && !cancelled) setTypeNamesTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [hasTypes, venue.id]);

  const typeLabels = (venue.venueTypes || []).map((code) => venueTypeDisplayName(code)).filter(Boolean);
  const address = formatAddress(venue);
  const ratingText = venueRatingText(rating);

  const lineStyle = { display: "block", marginTop: "3px" };
  const chipStyle = { background: COLORS.paperAlt, borderRadius: "999px", padding: "0.3em 0.8em", fontSize: "10px", fontWeight: 600, color: COLORS.ink, whiteSpace: "nowrap" };

  return (
    <button
      type="button"
      onClick={onOpen || undefined}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: COLORS.surfaceAlt,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "10px",
        padding: "10px 12px",
        color: COLORS.ink,
        cursor: onOpen ? "pointer" : "default",
        font: "inherit",
      }}
    >
      {/* Rond-profil, centré sur les trois premières lignes : nom, sous-titre, adresse */}
      <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <EntityAvatar photoUrl={venue.profilePhotoUrl} photoEmoji={venue.avatarEmoji} size={56} fallbackIcon="map-pin" />
        <span style={{ flex: 1, minWidth: 0 }}>
          {/* Ligne 1 : nom */}
          <span style={{ display: "block", fontWeight: 700, fontSize: "14px", overflowWrap: "anywhere" }}>{venue.name}</span>
          {/* Ligne 2 : sous-titre, précédé du point vert fluo */}
          {venue.subtitle && (
            <span style={{ ...lineStyle, display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: COLORS.chalkWhite, fontStyle: "italic", fontWeight: 600 }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{venue.subtitle}</span>
            </span>
          )}
          {/* Ligne 3 : adresse */}
          {address && <span style={{ ...lineStyle, fontSize: "11.5px", color: COLORS.inkSoft, overflowWrap: "anywhere" }}>{address}</span>}
        </span>
      </span>
      {/* Lignes suivantes : sous le rond-profil, contre le bord gauche du bloc */}
      {/* Ligne 4 (et 5 si beaucoup de types) : types d'établissement, en petites pastilles */}
      {typeLabels.length > 0 && (
        <span style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
          {typeLabels.map((label) => (
            <span key={label} style={chipStyle}>
              {label}
            </span>
          ))}
        </span>
      )}
      {/* Dernière ligne : appréciation du lieu */}
      {ratingText && (
        <span style={{ display: "block", marginTop: "8px" }}>
          <span
            title="Appréciation du lieu"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", maxWidth: "100%", boxSizing: "border-box", background: "#000", border: `2px solid ${COLORS.amber}`, borderRadius: "8px", padding: "3px 8px" }}
          >
            <NavIcon name="flame" size={13} color={COLORS.amber} filled />
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "12px", color: COLORS.chalkWhite, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ratingText}</span>
            <span style={{ fontSize: "10px", color: COLORS.inkSoft, whiteSpace: "nowrap" }}>- {rating.rating_count} avis</span>
          </span>
        </span>
      )}
    </button>
  );
}
