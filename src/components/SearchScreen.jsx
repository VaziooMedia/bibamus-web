// ============================================================
// Écran de recherche — accessible depuis la barre de recherche
// sur Home. Une seule saisie, 5 catégories de résultats
// affichées séparément : Établissements, Produits, Marques,
// Producteurs, Bibax. Les 4 premières filtrent des répertoires
// déjà chargés (aucun appel réseau) ; Bibax interroge le serveur
// (avec un léger anti-rebond) puisque rien n'est chargé d'avance
// pour cette catégorie côté vie privée.
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";
import { searchBibax } from "../data/sharedDirectories.js";

const MAX_PER_CATEGORY = 5;

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function ResultSection({ title, icon, items, renderItem, emptyOkay }) {
  if (items.length === 0 && !emptyOkay) return null;
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 8px 2px" }}>
        {icon}
        <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", margin: 0 }}>
          {title} {items.length > 0 && <span style={{ color: COLORS.inkSoft, fontWeight: 600 }}>({items.length})</span>}
        </h2>
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, margin: "0 0 0 2px" }}>Aucun résultat</p>
      ) : (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "0 12px" }}>
          {items.slice(0, MAX_PER_CATEGORY).map((item, i) => renderItem(item, i === Math.min(items.length, MAX_PER_CATEGORY) - 1))}
        </div>
      )}
    </div>
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
  onBack,
}) {
  const [query, setQuery] = useState("");
  const [bibaxResults, setBibaxResults] = useState([]);
  const [bibaxLoading, setBibaxLoading] = useState(false);

  const trimmed = query.trim();
  const q = normalize(trimmed);

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

  const hasQuery = trimmed.length >= 2;
  const totalResults = venueResults.length + drinkResults.length + brandResults.length + breweryResults.length + bibaxResults.length;

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", flexShrink: 0 }}>
          <NavIcon name="back-triangle" size={18} color={COLORS.ink} />
        </button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "10px 14px" }}>
          <NavIcon name="search" size={17} color={COLORS.inkSoft} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Établissements, produits, marques, producteurs, Bibax..."
            autoFocus
            style={{ flex: 1, minWidth: 0, border: "none", background: "none", color: COLORS.ink, fontSize: "14px", outline: "none" }}
          />
          {query.length > 0 && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
              <NavIcon name="x" size={15} color={COLORS.inkSoft} />
            </button>
          )}
        </div>
      </div>

      {!hasQuery ? (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Tapez au moins 2 caractères pour lancer la recherche.</p>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {totalResults === 0 && !bibaxLoading && (
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, textAlign: "center", marginTop: "40px" }}>Aucun résultat pour « {trimmed} ».</p>
          )}

          <ResultSection
            title="Établissements"
            icon={<NavIcon name="map-pin" size={16} color={COLORS.amber} />}
            items={venueResults}
            renderItem={(v, last) => (
              <ResultRow key={v.id} title={v.name} subtitle={v.city} avatar={<GenericIconAvatar name="map-pin" />} onClick={() => onOpenVenue(v.id)} last={last} />
            )}
          />

          <ResultSection
            title="Produits"
            icon={<NavIcon name="bottle" size={16} color={COLORS.amber} />}
            items={drinkResults}
            renderItem={(d, last) => (
              <ResultRow key={d.id} title={d.name} subtitle={d.type} avatar={<GenericIconAvatar name="bottle" />} onClick={() => onOpenDrink(d.id)} last={last} />
            )}
          />

          <ResultSection
            title="Marques"
            icon={<NavIcon name="tag" size={16} color={COLORS.amber} />}
            items={brandResults}
            renderItem={(b, last) => <ResultRow key={b.id} title={b.name} avatar={<GenericIconAvatar name="tag" />} onClick={() => onOpenBrand(b.id)} last={last} />}
          />

          <ResultSection
            title="Producteurs"
            icon={<NavIcon name="world" size={16} color={COLORS.amber} />}
            items={breweryResults}
            renderItem={(b, last) => <ResultRow key={b.id} title={b.name} avatar={<GenericIconAvatar name="world" />} onClick={() => onOpenBrewery(b.id)} last={last} />}
          />

          <ResultSection
            title="Bibax"
            icon={<NavIcon name="users" size={16} color={COLORS.amber} />}
            items={bibaxResults}
            emptyOkay={bibaxLoading}
            renderItem={(b, last) => (
              <ResultRow
                key={b.id}
                title={b.displayName}
                avatar={<EntityAvatar photoUrl={b.avatarUrl} size={36} />}
                onClick={() => onOpenBibaxProfile(b.bibroCode)}
                last={last}
              />
            )}
          />
          {bibaxLoading && <p style={{ fontSize: "12px", color: COLORS.inkSoft, textAlign: "center" }}>Recherche des Bibax...</p>}
        </div>
      )}
    </div>
  );
}
