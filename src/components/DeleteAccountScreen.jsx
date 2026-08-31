import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { PageHeader, PageFooterNav, PrimaryButton } from "./ui.jsx";
import { deleteMyAccount } from "../data/sharedDirectories.js";

// Suppression de compte — conforme aux exigences Apple/Google : explication des conséquences,
// confirmation explicite, réauthentification par mot de passe avant toute suppression
// définitive. Le nettoyage des données associées (contenus contribués, historique) se fait
// automatiquement côté serveur, pas ici.
export function DeleteAccountScreen({ onBack, onAccountDeleted }) {
  const [confirmed, setConfirmed] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    const result = await deleteMyAccount(password);
    setDeleting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onAccountDeleted();
  };

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>COMPTE</span>
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "36px", margin: "4px 0 18px 0", lineHeight: 1.1 }}>Supprimer mon compte</h1>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.wine}`, borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
        <p style={{ fontSize: "13.5px", color: COLORS.ink, margin: "0 0 10px 0", fontWeight: 700 }}>Cette action est définitive et irréversible. Voici ce qui va se passer :</p>
        <ul style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0, paddingLeft: "18px", lineHeight: 1.6 }}>
          <li>Votre profil, votre email et votre code Bibax seront supprimés définitivement</li>
          <li>Vous ne pourrez plus vous reconnecter avec ce compte</li>
          <li>
            Les établissements, produits ou marques que vous avez ajoutés à la Database <strong>resteront visibles</strong> (utiles à la communauté), mais ne seront plus associés à votre
            compte
          </li>
          <li>Votre historique de contributions et de signalements reste conservé de façon anonyme, à des fins d'audit</li>
        </ul>
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "18px", cursor: "pointer" }}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: "3px" }} />
        <span style={{ fontSize: "13.5px", color: COLORS.ink }}>J'ai bien compris que cette suppression est définitive et je souhaite continuer.</span>
      </label>

      {confirmed && (
        <>
          <label style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "6px", display: "block" }}>Confirmez votre mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "12px", width: "100%", boxSizing: "border-box" }}
          />
          {error && <p style={{ color: COLORS.wine, fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
          <PrimaryButton onClick={handleDelete} disabled={deleting || !password} style={{ width: "100%", background: COLORS.wine }}>
            {deleting ? "Suppression..." : "Supprimer définitivement mon compte"}
          </PrimaryButton>
        </>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
