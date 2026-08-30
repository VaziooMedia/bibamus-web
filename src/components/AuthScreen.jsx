import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { signUp, signIn, resetPassword, isUsernameAvailable } from "../data/sharedDirectories.js";

const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", boxSizing: "border-box" };
const labelStyle = { fontSize: "12px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "4px", display: "block" };
const buttonStyle = { width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: COLORS.amber, color: COLORS.paper, fontWeight: 700, fontSize: "15px", cursor: "pointer" };

// Âge minimum provisoire (16 ans, seuil belge bière/vin) — le moteur de règles par pays
// (country_rules) n'existe pas encore ; à revoir une fois ce chantier construit.
const PROVISIONAL_MINIMUM_AGE = 16;

function ageFromBirthDate(dateStr) {
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function PasswordField({ value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        style={{ ...inputStyle, paddingRight: "44px" }}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.inkSoft, fontSize: "12px", cursor: "pointer", padding: "4px" }}
      >
        {visible ? "Masquer" : "Afficher"}
      </button>
    </div>
  );
}

// Un seul écran, trois modes — inscription, connexion, mot de passe oublié. Bloque l'accès au
// reste de l'app tant qu'aucune session n'est active (compte réel désormais requis).
export function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
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

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Les deux mots de passe ne correspondent pas.");
        return;
      }
      if (password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caractères.");
        return;
      }
      if (!firstName.trim() || !lastName.trim() || !username.trim() || !birthDate) {
        setError("Merci de compléter tous les champs obligatoires.");
        return;
      }
      if (!birthDate || Number.isNaN(new Date(birthDate).getTime())) {
        setError("Date de naissance invalide.");
        return;
      }
      if (ageFromBirthDate(birthDate) < PROVISIONAL_MINIMUM_AGE) {
        setError(`Bibamus concerne des boissons alcoolisées — un âge minimum de ${PROVISIONAL_MINIMUM_AGE} ans est requis pour s'inscrire.`);
        return;
      }
      setLoading(true);
      const available = await isUsernameAvailable(username.trim());
      if (!available) {
        setLoading(false);
        setError("Ce nom d'utilisateur est déjà pris — essayez-en un autre.");
        return;
      }
      const result = await signUp(email, password, { firstName: firstName.trim(), lastName: lastName.trim(), nickname: nickname.trim(), username: username.trim(), birthDate });
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.session) {
        setMessage("Compte créé — vérifiez votre email pour confirmer votre adresse avant de vous connecter.");
        return;
      }
      onAuthenticated(result.session);
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
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
        {mode === "signup" && (
          <>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Prénom *</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} autoComplete="given-name" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Nom *</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} autoComplete="family-name" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Surnom (optionnel)</label>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex. Ju" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nom d'utilisateur *</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ex. julien_74" required style={inputStyle} autoComplete="username" />
            </div>
            <div>
              <label style={labelStyle}>Date de naissance *</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required style={inputStyle} />
            </div>
            <p style={{ fontSize: "11px", color: COLORS.inkSoft, margin: "-4px 0 0" }}>
              Le prénom, nom, surnom et nom d'utilisateur pourront être affichés aux autres Bibax — vous choisirez ce qui est visible dans vos paramètres. La date de naissance sert uniquement à
              vérifier l'âge minimum requis (contenus liés à l'alcool).
            </p>
          </>
        )}

        <div>
          {mode === "signup" && <label style={labelStyle}>Email *</label>}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse email" required style={inputStyle} autoComplete="email" />
        </div>

        {mode !== "forgot" && (
          <div>
            {mode === "signup" && <label style={labelStyle}>Mot de passe *</label>}
            <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </div>
        )}

        {mode === "signup" && (
          <div>
            <label style={labelStyle}>Confirmez le mot de passe *</label>
            <PasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmez le mot de passe" autoComplete="new-password" />
          </div>
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
