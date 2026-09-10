// ============================================================
// Popup de "check" d'un produit — miroir du check-in d'un lieu,
// mais pour une boisson. La note d'un produit vit désormais
// entièrement ici (comme pour un lieu, dont la notation se fait
// dans son propre popup séparé).
//
// Le lieu est obligatoire (utile pour les stats), mais pas
// forcément un vrai lieu géographique — "@Home" et "@Event"
// couvrent les cas où on ne veut/peut pas en choisir un vrai.
// Pré-remplissage automatique depuis un salon/arena : pas encore
// possible (rien ne trace aujourd'hui "dans quel salon on est"
// au moment d'ouvrir une fiche produit) — presetVenue est déjà
// prévu en prop pour le jour où cette info existera.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { normalizeForSearch } from "../utils.js";
import { RatingSlider } from "./RatingSlider.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";

const TITLE_BY_TYPE = {
  "Bières & Cidres": "Check cette bière",
  "Vins & Bulles": "Check ce vin",
  Spiritueux: "Check ce spiritueux",
  "Cocktails / Mocktails": "Check ce cocktail",
  "Softs & Eaux": "Check ce soft",
  "Boissons chaudes": "Check cette boisson chaude",
  Snacks: "Check ce snack",
};

const SPECIAL_VENUES = [
  { id: "@home", name: "@Home" },
  { id: "@event", name: "@Event" },
];

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function DrinkCheckInModal({ drinkName, drinkType, venues = [], myRating, presetVenue = null, onRate, onUnrate, onClose }) {
  const hasRating = myRating != null;
  const [isEditingRating, setIsEditingRating] = useState(!hasRating);
  const [pendingValue, setPendingValue] = useState(hasRating ? myRating : 0.25);
  const [publishToPulse, setPublishToPulse] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(presetVenue);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myPosition, setMyPosition] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const sortedVenues = myPosition
    ? [...venues].sort((a, b) => {
        const da = a.latitude != null && a.longitude != null ? distanceKm(myPosition.lat, myPosition.lng, a.latitude, a.longitude) : Infinity;
        const db = b.latitude != null && b.longitude != null ? distanceKm(myPosition.lat, myPosition.lng, b.latitude, b.longitude) : Infinity;
        return da - db;
      })
    : venues;

  const q = normalizeForSearch(query.trim());
  const filteredVenues = q ? sortedVenues.filter((v) => normalizeForSearch(v.name).includes(q) || normalizeForSearch(v.city).includes(q)) : sortedVenues;
  const filteredSpecials = q ? SPECIAL_VENUES.filter((v) => normalizeForSearch(v.name).includes(q)) : SPECIAL_VENUES;

  const title = TITLE_BY_TYPE[drinkType] || "Check ce produit";

  const finalizeCheck = (skipRating) => {
    if (isEditingRating && !skipRating) onRate(pendingValue);
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
          {title}
        </h2>
        {drinkName && <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 18px 0" }}>{drinkName}</p>}

        <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px", display: "block" }}>Ta note</label>
        {isEditingRating ? (
          <>
            <RatingSlider value={hasRating ? myRating : 0} onLocalChange={setPendingValue} />
            <button
              onClick={() => finalizeCheck(true)}
              style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: "none", borderRadius: "10px", padding: "10px 0", cursor: "pointer", textAlign: "left", marginTop: "6px" }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#ef007c" }}>Pas de note</span>
            </button>
            {hasRating && (
              <button
                onClick={() => {
                  setPendingValue(myRating);
                  setIsEditingRating(false);
                }}
                style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "11.5px", textDecoration: "underline", cursor: "pointer", padding: 0, marginTop: "4px" }}
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
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: "16px 0 0 0", textAlign: "left" }}
          >
            <NavIcon name="x" size={13} color={COLORS.wine} />
            Retirer ma note
          </button>
        )}

        <div style={{ borderBottom: `1px dashed ${COLORS.paperAlt}`, margin: "16px 0" }} />

        <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Lieu</label>
        <div style={{ position: "relative", marginBottom: "18px" }}>
          <input
            value={selectedVenue ? selectedVenue.name : query}
            onChange={(e) => {
              setSelectedVenue(null);
              setQuery(e.target.value);
              setPickerOpen(true);
            }}
            onFocus={() => setPickerOpen(true)}
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${selectedVenue ? COLORS.amber : COLORS.paperAlt}`, fontSize: "14px", color: COLORS.ink, background: COLORS.paper }}
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
          {pickerOpen && !selectedVenue && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: COLORS.paper,
                border: `2px solid ${COLORS.paperAlt}`,
                borderRadius: "10px",
                maxHeight: "240px",
                overflowY: "auto",
                zIndex: 20,
              }}
            >
              {filteredSpecials.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVenue(v);
                    setPickerOpen(false);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13.5px", fontWeight: 700, color: COLORS.amber }}
                >
                  {v.name}
                </button>
              ))}
              {filteredVenues.length === 0 && filteredSpecials.length === 0 && (
                <div style={{ padding: "12px 14px", fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucun résultat.</div>
              )}
              {!q && myPosition && filteredVenues.length > 0 && (
                <div style={{ padding: "8px 14px 2px", fontSize: "10.5px", fontWeight: 700, color: COLORS.inkSoft, letterSpacing: "0.5px" }}>AUTOUR DE TOI</div>
              )}
              {filteredVenues.slice(0, 8).map((v) => (
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
          onClick={() => finalizeCheck(false)}
          disabled={!selectedVenue}
          style={{ width: "100%", background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, color: COLORS.paper, cursor: selectedVenue ? "pointer" : "default", opacity: selectedVenue ? 1 : 0.5 }}
        >
          Confirmer le check
        </button>
      </div>
    </div>
  );
}
