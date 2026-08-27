import React, { useState } from "react";

const ADMIN_PASSPHRASE = "bibamus-admin"; // même phrase que dans l'app — à remplacer par de vrais comptes plus tard

export function LoginScreen({ onUnlock }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (value === ADMIN_PASSPHRASE) {
      onUnlock();
    } else {
      setError("Phrase incorrecte.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={submit} style={{ width: "320px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "28px", margin: 0 }}>
          <span style={{ color: "#F2F2E8" }}>Bibamus</span> <span style={{ color: "#39FF66" }}>Gestion</span>
        </h1>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Phrase d'accès"
          autoFocus
          style={{ padding: "12px 14px", borderRadius: "8px", border: "2px solid #28405C", fontSize: "15px" }}
        />
        {error && <p style={{ color: "#FF3B4E", fontSize: "13px", margin: 0 }}>{error}</p>}
        <button
          type="submit"
          style={{ background: "#39FF66", border: "none", borderRadius: "8px", padding: "12px", fontWeight: 700, color: "#0D1B2A", cursor: "pointer" }}
        >
          Entrer
        </button>
      </form>
    </div>
  );
}
