// ============================================================
// Affichage de l'appréciation d'un lieu sur sa fiche — texte
// seul (label + nombre d'avis), pas d'indicateur visuel gradué
// (flammes, étoiles...) : un système à 1 palier sur 5 donnerait
// l'impression fausse d'un avis faible, alors que tous les
// paliers sont positifs. Voir doc de specs.
//
// Donner ou modifier son avis n'est plus accessible depuis ce
// bloc — uniquement via un check-in sur le lieu (voir
// VenueDetailScreen.jsx).
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, RATING_LABELS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { loadVenueRatingSummary } from "../data/sharedDirectories.js";

export function VenueRatingDisplay({ venueId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

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

  if (loading || !summary) return null;

  if (summary.rating_status === "none") {
    return <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: "16px" }}>Aucun avis pour l'instant</p>;
  }

  if (summary.rating_status === "early") {
    return (
      <p style={{ fontSize: "15px", marginBottom: "16px" }}>
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, color: COLORS.ink }}>Premières appréciations</span>
        <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}> - {summary.rating_count} avis</span>
      </p>
    );
  }

  // rating_status === "public"
  const labelInfo = RATING_LABELS.find((l) => l.code === summary.rating_label);
  const distribution = RATING_LABELS.map((l) => ({
    ...l,
    count: summary[`count_${l.value}`] || 0,
    pct: summary.rating_count > 0 ? Math.round(((summary[`count_${l.value}`] || 0) / summary.rating_count) * 100) : 0,
  }));

  return (
    <div style={{ marginBottom: "16px" }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <span>
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "16px", color: COLORS.ink }}>{labelInfo?.fr}</span>
          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}> - {summary.rating_count} avis</span>
        </span>
        <span style={{ display: "flex", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
          <NavIcon name="chevron-right" size={14} color={COLORS.inkSoft} />
        </span>
      </button>

      {expanded && (
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "12px", padding: "14px", marginTop: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[...distribution].reverse().map((level) => (
              <div key={level.code} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: COLORS.inkSoft, width: "88px", flexShrink: 0 }}>{level.fr}</span>
                <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: COLORS.paperAlt, overflow: "hidden" }}>
                  <div style={{ width: `${level.pct}%`, height: "100%", background: COLORS.amber, borderRadius: "3px" }} />
                </div>
                <span style={{ fontSize: "12px", color: COLORS.inkSoft, width: "34px", textAlign: "right", flexShrink: 0 }}>{level.pct}%</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "12px", marginBottom: 0 }}>Moyenne : {summary.rating_average} / 5</p>
        </div>
      )}
    </div>
  );
}
