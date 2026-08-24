// ============================================================
// Bloc de notation (étoiles + modes goûtés) d'une boisson.
// ============================================================
import React, { useState } from "react";
import { COLORS, BEER_RATING_MODES, SERVING_MODE_LABELS } from "../constants.js";
import { formatDDMMYYYY } from "../utils.js";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { RatingSlider } from "./RatingSlider.jsx";
import { NavIcon } from "./icons.jsx";

export function StarRating({ ratings, ratingDates, ratedServingModes, myBibroCode, onRate, onUnrate, onToggleMode, isBeer }) {
  const values = Object.values(ratings || {}).filter((v) => typeof v === "number" && isFinite(v));
  const average = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null;
  const rawMyRating = ratings && ratings[myBibroCode];
  const myRating = typeof rawMyRating === "number" && isFinite(rawMyRating) ? rawMyRating : null;
  console.log("[DIAGNOSTIC] StarRating render — rawMyRating:", rawMyRating, "typeof:", typeof rawMyRating, "myRating:", myRating, "full ratings object:", JSON.stringify(ratings));
  const myRatingDate = ratingDates && ratingDates[myBibroCode];
  const myTastedModes = (ratedServingModes && ratedServingModes[myBibroCode]) || [];
  const hasRating = myRating != null;

  // La barre ne s'affiche que pour donner une première note, ou pendant une modification
  // volontaire — une fois notée, l'affichage se fige pour éviter de la changer par accident
  // en effleurant la barre par mégarde.
  const [isEditing, setIsEditing] = useState(!hasRating);
  const [pendingValue, setPendingValue] = useState(hasRating ? myRating : 0.25);

  // Si la note stockée s'avère invalide (ex. une donnée corrompue), on repasse en mode édition
  // — mais uniquement dans ce sens : ça ne doit jamais empêcher de sortir du mode édition une
  // fois qu'on vient de valider une toute première note.
  React.useEffect(() => {
    if (!hasRating) setIsEditing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRating]);

  const confirmRating = () => {
    console.log("[DIAGNOSTIC] confirmRating — pendingValue:", pendingValue, "typeof:", typeof pendingValue, "rawMyRating before:", rawMyRating);
    onRate(pendingValue);
    setIsEditing(false);
  };

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

      {isEditing ? (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <RatingSlider value={hasRating ? myRating : 0} onLocalChange={setPendingValue} />
            </div>
            <button
              onClick={confirmRating}
              title="Valider ma note"
              style={{
                background: COLORS.amber,
                border: "none",
                borderRadius: "8px",
                width: "34px",
                height: "34px",
                flexShrink: 0,
                color: COLORS.paper,
                fontSize: "15px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              V
            </button>
          </div>
          {hasRating && (
            <button
              onClick={() => setIsEditing(false)}
              style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "11.5px", textDecoration: "underline", cursor: "pointer", padding: 0, marginTop: "10px" }}
            >
              Annuler
            </button>
          )}
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <StarsDisplay value={myRating} size={22} />
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px" }}>
              <span style={{ color: COLORS.amber }}>{String(myRating).replace(".", ",")}</span>
              <span style={{ color: COLORS.ink }}>/5</span>
            </span>
          </div>
          <button
            onClick={() => {
              setPendingValue(myRating);
              setIsEditing(true);
            }}
            title="Modifier ma note"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex" }}
          >
            <NavIcon name="pencil" size={19} color={COLORS.amber} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
        {myRatingDate ? <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, margin: 0 }}>Notée le {formatDDMMYYYY(myRatingDate)}</p> : <span />}
        {hasRating && (
          <button
            onClick={() => {
              onUnrate();
              setIsEditing(true);
            }}
            style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "11.5px", textDecoration: "underline", cursor: "pointer", padding: 0 }}
          >
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
