// « PlaceChecks » (Mon Profil) — la liste des lieux que la personne a déjà checkés : un lieu une seule fois, par défaut du plus récemment visité au plus ancien
// (quatre classements au choix, voir SORTS), avec à droite son nombre de visites (le nombre seul, en vert fluo, dans une colonne plus sombre). Mêmes lignes que « Mes Favoris > Lieux » (rond de 40 px, nom en gras, ville · drapeau du pays) dans une carte, lignes pleine
// largeur séparées par un trait fin. Une ligne ouvre la fiche du lieu, dont le retour ramène ici. Une liste vide dit quel geste l'alimente.
// Les identifiants viennent de la fonction `get_my_checked_venues` (script bibamus-sql-mes-lieux-1-liste), puis les lieux par `loadVenuesByIds`.
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, PageFooterNav, EntityAvatar } from "./ui.jsx";
import { loadMyCheckedVenues, loadVenuesByIds } from "../data/sharedDirectories.js";
import { DotLine, ScreenTitle, countryFlagPart } from "./MyFavoritesScreen.jsx";
import { PillTabs } from "./PillTabs.jsx";
import { CountryFlagImg, COUNTRY_ISO_CODES } from "./icons.jsx";
import { SOLO_BAR_LABEL_STYLE, SOLO_BAR_LINE_STYLE } from "./BibaSoloScreen.jsx";

// Les classements au choix (pastilles de même largeur en haut de la page). « Récents » : l'ordre de la base, du plus récemment visité au plus ancien.
const SORTS = [
  { key: "recent", label: "Récents" },
  { key: "checks", label: "Checks" },
  { key: "country", label: "Pays" },
  { key: "alpha", label: "A–Z" },
];
const byName = (a, b) => a.venue.name.localeCompare(b.venue.name, "fr", { sensitivity: "base" });
const byChecks = (a, b) => b.visits - a.visits; // le tri de JavaScript est stable : à égalité, l'ordre « Récents » est conservé
// Range les lieux selon le classement : une liste de groupes { country, label, entries } (un seul groupe, sans titre, sauf pour « Pays »).
function arrange(entries, sort) {
  if (sort === "checks") return [{ entries: [...entries].sort(byChecks) }];
  if (sort === "alpha") return [{ entries: [...entries].sort(byName) }];
  if (sort === "country") {
    const groups = new Map();
    for (const x of entries) {
      const c = x.venue.country || "";
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(x);
    }
    return [...groups.keys()]
      .sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "fr", { sensitivity: "base" })))
      .map((c) => ({ country: c, label: c || "Pays non renseigné", entries: groups.get(c).sort(byChecks) }));
  }
  return [{ entries }];
}

function PlaceRow({ venue, visits, isLast, showFlag = true, onOpen }) {
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
        <DotLine parts={[venue.city, showFlag ? countryFlagPart(venue.country) : null].filter(Boolean)} />
      </div>
      {/* Colonne du chiffre : sur toute la hauteur de la ligne et jusqu'au bord de la carte, plus sombre que la carte, avec un trait fin à gauche ; le trait de séparation
          des lignes la traverse. Largeur d'au moins 52 px : les chiffres restent alignés d'une ligne à l'autre (jusqu'à 4 chiffres et au-delà, la colonne s'élargit). */}
      <span
        data-place-visits
        style={{
          flexShrink: 0,
          alignSelf: "stretch",
          minWidth: "52px",
          boxSizing: "border-box",
          padding: "0 8px",
          margin: `-12px -14px ${isLast ? "-12px" : "-13px"} 6px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.paper,
          borderLeft: `1px solid ${COLORS.paperAlt}`,
          borderBottom: isLast ? "none" : `1px solid ${COLORS.paperAlt}`,
          fontFamily: "'Urbanist', sans-serif",
          fontWeight: 800,
          fontSize: "16px",
          color: COLORS.amber,
          whiteSpace: "nowrap",
        }}
      >
        {visits}
      </span>
    </button>
  );
}

export function MyPlaceChecksScreen({ onBack, onOpenVenue }) {
  const [items, setItems] = useState(null); // null = chargement ; [{ venueId, visits, lastAt }]
  const [venuesById, setVenuesById] = useState({});
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState("recent");

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
      <ScreenTitle>
        Place<span style={{ color: COLORS.amber }}>Checks</span>
      </ScreenTitle>

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
          <>
            <PillTabs tabs={SORTS} active={sort} onChange={setSort} />
            {arrange(entries, sort).map((g, gi) => (
              <section key={g.label || "all"} data-place-group={g.label || ""}>
                {g.label && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: gi === 0 ? "0 0 18px" : "20px 0 18px" }}>
                    <span style={{ ...SOLO_BAR_LABEL_STYLE, display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      {COUNTRY_ISO_CODES[g.country] ? <CountryFlagImg country={g.country} size={16} /> : null}
                      {g.label}
                    </span>
                    <div style={SOLO_BAR_LINE_STYLE} />
                  </div>
                )}
                <div data-place-section style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 14px", overflow: "hidden" }}>
                  {g.entries.map((x, i) => (
                    <PlaceRow
                      key={x.venueId}
                      venue={x.venue}
                      visits={x.visits}
                      isLast={i === g.entries.length - 1}
                      showFlag={sort !== "country"}
                      onOpen={onOpenVenue ? () => onOpenVenue(x.venue.id) : null}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
