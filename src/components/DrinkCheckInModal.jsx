// ============================================================
// Popup de "check" d'un produit — miroir du check-in d'un lieu,
// mais pour une boisson. Contrairement au check-in lieu, il
// n'est pas géolocalisé : le lieu associé est optionnel, choisi
// à la main dans la liste (goûté "quelque part" ou "ici").
// Contrairement au lieu (dont la notation se fait dans son
// propre popup séparé, VenueRatingModal), la note d'un produit
// est intégrée ici même, dans ce popup de check — c'est le seul
// endroit où on peut désormais donner ou modifier sa note.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { normalizeForSearch } from "../utils.js";
import { RatingSlider } from "./RatingSlider.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";

export function DrinkCheckInModal({ drinkName, venues = [], myRating, onRate, onUnrate, onClose }) {
  const hasRating = myRating != null;
  const [isEditingRating, setIsEditingRating] = useState(!hasRating);
  const [pendingValue, setPendingValue] = useState(hasRating ? myRating : 0.25);
  const [publishToPulse, setPublishToPulse] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const q = normalizeForSearch(query.trim());
  const filtered = q ? venues.filter((v) => normalizeForSearch(v.name).includes(q) || normalizeForSearch(v.city).includes(q)) : venues;

  const handleConfirm = () => {
    if (isEditingRating) onRate(pendingValue);
    onClose({ publishToPulse, venueId: selectedVenue?.id || null });
  };

  return (
    <div
      onClick={() => onClose(null)}
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
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", color: COLORS.ink, margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
          Check ce produit
        </h2>
        {drinkName && <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 18px 0" }}>{drinkName}</p>}

        <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px", display: "block" }}>Ta note</label>
        {isEditingRating ? (
          <>
            <RatingSlider value={hasRating ? myRating : 0} onLocalChange={setPendingValue} />
            {hasRating && (
              <button
                onClick={() => {
                  setPendingValue(myRating);
                  setIsEditingRating(false);
                }}
                style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "11.5px", textDecoration: "underline", cursor: "pointer", padding: 0, marginTop: "10px" }}
              >
                Annuler
              </button>
            )}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
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
                setIsEditingRating(true);
              }}
              title="Modifier ma note"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex" }}
            >
              <NavIcon name="pencil" size={19} color={COLORS.amber} />
            </button>
          </div>
        )}
        {!isEditingRating && (
          <button
            onClick={() => {
              onUnrate();
              setIsEditingRating(true);
              setPendingValue(0.25);
            }}
            style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "11.5px", textDecoration: "underline", cursor: "pointer", padding: 0, marginBottom: "10px" }}
          >
            Retirer ma note
          </button>
        )}

        <div style={{ borderBottom: `1px dashed ${COLORS.paperAlt}`, margin: "16px 0" }} />

        <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Lieu (facultatif)</label>
        <div style={{ position: "relative", marginBottom: "18px" }}>
          <input
            value={selectedVenue ? selectedVenue.name : query}
            onChange={(e) => {
              setSelectedVenue(null);
              setQuery(e.target.value);
              setPickerOpen(true);
            }}
            onFocus={() => setPickerOpen(true)}
            placeholder="Où l'as-tu goûté ? (optionnel)"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", color: COLORS.ink, background: COLORS.paper }}
          />
          {selectedVenue && (
            <button
              onClick={() => {
                setSelectedVenue(null);
                setQuery("");
              }}
              title="Retirer le lieu"
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.inkSoft, fontSize: "18px", cursor: "pointer", padding: 0 }}
            >
              ×
            </button>
          )}
          {pickerOpen && !selectedVenue && query.trim() && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: COLORS.paper,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "10px",
                maxHeight: "220px",
                overflowY: "auto",
                zIndex: 20,
              }}
            >
              {filtered.length === 0 && <div style={{ padding: "12px 14px", fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucun résultat.</div>}
              {filtered.slice(0, 8).map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVenue(v);
                    setPickerOpen(false);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13.5px", color: COLORS.ink }}
                >
                  {v.name}
                  {v.city && <span style={{ color: COLORS.inkSoft }}> — {v.city}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setPublishToPulse((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: COLORS.ink, cursor: "pointer", marginBottom: "20px", background: "none", border: "none", padding: 0, textAlign: "left" }}
        >
          <span
            style={{
              width: "18px",
              height: "18px",
              flexShrink: 0,
              borderRadius: "4px",
              background: publishToPulse ? COLORS.amber : "none",
              border: `2px solid ${publishToPulse ? COLORS.amber : COLORS.paperAlt}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {publishToPulse && <NavIcon name="check" size={13} color="#000" />}
          </span>
          Publier dans BibaPulse
        </button>

        <button
          onClick={handleConfirm}
          style={{ width: "100%", background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, color: COLORS.paper, cursor: "pointer" }}
        >
          Confirmer le check
        </button>
      </div>
    </div>
  );
}
