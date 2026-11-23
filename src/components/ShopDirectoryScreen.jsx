// ============================================================
// Écran « Shops » (points de vente de boissons à emporter : supermarchés, négociants en vin, Drink & Food Shops, boutiques en ligne).
// Même structure que « Producteurs » (BreweryDirectoryScreen) : une page de pays, puis la liste d'un pays, et la recherche par nom. Tout est calculé
// dans l'appareil à partir d'un seul chargement de loadShopsDirectory().
// Une tuile « En ligne » passe en tête de la page des pays : elle rassemble les shops qui ont une boutique en ligne (même s'ils ont aussi un magasin),
// car une boutique en ligne n'a pas toujours de pays. Un shop qui a un magasin est aussi rangé dans le pays de son magasin.
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import { COLORS, SHOP_CATEGORIES } from "../constants.js";
import { NavIcon, CountryFlagImg } from "./icons.jsx";
import { PageHeader, BackFooterLink, ScrollToTopButton, EntityAvatar } from "./ui.jsx";
import { loadShopsDirectory, loadShopListsOnce, COUNTRY_CODE_TO_LABEL } from "../data/sharedDirectories.js";
import { resolveTagLabels } from "./BreweryBrandDetailScreens.jsx";
import { SHOP_CATEGORY_LIST_KEY } from "../shopLists.js";
import { normalizeSearchText, makeSearchMatcher, entityNames, formatAddress } from "../utils.js";
import { useListReturn } from "../hooks/useListReturn.js";

// Valeur de `activeCountry` pour la liste « En ligne » (aucun vrai pays ne porte ce nom).
export const ONLINE_KEY = "__online__";

const countryLabel = (code) => COUNTRY_CODE_TO_LABEL[code] || code;

// Les deux lignes sous le nom : l'adresse complète, écrite comme dans la liste des Lieux (« Rue de Fer, 12 - B-5000 Namur »), ou « En ligne » pour une boutique
// sans magasin ; puis les catégories (« Supermarché · Cave à bières »).
const shopLines = (shop, categoryLabels) => {
  const place = shop.hasStore ? formatAddress(shop) : "En ligne";
  return { place, categories: categoryLabels.join(" · ") };
};

