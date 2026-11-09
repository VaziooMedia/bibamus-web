// ============================================================
// Écran "Produits" — catégories, lettres (rangée de pastilles au-dessus de la liste),
// recherche et pagination calculés côté serveur. Réécrit pour
// tenir à l'échelle de plusieurs milliers de produits : rien
// n'est plus chargé en bloc, chaque vue ne charge que ce dont
// elle a besoin (comptages, page de résultats).
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, DRINK_TYPES } from "../constants.js";
import { NavIcon, CountryFlagImg, CertificationIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, ScrollToTopButton, EntityAvatar } from "./ui.jsx";
import { DrinkBadges, getDrinkBadgeItems, renderDrinkBadgeItem } from "./DrinkDisplay.jsx";
import { drinkTypeLabel, drinkSummaryParts } from "../utils.js";
import { styleTagLabel, registerCustomStyleLabels } from "../data/styleTagLabels.js";
import { loadDrinkCategoryCounts, loadDrinkLetterCounts, loadDrinksDirectoryPage, loadDrinksDirectoryCount, loadCustomBeerCiderStylesOnce, loadCustomListStyleLabelsOnce } from "../data/sharedDirectories.js";
import { AiIcon } from "./AiIcon.jsx";
import { AddAfterSearch } from "./AddAfterSearch.jsx";

const PAGE_SIZE = 40;
const LETTER_THRESHOLD = 20;

// Ordre des pastilles : les lettres de A à Z dans l'ordre du serveur, puis « 0-9 » toujours en dernier (le serveur le renvoie en
// premier, avant « A »). Un éventuel autre groupe (« ? ») se place avant « 0-9 ».
const letterRank = (letter) => (/^[A-Z]$/.test(letter) ? 0 : letter === "0-9" ? 2 : 1);
const orderLetters = (counts) =>
  counts
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => letterRank(a.entry.letter) - letterRank(b.entry.letter) || a.index - b.index)
    .map((x) => x.entry);

// Dernière lettre consultée dans chaque catégorie, le temps de la session : en rouvrant une catégorie, on reprend où l'on était.
const lastLetterByCategory = new Map();

// Rangée de pastilles des lettres, au-dessus de la liste. Elle défile horizontalement (jamais à la ligne), reste épinglée en haut
// de l'écran quand on fait défiler la liste, et garde la pastille choisie visible (centrée). Un fondu sur un bord signale qu'il
// reste des lettres de ce côté.
function LetterPills({ letters, activeLetter, onSelect }) {
  const stickyRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  const firstRef = React.useRef(true);
  const [edge, setEdge] = useState({ start: true, end: false });
  const updateEdge = () => {
    const el = scrollRef.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const selected = el.querySelector('[data-selected="true"]');
    if (selected) {
      const left = Math.max(0, selected.offsetLeft - el.clientWidth / 2 + selected.offsetWidth / 2);
      el.scrollTo({ left, behavior: firstRef.current ? "auto" : "smooth" });
    }
    firstRef.current = false;
    updateEdge();
  }, [activeLetter, letters.length]);
  // Changer de lettre ramène le haut de la liste sous les pastilles : si l'on avait défilé plus bas, on remonte juste ce qu'il faut
  // (jamais plus haut que le début de la liste, et on ne descend jamais).
  const choose = (letter) => {
    onSelect(letter);
    const box = stickyRef.current;
    const list = box ? box.parentElement : null;
    let scroller = list ? list.parentElement : null;
    while (scroller && scroller !== document.body) {
      const overflowY = getComputedStyle(scroller).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") break;
      scroller = scroller.parentElement;
    }
    if (!list || !scroller || scroller === document.body) return;
    const listTop = scroller.scrollTop + list.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    if (scroller.scrollTop > listTop) scroller.scrollTo({ top: listTop });
  };
  return (
    <div ref={stickyRef} style={{ position: "sticky", top: 0, zIndex: 5, background: COLORS.paper, margin: "0 -20px 2px", paddingBottom: "2px" }}>
      <div
        ref={scrollRef}
        onScroll={updateEdge}
        role="group"
        aria-label="Lettres"
        style={{ position: "relative", display: "flex", flexWrap: "nowrap", gap: "8px", overflowX: "auto", padding: "8px 20px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {letters.map((letter) => {
          const selected = letter === activeLetter;
          return (
            <button
              key={letter}
              data-selected={selected ? "true" : "false"}
              aria-pressed={selected}
              onClick={() => choose(letter)}
              style={{
                flex: "0 0 auto",
                minWidth: "42px",
                height: "42px",
                padding: "0 12px",
                borderRadius: "999px",
                border: `2px solid ${selected ? COLORS.amber : COLORS.paperAlt}`,
                background: selected ? COLORS.amber : COLORS.surface,
                color: selected ? COLORS.paper : COLORS.ink,
                fontWeight: 700,
                fontSize: "14.5px",
                fontFamily: "'Urbanist', sans-serif",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>
      {!edge.start && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "26px", background: `linear-gradient(to right, ${COLORS.paper}, transparent)`, pointerEvents: "none" }} />}
      {!edge.end && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "34px", background: `linear-gradient(to left, ${COLORS.paper}, transparent)`, pointerEvents: "none" }} />}
    </div>
  );
}

