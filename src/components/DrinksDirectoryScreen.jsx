// ============================================================
// Écran "Produits" — catégories, groupement alphabétique,
// recherche et pagination calculés côté serveur. Réécrit pour
// tenir à l'échelle de plusieurs milliers de produits : rien
// n'est plus chargé en bloc, chaque vue ne charge que ce dont
// elle a besoin (comptages, page de résultats).
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, DRINK_TYPES, RATABLE_DRINK_TYPES } from "../constants.js";
import { NavIcon, CountryFlagImg, VerifiedBadge } from "./icons.jsx";
import { PageHeader, BackFooterLink, ScrollToTopButton } from "./ui.jsx";
import { DrinkBadges } from "./DrinkDisplay.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { drinkTypeLabel, drinkSummaryLine } from "../utils.js";
import { loadDrinkCategoryCounts, loadDrinkLetterCounts, loadDrinksDirectoryPage } from "../data/sharedDirectories.js";

const PAGE_SIZE = 40;
const LETTER_THRESHOLD = 20;

export function DrinksDirectoryScreen({ isAdmin, myBibroCode, onBack, onOpenDrink, goToSubmit, initialCategory, initialTagFilter, onSeedConsumed }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(initialCategory || null);
  const [activeTagFilter, setActiveTagFilter] = useState(initialTagFilter || null);
  const [activeLetter, setActiveLetter] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [categoryCounts, setCategoryCounts] = useState({});
  const [letterCounts, setLetterCounts] = useState([]);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = React.useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (initialCategory && onSeedConsumed) onSeedConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDrinkCategoryCounts().then(setCategoryCounts);
  }, [refreshTick]);

  const q = debouncedQuery.trim();
  const searching = q.length > 0;
  const countFor = (type) => categoryCounts[type] || 0;
  const useLetterTier = !!activeCategory && !searching && countFor(activeCategory) > LETTER_THRESHOLD;

  // Regroupement alphabétique — chargé uniquement quand une catégorie assez fournie est
  // sélectionnée, sans recherche active et sans lettre encore choisie.
  useEffect(() => {
    if (useLetterTier && !activeLetter) {
      loadDrinkLetterCounts(activeCategory).then(setLetterCounts);
    } else {
      setLetterCounts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLetterTier, activeLetter, activeCategory, refreshTick]);

  const countForLetter = (letter) => letterCounts.find((l) => l.letter === letter)?.count || 0;

  // La page de résultats effectivement affichée — jamais chargée pour la simple vue "choisir une
  // catégorie" ni pour la vue "choisir une lettre" (ces deux-là n'ont besoin que des comptages
  // ci-dessus, pas des produits eux-mêmes).
  const showingList = searching || (activeCategory && (!useLetterTier || activeLetter));

  useEffect(() => {
    if (!showingList) {
      setItems([]);
      setHasMore(true);
      return;
    }
    let cancelled = false;
    setItems([]);
    setHasMore(true);
    loadDrinksDirectoryPage({
      type: activeCategory || null,
      letter: useLetterTier && activeLetter ? activeLetter : null,
      query: searching ? q : null,
      tagKind: activeTagFilter?.kind || null,
      tagValue: activeTagFilter?.value || null,
      page: 0,
      pageSize: PAGE_SIZE,
    }).then((results) => {
      if (cancelled) return;
      setItems(results);
      setHasMore(results.length === PAGE_SIZE);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showingList, activeCategory, activeLetter, useLetterTier, searching, q, activeTagFilter, refreshTick]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = Math.floor(items.length / PAGE_SIZE);
    const results = await loadDrinksDirectoryPage({
      type: activeCategory || null,
      letter: useLetterTier && activeLetter ? activeLetter : null,
      query: searching ? q : null,
      tagKind: activeTagFilter?.kind || null,
      tagValue: activeTagFilter?.value || null,
      page: nextPage,
      pageSize: PAGE_SIZE,
    });
    setItems((prev) => [...prev, ...results]);
    setHasMore(results.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, items.length, hasMore, loadingMore]);

  const goBackOneLevel = () => {
    if (searching) return onBack();
    if (useLetterTier && activeLetter) {
      setActiveLetter(null);
      return;
    }
    if (activeCategory) {
      setActiveCategory(null);
      setActiveTagFilter(null);
      setActiveLetter(null);
      return;
    }
    onBack();
  };

  const onTagClick = (type, filter) => {
    setActiveCategory(type);
    setActiveTagFilter(filter);
    setActiveLetter(null);
  };

  const renderDrinkRow = (d) => (
    <button
      key={d.id}
      onClick={() => onOpenDrink(d.id, !searching ? { category: activeCategory, tagFilter: activeTagFilter } : null)}
      style={{
        textAlign: "left",
        background: COLORS.surface,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "12px",
        padding: "14px 16px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1, minWidth: 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            {d.name}
            {d.status === "to_process" && <span style={{ fontSize: "10.5px", color: COLORS.wine, fontWeight: 700 }}>EN ATTENTE</span>}
            {d.pendingContributionsCount > 0 && <span style={{ fontSize: "13px" }} title="Une modification est proposée">📝</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
            <DrinkBadges drink={d} onTagClick={onTagClick} />
          </div>
          {drinkSummaryLine(d, searching) && <div style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "2px" }}>{drinkSummaryLine(d, searching)}</div>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0, marginLeft: "10px" }}>
        {d.status === "complete" && <VerifiedBadge size={15} />}
        {RATABLE_DRINK_TYPES.includes(d.type) &&
          !d.isGeneric &&
          d.ratings &&
          Object.keys(d.ratings).length > 0 &&
          (() => {
            const values = Object.values(d.ratings).filter((v) => typeof v === "number" && isFinite(v));
            if (values.length === 0) return null;
            const avg = values.reduce((s, v) => s + v, 0) / values.length;
            return (
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px", color: COLORS.amber, fontWeight: 700, whiteSpace: "nowrap" }}>
                <StarsDisplay value={1} max={1} size={13} /> {avg.toFixed(2).replace(".", ",")}
              </span>
            );
          })()}
      </div>
    </button>
  );

  const addButton = (
    <button
      onClick={goToSubmit}
      style={{
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        background: COLORS.amber,
        border: "none",
        color: COLORS.paper,
        fontSize: "32px",
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        lineHeight: 1,
        boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
      }}
      title="Proposer une boisson"
      aria-label="Proposer une boisson"
    >
      +
    </button>
  );

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={goBackOneLevel} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", margin: "4px 0 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>
            {useLetterTier && activeLetter ? `${drinkTypeLabel(activeCategory)} — ${activeLetter}` : activeCategory ? drinkTypeLabel(activeCategory) : "Produits"}
          </h1>
        </div>
        <button onClick={() => setRefreshTick((t) => t + 1)} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }} title="Actualiser" aria-label="Actualiser">
          <NavIcon name="refresh" size={18} color={COLORS.redFluo} />
        </button>
      </div>

      {!searching && activeCategory && activeTagFilter && (
        <button
          onClick={() => setActiveTagFilter(null)}
          style={{ background: COLORS.paperAlt, border: "none", borderRadius: "999px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, cursor: "pointer", marginBottom: "14px", alignSelf: "flex-start" }}
        >
          Filtré :{" "}
          {activeTagFilter.kind === "nationality" ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <CountryFlagImg country={activeTagFilter.value} size={13} />
              {activeTagFilter.value}
            </span>
          ) : activeTagFilter.kind === "zero" ? (
            "0.0%"
          ) : activeTagFilter.kind === "alcoholic" ? (
            "Alcoolisé"
          ) : activeTagFilter.kind === "glutenFree" ? (
            "Sans gluten"
          ) : (
            "Bio"
          )}{" "}
          ✕
        </button>
      )}

      {activeCategory && !searching && <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>{addButton}</div>}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={activeCategory ? `Rechercher dans ${drinkTypeLabel(activeCategory)}` : "Rechercher dans toutes les catégories"}
        style={{ padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "15px", outline: "none", marginBottom: "16px" }}
      />

      {searching ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {items.length === 0 && !loadingMore && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune boisson trouvée.</p>}
          {items.map(renderDrinkRow)}
          {hasMore && (
            <div ref={sentinelRef} style={{ textAlign: "center", padding: "10px", fontSize: "12px", color: COLORS.inkSoft }}>
              Chargement...
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "6px" }}>{addButton}</div>
        </div>
      ) : activeCategory && useLetterTier && !activeLetter ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {letterCounts.map(({ letter }) => (
            <button
              key={letter}
              onClick={() => setActiveLetter(letter)}
              style={{
                textAlign: "left",
                background: COLORS.surface,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "10px",
                padding: "12px 14px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, fontSize: "14.5px" }}>
                <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
                {letter}
              </span>
              <span style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{countForLetter(letter)} →</span>
            </button>
          ))}
        </div>
      ) : activeCategory ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {items.length === 0 && !loadingMore && (
            <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune boisson dans cette catégorie pour l'instant.</p>
          )}
          {items.map(renderDrinkRow)}
          {hasMore && (
            <div ref={sentinelRef} style={{ textAlign: "center", padding: "10px", fontSize: "12px", color: COLORS.inkSoft }}>
              Chargement...
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>{addButton}</div>
          {DRINK_TYPES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setActiveTagFilter(null);
                setActiveLetter(null);
              }}
              style={{
                textAlign: "left",
                background: COLORS.surface,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "12px",
                padding: "14px 16px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, fontSize: "15px" }}>
                <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
                {drinkTypeLabel(cat)}
              </span>
              <span style={{ fontSize: "13px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{countFor(cat)} →</span>
            </button>
          ))}
        </div>
      )}

      {activeCategory && !searching && <div style={{ display: "flex", justifyContent: "center", marginTop: "auto", paddingTop: "16px" }}>{addButton}</div>}
      {activeCategory && !searching && <ScrollToTopButton />}
      <BackFooterLink onClick={goBackOneLevel} />
    </div>
  );
}