// Retour d'une fiche (norme de l'app, voir `useListReturn`) : la page se remet à la hauteur où on l'avait laissée, avec la recherche tapée et le pays ouvert (gardé par App) ;
// la liste est relue en silence. Une entrée depuis BibAtlas repart de zéro.
export function ShopDirectoryScreen({ onBack, onOpenShop: onOpenShopProp, activeCountry, setActiveCountry, mainScrollRef }) {
  const { restored, save, open } = useListReturn("shopDirectory", mainScrollRef, { valid: (m) => (m.activeCountry || null) === (activeCountry || null) });
  const onOpenShop = open(onOpenShopProp);
  const [query, setQuery] = useState(restored ? restored.query : "");
  const [debouncedQuery, setDebouncedQuery] = useState(restored ? restored.query : "");
  const [all, setAll] = useState(restored ? restored.all : []);
  const [loading, setLoading] = useState(!restored);
  const [failed, setFailed] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lists, setLists] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    // Au retour d'une fiche, la liste déjà affichée reste en place pendant la relecture (pas de « Chargement... »).
    if (!(restored && refreshTick === 0)) setLoading(true);
    loadShopsDirectory().then((list) => {
      // Si la lecture échoue, on garde ce qu'on avait.
      if (list) {
        setAll(list);
        setFailed(false);
      } else if (!(restored && refreshTick === 0)) {
        setFailed(true);
      }
      setLoading(false);
    });
  }, [refreshTick]);

  // Les noms des catégories : ceux de la plateforme de gestion (élément ajouté, élément renommé) l'emportent sur la liste de départ.
  useEffect(() => {
    let cancelled = false;
    loadShopListsOnce().then((l) => {
      if (l && !cancelled) setLists(l);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // La mémoire suit la page ; la hauteur de défilement s'y ajoute au moment où l'on ouvre une fiche.
  useEffect(() => {
    if (!loading) save({ query, all, activeCountry: activeCountry || null });
  }, [query, all, loading, activeCountry]);

  const q = normalizeSearchText(debouncedQuery);
  const searching = q.length > 0;

  const { countryCounts, onlineCount } = useMemo(() => {
    const counts = {};
    let online = 0;
    all.forEach((s) => {
      if (s.hasStore && s.country) counts[s.country] = (counts[s.country] || 0) + 1;
      if (s.hasOnline) online += 1;
    });
    return { countryCounts: counts, onlineCount: online };
  }, [all]);

  const countries = Object.keys(countryCounts).sort((a, b) => countryLabel(a).localeCompare(countryLabel(b)));

  const items = useMemo(() => {
    if (searching) {
      // Même règle de recherche que partout dans l'app (voir makeSearchMatcher) : chaque mot tapé se retrouve, dans n'importe quel ordre.
      const matches = makeSearchMatcher(debouncedQuery);
      return all.filter((s) => matches(entityNames(s)));
    }
    if (activeCountry === ONLINE_KEY) return all.filter((s) => s.hasOnline).sort((a, b) => a.name.localeCompare(b.name));
    if (activeCountry) return all.filter((s) => s.hasStore && s.country === activeCountry).sort((a, b) => a.name.localeCompare(b.name));
    return [];
  }, [all, searching, debouncedQuery, activeCountry]);

  const renderShopRow = (s) => {
    const lines = shopLines(s, resolveTagLabels(lists, s.categories, SHOP_CATEGORIES, SHOP_CATEGORY_LIST_KEY));
    return (
      <button
        key={s.id}
        onClick={() => onOpenShop(s.id)}
        style={{
          textAlign: "left",
          background: COLORS.surface,
          // Bloc pleine largeur : il sort de la marge de 20 px de la page (même présentation que la liste des Producteurs).
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
          alignItems: "center",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div style={{ display: "flex", flexShrink: 0, margin: "-12px 0" }}>
            <EntityAvatar photoUrl={s.profilePhotoUrl} size={68} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>{s.name}</div>
            {lines.place && <div style={{ fontSize: "9.5px", color: COLORS.inkSoft, marginTop: "2px" }}>{lines.place}</div>}
            {lines.categories && <div style={{ fontSize: "9.5px", color: COLORS.inkSoft, marginTop: "2px" }}>{lines.categories}</div>}
          </div>
        </div>
      </button>
    );
  };

  // Flèche retour : un niveau à la fois (pays → page des pays → écran d'avant).
  const handleBack = () => {
    if (searching) return onBack();
    if (activeCountry) return setActiveCountry(null);
    return onBack();
  };

  const title = searching ? "Shops" : activeCountry === ONLINE_KEY ? "En ligne" : activeCountry ? countryLabel(activeCountry) : "Shops";

  const tileStyle = {
    textAlign: "left",
    background: COLORS.surface,
    border: `2px solid ${COLORS.paperAlt}`,
    borderRadius: "12px",
    padding: "14px 16px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };
  const tileCountStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" };

  return (
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={handleBack} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", margin: "4px 0 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", margin: 0, lineHeight: 1 }}>{title}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, marginTop: "4px" }}>
          <button onClick={() => setRefreshTick((t) => t + 1)} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }} title="Actualiser" aria-label="Actualiser">
            <NavIcon name="refresh" size={18} color={COLORS.amber} />
          </button>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nom"
        style={{ padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "15px", outline: "none", marginBottom: "16px" }}
      />

      {loading ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Chargement...</p>
      ) : failed ? (
        <p role="alert" style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>
          Impossible de charger les shops pour l'instant. Touche « Actualiser » pour réessayer.
        </p>
      ) : searching ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {items.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun shop trouvé.</p>}
          {items.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{items.map(renderShopRow)}</div>}
        </div>
      ) : activeCountry ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {items.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun shop pour l'instant.</p>}
          {items.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{items.map(renderShopRow)}</div>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {countries.length === 0 && onlineCount === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun shop enregistré pour l'instant.</p>}
          {onlineCount > 0 && (
            <button data-shop-tile="online" onClick={() => setActiveCountry(ONLINE_KEY)} style={tileStyle}>
              <span style={{ fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ display: "inline-flex", width: "22px", justifyContent: "center" }}>
                  <NavIcon name="world" size={20} color={COLORS.amber} />
                </span>
                En ligne
              </span>
              <span style={tileCountStyle}>
                {onlineCount}
                <NavIcon name="arrow-right-circle" size={18} color={COLORS.amber} />
              </span>
            </button>
          )}
          {countries.map((country) => (
            <button key={country} data-shop-tile={country} onClick={() => setActiveCountry(country)} style={tileStyle}>
              <span style={{ fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CountryFlagImg country={countryLabel(country)} size={22} />
                {countryLabel(country)}
              </span>
              <span style={tileCountStyle}>
                {countryCounts[country]}
                <NavIcon name="arrow-right-circle" size={18} color={COLORS.amber} />
              </span>
            </button>
          ))}
        </div>
      )}

      {(activeCountry || searching) && <ScrollToTopButton />}
      <BackFooterLink onClick={handleBack} />
    </div>
  );
}
