// ============================================================
// Bloc de notation (étoiles + modes goûtés) d'une boisson.
// ============================================================
import React from "react";
import { COLORS, BEER_RATING_MODES, SERVING_MODE_LABELS } from "../constants.js";
import { formatDDMMYYYY } from "../utils.js";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { RatingSlider } from "./RatingSlider.jsx";

export function StarRating({ ratings, ratingDates, ratedServingModes, myBibroCode, onRate, onUnrate, onToggleMode, isBeer }) {
  const values = Object.values(ratings || {});
  const average = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null;
  const myRating = ratings && ratings[myBibroCode];
  const myRatingDate = ratingDates && ratingDates[myBibroCode];
  const myTastedModes = (ratedServingModes && ratedServingModes[myBibroCode]) || [];

  return (
    <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>Note des Bibax</div>
      {average != null ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "36px", color: COLORS.amber, lineHeight: 1 }}>{average.toFixed(2).replace(".", ",")}</span>
          <div>
            <StarsDisplay value={average} size={18} />
            <div style={{ fontSize: "12px", color: COLORS.inkSoft, marginTop: "2px" }}>
              sur 5 · {values.length} avis
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>Pas encore d'avis — sois le premier !</p>
      )}

      <div style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px" }}>Ta note</div>
      <RatingSlider value={myRating} onChange={(v) => onRate(v)} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
        {myRatingDate ? <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: 0 }}>Notée le {formatDDMMYYYY(myRatingDate)}</p> : <span />}
        {myRating != null && (
          <button onClick={onUnrate} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "11.5px", textDecoration: "underline", cursor: "pointer", padding: 0 }}>
            Retirer ma note
          </button>
        )}
      </div>

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
