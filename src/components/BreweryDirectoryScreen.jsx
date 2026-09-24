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
import { PageHeader, BackFooterLink, ScrollToTopButton, PrimaryButton, EntityAvatar } from "./ui.jsx";
import { loadBreweriesDirectory, COUNTRY_CODE_TO_LABEL } from "../data/sharedDirectories.js";
import { normalizeSearchText } from "../utils.js";

const countryLabel = (code) => COUNTRY_CODE_TO_LABEL[code] || code;

export function BreweryDirectoryScreen({ myBreweries = [], myBibroCode, isAdmin, addIntent, onBack, onOpenBrewery, goToSubmit, activeCountry, setActiveCountry, activeCity, setActiveCity }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    loadBreweriesDirectory().then((list) => {
      setAll(list);
      setLoading(false);
    });
  }, [refreshTick]);

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
      return all.filter((b) =>
        [b.name, b.alternateName, ...(b.aliases || []), ...(b.translations || []).map((t) => t.value)].some((v) => v && normalizeSearchText(v).includes(q))
      );
    }
    if (activeCountry) {
      return all.filter((b) => b.country === activeCountry).sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }, [all, searching, q, activeCountry]);

  const alreadyAdded = (b) => myBreweries.some((mb) => mb.isFavorite && mb.sourcePublicBreweryId === b.id);

  const renderBreweryRow = (b) => (
    <button
      key={b.id}
      onClick={() => onOpenBrewery(b.id)}
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
        position: "relative",
      }}
    >
      <span style={{ position: "absolute", top: "10px", right: "12px" }}>
        <CertificationIcon level={b.certificationLevel} size={15} />
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <EntityAvatar photoUrl={b.profilePhotoUrl} photoEmoji={b.avatarEmoji} size={44} />
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>
            {b.name}
          </div>
          <div style={{ fontSize: "9.5px", color: COLORS.inkSoft, marginTop: "2px" }}>{countryLabel(b.country)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
        {alreadyAdded(b) && <span style={{ fontSize: "14px", color: COLORS.amber }}>★</span>}
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
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={handleBack} />
      {addIntent && !activeCountry && !searching && (
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>AJOUTER UN PRODUCTEUR</span>
      )}
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
      {!activeCountry && !searching && addIntent && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "16px" }}>
          Vérifie d'abord s'il existe déjà, pour éviter les doublons — sinon tu pourras le créer en bas de cette page.
        </p>
      )}

      {addIntent && (
        <PrimaryButton onClick={goToSubmit} style={{ width: "100%", marginBottom: "16px" }}>
          Je ne le trouve pas, créer une fiche
        </PrimaryButton>
      )}

      {!addIntent && !activeCountry && !searching && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <button
            onClick={goToSubmit}
            style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
            title="Proposer un producteur"
            aria-label="Proposer un producteur"
          >
            +
          </button>
        </div>
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
          {items.map(renderBreweryRow)}
        </div>
      ) : activeCountry ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {items.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun producteur pour l'instant.</p>}
          {items.map(renderBreweryRow)}
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

      {!addIntent && !activeCountry && !searching && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <button
            onClick={goToSubmit}
            style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
            title="Proposer un producteur"
            aria-label="Proposer un producteur"
          >
            +
          </button>
        </div>
      )}

      {(activeCountry || searching) && <ScrollToTopButton />}
      <BackFooterLink onClick={handleBack} />
    </div>
  );
}
