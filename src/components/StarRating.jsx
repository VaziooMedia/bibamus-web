// ============================================================
// Bloc de notation (étoiles + modes goûtés) d'une boisson —
// copié tel quel depuis le prototype Claude.
// ============================================================
import React from "react";
import { COLORS, BEER_RATING_MODES, SERVING_MODE_LABELS } from "../constants.js";
import { formatDDMMYYYY } from "../utils.js";

export function StarRating({ ratings, ratingDates, ratedServingModes, myBibroCode, onRate, onUnrate, onToggleMode, isBeer }) {
  const values = Object.values(ratings || {});
  const average = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null;
  const myRating = ratings && ratings[myBibroCode];
  const myRatingDate = ratingDates && ratingDates[myBibroCode];
  const myTastedModes = (ratedServingModes && ratedServingModes[myBibroCode]) || [];

  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>Note des Bibax</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "36px", color: COLORS.amberDark, lineHeight: 1 }}>{average != null ? average.toFixed(1) : "—"}</span>
        <span style={{ fontSize: "13px", color: COLORS.inkSoft }}>
          {values.length > 0 ? `sur 5 · ${values.length} avis` : "Pas encore d'avis — soyez le premier"}
        </span>
      </div>

      <div style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px" }}>Ta note</div>
      <div style={{ display: "flex", gap: "6px" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => (myRating === n ? onUnrate() : onRate(n))}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "30px", lineHeight: 1, filter: myRating >= n ? "none" : "grayscale(1) opacity(0.35)" }}
          >
            ⭐
          </button>
        ))}
      </div>
      {myRatingDate && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "8px", marginBottom: 0 }}>Bière goûtée le {formatDDMMYYYY(myRatingDate)}</p>}

      {isBeer && (
        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px dashed ${COLORS.paperAlt}` }}>
          <div style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px" }}>Tu l'as goûtée en...</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {BEER_RATING_MODES.map((m) => {
              const checked = myTastedModes.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => onToggleMode(m)}
                  style={{
                    background: checked ? COLORS.amber : COLORS.surface,
                    color: checked ? COLORS.paper : COLORS.ink,
                    border: `2px solid ${checked ? COLORS.amber : COLORS.paperAlt}`,
                    borderRadius: "999px",
                    padding: "7px 13px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {checked ? "✓ " : ""}
                  {SERVING_MODE_LABELS[m]}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: "11px", color: COLORS.inkSoft, marginTop: "8px", marginBottom: 0 }}>
            Purement informatif — ça n'affecte pas ta note. Pratique pour se rappeler quel format il te reste à essayer.
          </p>
        </div>
      )}
    </div>
  );
}
