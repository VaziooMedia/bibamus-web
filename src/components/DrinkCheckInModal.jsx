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
import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { RatingSlider } from "./RatingSlider.jsx";
import { StarsDisplay } from "./StarsDisplay.jsx";
import { loadNearbyVenues, searchVenues, searchBibaxForTagging, uploadPulsePhoto } from "../data/sharedDirectories.js";
import { fileToResizedJpegBlob } from "../imageUtils.js";

const TITLE_BY_TYPE = {
  "Bières & Cidres": "Check cette bière",
  "Vins & Bulles": "Check ce vin",
  Spiritueux: "Check ce spiritueux",
  "Cocktails / Mocktails": "Check ce cocktail",
  "Softs & Eaux": "Check ce soft",
  "Boissons chaudes": "Check cette boisson chaude",
  Snacks: "Check ce snack",
};

// Nombre maximum de Bibax tagués dans une publication (le serveur en accepte jusqu'à 10).
const MAX_TAGS = 5;

const isOnRatingScale = (v) => Number.isFinite(v) && v >= 0.25 && v <= 5 && Math.abs(v * 4 - Math.round(v * 4)) < 1e-9;

const SPECIAL_VENUES = [
  { id: "@home", name: "@Home" },
  { id: "@event", name: "@Event" },
];

