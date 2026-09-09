// ============================================================
// Popup affiché à partir du 2e check-in sur un même lieu — la
// question complète ("donne ton avis") n'est posée qu'une seule
// fois (voir VenueDetailScreen.jsx). Ici, juste une confirmation
// discrète : publier ou non ce passage sur BibaPulse, et un lien
// discret pour revenir sur son avis déjà donné si besoin.
// ============================================================
import React, { useState } from "react";
import { COLORS, RATING_LABELS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

export function VenueCheckInConfirmModal({ venueName, myRating, onClose, onModifyRating }) {
  const [publishToPulse, setPublishToPulse] = useState(true);
  const ratingLabel = RATING_LABELS.find((l) => l.value === myRating)?.fr;

  const handleConfirm = () => {
    onClose(publishToPulse);
  };

  return (
    <div
      onClick={handleConfirm}
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
          Place Check-in
        </h2>
        {venueName && <p style={{ fontSize: "13px", color: COLORS.inkSoft, margin: "0 0 20px 0" }}>{venueName}</p>}

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

        {onModifyRating && (
          <button
            onClick={onModifyRating}
            style={{ display: "block", background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12px", cursor: "pointer", padding: 0, marginBottom: "20px", textAlign: "left" }}
          >
            Modifier mon avis sur ce lieu{ratingLabel ? ` (actuellement : ${ratingLabel})` : ""}
          </button>
        )}

        <button
          onClick={handleConfirm}
          style={{ width: "100%", background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, color: COLORS.paper, cursor: "pointer" }}
        >
          Place Check-in
        </button>
      </div>
    </div>
  );
}
