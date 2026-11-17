// « PlaceChecks » (Mon Profil) — la liste des lieux que la personne a déjà checkés : un lieu une seule fois, par défaut du plus récemment visité au plus ancien
// (quatre classements au choix : Récents, Checks, Pays, A–Z), avec à droite son nombre de visites (le nombre seul, en vert fluo, dans une colonne plus sombre).
// Mêmes lignes que « Mes Favoris > Lieux » (rond de profil de 48 px, nom en gras, ville · drapeau du pays) dans une carte, lignes pleine
// largeur séparées par un trait fin. Une ligne ouvre la fiche du lieu, dont le retour ramène ici. Une liste vide dit quel geste l'alimente.
// Les lignes, les groupes et les classements sont communs avec « DrinkChecks » (CheckListParts.jsx). Classés A–Z, à partir de 30 lieux, un index des lettres (AlphaIndex) borde la liste à droite.
// Sous les classements, deux blocs côte à côte avec les totaux : « X PlaceChecks » (la somme des visites) et « X Lieux uniques ». Classés par pays, la barre de chaque pays porte, au bout de la ligne,
// ses propres totaux : « (checks / lieux uniques) ».
// Retour d'une fiche : la page se remet comme on l'avait laissée (classement et hauteur de défilement, voir `useListReturn`) ; ce qu'elle affichait revient aussitôt, puis la liste est relue
// en silence et remplacée seulement si elle a changé (un PlaceCheck fait sur la fiche). Une entrée depuis Mon Profil repart de zéro.
// Les identifiants viennent de la fonction `get_my_checked_venues` (script bibamus-sql-mes-lieux-1-liste), puis les lieux par `loadVenuesByIds`.
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, PageFooterNav } from "./ui.jsx";
import { loadMyCheckedVenues, loadVenuesByIds } from "../data/sharedDirectories.js";
import { ScreenTitle, countryFlagPart } from "./MyFavoritesScreen.jsx";
import { PillTabs } from "./PillTabs.jsx";
import { CountryFlagImg, COUNTRY_ISO_CODES } from "./icons.jsx";
import { CHECK_SORTS, arrangeChecks, countryOptions, letterOf, alphaRowFor, CheckGroup, CheckRow, CheckTotals } from "./CheckListParts.jsx";
import { AlphaIndex, showAlphaIndex } from "./AlphaIndex.jsx";
import { CountryPicker } from "./CountryPicker.jsx";
import { useListReturn } from "../hooks/useListReturn.js";
import placeCheckIconUrl from "../assets/brand/place-check-lieux.svg";

const SORT_FIELDS = { nameOf: (x) => x.venue.name, countOf: (x) => x.visits, countryOf: (x) => x.venue.country };

const signatureOf = (list) => list.map((x) => `${x.venueId}:${x.visits}`).join(",");

export function MyPlaceChecksScreen({ onBack, onOpenVenue, mainScrollRef }) {
  const { restored, save, open } = useListReturn("myPlaceChecks", mainScrollRef);
  const [items, setItems] = useState(restored ? restored.items : null); // null = chargement ; [{ venueId, visits, lastAt }]
  const [venuesById, setVenuesById] = useState(restored ? restored.venuesById : {});
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState(restored ? restored.sort : "recent");
  const [country, setCountry] = useState(restored ? restored.country ?? null : null); // classé « Pays » : le pays choisi dans la liste déroulante (null = tous)

  useEffect(() => {
    let cancelled = false;
    setError(false);
    loadMyCheckedVenues().then(async (list) => {
      if (cancelled) return;
      if (!list) {
        // Si la base n'a pas répondu, on ne prétend pas que la liste est vide : on n'affiche que le message d'erreur.
        // Au retour d'une fiche, on garde en silence ce qu'on avait.
        if (!restored) {
          setError(true);
          setItems((prev) => prev || []);
        }
        return;
      }
      // Au retour d'une fiche, rien à remplacer si la liste n'a pas changé.
      if (restored && signatureOf(list) === signatureOf(restored.items)) return;
      const venues = await loadVenuesByIds(list.map((x) => x.venueId));
      if (cancelled) return;
      setVenuesById(Object.fromEntries(venues.map((v) => [String(v.id), v])));
      setItems(list);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // La mémoire suit la page ; la hauteur de défilement s'y ajoute au moment où l'on ouvre une fiche.
  useEffect(() => {
    if (items === null || error) return;
    save({ items, venuesById, sort, country });
  }, [items, venuesById, sort, country, error]);
  const openVenue = onOpenVenue ? open(onOpenVenue) : null;

  const loading = items === null;
  const entries = (items || []).map((x) => ({ ...x, venue: venuesById[x.venueId] })).filter((x) => x.venue);
  // Classé « Pays » : la liste déroulante des pays de la liste ; un pays choisi ne garde que ses lieux.
  const countryChoices = sort === "country" ? countryOptions(entries, SORT_FIELDS.countryOf) : [];
  const activeCountry = countryChoices.some((o) => o.country === country) ? country : null;
  const shown = activeCountry === null ? entries : entries.filter((x) => (SORT_FIELDS.countryOf(x) || "") === activeCountry);
  const groups = arrangeChecks(shown, sort, SORT_FIELDS);
  // Classé A–Z : l'index des lettres sur le bord droit (AlphaIndex).
  const listRef = React.useRef(null);
  const alphaOn = showAlphaIndex(sort, entries.length);
  const alphaLetters = alphaOn ? [...new Set(entries.map((x) => letterOf(x.venue.name)))] : [];
  const alphaTarget = (letter) => alphaRowFor(listRef.current, groups.flatMap((g) => g.entries), (x) => x.venue.name, letter);

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <ScreenTitle iconUrl={placeCheckIconUrl}>
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
          <p data-check-empty style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 4px" }}>
            Aucun lieu checké pour l'instant. Fais un PlaceCheck depuis la fiche d'un lieu.
          </p>
        ) : (
          <>
            <PillTabs tabs={CHECK_SORTS} active={sort} onChange={(k) => { if (k !== sort) setCountry(null); setSort(k); }} fine />
            {countryChoices.length > 1 && <CountryPicker options={countryChoices} value={activeCountry} total={entries.length} onChange={setCountry} />}
            <CheckTotals checks={shown.reduce((sum, x) => sum + x.visits, 0)} unique={shown.length} brand="Place" uniqueLabel={["Lieu unique", "Lieux uniques"]} />
            <div ref={listRef} style={{ position: "relative" }}>
            {alphaOn && <AlphaIndex available={alphaLetters} scrollRef={mainScrollRef} targetFor={alphaTarget} />}
            {groups.map((g, gi) => (
              <CheckGroup key={g.key} label={g.label} flag={COUNTRY_ISO_CODES[g.country] ? <CountryFlagImg country={g.country} size={16} /> : null} counts={g.label ? { checks: g.entries.reduce((sum, x) => sum + x.visits, 0), unique: g.entries.length } : null} isFirst={gi === 0}>
                {g.entries.map((x, i) => (
                  <CheckRow
                    key={x.venueId}
                    avatarPhotoUrl={x.venue.profilePhotoUrl}
                    avatarEmoji={x.venue.avatarEmoji}
                    fallbackIcon="map-pin"
                    name={x.venue.name}
                    parts={[x.venue.city, sort !== "country" ? countryFlagPart(x.venue.country) : null].filter(Boolean)}
                    count={x.visits}
                    isLast={i === g.entries.length - 1}
                    onOpen={openVenue ? () => openVenue(x.venue.id) : null}
                  />
                ))}
              </CheckGroup>
            ))}
            </div>
          </>
        )}
      </div>

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