// enableContent : affiche les champs de publication (visibilité, commentaire, photo, Bibax tagués).
// Le résultat renvoyé à onClose est { publishToPulse, venueId, visibility, content } — content ne
// contient que ce qui a été renseigné : { comment, rating, photoUrl, taggedIds }.
export function DrinkCheckInModal({ drinkName, drinkType, myRating, presetVenue = null, enableContent = false, onRate, onUnrate, onClose }) {
  const hasRating = myRating != null;
  const [isEditingRating, setIsEditingRating] = useState(!hasRating);
  const [pendingValue, setPendingValue] = useState(hasRating ? myRating : 0.25);
  const [publishToPulse, setPublishToPulse] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(presetVenue);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nearbyVenues, setNearbyVenues] = useState([]);
  const [searchedVenues, setSearchedVenues] = useState([]);
  const [visibility, setVisibility] = useState("public");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState(null); // { blob, previewUrl }
  const [tagQuery, setTagQuery] = useState("");
  const [tagResults, setTagResults] = useState([]);
  const [taggedPeople, setTaggedPeople] = useState([]); // [{ id, name }]
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

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

  // Recherche des Bibax à taguer — uniquement de vrais Bibax confirmés qui acceptent d'être tagués.
  useEffect(() => {
    const term = tagQuery.trim();
    if (term.length < 2) {
      setTagResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchBibaxForTagging(term).then((results) => {
        if (cancelled) return;
        setTagResults(results.filter((r) => r.allowStoryTags !== false && !taggedPeople.some((t) => t.id === r.id)).slice(0, 6));
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tagQuery, taggedPeople]);

  // Libère l'aperçu de la photo quand elle change ou quand la fenêtre se ferme.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.previewUrl);
    };
  }, [photo]);

  const handlePhotoPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Ce fichier n'est pas une image.");
      return;
    }
    try {
      const blob = await fileToResizedJpegBlob(file);
      setPhoto({ blob, previewUrl: URL.createObjectURL(blob) });
      setError(null);
    } catch (_) {
      setError("Impossible de lire cette photo.");
    }
  };

  const filteredVenues = q ? searchedVenues : nearbyVenues;
  const filteredSpecials = q ? SPECIAL_VENUES.filter((v) => v.name.toLowerCase().includes(q.toLowerCase())) : SPECIAL_VENUES;

  const title = TITLE_BY_TYPE[drinkType] || "Check ce produit";

  const finalizeCheck = async (skipRating) => {
    if (sending) return;
    setError(null);

    // Contenu de la publication : seulement ce qui a été renseigné. La photo est envoyée AVANT de
    // valider le check : si elle est refusée, rien n'est enregistré et on reste dans la fenêtre.
    let content;
    if (enableContent && publishToPulse) {
      const built = {};
      const trimmedComment = comment.trim();
      if (trimmedComment) built.comment = trimmedComment;
      const ratingForPulse = isEditingRating && !skipRating ? pendingValue : hasRating ? myRating : null;
      if (ratingForPulse != null && isOnRatingScale(ratingForPulse)) built.rating = ratingForPulse;
      if (taggedPeople.length > 0) built.taggedIds = taggedPeople.map((p) => p.id);
      if (photo) {
        setSending(true);
        const uploaded = await uploadPulsePhoto(photo.blob);
        if (uploaded.error) {
          setSending(false);
          setError(uploaded.error);
          return;
        }
        built.photoUrl = uploaded.url;
      }
      if (Object.keys(built).length > 0) content = built;
    }

    if (isEditingRating && !skipRating) onRate(pendingValue);
    onClose({ publishToPulse, venueId: selectedVenue?.id || null, visibility, content });
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

        {enableContent && publishToPulse && (
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "8px", display: "block" }}>Qui peut le voir ?</label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {[
                { key: "public", label: "Public" },
                { key: "relations", label: "Mes Bibax" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setVisibility(opt.key)}
                  style={{
                    flex: 1,
                    background: visibility === opt.key ? COLORS.amber : "none",
                    color: visibility === opt.key ? COLORS.paper : COLORS.ink,
                    border: `2px solid ${visibility === opt.key ? COLORS.amber : COLORS.paperAlt}`,
                    borderRadius: "999px",
                    padding: "9px 12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Commentaire (facultatif)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Ton avis, une anecdote..."
              style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontSize: "14px", fontFamily: "inherit", resize: "none" }}
            />
            <p style={{ margin: "2px 0 14px", fontSize: "11px", color: COLORS.inkSoft, textAlign: "right" }}>{comment.length}/280</p>

            <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Photo (facultatif)</label>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoPick} />
            {photo ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <img src={photo.previewUrl} alt="Aperçu de la photo" style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "10px", flexShrink: 0 }} />
                <button
                  onClick={() => setPhoto(null)}
                  style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "12.5px", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                >
                  Retirer la photo
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{ display: "block", width: "100%", background: "none", border: `2px dashed ${COLORS.paperAlt}`, borderRadius: "10px", padding: "11px", color: COLORS.inkSoft, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", marginBottom: "16px" }}
              >
                Ajouter une photo
              </button>
            )}

            <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" }}>Avec (facultatif)</label>
            {taggedPeople.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                {taggedPeople.map((person) => (
                  <span key={person.id} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: COLORS.paperAlt, borderRadius: "999px", padding: "5px 6px 5px 12px", fontSize: "12.5px", color: COLORS.ink }}>
                    {person.name}
                    <button
                      onClick={() => setTaggedPeople((prev) => prev.filter((p) => p.id !== person.id))}
                      aria-label={"Retirer " + person.name}
                      style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "16px", lineHeight: 1, cursor: "pointer", padding: "0 6px" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {taggedPeople.length < MAX_TAGS && (
              <div style={{ position: "relative" }}>
                <input
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  placeholder="Taguer un Bibax"
                  style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontSize: "14px" }}
                />
                {tagResults.length > 0 && (
                  <div style={{ marginTop: "4px", background: COLORS.paper, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", overflow: "hidden" }}>
                    {tagResults.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => {
                          setTaggedPeople((prev) => [...prev, { id: person.id, name: person.name }]);
                          setTagQuery("");
                          setTagResults([]);
                        }}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13.5px", color: COLORS.ink }}
                      >
                        {person.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p style={{ color: COLORS.wine, fontSize: "13px", margin: "0 0 12px" }}>{error}</p>}

        <button
          onClick={() => finalizeCheck(false)}
          disabled={!selectedVenue || sending}
          style={{ width: "100%", background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, color: COLORS.paper, cursor: selectedVenue && !sending ? "pointer" : "default", opacity: selectedVenue && !sending ? 1 : 0.5 }}
        >
          {sending ? "Envoi de la photo..." : "Confirmer le check"}
        </button>
      </div>
    </div>
  );
}
