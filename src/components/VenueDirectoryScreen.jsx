// ============================================================
// Écran "Établissements & Lieux" — pays, villes, recherche et
// pagination calculés côté serveur, pour tenir à l'échelle de
// plusieurs milliers de lieux. myVenues (mes favoris) reste une
// petite liste passée telle quelle — seul le répertoire public
// complet est concerné par cette réécriture.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, COUNTRY_FLAGS } from "../constants.js";
import { NavIcon, FlagIcon, VerifiedBadge } from "./icons.jsx";
import { PageHeader, BackFooterLink, ScrollToTopButton, PrimaryButton } from "./ui.jsx";
import { formatCompactCount, sameVenueByNameCity, formatAddress } from "../utils.js";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { loadNearbyVenues, loadVenueCountryCounts, loadVenueCityCounts, loadVenuesDirectoryPage, COUNTRY_CODE_TO_LABEL } from "../data/sharedDirectories.js";

const PAGE_SIZE = 40;
const countryLabel = (code) => COUNTRY_CODE_TO_LABEL[code] || code;

export function VenueDirectoryScreen({ myVenues, myBibroCode, isAdmin, addIntent, onBack, onOpenVenue, goToSubmit, goToMap, activeCountry, setActiveCountry, activeCity, setActiveCity }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { status: geoStatus, position, requestPosition } = useGeolocation();
  const [nearbyVenues, setNearbyVenues] = useState(null);
  const [loadingNearby, setLoadingNearby] = useState(false);

  const [countryCounts, setCountryCounts] = useState({});
  const [cityCounts, setCityCounts] = useState({});
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const sentinelRef = React.useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

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

  const q = debouncedQuery.trim();
  const searching = q.length > 0;

  useEffect(() => {
    loadVenueCountryCounts().then(setCountryCounts);
  }, [refreshTick]);

  const countFor = (country, city) => (city ? cityCounts[city] || 0 : countryCounts[country] || 0);

  useEffect(() => {
    if (activeCountry && !activeCity) {
      loadVenueCityCounts(activeCountry).then(setCityCounts);
    } else {
      setCityCounts({});
    }
  }, [activeCountry, activeCity, refreshTick]);

  const countries = Object.keys(countryCounts).sort((a, b) => countryLabel(a).localeCompare(countryLabel(b)));
  const cities = Object.keys(cityCounts).sort((a, b) => a.localeCompare(b));

  // La page de résultats effectivement affichée — jamais chargée pour la simple vue "choisir un
  // pays" ni "choisir une ville" (celles-là n'ont besoin que des comptages ci-dessus).
  const showingList = searching || activeCity;

  useEffect(() => {
    if (!showingList) {
      setItems([]);
      setHasMore(true);
      return;
    }
    let cancelled = false;
    setItems([]);
    setHasMore(true);
    loadVenuesDirectoryPage({
      country: !searching ? activeCountry : null,
      city: !searching ? activeCity : null,
      query: searching ? q : null,
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
  }, [showingList, activeCountry, activeCity, searching, q, refreshTick]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = Math.floor(items.length / PAGE_SIZE);
    const results = await loadVenuesDirectoryPage({
      country: !searching ? activeCountry : null,
      city: !searching ? activeCity : null,
      query: searching ? q : null,
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
    if (activeCountry) return setActiveCountry(null);
    return onBack();
  };

  const title = searching ? "Établissements & Lieux" : activeCity || (activeCountry ? countryLabel(activeCountry) : "Établissements & Lieux");

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
          <button onClick={() => setRefreshTick((t) => t + 1)} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }} title="Actualiser" aria-label="Actualiser">
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

      {!addIntent && !activeCity && !activeCountry && !searching && goToMap && (
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
          {items.length === 0 && !loadingMore && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun établissement trouvé.</p>}
          {items.map(renderVenueRow)}
          {hasMore && (
            <div ref={sentinelRef} style={{ textAlign: "center", padding: "10px", fontSize: "12px", color: COLORS.inkSoft }}>
              Chargement...
            </div>
          )}
        </div>
      ) : activeCity ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {items.length === 0 && !loadingMore && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun établissement pour l'instant.</p>}
          {items.map(renderVenueRow)}
          {hasMore && (
            <div ref={sentinelRef} style={{ textAlign: "center", padding: "10px", fontSize: "12px", color: COLORS.inkSoft }}>
              Chargement...
            </div>
          )}
        </div>
      ) : !activeCountry ? (
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
                {COUNTRY_FLAGS[countryLabel(country)] ? <FlagIcon flag={COUNTRY_FLAGS[countryLabel(country)]} size={17} /> : <span>🌍</span>}
                {countryLabel(country)}
              </span>
              <span style={{ fontSize: "13px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{countFor(country)} →</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {cities.length === 0 && <p style={{ color: COLORS.inkSoft, fontSize: "14px", fontStyle: "italic" }}>Aucun établissement enregistré pour l'instant.</p>}
          {cities.map((city) => (
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
              <span style={{ fontSize: "13px", color: COLORS.inkSoft, fontFamily: "'Urbanist', sans-serif" }}>{countFor(activeCountry, city)} →</span>
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
