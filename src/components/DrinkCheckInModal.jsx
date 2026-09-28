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
import { EntityAvatar } from "./ui.jsx";
import { RatingSlider } from "./RatingSlider.jsx";
import { loadNearbyVenues, searchVenues } from "../data/sharedDirectories.js";
import { usePulseContentForm, buildPulseContent, PulseContentFields } from "./PulseContentForm.jsx";

const SPECIAL_VENUES = [
  { id: "@home", name: "@Home" },
  { id: "@event", name: "@Event" },
];

// enableContent : affiche les champs de publication (visibilité, commentaire, photo, Bibax tagués).
// Le résultat renvoyé à onClose est { publishToPulse, venueId, visibility, content } — content ne
// contient que ce qui a été renseigné : { comment, rating, photoUrl, taggedIds }.
export function DrinkCheckInModal({ drinkName, myRating, presetVenue = null, enableContent = false, onRate, onUnrate, onClose }) {
  const hasRating = myRating != null;
  const [isEditingRating, setIsEditingRating] = useState(!hasRating);
  const [pendingValue, setPendingValue] = useState(hasRating ? myRating : 0.25);
  // « Pas de note » : simple choix à bascule — la note n'est alors pas appliquée, mais la fenêtre reste ouverte
  // pour compléter le lieu et le reste ; c'est « Confirmer le check » qui valide.
  const [skipRating, setSkipRating] = useState(false);
  const [publishToPulse, setPublishToPulse] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(presetVenue);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nearbyVenues, setNearbyVenues] = useState([]);
  const [searchedVenues, setSearchedVenues] = useState([]);
  const form = usePulseContentForm("public");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadNearbyVenues(pos.coords.latitude, pos.coords.longitude, 5000, 8).then(setNearbyVenues);
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const q = query.trim();
  useEffect(() => {
    if (!q) {
      setSearchedVenues([]);
      return;
    }
    const timer = setTimeout(() => {
      searchVenues(q, 8).then(setSearchedVenues);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const filteredVenues = q ? searchedVenues : nearbyVenues;
  const filteredSpecials = q ? SPECIAL_VENUES.filter((v) => v.name.toLowerCase().includes(q.toLowerCase())) : SPECIAL_VENUES;


  const finalizeCheck = async () => {
    if (sending) return;
    form.setError(null);

    // Contenu de la publication : seulement ce qui a été renseigné. La photo est envoyée AVANT de
    // valider le check : si elle est refusée, rien n'est enregistré et on reste dans la fenêtre.
    let content;
    if (enableContent && publishToPulse) {
      const ratingForPulse = isEditingRating && !skipRating ? pendingValue : hasRating ? myRating : null;
      if (form.photo) setSending(true);
      const built = await buildPulseContent(form, { rating: ratingForPulse });
      if (built.error) {
        setSending(false);
        form.setError(built.error);
        return;
      }
      content = built.content;
    }

    if (isEditingRating && !skipRating) onRate(pendingValue);
    onClose({ publishToPulse, venueId: selectedVenue?.id || null, visibility: form.visibility, content });
  };

  return (
    <div
      onClick={() => {
        if (!sending) onClose(null);
      }}
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
          maxHeight: "92vh",
          overflowY: "auto",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <button
          onClick={() => {
            if (!sending) onClose(null);
          }}
          disabled={sending}
          aria-label="Fermer"
          style={{ position: "absolute", top: "12px", right: "12px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", padding: 0, cursor: sending ? "default" : "pointer", opacity: sending ? 0.4 : 1 }}
        >
          <NavIcon name="x" size={16} color={COLORS.inkSoft} />
        </button>
        <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", color: COLORS.ink, margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
          <span>
            Drink<span style={{ color: COLORS.amber }}>Check</span>
          </span>
        </h2>
        {drinkName && <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 18px 0" }}>{drinkName}</p>}

        <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px", display: "block" }}>Ta note</label>
        {isEditingRating ? (
          <>
            {/* « Pas de note » atténue le curseur ; le déplacer, ou retaper sur le bouton, annule ce choix. */}
            <div style={{ opacity: skipRating ? 0.35 : 1, transition: "opacity 0.15s" }}>
              <RatingSlider
                value={hasRating ? myRating : 0}
                onLocalChange={(v) => {
                  setPendingValue(v);
                  setSkipRating(false);
                }}
              />
            </div>
            <button
              onClick={() => setSkipRating((v) => !v)}
              aria-pressed={skipRating}
              style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: "none", borderRadius: "10px", padding: "5px 0", cursor: "pointer", textAlign: "left", marginTop: "6px" }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600, color: skipRating ? "#fff" : "#ef007c", background: skipRating ? "#ef007c" : "none", borderRadius: "999px", padding: "5px 12px", marginLeft: "-12px" }}>Pas de note</span>
            </button>
            {hasRating && (
              <button
                onClick={() => {
                  setPendingValue(myRating);
                  setIsEditingRating(false);
                  setSkipRating(false);
                }}
                style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "11.5px", textDecoration: "underline", cursor: "pointer", padding: 0, marginTop: "4px" }}
              >
                Annuler
              </button>
            )}
            {hasRating && (
              <button
                onClick={() => {
                  onUnrate();
                  setPendingValue(0.25);
                  setSkipRating(false);
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: "16px 0 0 0", textAlign: "left" }}
              >
                <NavIcon name="x" size={13} color={COLORS.wine} />
                Retirer ma note
              </button>
            )}
          </>
        ) : (
          // Note déjà donnée : verrouillée par défaut — ni barre d'étoiles ni retrait, seulement la valeur actuelle.
          // C'est à l'utilisateur de demander à la revoir (« Modifier »).
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "18px" }}>
              <span style={{ color: COLORS.amber }}>{String(myRating).replace(".", ",")}</span>
              <span style={{ color: COLORS.ink }}>/5</span>
            </span>
            <button
              onClick={() => {
                setPendingValue(myRating);
                setIsEditingRating(true);
              }}
              title="Modifier ma note"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", gap: "6px", color: COLORS.amber, fontWeight: 600, fontSize: "12.5px" }}
            >
              <NavIcon name="pencil" size={19} color={COLORS.amber} />
              Modifier
            </button>
          </div>
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
                  style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13.5px", fontWeight: 700, color: COLORS.amber }}
                >
                  <EntityAvatar photoUrl={v.profilePhotoUrl} photoEmoji={v.avatarEmoji} size={36} />
                  <span style={{ minWidth: 0 }}>{v.name}</span>
                </button>
              ))}
              {filteredVenues.length === 0 && filteredSpecials.length === 0 && (
                <div style={{ padding: "12px 14px", fontSize: "13px", color: COLORS.inkSoft, fontStyle: "italic" }}>Aucun résultat.</div>
              )}
              {!q && filteredVenues.length > 0 && (
                <div style={{ padding: "8px 14px 2px", fontSize: "10.5px", fontWeight: 700, color: COLORS.inkSoft, letterSpacing: "0.5px" }}>AUTOUR DE TOI</div>
              )}
              {filteredVenues.slice(0, 8).map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVenue(v);
                    setPickerOpen(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13.5px", color: COLORS.ink }}
                >
                  <EntityAvatar photoUrl={v.profilePhotoUrl} photoEmoji={v.avatarEmoji} size={36} />
                  <span style={{ minWidth: 0 }}>
                    {v.name}
                    {v.city && <span style={{ color: COLORS.inkSoft }}> — {v.city}</span>}
                  </span>
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

        {enableContent && publishToPulse && <PulseContentFields form={form} />}

        {form.error && <p style={{ color: COLORS.wine, fontSize: "13px", margin: "0 0 12px" }}>{form.error}</p>}

        <button
          onClick={() => finalizeCheck()}
          disabled={!selectedVenue || sending}
          style={{ width: "100%", background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, color: COLORS.paper, cursor: selectedVenue && !sending ? "pointer" : "default", opacity: selectedVenue && !sending ? 1 : 0.5 }}
        >
          {sending ? "Envoi de la photo..." : "Confirmer le check"}
        </button>
      </div>
    </div>
  );
}
