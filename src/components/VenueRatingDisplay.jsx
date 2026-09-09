// ============================================================
// Affichage de l'appréciation d'un lieu sur sa fiche — label +
// nombre d'appréciations (jamais "4,1 / 5" en avant, le
// qualificatif reste l'identité principale). Voir doc de specs.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, RATING_LABELS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { loadVenueRatingSummary } from "../data/sharedDirectories.js";

function FlameRow({ count, size = 12 }) {
  return (
    <span style={{ display: "flex", gap: "1px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <NavIcon key={i} name="flame" size={size} color={COLORS.amber} />
      ))}
    </span>
  );
}

export function VenueRatingDisplay({ venueId, onOpenRatingModal }) {
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
    return (
      <button
        onClick={onOpenRatingModal}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: 0, marginBottom: "16px", textAlign: "left" }}
      >
        <NavIcon name="flame" size={14} color={COLORS.inkSoft} />
        Sois le premier à donner ton avis sur ce lieu
      </button>
    );
  }

  if (summary.rating_status === "early") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>
          Premières appréciations <span style={{ color: COLORS.ink, fontWeight: 700 }}>· {summary.rating_count}</span>
        </span>
        <button onClick={onOpenRatingModal} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, fontSize: "12.5px", cursor: "pointer" }}>
          Donner ton avis
        </button>
      </div>
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
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FlameRow count={labelInfo?.value || 0} size={14} />
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "16px", color: COLORS.ink }}>{labelInfo?.fr}</span>
          <span style={{ fontSize: "12.5px", color: COLORS.inkSoft }}>· {summary.rating_count} appréciations</span>
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

      <button onClick={onOpenRatingModal} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, fontSize: "12.5px", cursor: "pointer", padding: 0, marginTop: "10px" }}>
        Donner ou modifier ton avis
      </button>
    </div>
  );
}
