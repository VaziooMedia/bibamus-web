// ============================================================
// Écran "Producteurs" — copié depuis VenueDirectoryScreen (structure,
// navigation pays → liste, recherche) mais SANS pagination
// serveur ni "à proximité" : ces fonctionnalités n'ont pas encore
// d'équivalent côté producteurs (pas de lat/lng, pas de RPC de comptage
// ou de page serveur). Tout est calculé côté client à partir d'un seul
// chargement de loadBreweriesDirectory(). À faire évoluer vers le même
// modèle serveur que Lieux si le volume de producteurs le justifie un jour.
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import { COLORS } from "../constants.js";
import { NavIcon, CountryFlagImg, CertificationIcon } from "./icons.jsx";
import { PageHeader, BackFooterLink, ScrollToTopButton, EntityAvatar } from "./ui.jsx";
import { loadBreweriesDirectory, COUNTRY_CODE_TO_LABEL } from "../data/sharedDirectories.js";
import { normalizeSearchText, makeSearchMatcher, entityNames } from "../utils.js";
import { useListReturn } from "../hooks/useListReturn.js";
import { BibaMapButton } from "./BibaMapButton.jsx";

const countryLabel = (code) => COUNTRY_CODE_TO_LABEL[code] || code;

// Retour d'une fiche (norme de l'app, voir `useListReturn`) : la page se remet à la hauteur où on l'avait laissée, avec la recherche tapée et le pays ouvert (gardé par App) ;
// la liste est relue en silence. Une entrée depuis BibAtlas repart de zéro.
export function BreweryDirectoryScreen({ myBibroCode, onBack, onOpenBrewery: onOpenBreweryProp, goToMap, activeCountry, setActiveCountry, activeCity, setActiveCity, mainScrollRef }) {
  const { restored, save, open } = useListReturn("breweryDirectory", mainScrollRef, { valid: (m) => (m.activeCountry || null) === (activeCountry || null) });
  const onOpenBrewery = open(onOpenBreweryProp);
  const [query, setQuery] = useState(restored ? restored.query : "");
  const [debouncedQuery, setDebouncedQuery] = useState(restored ? restored.query : "");
  const [all, setAll] = useState(restored ? restored.all : []);
  const [loading, setLoading] = useState(!restored);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    // Au retour d'une fiche, la liste déjà affichée reste en place pendant la relecture (pas de « Chargement... »).
    if (!(restored && refreshTick === 0)) setLoading(true);
    loadBreweriesDirectory().then((list) => {
      setAll(list);
      setLoading(false);
    });
  }, [refreshTick]);

  // La mémoire suit la page ; la hauteur de défilement s'y ajoute au moment où l'on ouvre une fiche.
  useEffect(() => {
    if (!loading) save({ query, all, activeCountry: activeCountry || null });
  }, [query, all, loading, activeCountry]);

  const q = normalizeSearchText(debouncedQuery);
  const searching = q.length > 0;

  const countryCounts = useMemo(() => {
    const counts = {};
    all.forEach((b) => {
      counts[b.country] = (counts[b.country] || 0) + 1;
    });
    return counts;
  }, [all]);

  const countFor = (country) => countryCounts[country] || 0;

  const countries = Object.keys(countryCounts).sort((a, b) => countryLabel(a).localeCompare(countryLabel(b)));

  const items = useMemo(() => {
    if (searching) {
      // Même règle de recherche que partout dans l'app (voir makeSearchMatcher) : chaque mot tapé se retrouve, dans n'importe quel ordre.
      const matches = makeSearchMatcher(debouncedQuery);
      return all.filter((b) => matches(entityNames(b)));
    }
    if (activeCountry) {
      return all.filter((b) => b.country === activeCountry).sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }, [all, searching, debouncedQuery, activeCountry]);

  const renderBreweryRow = (b) => (
    <button
      key={b.id}
      onClick={() => onOpenBrewery(b.id)}
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
        alignItems: "center",
        position: "relative",
      }}
    >
      <span style={{ position: "absolute", top: "10px", right: "12px" }}>
        <CertificationIcon level={b.certificationLevel} size={15} />
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Rond-profil : le plus grand possible sans agrandir le bloc (68 px : la hauteur du bloc le plus bas, 76 px, moins 4 px de chaque côté), à 4 px du haut et du bas, centré en hauteur, à 14 px du bord gauche. Les marges négatives du haut et du bas reprennent le remplissage du bloc (14 px) sans changer sa hauteur. Même règle que sur la carte d'un produit de la tournée. */}
        <div style={{ display: "flex", flexShrink: 0, margin: "-12px 0" }}>
          <EntityAvatar photoUrl={b.profilePhotoUrl} photoEmoji={b.avatarEmoji} size={68} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>
            {b.name}
          </div>
          <div style={{ marginTop: "2px", display: "flex", alignItems: "center", lineHeight: 0 }}>
            <CountryFlagImg country={countryLabel(b.country)} size={14} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
        {b.pendingContributionsCount > 0 && <span style={{ fontSize: "13px" }} title="Une modification est proposée">📝</span>}
      </div>
    </button>
  );

  // Back button: unwind one navigation level at a time (country → screen back).
  const handleBack = () => {
    if (searching) return onBack();
    if (activeCountry) return setActiveCountry(null);
    return onBack();
  };

  const title = searching ? "Producteurs" : activeCountry ? countryLabel(activeCountry) : "Producteurs";

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

      {!activeCountry && !searching && goToMap && (
        <BibaMapButton onClick={goToMap} />
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nom"
        style={{ padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "15px", outline: "none", marginBottom: "16px" }}
      />

      {loading ? (
        <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Chargement...</p>
      ) : searching ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {items.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun producteur trouvé.</p>}
          {items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{items.map(renderBreweryRow)}</div>
          )}
        </div>
      ) : activeCountry ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {items.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun producteur pour l'instant.</p>}
          {items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>{items.map(renderBreweryRow)}</div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {countries.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun producteur enregistré pour l'instant.</p>}
          {countries.map((country) => (
            <button
              key={country}
              onClick={() => setActiveCountry(country)}
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
              <span style={{ fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CountryFlagImg country={countryLabel(country)} size={22} />
                {countryLabel(country)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>
                {countFor(country)}
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
