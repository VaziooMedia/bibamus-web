// ============================================================
// Écran de notation d'un lieu — système Bibamus à 5 paliers
// positifs (pas d'étoiles, pas de note négative). L'utilisateur
// choisit un palier parmi 5, ou ne choisit rien : il n'y a pas
// d'option "mauvais". Voir doc de specs pour la philosophie
// complète.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { submitVenueRating, removeVenueRating, loadMyVenueRating } from "../data/sharedDirectories.js";

// L'ordre ici fixe aussi l'ordre affiché — échelle d'enthousiasme
// croissant, jamais une échelle de qualité "mauvais → bon".
const RATING_LEVELS = [
  { value: 1, label: "Sympa" },
  { value: 2, label: "Très bien" },
  { value: 3, label: "Excellent" },
  { value: 4, label: "Exceptionnel" },
  { value: 5, label: "Incontournable" },
];

function FlameRow({ count }) {
  return (
    <span style={{ display: "flex", gap: "2px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <NavIcon key={i} name="flame" size={13} color={COLORS.amber} />
      ))}
    </span>
  );
}

export function VenueRatingModal({ venueId, venueName, onClose, onRated }) {
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(null);
  const [submittingValue, setSubmittingValue] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadMyVenueRating(venueId).then((value) => {
      if (!cancelled) {
        setMyRating(value);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  const handleSelect = async (value) => {
    if (submittingValue || removing) return;
    setError(null);
    setSubmittingValue(value);
    const result = await submitVenueRating(venueId, value);
    setSubmittingValue(null);
    if (result.error) {
      setError("Une erreur est survenue — merci de réessayer.");
      return;
    }
    onRated && onRated(value);
    onClose();
  };

  const handleRemove = async () => {
    if (submittingValue || removing) return;
    setError(null);
    setRemoving(true);
    const result = await removeVenueRating(venueId);
    setRemoving(false);
    if (result.error) {
      setError("Une erreur est survenue — merci de réessayer.");
      return;
    }
    onRated && onRated(null);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 110 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.surface,
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px calc(32px + env(safe-area-inset-bottom, 0px)) 20px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "80vh",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", color: COLORS.ink, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
            Ton avis sur ce lieu
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "20px", cursor: "pointer" }}>
            ✕
          </button>
        </div>
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "20px" }}>
          {venueName ? `Tu as aimé ${venueName} ? ` : "Tu as aimé cet endroit ? "}
          Choisis un niveau si oui — sinon tu peux simplement fermer cette fenêtre.
        </p>

        {loading ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft }}>Chargement...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {RATING_LEVELS.map((level) => {
              const isMine = myRating === level.value;
              const isBusy = submittingValue === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => handleSelect(level.value)}
                  disabled={submittingValue !== null || removing}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    background: isMine ? `${COLORS.amber}1A` : "none",
                    border: `2px solid ${isMine ? COLORS.amber : COLORS.paperAlt}`,
                    borderRadius: "10px",
                    padding: "13px 16px",
                    cursor: submittingValue !== null || removing ? "default" : "pointer",
                    opacity: submittingValue !== null && !isBusy ? 0.5 : 1,
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "15px", fontWeight: 700, color: isMine ? COLORS.amber : COLORS.ink }}>
                    {isBusy ? "..." : level.label}
                  </span>
                  <FlameRow count={level.value} />
                </button>
              );
            })}
          </div>
        )}

        {error && <p style={{ color: COLORS.wine, fontSize: "13px", marginTop: "14px" }}>{error}</p>}

        {!loading && myRating != null && (
          <button
            onClick={handleRemove}
            disabled={submittingValue !== null || removing}
            style={{ background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: "16px 0 0 0", textAlign: "left" }}
          >
            {removing ? "..." : "Retirer mon avis"}
          </button>
        )}
      </div>
    </div>
  );
}
