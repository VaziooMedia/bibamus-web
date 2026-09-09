// ============================================================
// Écran de notation d'un lieu — système Bibamus à 5 paliers
// positifs (pas d'étoiles, pas de note négative). L'utilisateur
// choisit un palier parmi 5, ou "Pas d'avis" (non comptabilisé,
// juste pour ne jamais donner l'impression d'obliger à répondre).
// Voir doc de specs pour la philosophie complète.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, RATING_LABELS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { submitVenueRating, removeVenueRating, loadMyVenueRating } from "../data/sharedDirectories.js";

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
            Donne ton avis sur ce lieu
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "20px", cursor: "pointer" }}>
            ✕
          </button>
        </div>
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "20px", lineHeight: 1.5 }}>
          Tu as aimé {venueName ? <span style={{ color: COLORS.amber, fontWeight: 700 }}>{venueName}</span> : "cet endroit"} ?
          <br />
          Choisis un niveau d'appréciation
        </p>

        {loading ? (
          <p style={{ fontSize: "13px", color: COLORS.inkSoft }}>Chargement...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {RATING_LABELS.map((level) => {
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
                    {isBusy ? "..." : level.fr}
                  </span>
                </button>
              );
            })}

            <button
              onClick={onClose}
              disabled={submittingValue !== null || removing}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                background: "none",
                border: "none",
                borderRadius: "10px",
                padding: "10px 16px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#ef007c" }}>Pas d'avis</span>
            </button>
          </div>
        )}

        {error && <p style={{ color: COLORS.wine, fontSize: "13px", marginTop: "14px" }}>{error}</p>}

        {!loading && myRating != null && (
          <button
            onClick={handleRemove}
            disabled={submittingValue !== null || removing}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: "16px 0 0 0", textAlign: "left" }}
          >
            <NavIcon name="x" size={13} color={COLORS.wine} />
            {removing ? "..." : "Retirer mon avis"}
          </button>
        )}
      </div>
    </div>
  );
}
