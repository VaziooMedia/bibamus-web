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
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 8px 0" }}>
        <span style={{ width: "4px", height: "20px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0 }} />
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "26px", margin: 0 }}>
          Rejoindre un Biba<span style={{ color: COLORS.amber }}>Room</span>
        </h1>
      </div>
      <p style={{ fontSize: "13px", color: COLORS.inkSoft, marginBottom: "22px" }}>
        Entre le code à 4 caractères partagé par tes amis. Tu rejoindras en tant que <strong>{myName}</strong>.
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: COLORS.surface,
          border: `2px solid ${COLORS.paperAlt}`,
          borderRadius: "12px",
          padding: "0 16px",
          marginBottom: "16px",
          boxSizing: "border-box",
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ex. 4K7T"
          maxLength={4}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "16px 0",
            border: "none",
            background: "none",
            fontSize: "24px",
            fontFamily: "'Urbanist', sans-serif",
            letterSpacing: "6px",
            textAlign: "center",
            outline: "none",
            color: COLORS.ink,
          }}
        />
        <button
          onClick={() => setScanning(true)}
          title="Scanner le QR code"
          style={{ display: "flex", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
        >
          <NavIcon name="scan-line" size={20} color={COLORS.amber} />
        </button>
      </div>
      {error && <p style={{ fontSize: "12px", color: COLORS.wine, marginBottom: "12px" }}>{error}</p>}
      <PrimaryButton onClick={() => handleSubmit()} disabled={!code.trim() || loading} style={{ width: "100%", marginTop: "auto" }}>
        {loading ? "..." : "Rejoindre →"}
      </PrimaryButton>
      <PageFooterNav onBack={onCancel} />
      {scanning && <SalonQrScannerModal onClose={() => setScanning(false)} onScanned={handleScanned} />}
    </div>
  );
}
