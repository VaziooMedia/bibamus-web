// ============================================================
// Écran "Rejoindre un BibaRoom avec un code" — copié tel quel
// depuis le prototype Claude.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";
import { SalonQrScannerModal } from "./SalonQrScannerModal.jsx";

export function JoinSalonScreen({ onJoin, onCancel, myName }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  const handleSubmit = async (codeToJoin) => {
    const finalCode = (codeToJoin || code).trim();
    if (!finalCode) return;
    setLoading(true);
    setError("");
    try {
      await onJoin(finalCode.toUpperCase());
    } catch (e) {
      setError(e.message || "Code introuvable. Vérifie auprès de tes amis.");
      setLoading(false);
    }
  };

  const handleScanned = (scannedCode) => {
    setScanning(false);
    setCode(scannedCode);
    handleSubmit(scannedCode);
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
      <button
        onClick={() => setScanning(true)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          background: "none",
          border: `2px solid ${COLORS.paperAlt}`,
          borderRadius: "12px",
          padding: "13px",
          fontSize: "14px",
          fontWeight: 700,
          color: COLORS.amber,
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        <NavIcon name="scan-line" size={17} color={COLORS.amber} />
        Scanner le QR code
      </button>
      <PrimaryButton onClick={() => handleSubmit()} disabled={!code.trim() || loading} style={{ width: "100%", marginTop: "auto" }}>
        {loading ? "..." : "Rejoindre →"}
      </PrimaryButton>
      <PageFooterNav onBack={onCancel} />
      {scanning && <SalonQrScannerModal onClose={() => setScanning(false)} onScanned={handleScanned} />}
    </div>
  );
}
