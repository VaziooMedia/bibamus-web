import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { submitClaim } from "../data/sharedDirectories.js";

// entityType: "venue" | "drink" | "brand" | "producer"
export function ClaimModal({ entityType, entityId, entityName, myBibroCode, myUserId, onClose }) {
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [officers, setOfficers] = useState("");
  const [justification, setJustification] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = companyName.trim().length > 0 && justification.trim().length > 0;

  const handleSubmit = async () => {
    setSending(true);
    setError(null);
    const result = await submitClaim(
      entityType,
      entityId,
      entityName,
      { companyName: companyName.trim(), vatNumber: vatNumber.trim(), officers: officers.trim(), justification: justification.trim() },
      myUserId,
      myBibroCode
    );
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
            <p style={{ fontSize: "15px", color: COLORS.ink, fontWeight: 700, marginBottom: "8px" }}>Votre demande a bien été transmise.</p>
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "20px" }}>
              Notre équipe va l'examiner. Si elle est approuvée, nous vous recontacterons pour créer votre compte Business, avec une adresse email professionnelle dédiée.
            </p>
            <button
              onClick={onClose}
              style={{ width: "100%", background: COLORS.amber, border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, color: COLORS.paper, cursor: "pointer" }}
            >
              Fermer
            </button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", color: COLORS.ink, margin: 0 }}>Revendiquer cette fiche</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "20px", cursor: "pointer" }}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "18px" }}>
              Vous représentez officiellement <strong>{entityName}</strong> ?
              <br />
              Ces informations nous permettent de vérifier votre demande.
            </p>

            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "6px" }}>Nom de la société (ou votre nom, si personne physique) *</p>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", color: COLORS.ink, background: "none", boxSizing: "border-box", marginBottom: "14px" }}
            />

            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "6px" }}>Numéro d'entreprise - Si disponible</p>
            <input
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", color: COLORS.ink, background: "none", boxSizing: "border-box", marginBottom: "14px" }}
            />

            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "6px" }}>Administrateur de l'entreprise (1) - Si disponible</p>
            <input
              value={officers}
              onChange={(e) => setOfficers(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", color: COLORS.ink, background: "none", boxSizing: "border-box", marginBottom: "14px" }}
            />

            <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "6px" }}>Quel est votre lien avec cette fiche ? *</p>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              placeholder="Texte libre ..."
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
              {sending ? "Envoi..." : "Envoyer la demande"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
