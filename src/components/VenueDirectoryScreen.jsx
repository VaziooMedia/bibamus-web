// ============================================================
// Écran "Établissements & Lieux" — copié tel quel depuis le
// prototype Claude. C'est ici que la connexion à Supabase se
// voit concrètement : `publicVenues` vient maintenant de la
// vraie base de données, partagée entre tous les Bibax connectés.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, COUNTRY_FLAGS } from "../constants.js";
import { NavIcon, FlagIcon, VerifiedBadge } from "./icons.jsx";
import { PageHeader, BackFooterLink, ScrollToTopButton, PrimaryButton } from "./ui.jsx";
import { normalizeForSearch, formatCompactCount, sameVenueByNameCity, formatAddress } from "../utils.js";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { loadNearbyVenues } from "../data/sharedDirectories.js";

export function VenueDirectoryScreen({ publicVenues, myVenues, myBibroCode, isAdmin, addIntent, onBack, onOpenVenue, goToSubmit, goToMap, onRefresh, activeCountry, setActiveCountry, activeCity, setActiveCity }) {
  const [query, setQuery] = useState("");
  const { status: geoStatus, position, requestPosition } = useGeolocation();
  const [nearbyVenues, setNearbyVenues] = useState(null);
  const [loadingNearby, setLoadingNearby] = useState(false);

  const fetchNearby = async (pos) => {
    setLoadingNearby(true);
    const results = await loadNearbyVenues(pos.lat, pos.lng, 3000, 8);
    setNearbyVenues(results);
    setLoadingNearby(false);
  };

  useEffect(() => {
    if (geoStatus === "granted" && position && nearbyVenues === null) {
      fetchNearby(position);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, position]);

  const handleNearbyClick = () => {
    if (geoStatus === "granted" && position) {
      fetchNearby(position);
      return;
    }
    requestPosition();
  };

  const visible = publicVenues;
  const q = normalizeForSearch(query.trim());
  const searching = q.length > 0;

  const countries = Array.from(new Set(visible.map((v) => v.country || "Non précisé"))).sort((a, b) => a.localeCompare(b));
  // Always show the country step, even with just one country today — keeps the browsing structure
  // stable as more countries get added, rather than restructuring the flow later.
  const skipCountryLevel = false;

  const citiesFor = (country) =>
    Array.from(new Set(visible.filter((v) => (v.country || "Non précisé") === country).map((v) => v.city || "Non précisée"))).sort((a, b) => a.localeCompare(b));

  const countFor = (country, city) =>
    visible.filter((v) => (v.country || "Non précisé") === country && (city ? (v.city || "Non précisée") === city : true)).length;

  const searchResults = searching
    ? visible
        .filter(
          (v) =>
            normalizeForSearch(v.name).includes(q) ||
            normalizeForSearch(v.city).includes(q) ||
            normalizeForSearch(v.streetName).includes(q) ||
            normalizeForSearch(v.postalCode).includes(q)
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const effectiveCountry = skipCountryLevel ? countries[0] : activeCountry;
  const cityResults =
    effectiveCountry && activeCity
      ? visible
          .filter((v) => (v.country || "Non précisé") === effectiveCountry && (v.city || "Non précisée") === activeCity)
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

  const alreadyAdded = (v) =>
    myVenues.some((mv) => mv.isFavorite && mv.sourcePublicVenueId === v.id) ||
    myVenues.some((mv) => mv.isFavorite && sameVenueByNameCity(mv, v));

  const renderVenueRow = (v) => (
    <button
      key={v.id}
      onClick={() => onOpenVenue(v.id)}
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
      <div>
        <div style={{ fontWeight: 700, fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>
          {v.name}
          {v.status === "complete" && <VerifiedBadge size={15} />}
          {v.status === "to_process" && (
            <span style={{ fontSize: "10.5px", color: COLORS.wine, fontWeight: 700, verticalAlign: "middle" }}>EN ATTENTE</span>
          )}
        </div>
        {v.subtitle && <div style={{ fontSize: "12px", color: COLORS.wine, fontWeight: 600, marginTop: "1px" }}>{v.subtitle}</div>}
        <div style={{ fontSize: "13px", color: COLORS.inkSoft, marginTop: "2px" }}>{formatAddress(v)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
        {alreadyAdded(v) && <span style={{ fontSize: "14px", color: COLORS.amber }}>★</span>}
        {(v.likes || []).length > 0 && (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
            <NavIcon name="heart" size={14} color={COLORS.redFluo} />
            <span style={{ fontSize: "10px", color: COLORS.redFluo, fontWeight: 700 }}>{formatCompactCount(v.likes.length)}</span>
          </span>
        )}
        {v.pendingContributionsCount > 0 && <span style={{ fontSize: "13px" }} title="Une modification est proposée">📝</span>}
      </div>
    </button>
  );

  // Back button: unwind one navigation level at a time (city → country → screen back).
  const handleBack = () => {
    if (searching) return onBack();
    if (activeCity) return setActiveCity(null);
    if (!skipCountryLevel && activeCountry) return setActiveCountry(null);
    return onBack();
  };

  const title = searching ? "Établissements & Lieux" : activeCity || effectiveCountry || "Établissements & Lieux";

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={handleBack} />
      {addIntent && !activeCity && !activeCountry && !searching && (
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>AJOUTER UN LIEU</span>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", margin: "4px 0 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", margin: 0, lineHeight: 1 }}>{title}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, marginTop: "4px" }}>
          <button onClick={onRefresh} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }} title="Actualiser" aria-label="Actualiser">
            <NavIcon name="refresh" size={18} color={COLORS.redFluo} />
          </button>
        </div>
      </div>
      {!activeCity && !activeCountry && !searching && addIntent && (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "16px" }}>
          Vérifie d'abord s'il existe déjà, pour éviter les doublons — sinon tu pourras le créer en bas de cette page.
        </p>
      )}

      {addIntent && (
        <PrimaryButton onClick={goToSubmit} style={{ width: "100%", marginBottom: "16px" }}>
          Je ne le trouve pas, créer une fiche
        </PrimaryButton>
      )}

      {!addIntent && !activeCity && !activeCountry && !searching && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <button
            onClick={goToSubmit}
            style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
            title="Proposer un établissement"
            aria-label="Proposer un établissement"
          >
            +
          </button>
        </div>
      )}

      {!addIntent && !activeCity && !activeCountry && !searching && (
        <button
          onClick={goToMap}
          style={{
            background: COLORS.surfaceAlt,
            border: "none",
            borderRadius: "12px",
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            width: "100%",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "14.5px", color: COLORS.chalkWhite }}>🗺️ Voir sur une carte</span>
          <span style={{ fontSize: "13px", color: COLORS.chalkWhite, opacity: 0.7 }}>→</span>
        </button>
      )}

      {!addIntent && !activeCity && !activeCountry && !searching && (
        <div style={{ marginBottom: "16px" }}>
          {nearbyVenues === null ? (
            <button
              onClick={handleNearbyClick}
              disabled={geoStatus === "loading" || loadingNearby}
              style={{
                background: "none",
                border: `2px dashed ${COLORS.paperAlt}`,
                borderRadius: "12px",
                padding: "13px 16px",
                cursor: "pointer",
                width: "100%",
                color: COLORS.amber,
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              {geoStatus === "loading" || loadingNearby ? "Recherche..." : "📍 Établissements près de moi"}
              {geoStatus === "denied" && (
                <span style={{ display: "block", fontSize: "11px", color: COLORS.inkSoft, fontWeight: 500, marginTop: "4px" }}>
                  Position refusée — activez-la dans les réglages de votre navigateur pour réessayer.
                </span>
              )}
              {geoStatus === "unavailable" && (
                <span style={{ display: "block", fontSize: "11px", color: COLORS.inkSoft, fontWeight: 500, marginTop: "4px" }}>
                  Géolocalisation non disponible sur cet appareil.
                </span>
              )}
            </button>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.inkSoft }}>📍 Près de vous</span>
                <button onClick={() => setNearbyVenues(null)} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "12px", textDecoration: "underline", cursor: "pointer" }}>
                  Masquer
                </button>
              </div>
              {nearbyVenues.length === 0 ? (
                <p style={{ color: COLORS.inkSoft, fontSize: "13px", fontStyle: "italic" }}>Aucun établissement répertorié à proximité pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>{nearbyVenues.map(renderVenueRow)}</div>
              )}
              <div style={{ borderBottom: `1px solid ${COLORS.paperAlt}`, margin: "18px 0" }} />
            </>
          )}
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={activeCity ? "Rechercher par nom" : activeCountry ? "Rechercher par ville, code postal, nom" : "Rechercher par pays, ville, code postal, nom"}
        style={{ padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "15px", outline: "none", marginBottom: "16px" }}
      />

      {searching ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {searchResults.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun établissement trouvé.</p>}
          {searchResults.map(renderVenueRow)}
        </div>
      ) : activeCity ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {cityResults.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun établissement pour l'instant.</p>}
          {cityResults.map(renderVenueRow)}
        </div>
      ) : !skipCountryLevel && !activeCountry ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {countries.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun établissement enregistré pour l'instant.</p>}
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
                {COUNTRY_FLAGS[country] ? <FlagIcon flag={COUNTRY_FLAGS[country]} size={17} /> : <span>🌍</span>}
                {country}
              </span>
              <span style={{ fontSize: "13px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{countFor(country)} →</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {effectiveCountry &&
            citiesFor(effectiveCountry).length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun établissement enregistré pour l'instant.</p>}
          {effectiveCountry &&
            citiesFor(effectiveCountry).map((city) => (
              <button
                key={city}
                onClick={() => setActiveCity(city)}
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
                  <span style={{ width: "4px", height: "16px", background: COLORS.amber, borderRadius: "2px", flexShrink: 0 }} />
                  {city}
                </span>
                <span style={{ fontSize: "13px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{countFor(effectiveCountry, city)} →</span>
              </button>
            ))}
        </div>
      )}

      {!addIntent && !activeCity && !activeCountry && !searching && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <button
            onClick={goToSubmit}
            style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.amber, border: "none", color: COLORS.paper, fontSize: "32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.35)" }}
            title="Proposer un établissement"
            aria-label="Proposer un établissement"
          >
            +
          </button>
        </div>
      )}

      {(activeCity || (activeCountry && !activeCity) || searching) && <ScrollToTopButton />}
      <BackFooterLink onClick={handleBack} />
    </div>
  );
}
