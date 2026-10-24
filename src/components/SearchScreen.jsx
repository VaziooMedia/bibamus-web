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
import { COLORS } from "../constants.js";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import { EntityAvatar, ActionCard } from "./ui.jsx";
import { formatAddress, usernameFromQuery } from "../utils.js";
import { searchBibax, searchDrinks, searchVenues, lookupUsername, lookupBibroCode, loadVenuesByIds } from "../data/sharedDirectories.js";
import { AiIcon } from "./AiIcon.jsx";

// Seuls Bières & Cidres et Vins ont déjà de vraies sous-catégories définies côté plateforme
// de gestion — les autres (Soft, Spiritueux...) n'en ont pas encore ; on laisse alors vide
// plutôt que d'afficher un code brut ou la catégorie générale.
const SUBTYPE_LABELS = {
  biere: "Bière",
  cidre: "Cidre",
  poire: "Poiré",
  vin: "Vin",
  vin_effervescent: "Vin effervescent",
};

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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
      <span style={{ color: filled ? COLORS.paper : COLORS.inkSoft, fontWeight: 700 }}>({count})</span>
    </button>
  );
}

export function ResultRow({ title, subtitle, avatar, onClick, last }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        background: "none",
        border: "none",
        borderBottom: last ? "none" : `1px solid ${COLORS.paperAlt}`,
        padding: "12px 4px",
        textAlign: "left",
        cursor: "pointer",
        color: COLORS.ink,
      }}
    >
      {avatar}
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
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [bibaxSearchResults, setBibaxResults] = useState([]);
  const [bibaxLoading, setBibaxLoading] = useState(false);
  const inputRef = useRef(null);
  // Tant que la personne n'a pas cliqué elle-même sur un onglet pour cette recherche, l'onglet
  // affiché suit automatiquement celui qui a le plus de résultats. Un clic manuel arrête ce
  // suivi jusqu'à la prochaine requête tapée.
  const userPickedTabRef = useRef(false);

  const trimmed = query.trim();
  const q = normalize(trimmed);
  const hasQuery = trimmed.length >= 2;

  const [venueSearchResults, setVenueResults] = useState([]);
  const [drinkResults, setDrinkResults] = useState([]);
  const [drinksLoading, setDrinksLoading] = useState(false);
  // Recherche « @nom » exacte : atState garde le nom pour lequel la réponse a été reçue, et son résultat
  // ({ kind: "venue", venue } | { kind: "brand" | "brewery", id } | { kind: "user", bibax } | null).
  // Une réponse qui ne correspond plus à la saisie n'est jamais affichée, et « en cours » se déduit
  // directement de la saisie (pas d'image intermédiaire « Aucun résultat »).
  const atName = usernameFromQuery(trimmed);
  const [atState, setAtState] = useState({ name: null, found: null });
  const atDone = atName !== null && atState.name === atName;
  const atFound = atDone ? atState.found : null;
  const atLoading = atName !== null && !atDone;
  const brandResults = useMemo(() => {
    const found = q.length < 2 ? [] : brandsDirectory.filter((b) => normalize(b.name).includes(q) || (b.aliases || []).some((a) => normalize(a).includes(q)));
    const exact = atFound?.kind === "brand" ? brandsDirectory.find((b) => b.id === atFound.id) : null;
    return exact ? [exact, ...found.filter((b) => b.id !== exact.id)] : found;
  }, [brandsDirectory, q, atFound]);
  const breweryResults = useMemo(() => {
    const found = q.length < 2 ? [] : breweriesDirectory.filter((b) => normalize(b.name).includes(q) || (b.aliases || []).some((a) => normalize(a).includes(q)));
    const exact = atFound?.kind === "brewery" ? breweriesDirectory.find((b) => b.id === atFound.id) : null;
    return exact ? [exact, ...found.filter((b) => b.id !== exact.id)] : found;
  }, [breweriesDirectory, q, atFound]);
  const venueResults = useMemo(
    () => (atFound?.kind === "venue" ? [atFound.venue, ...venueSearchResults.filter((v) => v.id !== atFound.venue.id)] : venueSearchResults),
    [venueSearchResults, atFound]
  );
  const bibaxResults = useMemo(
    () => (atFound?.kind === "user" ? [atFound.bibax, ...bibaxSearchResults.filter((b) => b.bibroCode !== atFound.bibax.bibroCode)] : bibaxSearchResults),
    [bibaxSearchResults, atFound]
  );

  useEffect(() => {
    if (hideBibaxAndAtlas || trimmed.length < 2) {
      setBibaxResults([]);
      return;
    }
    setBibaxLoading(true);
    const timer = setTimeout(() => {
      searchBibax(trimmed).then((results) => {
        setBibaxResults(results);
        setBibaxLoading(false);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [trimmed]);

  // Recherche produits côté serveur plutôt qu'un filtre sur tout le répertoire en mémoire — seule
  // différence avec le comportement précédent : les alias ne sont pas (encore) inclus dans cette
  // recherche serveur, contrairement à l'ancien filtre en mémoire.
  useEffect(() => {
    if (trimmed.length < 2) {
      setDrinkResults([]);
      return;
    }
    setDrinksLoading(true);
    const timer = setTimeout(() => {
      searchDrinks(trimmed).then((results) => {
        setDrinkResults(results);
        setDrinksLoading(false);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [trimmed]);

  // Même principe côté serveur pour les lieux.
  useEffect(() => {
    if (trimmed.length < 2) {
      setVenueResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchVenues(trimmed).then(setVenueResults);
    }, 350);
    return () => clearTimeout(timer);
  }, [trimmed]);

  // « @nom » exact : le serveur rend au plus une ligne ; on charge ensuite ce qu'il faut pour l'afficher
  // (la fiche du lieu, le profil de la personne) — les marques et producteurs viennent des répertoires
  // déjà en mémoire. Une réponse arrivée après une nouvelle frappe est ignorée.
  useEffect(() => {
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
    userPickedTabRef.current = false;
  }, [trimmed]);

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
              autoFocus={!atlas}
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

          <div onScroll={() => inputRef.current?.blur()} onTouchMove={() => inputRef.current?.blur()} style={{ flex: 1, overflowY: "auto" }}>
            {totalResults === 0 && !bibaxLoading && !drinksLoading && !atLoading ? (
              <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Aucun résultat pour « {trimmed} ».</p>
            ) : counts[activeTab] === 0 ? (
              <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>
                {atLoading
                  ? "Recherche..."
                  : activeTab === "bibax" && bibaxLoading
                  ? "Recherche des Bibax..."
                  : activeTab === "produits" && drinksLoading
                  ? "Recherche des produits..."
                  : "Aucun résultat dans cette catégorie."}
              </p>
            ) : (
              <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
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
                      avatar={<EntityAvatar photoUrl={v.profilePhotoUrl} photoEmoji={v.avatarEmoji} size={36} fallbackIcon="map-pin" />}
                      onClick={() => onOpenVenue(v.id)}
                      last={i === venueResults.length - 1}
                    />
                  ))}
                {activeTab === "produits" &&
                  drinkResults.map((d, i) => (
                    <ResultRow
                      key={d.id}
                      title={d.name}
                      subtitle={SUBTYPE_LABELS[d.beverageSubtype] || ""}
                      avatar={<EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={36} fallbackIcon="bottle" />}
                      onClick={() => onOpenDrink(d.id)}
                      last={i === drinkResults.length - 1}
                    />
                  ))}
                {activeTab === "marques" &&
                  brandResults.map((b, i) => (
                    <ResultRow
                      key={b.id}
                      title={b.name}
                      subtitle={(b.producerIds || []).map((id) => breweriesDirectory.find((br) => br.id === id)?.name).filter(Boolean).join(", ")}
                      avatar={<EntityAvatar photoUrl={b.logoUrl} size={36} fallbackIcon="tag" />}
                      onClick={() => onOpenBrand(b.id)}
                      last={i === brandResults.length - 1}
                    />
                  ))}
                {activeTab === "producteurs" &&
                  breweryResults.map((b, i) => (
                    <ResultRow
                      key={b.id}
                      title={b.name}
                      subtitle={b.country}
                      avatar={<EntityAvatar photoUrl={b.profilePhotoUrl} photoEmoji={b.avatarEmoji} size={36} fallbackIcon="world" />}
                      onClick={() => onOpenBrewery(b.id)}
                      last={i === breweryResults.length - 1}
                    />
                  ))}
                {activeTab === "bibax" &&
                  bibaxResults.map((b, i) => (
                    <ResultRow
                      key={b.id}
                      title={[b.displayName, b.lastName].filter(Boolean).join(" ")}
                      subtitle={
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {b.city}
                          {b.country && <CountryFlagImg country={b.country} size={13} />}
                          {(b.city || b.country) && b.mutualBibaxCount > 0 && (
                            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, display: "inline-block" }} />
                          )}
                          {b.mutualBibaxCount > 0 && `${b.mutualBibaxCount} Bibax en commun`}
                        </span>
                      }
                      avatar={<EntityAvatar photoUrl={b.avatarUrl} size={36} />}
                      onClick={() => onOpenBibaxProfile(b.bibroCode)}
                      last={i === bibaxResults.length - 1}
                    />
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

