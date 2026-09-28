// ============================================================
// Fenêtre « Place Check-in » — affichée à CHAQUE check-in dans un lieu. Le check n'est enregistré
// qu'à la confirmation (VenueDetailScreen.jsx) ; fermer la fenêtre sans confirmer l'annule.
//
// On peut y :
//   - ajouter un produit (facultatif) : le check compte alors aussi comme un check de ce produit
//     dans ce lieu — une seule publication pour le geste, celle du produit ;
//   - publier ou non sur BibaPulse, avec qui peut le voir (« Mes Bibax » par défaut), un
//     commentaire, une photo et des Bibax tagués ;
//   - revenir sur son avis déjà donné sur le lieu (lien discret, si un avis existe).
//
// La question complète (« donne ton avis ») n'est posée qu'au premier check-in, après cette
// fenêtre (voir VenueDetailScreen.jsx).
//
// Résultat envoyé à onClose : null si annulé, sinon
//   { publishToPulse, visibility, content, drink: { id, name } | null, modifyRating }
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS, RATING_LABELS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { searchDrinks } from "../data/sharedDirectories.js";
import { usePulseContentForm, buildPulseContent, PulseContentFields } from "./PulseContentForm.jsx";

const labelStyle = { fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "6px", display: "block" };

export function VenueCheckInConfirmModal({ venueName, myRating, onClose }) {
  const [publishToPulse, setPublishToPulse] = useState(true);
  // Un passage dans un lieu se partage d'abord avec ses Bibax (comme avant) ; le public reste un choix.
  const form = usePulseContentForm("relations");
  const [sending, setSending] = useState(false);
  const [drink, setDrink] = useState(null); // { id, name }
  const [drinkQuery, setDrinkQuery] = useState("");
  const [drinkResults, setDrinkResults] = useState([]);
  const ratingLabel = RATING_LABELS.find((l) => l.value === myRating)?.fr;

  // Recherche du produit à ajouter (mêmes règles que les autres recherches : 2 lettres minimum).
  useEffect(() => {
    const term = drinkQuery.trim();
    if (term.length < 2) {
      setDrinkResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchDrinks(term, 6).then((results) => {
        if (!cancelled) setDrinkResults(results);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [drinkQuery]);

  const handleConfirm = async (modifyRating = false) => {
    if (sending) return;
    form.setError(null);

    // La photo est envoyée AVANT de valider le check : si elle est refusée, rien n'est enregistré
    // et on reste dans la fenêtre.
    let content;
    if (publishToPulse) {
      if (form.photo) setSending(true);
      const built = await buildPulseContent(form);
      if (built.error) {
        setSending(false);
        form.setError(built.error);
        return;
      }
      content = built.content;
    }
    onClose({ publishToPulse, visibility: form.visibility, content, drink: drink ? { id: drink.id, name: drink.name } : null, modifyRating });
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
          Place Check-in
        </h2>
        {venueName && <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 20px 0" }}>{venueName}</p>}

        <label style={labelStyle}>Produit (facultatif)</label>
        {drink ? (
          <div style={{ marginBottom: "16px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: COLORS.paperAlt, borderRadius: "999px", padding: "5px 6px 5px 12px", fontSize: "12.5px", color: COLORS.ink }}>
              {drink.name}
              <button
                onClick={() => setDrink(null)}
                aria-label={"Retirer " + drink.name}
                style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "16px", lineHeight: 1, cursor: "pointer", padding: "0 6px" }}
              >
                ×
              </button>
            </span>
          </div>
        ) : (
          <div style={{ marginBottom: "16px" }}>
            <input
              value={drinkQuery}
              onChange={(e) => setDrinkQuery(e.target.value)}
              placeholder="Ajouter un produit"
              style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontSize: "14px" }}
            />
            {drinkResults.length > 0 && (
              <div style={{ marginTop: "4px", background: COLORS.paper, border: `2px solid ${COLORS.paperAlt}`, borderRadius: "10px", overflow: "hidden" }}>
                {drinkResults.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setDrink(d);
                      setDrinkQuery("");
                      setDrinkResults([]);
                    }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13.5px", color: COLORS.ink }}
                  >
                    {d.name}
                    {(d.brewery || d.brand) && <span style={{ display: "block", fontSize: "11.5px", color: COLORS.inkSoft, marginTop: "1px" }}>{d.brewery || d.brand}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setPublishToPulse((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: COLORS.ink, cursor: "pointer", marginBottom: "16px", background: "none", border: "none", padding: 0, textAlign: "left" }}
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

        {publishToPulse && <PulseContentFields form={form} />}

        {form.error && <p style={{ color: COLORS.wine, fontSize: "13px", margin: "0 0 12px" }}>{form.error}</p>}

        {myRating != null && (
          <button
            onClick={() => handleConfirm(true)}
            style={{ display: "block", background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12px", cursor: "pointer", padding: 0, marginBottom: "20px", textAlign: "left" }}
          >
            Modifier mon avis sur ce lieu{ratingLabel ? ` (actuellement : ${ratingLabel})` : ""}
          </button>
        )}

        <button
          onClick={() => handleConfirm(false)}
          disabled={sending}
          style={{ width: "100%", background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, color: COLORS.paper, cursor: sending ? "default" : "pointer", opacity: sending ? 0.6 : 1 }}
        >
          {sending ? "Envoi de la photo..." : "Place Check-in"}
        </button>
      </div>
    </div>
  );
}
