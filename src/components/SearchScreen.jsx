// ============================================================
// Écran de recherche — accessible depuis la barre de recherche
// sur Home. Une seule saisie, 5 onglets de résultats en haut
// (avec le nombre de résultats chacun) : Lieux, Produits,
// Marques, Producteurs, Bibax. Un seul onglet affiché à la fois,
// en liste complète — pensé pour rester utilisable même quand la
// base grandit (pas de multiples listes tronquées empilées).
// ============================================================
import React, { useState, useEffect, useMemo, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";
import { formatAddress } from "../utils.js";
import { searchBibax, searchDrinks, searchVenues } from "../data/sharedDirectories.js";

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

function ResultRow({ title, subtitle, avatar, onClick, last }) {
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

function GenericIconAvatar({ name }) {
  return (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: COLORS.paperAlt, flexShrink: 0 }}>
      <NavIcon name={name} size={17} color={COLORS.amber} />
    </span>
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
  initialTab = "lieux",
  onBack,
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [bibaxResults, setBibaxResults] = useState([]);
  const [bibaxLoading, setBibaxLoading] = useState(false);
  const inputRef = useRef(null);
  // Tant que la personne n'a pas cliqué elle-même sur un onglet pour cette recherche, l'onglet
  // affiché suit automatiquement celui qui a le plus de résultats. Un clic manuel arrête ce
  // suivi jusqu'à la prochaine requête tapée.
  const userPickedTabRef = useRef(false);

  const trimmed = query.trim();
  const q = normalize(trimmed);
  const hasQuery = trimmed.length >= 2;

  const [venueResults, setVenueResults] = useState([]);
  const [drinkResults, setDrinkResults] = useState([]);
  const [drinksLoading, setDrinksLoading] = useState(false);
  const brandResults = useMemo(
    () => (q.length < 2 ? [] : brandsDirectory.filter((b) => normalize(b.name).includes(q) || (b.aliases || []).some((a) => normalize(a).includes(q)))),
    [brandsDirectory, q]
  );
  const breweryResults = useMemo(
    () => (q.length < 2 ? [] : breweriesDirectory.filter((b) => normalize(b.name).includes(q) || (b.aliases || []).some((a) => normalize(a).includes(q)))),
    [breweriesDirectory, q]
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
              autoFocus
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
              <NavIcon name="scan-line" size={18} color={COLORS.amber} />
            </button>
          </div>
        </div>
      </div>

      {!hasQuery ? (
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
            {!hideBibaxAndAtlas && (
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
            {totalResults === 0 && !bibaxLoading && !drinksLoading ? (
              <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Aucun résultat pour « {trimmed} ».</p>
            ) : counts[activeTab] === 0 ? (
              <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>
                {activeTab === "bibax" && bibaxLoading
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
                      avatar={<GenericIconAvatar name="map-pin" />}
                      onClick={() => onOpenVenue(v.id)}
                      last={i === venueResults.length - 1}
                    />
                  ))}
                {activeTab === "produits" &&
                  drinkResults.map((d, i) => (
                    <ResultRow key={d.id} title={d.name} subtitle={SUBTYPE_LABELS[d.beverageSubtype] || ""} avatar={<GenericIconAvatar name="bottle" />} onClick={() => onOpenDrink(d.id)} last={i === drinkResults.length - 1} />
                  ))}
                {activeTab === "marques" &&
                  brandResults.map((b, i) => (
                    <ResultRow
                      key={b.id}
                      title={b.name}
                      subtitle={breweriesDirectory.find((br) => br.id === b.producerId)?.name}
                      avatar={<GenericIconAvatar name="tag" />}
                      onClick={() => onOpenBrand(b.id)}
                      last={i === brandResults.length - 1}
                    />
                  ))}
                {activeTab === "producteurs" &&
                  breweryResults.map((b, i) => (
                    <ResultRow key={b.id} title={b.name} subtitle={b.country} avatar={<GenericIconAvatar name="world" />} onClick={() => onOpenBrewery(b.id)} last={i === breweryResults.length - 1} />
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

