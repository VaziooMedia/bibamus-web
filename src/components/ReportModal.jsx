import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { submitReport } from "../data/sharedDirectories.js";

const REASONS = [
  { key: "closed_permanently", label: "Établissement fermé définitivement" },
  { key: "wrong_info", label: "Information incorrecte" },
  { key: "duplicate", label: "Fiche en double" },
  { key: "inappropriate", label: "Contenu inapproprié" },
  { key: "other", label: "Autre raison" },
];

// entityType: "venue" | "drink" | "brand" | "producer"
export function ReportModal({ entityType, entityId, myBibroCode, onClose }) {
  const [reason, setReason] = useState(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setSending(true);
    setError(null);
    const result = await submitReport(entityType, entityId, reason, comment, myBibroCode);
    setSending(false);
    if (result.error) {
      setError("Une erreur est survenue — merci de réessayer.");
      return;
    }
    setDone(true);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 110 }}>
      <div
        style={{
          background: COLORS.surface,
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px calc(32px + env(safe-area-inset-bottom, 0px)) 20px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "80vh",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        {done ? (
          <>
            <p style={{ fontSize: "15px", color: COLORS.ink, fontWeight: 700, marginBottom: "8px" }}>Merci, votre signalement a bien été transmis.</p>
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "20px" }}>Un membre de l'équipe va l'examiner.</p>
            <button
              onClick={onClose}
              style={{ width: "100%", background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, color: COLORS.paper, cursor: "pointer" }}
            >
              Fermer
            </button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", color: COLORS.ink, margin: 0 }}>Signaler cette fiche</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "20px", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "8px" }}>Quelle est la raison ?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {REASONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setReason(r.key)}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: `2px solid ${reason === r.key ? COLORS.amber : COLORS.paperAlt}`,
                    background: reason === r.key ? COLORS.surfaceAlt : "none",
                    color: COLORS.ink,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "8px" }}>Commentaire (optionnel)</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: `2px solid ${COLORS.paperAlt}`,
                fontSize: "14px",
                color: COLORS.ink,
                background: "none",
                boxSizing: "border-box",
                marginBottom: "16px",
                fontFamily: "inherit",
                resize: "none",
              }}
            />

            {error && <p style={{ color: COLORS.wine, fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!reason || sending}
              style={{
                width: "100%",
                background: COLORS.amber,
                border: "none",
                borderRadius: "10px",
                padding: "13px",
                fontWeight: 700,
                color: COLORS.paper,
                cursor: "pointer",
                opacity: !reason || sending ? 0.5 : 1,
              }}
            >
              {sending ? "Envoi..." : "Envoyer le signalement"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
