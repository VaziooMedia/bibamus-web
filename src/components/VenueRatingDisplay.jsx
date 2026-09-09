// ============================================================
// Affichage de l'appréciation d'un lieu — en essai sur la
// bannière, à gauche du bouton check-in. Petit badge compact
// (texte seul, pas d'indicateur gradué façon étoiles) pour
// rester lisible par-dessus une photo de couverture.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, RATING_LABELS } from "../constants.js";
import { loadVenueRatingSummary } from "../data/sharedDirectories.js";

export function VenueRatingDisplay({ venueId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadVenueRatingSummary(venueId).then((data) => {
      if (!cancelled) {
        setSummary(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  if (loading || !summary || summary.rating_status === "none") return null;

  const text =
    summary.rating_status === "early"
      ? "Premières appréciations"
      : RATING_LABELS.find((l) => l.code === summary.rating_label)?.fr;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "5px",
        background: "rgba(8,19,31,0.72)",
        border: `1.5px solid ${COLORS.paperAlt}`,
        borderRadius: "8px",
        padding: "5px 10px",
        maxWidth: "100%",
      }}
    >
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "13px", color: COLORS.chalkWhite, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {text}
      </span>
      <span style={{ fontSize: "10.5px", color: COLORS.inkSoft, whiteSpace: "nowrap" }}>- {summary.rating_count} avis</span>
    </div>
  );
}
