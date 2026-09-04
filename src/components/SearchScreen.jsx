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
import { NavIcon } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";
import { searchBibax } from "../data/sharedDirectories.js";

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function TagButton({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        background: active ? COLORS.amber : "none",
        border: `2px solid ${active ? COLORS.amber : count > 0 ? COLORS.amber : COLORS.paperAlt}`,
        borderRadius: "999px",
        padding: "6px 12px",
        fontSize: "12.5px",
        fontWeight: 700,
        color: active ? COLORS.paper : count > 0 ? COLORS.ink : COLORS.inkSoft,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
      <span style={{ color: active ? COLORS.paper : COLORS.inkSoft, fontWeight: 700 }}>({count})</span>
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
  venues = [],
  drinksDirectory = [],
  breweriesDirectory = [],
  brandsDirectory = [],
  onOpenVenue,
  onOpenDrink,
  onOpenBrewery,
  onOpenBrand,
  onOpenBibaxProfile,
  goToScan,
  goToAtlas,
  initialTab = "lieux",
  onBack,
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [bibaxResults, setBibaxResults] = useState([]);
  const [bibaxLoading, setBibaxLoading] = useState(false);
  const inputRef = useRef(null);

  const trimmed = query.trim();
  const q = normalize(trimmed);
  const hasQuery = trimmed.length >= 2;

  const venueResults = useMemo(() => (q.length < 2 ? [] : venues.filter((v) => normalize(v.name).includes(q))), [venues, q]);
  const drinkResults = useMemo(() => (q.length < 2 ? [] : drinksDirectory.filter((d) => normalize(d.name).includes(q))), [drinksDirectory, q]);
  const brandResults = useMemo(() => (q.length < 2 ? [] : brandsDirectory.filter((b) => normalize(b.name).includes(q))), [brandsDirectory, q]);
  const breweryResults = useMemo(() => (q.length < 2 ? [] : breweriesDirectory.filter((b) => normalize(b.name).includes(q))), [breweriesDirectory, q]);

  useEffect(() => {
    if (trimmed.length < 2) {
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

  // Bascule automatiquement sur le premier onglet qui a des résultats, dès qu'une recherche
  // commence — évite de rester sur un onglet vide par défaut.
  useEffect(() => {
    if (!hasQuery) return;
    const counts = { lieux: venueResults.length, produits: drinkResults.length, marques: brandResults.length, producteurs: breweryResults.length, bibax: bibaxResults.length };
    if (counts[activeTab] === 0) {
      const firstWithResults = TABS.find((t) => counts[t.key] > 0);
      if (firstWithResults) setActiveTab(firstWithResults.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuery, trimmed]);

  const counts = { lieux: venueResults.length, produits: drinkResults.length, marques: brandResults.length, producteurs: breweryResults.length, bibax: bibaxResults.length };
  const totalResults = Object.values(counts).reduce((a, b) => a + b, 0);

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
              placeholder="Établissements, produits, marques, producteurs, Bibax..."
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
            <button onClick={goToScan} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}>
              <NavIcon name="scan-line" size={18} color={COLORS.inkSoft} />
            </button>
          </div>
        </div>
      </div>

      {!hasQuery ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Tapez au moins 2 caractères pour lancer la recherche.</p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
            {TABS.map((t) => (
              <TagButton key={t.key} label={t.label} count={counts[t.key]} active={activeTab === t.key} onClick={() => setActiveTab(t.key)} />
            ))}
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
          </div>

          <div onScroll={() => inputRef.current?.blur()} onTouchMove={() => inputRef.current?.blur()} style={{ flex: 1, overflowY: "auto" }}>
            {totalResults === 0 && !bibaxLoading ? (
              <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Aucun résultat pour « {trimmed} ».</p>
            ) : counts[activeTab] === 0 ? (
              <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>
                {activeTab === "bibax" && bibaxLoading ? "Recherche des Bibax..." : "Aucun résultat dans cette catégorie."}
              </p>
            ) : (
              <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
                {activeTab === "lieux" &&
                  venueResults.map((v, i) => (
                    <ResultRow key={v.id} title={v.name} subtitle={v.city} avatar={<GenericIconAvatar name="map-pin" />} onClick={() => onOpenVenue(v.id)} last={i === venueResults.length - 1} />
                  ))}
                {activeTab === "produits" &&
                  drinkResults.map((d, i) => (
                    <ResultRow key={d.id} title={d.name} subtitle={d.type} avatar={<GenericIconAvatar name="bottle" />} onClick={() => onOpenDrink(d.id)} last={i === drinkResults.length - 1} />
                  ))}
                {activeTab === "marques" &&
                  brandResults.map((b, i) => (
                    <ResultRow key={b.id} title={b.name} avatar={<GenericIconAvatar name="tag" />} onClick={() => onOpenBrand(b.id)} last={i === brandResults.length - 1} />
                  ))}
                {activeTab === "producteurs" &&
                  breweryResults.map((b, i) => (
                    <ResultRow key={b.id} title={b.name} avatar={<GenericIconAvatar name="world" />} onClick={() => onOpenBrewery(b.id)} last={i === breweryResults.length - 1} />
                  ))}
                {activeTab === "bibax" &&
                  bibaxResults.map((b, i) => (
                    <ResultRow
                      key={b.id}
                      title={[b.displayName, b.lastName].filter(Boolean).join(" ")}
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

