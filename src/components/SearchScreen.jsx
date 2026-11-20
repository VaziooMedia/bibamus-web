// ============================================================
// Écran de recherche — accessible depuis la barre de recherche
// sur Home. Une seule saisie, 5 onglets de résultats en haut
// (avec le nombre de résultats chacun) : Lieux, Produits,
// Marques, Producteurs, Bibax. Un seul onglet affiché à la fois,
// en liste complète — pensé pour rester utilisable même quand la
// base grandit (pas de multiples listes tronquées empilées).
//
// « @nom » : une saisie qui commence par « @ » cherche aussi, en plus de la recherche normale, UN seul
// compte, lieu, marque ou producteur dont le nom d'utilisateur est exactement celui-là (pas de
// recherche partielle). Le résultat prend place dans l'onglet qui lui correspond.
//
// Mode « atlas » (prop atlas) : l'écran BibAtlas fusionné. Même barre, mêmes
// onglets (sans la pastille BibAtlas, puisqu'on y est déjà) ; tant qu'aucune
// recherche n'est lancée, les blocs du répertoire s'affichent en dessous :
// Lieux, Produits, Marques, Producteurs, Bibax. Le bloc Bibax ouvre sa propre
// page (BibaxDirectoryScreen).
// ============================================================
import React, { useState, useEffect, useMemo, useRef } from "react";
import { COLORS, SUBTYPE_LABELS } from "../constants.js";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import { EntityAvatar, ActionCard, MutualPill } from "./ui.jsx";
import { formatAddress, usernameFromQuery, makeSearchMatcher, entityNames, formatCount } from "../utils.js";
import { searchBibax, searchDrinksNoGeneric, searchVenues, lookupUsername, lookupBibroCode, loadVenuesByIds } from "../data/sharedDirectories.js";
import { AiIcon } from "./AiIcon.jsx";
import { useListReturn } from "../hooks/useListReturn.js";
import { AddAfterSearch } from "./AddAfterSearch.jsx";
import { AddVenueOverlay } from "./AddVenueOverlay.jsx";
import { AddDrinkOverlay } from "./AddDrinkOverlay.jsx";

function TagButton({ label, count, filled, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        background: filled ? COLORS.amber : "none",
        border: `2px solid ${filled ? COLORS.amber : count > 0 ? COLORS.amber : COLORS.paperAlt}`,
        borderRadius: "999px",
        padding: "6px 12px",
        fontSize: "12.5px",
        fontWeight: 700,
        color: filled ? COLORS.paper : count > 0 ? COLORS.ink : COLORS.inkSoft,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
      <span style={{ color: filled ? COLORS.paper : COLORS.inkSoft, fontWeight: 700 }}>({formatCount(count)})</span>
    </button>
  );
}

export function ResultRow({ title, subtitle, avatar, onClick, last, enlargeAvatar = false, band = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        // band : ligne en « bande » pleine largeur (liste hors bloc, bandes séparées par un écart) : même fond que les blocs des répertoires, bordure 2px en haut et en bas
        // seulement (les côtés sont hors de l'écran), 14 px de chaque côté, hauteur 60 px.
        background: band ? COLORS.surface : "none",
        border: "none",
        ...(band
          ? { borderTop: `2px solid ${COLORS.paperAlt}`, borderBottom: `2px solid ${COLORS.paperAlt}` }
          : { borderBottom: last ? "none" : `1px solid ${COLORS.paperAlt}` }),
        padding: band ? "10px 14px" : "12px 4px",
        textAlign: "left",
        cursor: "pointer",
        color: COLORS.ink,
      }}
    >
      {enlargeAvatar ? (
        // Rond plus grand que la ligne (52 px au lieu de 36 px, avatar passé par l'appelant) sans en changer la hauteur : les marges négatives de 8 px en haut et en bas
        // reprennent exactement l'écart de 16 px ajouté, la ligne garde ses 60 px. Le rond reste à 4 px du haut et du bas de la ligne.
        <span style={{ display: "flex", flexShrink: 0, margin: "-8px 0" }}>{avatar}</span>
      ) : (
        avatar
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "12px", color: COLORS.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</div>}
      </span>
      <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
    </button>
  );
}

