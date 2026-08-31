import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { submitReport } from "../data/sharedDirectories.js";

// Icône moderne (cercle + point d'exclamation), remplace l'ancien drapeau — cohérente avec le
// style trait fin utilisé ailleurs dans l'app.
function ReportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7.5" x2="12" y2="13" />
      <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

// Raisons disponibles selon le type de fiche — "Établissement fermé définitivement" n'a de
// sens que pour un établissement.
function reasonsFor(entityType) {
  const base = [
    { key: "wrong_info", label: "Information(s) incorrecte(s)", commentRequired: true },
    { key: "duplicate", label: "Fiche en double", commentRequired: false },
    { key: "inappropriate", label: "Contenu inapproprié", commentRequired: true },
    { key: "other", label: "Autre raison", commentRequired: true },
  ];
  if (entityType === "venue") {
    return [{ key: "closed_permanently", label: "Établissement fermé définitivement", commentRequired: false }, ...base];
  }
  return base;
}

// entityType: "venue" | "drink" | "brand" | "producer". directory: liste des fiches du même
// type ({id, name}[]), pour identifier précisément quelle fiche est dupliquée.
export function ReportModal({ entityType, entityId, myBibroCode, directory = [], onClose }) {
  const [reason, setReason] = useState(null);
  const [comment, setComment] = useState("");
  const [duplicateQuery, setDuplicateQuery] = useState("");
  const [duplicateTarget, setDuplicateTarget] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const REASONS = reasonsFor(entityType);
  const selectedReason = REASONS.find((r) => r.key === reason);
  const commentRequired = selectedReason?.commentRequired;
  const isDuplicate = reason === "duplicate";

  const duplicateMatches = isDuplicate && duplicateQuery.trim().length >= 2 ? directory.filter((d) => d.id !== entityId && d.name?.toLowerCase().includes(duplicateQuery.trim().toLowerCase())).slice(0, 5) : [];

  const canSubmit = reason && (!commentRequired || comment.trim().length > 0) && (!isDuplicate || duplicateTarget);

  const handleSubmit = async () => {
    setSending(true);
    setError(null);
    const result = await submitReport(entityType, entityId, reason, comment, myBibroCode, isDuplicate ? duplicateTarget : null);
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
                  onClick={() => {
                    setReason(r.key);
                    setDuplicateTarget(null);
                    setDuplicateQuery("");
                  }}
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

            {isDuplicate && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "8px" }}>De quelle fiche s'agit-il ? *</p>
                {duplicateTarget ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `2px solid ${COLORS.amber}`,
                      background: COLORS.surfaceAlt,
                    }}
                  >
                    <span style={{ fontSize: "14px", color: COLORS.ink }}>{duplicateTarget.name}</span>
                    <button onClick={() => setDuplicateTarget(null)} style={{ background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer" }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={duplicateQuery}
                      onChange={(e) => setDuplicateQuery(e.target.value)}
                      placeholder="Rechercher par nom..."
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: `2px solid ${COLORS.paperAlt}`,
                        fontSize: "14px",
                        color: COLORS.ink,
                        background: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {duplicateMatches.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                        {duplicateMatches.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setDuplicateTarget(m)}
                            style={{ textAlign: "left", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontSize: "13.5px", cursor: "pointer" }}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "8px" }}>
              Commentaire {commentRequired ? "*" : "(optionnel)"}
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={commentRequired ? "Merci de préciser le problème rencontré." : ""}
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
              disabled={!canSubmit || sending}
              style={{
                width: "100%",
                background: COLORS.amber,
                border: "none",
                borderRadius: "10px",
                padding: "13px",
                fontWeight: 700,
                color: COLORS.paper,
                cursor: "pointer",
                opacity: !canSubmit || sending ? 0.5 : 1,
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

export { ReportIcon };
