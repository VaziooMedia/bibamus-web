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
    <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <PageHeader onBack={onBack} />
      <span style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "12px", letterSpacing: "2px", color: COLORS.wine, fontWeight: 700 }}>COMPTE</span>
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "36px", margin: "4px 0 18px 0", lineHeight: 1.1 }}>Supprimer mon compte</h1>

      <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.wine}`, borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
        <p style={{ fontSize: "13.5px", color: COLORS.ink, margin: "0 0 10px 0", fontWeight: 700 }}>Cette action est définitive et irréversible. Voici ce qui va se passer :</p>
        <p style={{ fontSize: "13px", color: COLORS.ink, margin: "0 0 4px 0", fontWeight: 700 }}>Supprimé définitivement</p>
        <ul style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0, paddingLeft: "18px", lineHeight: 1.6 }}>
          <li>Ton profil, ton email, ton code Bibax et ta photo de profil</li>
          <li>Tu ne pourras plus te reconnecter avec ce compte</li>
          <li>Ton journal (bières goûtées, check-ins, scans d'étiquettes)</li>
          <li>Tes activités BibaPulse (cartes, photos, réactions, commentaires), tes Stories et tes réactions</li>
          <li>Tes relations (Bibax, blocages, suivis) et tes notifications</li>
          <li>
            Tes messages envoyés, <strong>y compris chez leurs destinataires</strong>, avec leurs photos
          </li>
          <li>
            Tes publications et ta place dans tes BibaClubs. Si tu es le seul membre actif d'un club, ce club est supprimé avec toi. Si tu en es le seul administrateur et qu'il compte
            d'autres membres actifs, tu dois d'abord nommer un autre administrateur.
          </li>
        </ul>
        <p style={{ fontSize: "13px", color: COLORS.ink, margin: "12px 0 4px 0", fontWeight: 700 }}>Conservé</p>
        <ul style={{ fontSize: "13px", color: COLORS.inkSoft, margin: 0, paddingLeft: "18px", lineHeight: 1.6 }}>
          <li>
            Les établissements, produits ou marques que tu as ajoutés à la Database, avec leurs photos, <strong>restent visibles</strong> (utiles à la communauté) mais ne sont plus liés à ton
            compte
          </li>
          <li>Tes signalements restent, sans lien avec ton compte</li>
          <li>Un journal de sécurité interne (qui a modifié quelle fiche, et quand) est conservé 12 mois à des fins de sécurité et peut contenir ton identifiant pendant cette durée</li>
        </ul>
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "18px", cursor: "pointer" }}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: "3px" }} />
        <span style={{ fontSize: "13.5px", color: COLORS.ink }}>J'ai bien compris que cette suppression est définitive et je souhaite continuer.</span>
      </label>

      {confirmed && (
        <>
          <label style={{ fontSize: "12.5px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "6px", display: "block" }}>Confirme ton mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", marginBottom: "12px", width: "100%", boxSizing: "border-box" }}
          />
          {error && <p style={{ color: COLORS.wine, fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
          <PrimaryButton onClick={handleDelete} disabled={deleting || !password} style={{ width: "100%", background: COLORS.pinkFluo, ...(deleting || !password ? {} : { color: "#fff" }) }}>
            {deleting ? "Suppression..." : "Supprimer définitivement mon compte"}
          </PrimaryButton>
        </>
      )}

      <PageFooterNav onBack={onBack} />
    </div>
  );
}
