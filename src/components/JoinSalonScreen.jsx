// ============================================================
// Écran "Rejoindre un BibaRoom avec un code" — copié tel quel
// depuis le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";

export function JoinSalonScreen({ onJoin, onCancel, myName }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onJoin(code.trim().toUpperCase());
    } catch (e) {
      setError(e.message || "Code introuvable. Vérifie auprès de tes amis.");
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onCancel} />
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "40px", margin: "0 0 8px 0" }}>Rejoindre un BibaRoom</h1>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "22px" }}>
        Entre le code à 4 caractères partagé par tes amis. Tu rejoindras en tant que <strong>{myName}</strong>.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, "").slice(0, 4))}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Ex. 4K7T"
        maxLength={4}
        autoFocus
        style={{
          padding: "16px",
          borderRadius: "12px",
          border: `2px solid ${COLORS.paperAlt}`,
          fontSize: "24px",
          fontFamily: "'Urbanist', sans-serif",
          letterSpacing: "6px",
          textAlign: "center",
          outline: "none",
          marginBottom: "16px",
        }}
      />
      {error && <p style={{ fontSize: "12px", color: COLORS.wine, marginBottom: "12px" }}>{error}</p>}
      <PrimaryButton onClick={handleSubmit} disabled={!code.trim() || loading} style={{ width: "100%", marginTop: "auto" }}>
        {loading ? "..." : "Rejoindre →"}
      </PrimaryButton>
      <PageFooterNav onBack={onCancel} />
    </div>
  );
}
