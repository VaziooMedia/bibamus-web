import React, { useEffect, useState } from "react";
import { COLORS } from "../constants.js";
import { EntityAvatar } from "./ui.jsx";
import { formatAddress } from "../utils.js";
import { loadVenueListsOnce } from "../data/sharedDirectories.js";
import { VENUE_TYPE_LIST_KEY, registerVenueTypeNames, venueTypeDisplayName } from "../venueLists.js";

// Fiche lieu en petit, dans une carte du fil BibaPulse (PlaceCheck). Même cadre et même mise en page que la fiche produit d'un
// DrinkCheck (PulseProductCard) : le rond-profil (photo du lieu, ou son emoji, ou le « B » Bibamus à défaut) est centré sur les TROIS
// premières lignes ; les suivantes reviennent sous lui, contre le bord gauche du bloc.
//   1. le nom ;
//   2. le sous-titre, en italique avec le petit point vert fluo de 6 px devant — comme sur les listes et le cadre de la carte du BibAtlas ;
//   3. l'adresse postale (même écriture que les listes du BibAtlas : « Rue Haute, 8 - B-4000 Liège ») ;
//   4. les types d'établissement, en petites pastilles (les mêmes que celles des styles d'un produit) — sur une ou plusieurs lignes.
// Une ligne sans donnée n'est pas affichée. Toute la fiche est un bouton qui ouvre le lieu. Les données viennent du lieu lui-même
// (jamais copiées dans la carte). Les noms de types modifiés depuis la plateforme de gestion sont chargés comme sur la fiche du lieu
// (une seule lecture par session) ; un type dont le nom n'est pas connu n'est pas montré (jamais son code technique).
export function PulseVenueCard({ venue, onOpen }) {
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
        <EntityAvatar photoUrl={venue.profilePhotoUrl} photoEmoji={venue.avatarEmoji} size={56} />
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
    </button>
  );
}
