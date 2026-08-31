import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { loadNearbyVenues } from "../data/sharedDirectories.js";

// Élargit progressivement le rayon de recherche seulement si nécessaire — serré d'abord (idéal
// en zone dense, ex. plusieurs bars à quelques centaines de mètres), élargi automatiquement si
// trop peu de résultats, pour ne pas revenir bredouille en zone plus rurale.
const RADIUS_STEPS_METERS = [300, 1000, 3000, 10000];
const MIN_RESULTS_TARGET = 3;

// Ne déclenche jamais la géolocalisation toute seule — seulement au clic, pour ne jamais
// demander la position sans un geste explicite de la personne.
export function NearbyVenueSuggestions({ onPick }) {
  const { status, position, requestPosition } = useGeolocation();
  const [venues, setVenues] = useState(null);
  const [loadingVenues, setLoadingVenues] = useState(false);

  const fetchNearby = async (pos) => {
    setLoadingVenues(true);
    let results = [];
    for (const radius of RADIUS_STEPS_METERS) {
      results = await loadNearbyVenues(pos.lat, pos.lng, radius, 8);
      if (results.length >= MIN_RESULTS_TARGET) break;
    }
    setVenues(results);
    setLoadingVenues(false);
  };

  const handleClick = async () => {
    if (status === "granted" && position) {
      await fetchNearby(position);
      return;
    }
    requestPosition();
  };

  // Dès que la position vient d'être accordée, on enchaîne automatiquement sur la recherche.
  useEffect(() => {
    if (status === "granted" && position && venues === null) {
      fetchNearby(position);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, position]);

  if (venues && venues.length > 0) {
    return (
      <div style={{ marginBottom: "12px" }}>
        <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginBottom: "8px" }}>Près de vous :</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => onPick(v)}
              style={{
                textAlign: "left",
                background: COLORS.surface,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "10px",
                padding: "10px 12px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: COLORS.ink, fontSize: "13.5px", fontWeight: 600 }}>{v.name}</span>
              {v.distanceMeters != null && (
                <span style={{ color: COLORS.inkSoft, fontSize: "11.5px" }}>
                  {v.distanceMeters < 1000 ? `${Math.round(v.distanceMeters)} m` : `${(v.distanceMeters / 1000).toFixed(1)} km`}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (venues && venues.length === 0) {
    return <p style={{ fontSize: "12px", color: COLORS.inkSoft, marginBottom: "12px", fontStyle: "italic" }}>Aucun établissement répertorié à proximité pour l'instant.</p>;
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === "loading" || loadingVenues}
      style={{
        background: "none",
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "10px",
        padding: "10px 14px",
        color: COLORS.amber,
        fontSize: "12.5px",
        fontWeight: 700,
        cursor: "pointer",
        marginBottom: "12px",
        width: "100%",
      }}
    >
      {status === "loading" || loadingVenues ? (
        "Recherche..."
      ) : (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <NavIcon name="plus" size={14} color={COLORS.amber} />
          Suggérer des lieux près de moi
        </span>
      )}
      {status === "denied" && <span style={{ display: "block", fontSize: "11px", color: COLORS.inkSoft, fontWeight: 500, marginTop: "4px" }}>Position refusée — activez-la dans les réglages de votre navigateur pour réessayer.</span>}
      {status === "unavailable" && <span style={{ display: "block", fontSize: "11px", color: COLORS.inkSoft, fontWeight: 500, marginTop: "4px" }}>Géolocalisation non disponible sur cet appareil.</span>}
    </button>
  );
}
