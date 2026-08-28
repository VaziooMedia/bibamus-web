// ============================================================
// Écran "Produits" — copié tel quel depuis le prototype Claude,
// avec le classement alphabétique et le défilement infini déjà
// en place pour absorber un grand nombre de produits sans lenteur.
// ============================================================
import React, { useState } from "react";
import { COLORS, COUNTRY_FLAGS, DRINK_TYPES, RATABLE_DRINK_TYPES } from "../constants.js";
import { NavIcon, FlagIcon, VerifiedBadge } from "./icons.jsx";
import { PageHeader, BackFooterLink, ScrollToTopButton, useInfiniteScroll, EntityAvatar } from "./ui.jsx";
import { DrinkBadges } from "./DrinkDisplay.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { normalizeForSearch, drinkTypeLabel, drinkSummaryLine } from "../utils.js";

export function DrinksDirectoryScreen({ drinks, isAdmin, myBibroCode, onBack, onOpenDrink, goToSubmit, onRefresh, initialCategory, initialTagFilter, onSeedConsumed }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(initialCategory || null);
  const [activeTagFilter, setActiveTagFilter] = useState(initialTagFilter || null);
  const [activeLetter, setActiveLetter] = useState(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    if (initialCategory && onSeedConsumed) onSeedConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const visible = drinks;
  const q = normalizeForSearch(debouncedQuery.trim());
  const searching = q.length > 0;

  const matchesTagFilter = (d) => {
    if (!activeTagFilter) return true;
    if (activeTagFilter.kind === "nationality") return d.nationality === activeTagFilter.value;
    if (activeTagFilter.kind === "zero") return d.abv != null && d.abv <= 0.5;
    if (activeTagFilter.kind === "alcoholic") return d.abv != null && d.abv > 0.5;
    if (activeTagFilter.kind === "glutenFree") return !!d.glutenFree;
    if (activeTagFilter.kind === "bio") return !!d.bio;
    return true;
  };

  const letterOf = (name) => {
    const stripped = (name || "").replace(/^(le|la|les)\s+/i, "");
    const c = normalizeForSearch(stripped[0] || "");
    return /[0-9]/.test(c) ? "0-9" : c ? c.toUpperCase() : "?";
  };

  const LETTER_THRESHOLD = 20;

  const itemsInCategory = React.useMemo(
    () => (activeCategory ? visible.filter((d) => d.type === activeCategory && matchesTagFilter(d)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, activeCategory, activeTagFilter]
  );

  const useLetterTier = activeCategory && itemsInCategory.length > LETTER_THRESHOLD;

  const lettersPresent = React.useMemo(() => {
    if (!useLetterTier) return [];
    const set = new Set(itemsInCategory.map((d) => letterOf(d.name)));
    return Array.from(set).sort((a, b) => (a === "0-9" ? -1 : b === "0-9" ? 1 : a.localeCompare(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsInCategory, useLetterTier]);

  const countForLetter = (letter) => itemsInCategory.filter((d) => letterOf(d.name) === letter).length;

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


  const filtered = React.useMemo(
    () =>
      (searching
        ? visible.filter(
            (d) =>
              (!activeCategory || d.type === activeCategory) &&
              (normalizeForSearch(d.name).includes(q) || normalizeForSearch(d.brewery).includes(q) || normalizeForSearch(d.type).includes(q))
          )
        : visible.filter(
            (d) => d.type === activeCategory && matchesTagFilter(d) && (!useLetterTier || !activeLetter || letterOf(d.name) === activeLetter)
          )
      ).sort((a, b) => a.name.replace(/^(le|la|les)\s+/i, "").localeCompare(b.name.replace(/^(le|la|les)\s+/i, ""))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, q, searching, activeCategory, activeTagFilter, activeLetter, useLetterTier]
  );

  const { visibleItems: visibleFiltered, hasMore, sentinelRef } = useInfiniteScroll(
    filtered,
    40,
    `${searching ? "search:" + q : "cat:" + activeCategory + ":" + activeLetter}:${activeTagFilter ? JSON.stringify(activeTagFilter) : ""}`
  );

  const categoryCounts = React.useMemo(() => {
    const counts = {};
    visible.forEach((d) => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });
    return counts;
  }, [visible]);
  const countFor = (type) => categoryCounts[type] || 0;

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
        <EntityAvatar photoUrl={d.photoUrl} photoEmoji={d.avatarEmoji} size={40} fallbackIcon="bottle" />
        <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {d.name}
          {d.status === "pending" && <span style={{ fontSize: "10.5px", color: COLORS.wine, fontWeight: 700 }}>EN ATTENTE</span>}
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

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={goBackOneLevel} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", margin: "4px 0 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", margin: 0, lineHeight: 1 }}>
            {!searching && activeCategory ? (
              <>
                {drinkTypeLabel(activeCategory)}
                {useLetterTier && activeLetter && (
                  <>
                    {" — "}
                    <span style={{ color: COLORS.amber }}>{activeLetter}</span>
                  </>
                )}
              </>
            ) : (
              "Produits"
            )}
          </h1>
        </div>
        <button onClick={onRefresh} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }} title="Actualiser" aria-label="Actualiser">
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
              {COUNTRY_FLAGS[activeTagFilter.value] && <FlagIcon flag={COUNTRY_FLAGS[activeTagFilter.value]} size={13} />}
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

      {activeCategory && !searching && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <button
            onClick={goToSubmit}
            style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
            title="Proposer une boisson"
            aria-label="Proposer une boisson"
          >
            +
          </button>
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={activeCategory ? `Rechercher dans ${drinkTypeLabel(activeCategory)}` : "Rechercher dans toutes les catégories"}
        style={{ padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "15px", outline: "none", marginBottom: "16px" }}
      />

      {searching ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {filtered.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune boisson trouvée.</p>}
          {visibleFiltered.map(renderDrinkRow)}
          {hasMore && (
            <div ref={sentinelRef} style={{ textAlign: "center", padding: "10px", fontSize: "12px", color: COLORS.inkSoft }}>
              Chargement...
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "6px" }}>
            <button
              onClick={goToSubmit}
              style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
              title="Proposer une boisson"
              aria-label="Proposer une boisson"
            >
              +
            </button>
          </div>
        </div>
      ) : activeCategory && useLetterTier && !activeLetter ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {lettersPresent.map((letter) => (
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
          {filtered.length === 0 && (
            <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucune boisson dans cette catégorie pour l'instant.</p>
          )}
          {visibleFiltered.map(renderDrinkRow)}
          {hasMore && (
            <div ref={sentinelRef} style={{ textAlign: "center", padding: "10px", fontSize: "12px", color: COLORS.inkSoft }}>
              Chargement...
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
            <button
              onClick={goToSubmit}
              style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
              title="Proposer une boisson"
              aria-label="Proposer une boisson"
            >
              +
            </button>
          </div>
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
              <span style={{ fontSize: "13px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>
                {countFor(cat)} →
              </span>
            </button>
          ))}
        </div>
      )}

      {activeCategory && !searching && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "auto", paddingTop: "16px" }}>
          <button
            onClick={goToSubmit}
            style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
            title="Proposer une boisson"
            aria-label="Proposer une boisson"
          >
            +
          </button>
        </div>
      )}
      {activeCategory && !searching && <ScrollToTopButton />}
      <BackFooterLink onClick={goBackOneLevel} />
    </div>
  );
}
