import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { signUp, signIn, resetPassword } from "../data/sharedDirectories.js";

const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", boxSizing: "border-box" };
const buttonStyle = { width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: COLORS.amber, color: COLORS.paper, fontWeight: 700, fontSize: "15px", cursor: "pointer" };

// Un seul écran, trois modes — inscription, connexion, mot de passe oublié. Bloque l'accès au
// reste de l'app tant qu'aucune session n'est active (compte réel désormais requis).
export function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "forgot") {
      setLoading(true);
      const result = await resetPassword(email);
      setLoading(false);
      if (result.error) setError(result.error);
      else setMessage("Un email vous a été envoyé pour réinitialiser votre mot de passe.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    const result = mode === "signup" ? await signUp(email, password) : await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (mode === "signup" && !result.session) {
      setMessage("Compte créé — vérifiez votre email pour confirmer votre adresse avant de vous connecter.");
      return;
    }
    onAuthenticated(result.session);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", background: COLORS.paper }}>
      <img src="/bibamus-logo.svg" alt="Bibamus" style={{ width: "180px", margin: "0 auto 28px", display: "block" }} />
      {mode !== "signin" && (
        <p style={{ textAlign: "center", color: COLORS.inkSoft, fontSize: "14px", marginBottom: "28px" }}>
          {mode === "signup" ? "Créez votre compte" : "Mot de passe oublié"}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse email" required style={inputStyle} autoComplete="email" />

        {mode !== "forgot" && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            required
            style={inputStyle}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        )}

        {mode === "signup" && (
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmez le mot de passe"
            required
            style={inputStyle}
            autoComplete="new-password"
          />
        )}

        {error && <p style={{ color: "#D64545", fontSize: "13px", margin: 0 }}>{error}</p>}
        {message && <p style={{ color: COLORS.sage, fontSize: "13px", margin: 0 }}>{message}</p>}

        <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.6 : 1 }}>
          {loading ? "..." : mode === "signup" ? "Créer mon compte" : mode === "forgot" ? "Envoyer le lien" : "Se connecter"}
        </button>
      </form>

      <div style={{ marginTop: "20px", textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
        {mode === "signin" && (
          <>
            <button onClick={() => setMode("forgot")} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", cursor: "pointer" }}>
              Mot de passe oublié ?
            </button>
            <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
              Pas encore de compte ?<br />Inscrivez-vous
            </button>
          </>
        )}
        {mode === "signup" && (
          <button onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
            Déjà un compte ? Connectez-vous
          </button>
        )}
        {mode === "forgot" && (
          <button onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", cursor: "pointer" }}>
            Retour à la connexion
          </button>
        )}
      </div>
    </div>
  );
}
