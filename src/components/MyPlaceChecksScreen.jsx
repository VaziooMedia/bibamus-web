// « PlaceChecks » (Mon Profil) — la liste des lieux que la personne a déjà checkés : un lieu une seule fois, du plus récemment visité au plus ancien,
// avec à droite son nombre de visites. Mêmes lignes que « Mes Favoris > Lieux » (rond de 40 px, nom en gras, ville · pays) dans une carte, lignes pleine
// largeur séparées par un trait fin. Une ligne ouvre la fiche du lieu, dont le retour ramène ici. Une liste vide dit quel geste l'alimente.
// Les identifiants viennent de la fonction `get_my_checked_venues` (script bibamus-sql-mes-lieux-1-liste), puis les lieux par `loadVenuesByIds`.
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, PageFooterNav, EntityAvatar } from "./ui.jsx";
import { loadMyCheckedVenues, loadVenuesByIds } from "../data/sharedDirectories.js";
import { DotLine, ScreenTitle } from "./MyFavoritesScreen.jsx";

const visitsLabel = (n) => `${n} visite${n > 1 ? "s" : ""}`;

function PlaceRow({ venue, visits, isLast, onOpen }) {
  return (
    <button
      type="button"
      data-place-row
      onClick={onOpen || undefined}
      disabled={!onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "12px 0",
        background: "none",
        border: "none",
        borderBottom: isLast ? "none" : `1px solid ${COLORS.paperAlt}`,
        textAlign: "left",
        color: "inherit",
        font: "inherit",
        cursor: onOpen ? "pointer" : "default",
      }}
    >
      <span style={{ flexShrink: 0, display: "flex" }}>
        <EntityAvatar photoUrl={venue.profilePhotoUrl} photoEmoji={venue.avatarEmoji} size={40} fallbackIcon="map-pin" />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.ink }}>{venue.name}</span>
        <DotLine parts={[venue.city, venue.country].filter(Boolean)} />
      </div>
      <span data-place-visits style={{ flexShrink: 0, fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", color: COLORS.chalkWhite, whiteSpace: "nowrap" }}>
        {visitsLabel(visits)}
      </span>
    </button>
  );
}

export function MyPlaceChecksScreen({ onBack, onOpenVenue }) {
  const [items, setItems] = useState(null); // null = chargement ; [{ venueId, visits, lastAt }]
  const [venuesById, setVenuesById] = useState({});
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    loadMyCheckedVenues().then(async (list) => {
      if (cancelled) return;
      if (!list) {
        // Si la base n'a pas répondu, on ne prétend pas que la liste est vide : on n'affiche que le message d'erreur.
        setError(true);
        setItems((prev) => prev || []);
        return;
      }
      const venues = await loadVenuesByIds(list.map((x) => x.venueId));
      if (cancelled) return;
      setVenuesById(Object.fromEntries(venues.map((v) => [String(v.id), v])));
      setItems(list);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const loading = items === null;
  const entries = (items || []).map((x) => ({ ...x, venue: venuesById[x.venueId] })).filter((x) => x.venue);

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle>Lieux checkés</ScreenTitle>

      <div style={{ flex: 1 }}>
        {loading ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "20px" }}>Chargement...</p>
        ) : error ? (
          <p style={{ fontSize: "12.5px", color: "#FF3B3B", textAlign: "center", margin: "0 0 16px" }}>
            Impossible de charger tes lieux.{" "}
            <button type="button" onClick={() => setAttempt((n) => n + 1)} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "12.5px" }}>
              Réessayer
            </button>
          </p>
        ) : entries.length === 0 ? (
          <p data-place-empty style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" }}>
            Aucun lieu checké pour l'instant. Fais un PlaceCheck depuis la fiche d'un lieu.
          </p>
        ) : (
          <div data-place-section style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px" }}>
            {entries.map((x, i) => (
              <PlaceRow key={x.venueId} venue={x.venue} visits={x.visits} isLast={i === entries.length - 1} onOpen={onOpenVenue ? () => onOpenVenue(x.venue.id) : null} />
            ))}
          </div>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