export function DrinksDirectoryScreen({
  myBibroCode,
  onBack,
  openedFromDrink = false,
  onOpenDrink,
  goToSubmit,
  goToScanBarcode,
  query,
  setQuery,
  activeCategory,
  setActiveCategory,
  activeTagFilter,
  setActiveTagFilter,
  activeLetter,
  setActiveLetter,
}) {
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const [categoryCounts, setCategoryCounts] = useState({});
  const [letterCounts, setLetterCounts] = useState([]);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  // Nombre total de produits de la liste affichée (null tant qu'il n'est pas connu, ou s'il est indisponible).
  const [totalCount, setTotalCount] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = React.useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    loadDrinkCategoryCounts().then(setCategoryCounts);
  }, [refreshTick]);

  const q = debouncedQuery.trim();
  const searching = q.length > 0;
  const countFor = (type) => categoryCounts[type] || 0;
  // Pas de regroupement par lettre quand une étiquette filtre la liste : les comptages par lettre
  // portent sur toute la catégorie et ne tiendraient pas compte du filtre. La liste filtrée,
  // généralement courte, s'affiche directement.
  const useLetterTier = !!activeCategory && !searching && !activeTagFilter && countFor(activeCategory) > LETTER_THRESHOLD;

  // Libellé d'un style modifié depuis la gestion (ajouté à la main, ou renommé) : l'app ne le connaît pas à la
  // compilation (voir la fiche produit). Il est déjà mémorisé quand on arrive depuis la fiche ; ce chargement
  // (une seule lecture par session) ne sert que si ce n'est pas encore le cas.
  const [, setStyleLabelsTick] = useState(0);
  // Un filtre de style peut porter plusieurs codes séparés par des virgules (« Produits communs » depuis une fiche).
  const styleFilterCodes = activeTagFilter?.kind === "style" ? String(activeTagFilter.value || "").split(",").filter(Boolean) : [];
  const needsStyleLabels = styleFilterCodes.length > 0;
  // Retirer un style du filtre ; le dernier retiré lève le filtre, comme la puce unique d'avant.
  const removeStyleFromFilter = (code) => {
    const rest = styleFilterCodes.filter((c) => c !== code);
    setActiveTagFilter(rest.length > 0 ? { kind: "style", value: rest.join(",") } : null);
  };
  useEffect(() => {
    if (!needsStyleLabels) return;
    let cancelled = false;
    // Les deux tables : le filtre peut porter un style de bière ou de l'une des autres catégories (Softs & Eaux, Boissons chaudes, Cocktails / Mocktails).
    Promise.all([loadCustomBeerCiderStylesOnce(), loadCustomListStyleLabelsOnce()]).then(([beerList, otherList]) => {
      if (registerCustomStyleLabels([...beerList, ...otherList]) && !cancelled) setStyleLabelsTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [needsStyleLabels]);

  // Les lettres (rangée de pastilles) — chargées uniquement quand une catégorie assez fournie est ouverte, sans recherche
  // active : la rangée reste affichée une fois une lettre choisie. Une réponse tardive d'une autre catégorie est ignorée.
  useEffect(() => {
    if (!useLetterTier) {
      setLetterCounts([]);
      return;
    }
    let cancelled = false;
    loadDrinkLetterCounts(activeCategory).then((counts) => {
      if (!cancelled) setLetterCounts(orderLetters(counts));
    });
    return () => {
      cancelled = true;
    };
  }, [useLetterTier, activeCategory, refreshTick]);

  // À l'ouverture d'une catégorie à lettres : on reprend la dernière lettre consultée dans cette catégorie (si elle existe
  // encore), sinon la première lettre de l'alphabet (« 0-9 » ou « ? » seulement s'il n'y en a pas d'autre).
  useEffect(() => {
    if (!useLetterTier || activeLetter || letterCounts.length === 0) return;
    const remembered = lastLetterByCategory.get(activeCategory);
    const firstAlpha = letterCounts.find((l) => /^[A-Z]$/.test(l.letter));
    const pick = letterCounts.find((l) => l.letter === remembered) || firstAlpha || letterCounts[0];
    setActiveLetter(pick.letter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLetterTier, activeLetter, activeCategory, letterCounts]);

  // On retient la lettre consultée.
  useEffect(() => {
    if (useLetterTier && activeLetter) lastLetterByCategory.set(activeCategory, activeLetter);
  }, [useLetterTier, activeCategory, activeLetter]);

  // La page de résultats effectivement affichée — jamais chargée pour la simple vue "choisir une
  // catégorie" (elle n'a besoin que des comptages), ni tant qu'une catégorie à lettres n'a pas sa lettre.
  const showingList = searching || (activeCategory && (!useLetterTier || activeLetter));

  // --- Pagination ---------------------------------------------------------------------------
  // Tout l'état "vivant" de la pagination est dans des refs : une réponse tardive, un double
  // déclenchement de l'observateur ou un re-rendu ne peuvent ainsi jamais la corrompre.
  //  - generationRef : change à chaque NOUVELLE liste (catégorie, lettre, recherche, filtre,
  //    rafraîchissement). Toute réponse venue d'une liste précédente est ignorée — sinon elle
  //    s'ajoutait à la nouvelle (produits d'une autre lettre, pages en double).
  //  - loadingRef : une requête (première page OU suite) est en cours. loadMore ne part jamais
  //    tant que la première page n'est pas arrivée : le repère de défilement est visible dès que
  //    la liste s'affiche, encore vide, et il redemandait alors la page 0, ajoutée à la suite de la
  //    première -> la liste entière apparaissait deux fois, et la page 1 disparaissait.
  //  - pageRef : la prochaine page à demander, comptée — et non plus déduite de la longueur de la
  //    liste, qui devenait fausse dès qu'un doublon s'y glissait.
  const generationRef = React.useRef(0);
  const loadingRef = React.useRef(false);
  const hasMoreRef = React.useRef(true);
  const pageRef = React.useRef(0);
  const loadParamsRef = React.useRef({});

  // Filet de sécurité : jamais deux fois le même produit, même si le serveur renvoie deux pages
  // qui se chevauchent (tri instable sur des noms identiques).
  const mergeUnique = (prev, results) => {
    const seen = new Set(prev.map((x) => x.id));
    return [...prev, ...results.filter((x) => !seen.has(x.id))];
  };

  useEffect(() => {
    const generation = ++generationRef.current;
    pageRef.current = 0;
    hasMoreRef.current = true;
    loadingRef.current = false;
    setItems([]);
    setTotalCount(null);
    setHasMore(true);
    setLoadingMore(false);
    if (!showingList) return;
    const params = {
      type: activeCategory || null,
      letter: useLetterTier && activeLetter ? activeLetter : null,
      query: searching ? q : null,
      tagKind: activeTagFilter?.kind || null,
      tagValue: activeTagFilter?.value || null,
    };
    loadParamsRef.current = params;
    loadingRef.current = true;
    loadDrinksDirectoryCount(params).then((n) => {
      if (generation === generationRef.current) setTotalCount(n);
    });
    loadDrinksDirectoryPage({ ...params, page: 0, pageSize: PAGE_SIZE }).then((results) => {
      if (generation !== generationRef.current) return;
      setItems(mergeUnique([], results));
      pageRef.current = 1;
      hasMoreRef.current = results.length === PAGE_SIZE;
      setHasMore(hasMoreRef.current);
      loadingRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showingList, activeCategory, activeLetter, useLetterTier, searching, q, activeTagFilter, refreshTick]);

  const loadMore = async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    const generation = generationRef.current;
    const page = pageRef.current;
    const results = await loadDrinksDirectoryPage({ ...loadParamsRef.current, page, pageSize: PAGE_SIZE });
    if (generation !== generationRef.current) return;
    pageRef.current = page + 1;
    hasMoreRef.current = results.length === PAGE_SIZE;
    setItems((prev) => mergeUnique(prev, results));
    setHasMore(hasMoreRef.current);
    loadingRef.current = false;
    setLoadingMore(false);
  };

  // L'observateur n'est créé qu'une seule fois par sentinel (pas à chaque changement de items,
  // hasMore ou loadingMore) — les vraies valeurs à jour sont lues via les refs ci-dessus.
  // Recréer l'observateur à chaque changement de données créait une vraie course : avec
  // rootMargin aussi large, chaque nouvel observateur détectait le sentinel comme déjà visible
  // et redéclenchait aussitôt loadMore, en cascade, dupliquant des pages entières.
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
  }, [sentinelRef.current]);

  const goBackOneLevel = () => {
    if (searching) return onBack();
    // Arrivé depuis une fiche par une étiquette : la flèche retour ramène à cette fiche.
    if (openedFromDrink && activeTagFilter) return onBack();
    // Arrivé depuis une fiche, même après avoir retiré les puces : la catégorie vient de la fiche, on n'est
    // jamais passé par la liste des catégories — la flèche retour ramène directement à la fiche.
    if (openedFromDrink) return onBack();
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
        // Bloc pleine largeur : il sort de la marge de 20 px de la page. Bordure gardée en haut et en bas seulement (les côtés sont hors de l'écran), sans coins arrondis ; la hauteur du bloc ne change pas.
        margin: "0 -20px",
        borderTop: `2px solid ${COLORS.paperAlt}`,
        borderBottom: `2px solid ${COLORS.paperAlt}`,
        borderLeft: "none",
        borderRight: "none",
        borderRadius: 0,
        padding: "14px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        position: "relative",
      }}
    >
      <span style={{ position: "absolute", top: "10px", right: "12px" }}>
        <CertificationIcon level={d.certificationLevel} size={15} />
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
        {/* Rond-profil : le plus grand possible sans agrandir le bloc (68 px : la hauteur du bloc le plus bas, 76 px, moins 4 px de chaque côté), à 4 px du haut et du bas, centré en hauteur, à 14 px du bord gauche. Les marges négatives du haut et du bas reprennent le remplissage du bloc (14 px) sans changer sa hauteur. Même règle que sur la carte d'un produit de la tournée. */}
        <div style={{ display: "flex", flexShrink: 0, margin: "-12px 0" }}>
          <EntityAvatar photoUrl={d.photoUrl} size={68} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            {d.name}
            {d.pendingContributionsCount > 0 && <span style={{ fontSize: "13px" }} title="Une modification est proposée">📝</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
            {(d.type === "Bières & Cidres"
              ? [
                  d.nationality ? <CountryFlagImg country={d.nationality} size={18.5} /> : null,
                  d.abv != null ? <span style={{ fontSize: "11px", color: COLORS.inkSoft }}>{d.abv.toFixed(1)}% ABV</span> : null,
                  ...getDrinkBadgeItems(d, { hideCountry: true }).map((it) => renderDrinkBadgeItem(it, { drink: d, onTagClick, size: 11 })),
                ]
              : getDrinkBadgeItems(d).map((it) => renderDrinkBadgeItem(it, { drink: d, onTagClick, size: 11 }))
            )
              .filter(Boolean)
              .map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />}
                  {part}
                </React.Fragment>
              ))}
          </div>
          {d.type === "Bières & Cidres" ? (
            d.brewery && (
              <div style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>{d.brewery}</div>
            )
          ) : (
            drinkSummaryParts(d, searching).length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "11px", color: COLORS.inkSoft, marginTop: "2px" }}>
                {drinkSummaryParts(d, searching).map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: COLORS.amber, flexShrink: 0 }} />}
                    {part}
                  </React.Fragment>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </button>
  );

  // « 23 produits » au-dessus des résultats (rien s'il n'y en a aucun : le message vide suffit).
  const countLine =
    totalCount > 0 ? (
      <p style={{ margin: "0 0 2px", fontSize: "12.5px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>
        {totalCount} {totalCount > 1 ? "produits" : "produit"}
      </p>
    ) : null;

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={goBackOneLevel} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", margin: "4px 0 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block", flexShrink: 0 }} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: 0 }}>
            {activeCategory ? drinkTypeLabel(activeCategory) : "Produits"}
          </h1>
        </div>
        <button onClick={() => setRefreshTick((t) => t + 1)} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }} title="Actualiser" aria-label="Actualiser">
          <NavIcon name="refresh" size={18} color={COLORS.amber} />
        </button>
      </div>

      {!searching && activeCategory && activeTagFilter?.kind === "style" && styleFilterCodes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px", alignSelf: "flex-start" }}>
          {styleFilterCodes.map((code, i) => (
            <button
              key={code}
              onClick={() => removeStyleFromFilter(code)}
              style={{ background: COLORS.paperAlt, border: "none", borderRadius: "999px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, color: COLORS.inkSoft, cursor: "pointer" }}
            >
              {i === 0 ? "Filtré : " : ""}
              {styleTagLabel(code)} ✕
            </button>
          ))}
        </div>
      )}

      {!searching && activeCategory && activeTagFilter && activeTagFilter.kind !== "style" && (
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
          ) : activeTagFilter.kind === "alcoholFree" ? (
            "Alcohol free"
          ) : activeTagFilter.kind === "alcoholLow" ? (
            "Alcohol low"
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "13px 14px",
          borderRadius: "10px",
          border: `2px solid ${COLORS.paperAlt}`,
          marginBottom: "16px",
        }}
      >
        <NavIcon name="search" size={17} color={COLORS.inkSoft} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher..."
          style={{ flex: 1, minWidth: 0, border: "none", background: "none", color: COLORS.ink, fontSize: "15px", outline: "none" }}
        />
        <span style={{ width: "1px", height: "20px", background: COLORS.paperAlt, flexShrink: 0 }} />
        <button onClick={goToScanBarcode} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}>
          <AiIcon size={28} bleed />
        </button>
      </div>

      {searching ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {countLine}
          {items.length === 0 && !loadingMore && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune boisson trouvée.</p>}
          {items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{items.map(renderDrinkRow)}</div>
          )}
          {hasMore && (
            <div ref={sentinelRef} style={{ textAlign: "center", padding: "10px", fontSize: "12px", color: COLORS.inkSoft }}>
              Chargement...
            </div>
          )}
          {!(items.length === 0 && loadingMore) && <AddAfterSearch query={q} onAdd={goToSubmit} noun="produit" label="Proposer une boisson" />}
        </div>
      ) : activeCategory ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {useLetterTier && letterCounts.length > 0 && <LetterPills letters={letterCounts.map((l) => l.letter)} activeLetter={activeLetter} onSelect={setActiveLetter} />}
          {showingList && countLine}
          {showingList && items.length === 0 && !loadingMore && (
            <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune boisson dans cette catégorie pour l'instant.</p>
          )}
          {showingList && items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{items.map(renderDrinkRow)}</div>
          )}
          {showingList && hasMore && (
            <div ref={sentinelRef} style={{ textAlign: "center", padding: "10px", fontSize: "12px", color: COLORS.inkSoft }}>
              Chargement...
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
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

      {activeCategory && !searching && <ScrollToTopButton />}
      <BackFooterLink onClick={goBackOneLevel} />
    </div>
  );
}