const TABS = [
  { key: "lieux", label: "Lieux", icon: "map-pin" },
  { key: "produits", label: "Produits", icon: "bottle" },
  { key: "marques", label: "Marques", icon: "tag" },
  { key: "producteurs", label: "Producteurs", icon: "world" },
  { key: "bibax", label: "Bibax", icon: "users" },
];

export function SearchScreen({
  breweriesDirectory = [],
  brandsDirectory = [],
  onOpenVenue,
  onOpenDrink,
  onOpenBrewery,
  onOpenBrand,
  onOpenBibaxProfile,
  goToScan,
  goToAtlas,
  hideBibaxAndAtlas = false,
  atlas = false,
  goToLieux,
  goToProduits,
  goToMarques,
  goToProducteurs,
  goToBibax,
  initialTab = "lieux",
  onBack,
  screenId = "search",
  mainScrollRef,
}) {
  // Les résultats défilent avec toute la page, dans le conteneur principal d'App : c'est sa hauteur que l'on retient au clic sur une fiche.
  const { restored, save, open } = useListReturn(screenId, mainScrollRef);
  const wrap = (fn) => (fn ? open(fn) : fn);
  const openVenue = wrap(onOpenVenue);
  const openDrink = wrap(onOpenDrink);
  const openBrewery = wrap(onOpenBrewery);
  const openBrand = wrap(onOpenBrand);
  const openBibaxProfile = wrap(onOpenBibaxProfile);
  // Au retour d'une fiche, la première recherche de chaque sorte est sautée : les résultats mémorisés restent affichés.
  const skipFirst = useRef({ bibax: !!restored, drinks: !!restored, venues: !!restored, at: !!restored, picked: !!restored });
  const [query, setQuery] = useState(restored ? restored.query : "");
  const [activeTab, setActiveTab] = useState(restored ? restored.activeTab : initialTab);
  const [bibaxSearchResults, setBibaxResults] = useState(restored ? restored.bibaxSearchResults : []);
  const [bibaxLoading, setBibaxLoading] = useState(false);
  const inputRef = useRef(null);
  // Tant que la personne n'a pas cliqué elle-même sur un onglet pour cette recherche, l'onglet
  // affiché suit automatiquement celui qui a le plus de résultats. Un clic manuel arrête ce
  // suivi jusqu'à la prochaine requête tapée.
  const userPickedTabRef = useRef(restored ? !!restored.userPicked : false);

  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 2;
  // « @nom » est une recherche exacte à part (plus bas) : la recherche normale ne s'y applique pas, elle ignorerait le « @ » et ramènerait des fiches partielles.
  const plain = trimmed.startsWith("@") ? "" : trimmed;
  const hasPlain = plain.length >= 2;
  // Même règle de recherche que partout dans l'app : chaque mot tapé doit se retrouver, dans n'importe quel ordre, sans tenir compte des accents,
  // des apostrophes, des tirets ni des espaces. Les marques et producteurs se cherchent dans leur nom, leur nom alternatif, leurs alias et leurs traductions.
  const matches = useMemo(() => makeSearchMatcher(plain), [plain]);

  const [venueSearchResults, setVenueResults] = useState(restored ? restored.venueSearchResults : []);
  // Le texte pour lequel la recherche de lieux a répondu (au retour d'une fiche, celui des résultats mémorisés) : le bloc « Ce lieu n'est pas encore présent… »
  // de l'onglet Lieux n'apparaît que s'il est celui du champ. addVenueName : « Ajouter un lieu » ouvert par-dessus (le texte tapé, ou null quand fermé).
  const [venuesSearchedFor, setVenuesSearchedFor] = useState(restored && !(restored.query || "").trim().startsWith("@") ? (restored.query || "").trim() : "");
  const [addVenueName, setAddVenueName] = useState(null);
  const [drinkResults, setDrinkResults] = useState(restored ? restored.drinkResults : []);
  const [drinksLoading, setDrinksLoading] = useState(false);
  // Idem pour les produits : le texte pour lequel la recherche a répondu (bloc « Ce produit n'est pas encore présent… » de l'onglet Produits) et « Ajouter un produit » ouvert par-dessus.
  const [drinksSearchedFor, setDrinksSearchedFor] = useState(restored && !(restored.query || "").trim().startsWith("@") ? (restored.query || "").trim() : "");
  const [addDrinkName, setAddDrinkName] = useState(null);
  // Recherche « @nom » exacte : atState garde le nom pour lequel la réponse a été reçue, et son résultat
  // ({ kind: "venue", venue } | { kind: "brand" | "brewery", id } | { kind: "user", bibax } | null).
  // Une réponse qui ne correspond plus à la saisie n'est jamais affichée, et « en cours » se déduit
  // directement de la saisie (pas d'image intermédiaire « Aucun résultat »).
  const atName = usernameFromQuery(trimmed);
  const [atState, setAtState] = useState(restored ? restored.atState : { name: null, found: null });
  const atDone = atName !== null && atState.name === atName;
  const atFound = atDone ? atState.found : null;
  const atLoading = atName !== null && !atDone;
  const brandResults = useMemo(() => {
    const found = !hasPlain ? [] : brandsDirectory.filter((b) => matches(entityNames(b)));
    const exact = atFound?.kind === "brand" ? brandsDirectory.find((b) => b.id === atFound.id) : null;
    return exact ? [exact, ...found.filter((b) => b.id !== exact.id)] : found;
  }, [brandsDirectory, hasPlain, matches, atFound]);
  const breweryResults = useMemo(() => {
    const found = !hasPlain ? [] : breweriesDirectory.filter((b) => matches(entityNames(b)));
    const exact = atFound?.kind === "brewery" ? breweriesDirectory.find((b) => b.id === atFound.id) : null;
    return exact ? [exact, ...found.filter((b) => b.id !== exact.id)] : found;
  }, [breweriesDirectory, hasPlain, matches, atFound]);
  const venueResults = useMemo(
    () => (atFound?.kind === "venue" ? [atFound.venue, ...venueSearchResults.filter((v) => v.id !== atFound.venue.id)] : venueSearchResults),
    [venueSearchResults, atFound]
  );
  const bibaxResults = useMemo(
    () => (atFound?.kind === "user" ? [atFound.bibax, ...bibaxSearchResults.filter((b) => b.bibroCode !== atFound.bibax.bibroCode)] : bibaxSearchResults),
    [bibaxSearchResults, atFound]
  );

  useEffect(() => {
    if (skipFirst.current.bibax) {
      skipFirst.current.bibax = false;
      return undefined;
    }
    if (hideBibaxAndAtlas || !hasPlain) {
      setBibaxResults([]);
      return;
    }
    setBibaxLoading(true);
    const timer = setTimeout(() => {
      searchBibax(plain).then((results) => {
        setBibaxResults(results);
        setBibaxLoading(false);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [plain]);

  // Recherche produits côté serveur plutôt qu'un filtre sur tout le répertoire en mémoire — seule
  // différence avec le comportement précédent : les alias ne sont pas (encore) inclus dans cette
  // recherche serveur, contrairement à l'ancien filtre en mémoire. Sans les produits génériques : voir searchDrinksNoGeneric.
  useEffect(() => {
    if (skipFirst.current.drinks) {
      skipFirst.current.drinks = false;
      return undefined;
    }
    if (!hasPlain) {
      setDrinkResults([]);
      setDrinksSearchedFor("");
      setDrinksLoading(false);
      return;
    }
    setDrinksLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      searchDrinksNoGeneric(plain).then((results) => {
        if (cancelled) return;
        setDrinkResults(results);
        setDrinksSearchedFor(plain);
        setDrinksLoading(false);
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [plain]);

  // Même principe côté serveur pour les lieux.
  useEffect(() => {
    if (skipFirst.current.venues) {
      skipFirst.current.venues = false;
      return undefined;
    }
    if (!hasPlain) {
      setVenueResults([]);
      setVenuesSearchedFor("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchVenues(plain).then((results) => {
        if (cancelled) return;
        setVenueResults(results);
        setVenuesSearchedFor(plain);
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [plain]);

  // « @nom » exact : le serveur rend au plus une ligne ; on charge ensuite ce qu'il faut pour l'afficher
  // (la fiche du lieu, le profil de la personne) — les marques et producteurs viennent des répertoires
  // déjà en mémoire. Une réponse arrivée après une nouvelle frappe est ignorée.
  useEffect(() => {
    if (skipFirst.current.at) {
      skipFirst.current.at = false;
      return undefined;
    }
    if (!atName) {
      setAtState((prev) => (prev.name === null ? prev : { name: null, found: null }));
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      let result = null;
      const found = await lookupUsername(atName);
      if (found && found.kind === "venue") {
        const [venue] = await loadVenuesByIds([found.id]);
        if (venue) result = { kind: "venue", venue };
      } else if (found && (found.kind === "brand" || found.kind === "brewery")) {
        result = { kind: found.kind, id: found.id };
      } else if (found && found.kind === "user" && !hideBibaxAndAtlas && found.bibroCode) {
        const identity = await lookupBibroCode(found.bibroCode);
        if (identity && identity.displayName) {
          result = {
            kind: "user",
            bibax: {
              id: found.id,
              displayName: identity.displayName,
              lastName: null,
              avatarUrl: identity.avatarUrl,
              bibroCode: found.bibroCode,
              city: identity.city,
              country: identity.country,
              mutualBibaxCount: identity.mutualBibaxCount || 0,
            },
          };
        }
      }
      if (cancelled) return;
      setAtState({ name: atName, found: result });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atName]);

  // Réinitialise le suivi automatique dès qu'une nouvelle requête est tapée — un clic manuel ne
  // vaut que pour la recherche en cours, pas pour toute la session.
  useEffect(() => {
    if (skipFirst.current.picked) {
      skipFirst.current.picked = false;
      return;
    }
    userPickedTabRef.current = false;
  }, [trimmed]);

  // La mémoire suit la page ; la hauteur de la liste s'y ajoute au moment où l'on ouvre une fiche.
  useEffect(() => {
    save({ query, activeTab, userPicked: userPickedTabRef.current, bibaxSearchResults, venueSearchResults, drinkResults, atState });
  }, [query, activeTab, bibaxSearchResults, venueSearchResults, drinkResults, atState]);

  // Suit automatiquement l'onglet qui a le plus de résultats, tant que la personne n'a pas
  // choisi elle-même un onglet pour cette recherche — recalculé à chaque arrivée de résultats
  // (les recherches sont asynchrones : produits peut arriver après marques, par exemple), pas
  // seulement une fois au démarrage, pour ne jamais rester bloqué sur un onglet qui n'a plus
  // le plus de résultats.
  useEffect(() => {
    if (!hasQuery || userPickedTabRef.current) return;
    const counts = { lieux: venueResults.length, produits: drinkResults.length, marques: brandResults.length, producteurs: breweryResults.length, bibax: bibaxResults.length };
    const candidates = TABS.filter((t) => !hideBibaxAndAtlas || t.key !== "bibax");
    const leader = candidates.reduce((best, t) => (counts[t.key] > (counts[best] || 0) ? t.key : best), null);
    if (leader && counts[leader] > 0 && leader !== activeTab) setActiveTab(leader);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuery, trimmed, venueResults, drinkResults, brandResults, breweryResults, bibaxResults]);

  const counts = { lieux: venueResults.length, produits: drinkResults.length, marques: brandResults.length, producteurs: breweryResults.length, bibax: bibaxResults.length };
  const totalResults = Object.values(counts).reduce((a, b) => a + b, 0);
  // Propositions d'ajout. Le lieu ou le produit cherché n'existe pas (encore) sur BibAtlas : le bloc rose d'ajout n'apparaît que lorsque la recherche correspondante a répondu pour le texte exact du champ.
  // Onglet Lieux → bloc Lieu ; onglet Produits → bloc Produit ; sous les résultats ou le message « Aucun résultat dans cette catégorie ». Quand rien n'est trouvé nulle part (« Aucun résultat pour … »),
  // les deux blocs s'affichent ensemble, quel que soit l'onglet (décidé par Mehdi, 2026-11-20). Marques et Producteurs : jamais d'ajout par un utilisateur (ils se créent côté Gestion) ; Bibax : sans objet.
  const venueAnswered = hasPlain && venuesSearchedFor === plain;
  const drinkAnswered = hasPlain && drinksSearchedFor === plain && !drinksLoading;
  const venueBlockEl = (
    <div style={{ padding: "16px 20px 8px" }} data-add-venue="1">
      <AddAfterSearch query={plain} onAdd={setAddVenueName} noun="lieu" label="Proposer un établissement" />
    </div>
  );
  const drinkBlockEl = (
    <div style={{ padding: "16px 20px 8px" }} data-add-drink="1">
      <AddAfterSearch query={plain} onAdd={setAddDrinkName} noun="produit" label="Proposer une boisson" />
    </div>
  );
  const addVenueBlock = activeTab === "lieux" && venueAnswered ? venueBlockEl : null;
  const addDrinkBlock = activeTab === "produits" && drinkAnswered ? drinkBlockEl : null;
  const addBothBlocks =
    venueAnswered && drinkAnswered ? (
      <>
        {venueBlockEl}
        {drinkBlockEl}
      </>
    ) : null;
  const visibleTabs = hideBibaxAndAtlas ? TABS.filter((t) => t.key !== "bibax") : TABS;
  // Mode atlas : tant qu'aucune recherche n'est lancée, les blocs du répertoire prennent la place des résultats.
  const showAtlasBlocks = atlas && !hasQuery;

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1, boxSizing: "border-box" }}>
      <div style={{ paddingRight: "16px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", flexShrink: 0 }}>
            <NavIcon name="back-triangle" size={18} color={COLORS.ink} />
          </button>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: COLORS.surface,
              border: `2px solid ${COLORS.paperAlt}`,
              borderRadius: "12px",
              padding: "10px 14px",
              boxSizing: "border-box",
            }}
          >
            <NavIcon name="search" size={17} color={COLORS.inkSoft} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              autoFocus={!atlas && !restored}
              style={{ flex: 1, minWidth: 0, border: "none", background: "none", color: COLORS.ink, fontSize: "14px", outline: "none" }}
            />
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: query.length > 0 ? "pointer" : "default",
                padding: 0,
                flexShrink: 0,
                visibility: query.length > 0 ? "visible" : "hidden",
                display: "flex",
              }}
            >
              <NavIcon name="x" size={15} color={COLORS.inkSoft} />
            </button>
            <span style={{ width: "1px", height: "20px", background: COLORS.paperAlt, flexShrink: 0 }} />
            <button onClick={goToScan} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}>
              <AiIcon size={28} bleed />
            </button>
          </div>
        </div>
      </div>

      {showAtlasBlocks ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 18px 0" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                background: COLORS.paperAlt,
                flexShrink: 0,
              }}
            >
              <NavIcon name="map" size={22} color={COLORS.amber} />
            </span>
            <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0, lineHeight: 1 }}>
              <span style={{ color: COLORS.ink }}>Bib</span>
              <span style={{ color: COLORS.amber }}>Atlas</span>
            </h1>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <ActionCard
              icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
              title="Lieux"
              subtitle="Répertoire des lieux référencés"
              onClick={goToLieux}
            />
            <ActionCard
              icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
              title="Produits"
              subtitle="Répertoire des produits référencés"
              onClick={goToProduits}
            />
            <ActionCard
              icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
              title="Marques"
              subtitle="Répertoire des marques référencées"
              onClick={goToMarques}
            />
            <ActionCard
              icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
              title="Producteurs"
              subtitle="Répertoire des producteurs référencés"
              onClick={goToProducteurs}
            />
            <ActionCard
              icon={<span style={{ width: "4px", height: "18px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />}
              title="Bibax"
              subtitle="Mes Bibax et recherche de Bibax"
              onClick={goToBibax}
            />
          </div>
        </>
      ) : !hasQuery ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Tapez au moins 2 caractères pour lancer la recherche.</p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
            {visibleTabs.map((t) => (
              <TagButton
                key={t.key}
                label={t.label}
                count={counts[t.key]}
                filled={activeTab === t.key}
                onClick={() => {
                  userPickedTabRef.current = true;
                  setActiveTab(t.key);
                }}
              />
            ))}
            {!hideBibaxAndAtlas && !atlas && (
              <button
                onClick={goToAtlas}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "none",
                  border: `2px solid ${COLORS.jetonFluo}`,
                  borderRadius: "999px",
                  padding: "6px 12px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: COLORS.jetonFluo,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <NavIcon name="map" size={13} color={COLORS.jetonFluo} />
                BibAtlas
              </button>
            )}
          </div>

          <div onScroll={() => inputRef.current?.blur()} onTouchMove={() => inputRef.current?.blur()} style={{ flex: 1, overflowY: "auto", margin: "0 -20px", padding: "0 20px" }}>
            {totalResults === 0 && !bibaxLoading && !drinksLoading && !atLoading ? (
              <>
                <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Aucun résultat pour « {trimmed} ».</p>
                {addBothBlocks}
              </>
            ) : counts[activeTab] === 0 ? (
              <>
                <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>
                  {atLoading
                    ? "Recherche..."
                    : activeTab === "bibax" && bibaxLoading
                    ? "Recherche des Bibax..."
                    : activeTab === "produits" && drinksLoading
                    ? "Recherche des produits..."
                    : "Aucun résultat dans cette catégorie."}
                </p>
                {addVenueBlock}
                {addDrinkBlock}
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "0 -20px" }}>
                {activeTab === "lieux" &&
                  venueResults.map((v, i) => (
                    <ResultRow
                      key={v.id}
                      title={v.name}
                      subtitle={
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          {formatAddress(v)}
                          <CountryFlagImg country={v.country} size={13} />
                        </span>
                      }
                      avatar={<EntityAvatar photoUrl={v.profilePhotoUrl} photoEmoji={v.avatarEmoji} size={52} fallbackIcon="map-pin" />}
                      enlargeAvatar
                      band
                      onClick={() => openVenue(v.id)}
                      last={i === venueResults.length - 1}
                    />
                  ))}
                {activeTab === "produits" &&
                  drinkResults.map((d, i) => (
                    <ResultRow
                      key={d.id}
                      title={d.name}
                      subtitle={SUBTYPE_LABELS[d.beverageSubtype] || ""}
                      avatar={<EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={52} fallbackIcon="bottle" />}
                      enlargeAvatar
                      band
                      onClick={() => openDrink(d.id)}
                      last={i === drinkResults.length - 1}
                    />
                  ))}
                {activeTab === "marques" &&
                  brandResults.map((b, i) => (
                    <ResultRow
                      key={b.id}
                      title={b.name}
                      subtitle={(b.producerIds || []).map((id) => breweriesDirectory.find((br) => br.id === id)?.name).filter(Boolean).join(", ")}
                      avatar={<EntityAvatar photoUrl={b.logoUrl} size={52} fallbackIcon="tag" />}
                      enlargeAvatar
                      band
                      onClick={() => openBrand(b.id)}
                      last={i === brandResults.length - 1}
                    />
                  ))}
                {activeTab === "producteurs" &&
                  breweryResults.map((b, i) => (
                    <ResultRow
                      key={b.id}
                      title={b.name}
                      subtitle={b.country}
                      avatar={<EntityAvatar photoUrl={b.profilePhotoUrl} photoEmoji={b.avatarEmoji} size={52} fallbackIcon="world" />}
                      enlargeAvatar
                      band
                      onClick={() => openBrewery(b.id)}
                      last={i === breweryResults.length - 1}
                    />
                  ))}
                {activeTab === "bibax" &&
                  bibaxResults.map((b, i) => (
                    <ResultRow
                      key={b.id}
                      title={[b.displayName, b.lastName].filter(Boolean).join(" ")}
                      subtitle={
                        <span style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                          {b.city && <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.city}</span>}
                          {b.country && (
                            <span style={{ display: "inline-flex", flexShrink: 0 }}>
                              <CountryFlagImg country={b.country} size={13} />
                            </span>
                          )}
                          <MutualPill n={b.mutualBibaxCount || 0} style={{ padding: "2px 9px", lineHeight: 1.2 }} />
                        </span>
                      }
                      avatar={<EntityAvatar photoUrl={b.avatarUrl} size={52} />}
                      enlargeAvatar
                      band
                      onClick={() => openBibaxProfile(b.bibroCode)}
                      last={i === bibaxResults.length - 1}
                    />
                  ))}
                {addVenueBlock}
                {addDrinkBlock}
              </div>
            )}
          </div>
        </>
      )}
      {addDrinkName !== null && (
        <AddDrinkOverlay initialName={addDrinkName} breweriesDirectory={breweriesDirectory} brandsDirectory={brandsDirectory} onChosen={(id) => openDrink(id)} onClose={() => setAddDrinkName(null)} />
      )}
      {addVenueName !== null && <AddVenueOverlay initialName={addVenueName} onChosen={(v) => openVenue(v.id)} onClose={() => setAddVenueName(null)} />}
    </div>
  );
}

