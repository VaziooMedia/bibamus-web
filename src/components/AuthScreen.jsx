import React, { useState } from "react";
import { COLORS, PROFILE_COUNTRIES } from "../constants.js";
import { signUp, signIn, resetPassword, isUsernameAvailable, getMinimumAge } from "../data/sharedDirectories.js";

const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", boxSizing: "border-box" };
const labelStyle = { fontSize: "12px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "4px", display: "block" };
const buttonStyle = { width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: COLORS.amber, color: COLORS.paper, fontWeight: 700, fontSize: "15px", cursor: "pointer" };

function ageFromBirthDate(dateStr) {
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function EyeIcon({ crossed }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="#8792A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="#8792A6" strokeWidth="1.8" />
      {crossed && <line x1="2" y1="2" x2="22" y2="22" stroke="#8792A6" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
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
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
      >
        <EyeIcon crossed={visible} />
      </button>
    </div>
  );
}

// Écran affiché après inscription — spécifique à la version "web app" (PWA). À retirer
// entièrement une fois les vraies apps App Store / Google Play disponibles.
function ConfirmEmailScreen({ email, onBackToSignIn }) {
  const [platform, setPlatform] = useState("ios");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", background: COLORS.paper }}>
      <img src="/bibamus-logo.svg" alt="Bibamus" style={{ width: "140px", margin: "0 auto 24px", display: "block" }} />
      <div style={{ fontSize: "44px", textAlign: "center", marginBottom: "12px" }}>📩</div>
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: "0 0 10px", textAlign: "center" }}>Vérifiez votre boîte mail</h1>
      <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, lineHeight: 1.6, marginBottom: "22px", textAlign: "center" }}>
        Un email de confirmation vient de vous être envoyé à <strong>{email}</strong>. Cette étape confirme que votre adresse est correcte et bien la vôtre.
      </p>

      <div style={{ background: COLORS.paperAlt, borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
        <p style={{ fontSize: "12.5px", color: COLORS.ink, fontWeight: 700, margin: "0 0 10px" }}>Marche à suivre :</p>
        <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: COLORS.inkSoft, lineHeight: 1.8 }}>
          <li>Ouvrez l'email reçu et appuyez sur le lien de confirmation.</li>
          <li>Il s'ouvrira dans votre navigateur (Safari/Chrome) — c'est normal, fermez-le une fois le message de confirmation affiché.</li>
          <li>
            Retournez sur Bibamus depuis l'icône sur votre écran d'accueil <em>(voir ci-dessous si vous ne l'avez pas encore ajoutée)</em>, puis connectez-vous avec votre mot de passe.
          </li>
        </ol>
      </div>

      <div style={{ background: COLORS.paperAlt, borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
        <p style={{ fontSize: "12.5px", color: COLORS.ink, fontWeight: 700, margin: "0 0 10px" }}>Ajouter Bibamus à votre écran d'accueil</p>
        <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
          <button
            onClick={() => setPlatform("ios")}
            style={{
              flex: 1,
              padding: "7px",
              borderRadius: "8px",
              border: `2px solid ${platform === "ios" ? COLORS.amber : COLORS.paper}`,
              background: platform === "ios" ? COLORS.amber : "none",
              color: platform === "ios" ? COLORS.paper : COLORS.ink,
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
            }}
          >
            iPhone (Safari)
          </button>
          <button
            onClick={() => setPlatform("android")}
            style={{
              flex: 1,
              padding: "7px",
              borderRadius: "8px",
              border: `2px solid ${platform === "android" ? COLORS.amber : COLORS.paper}`,
              background: platform === "android" ? COLORS.amber : "none",
              color: platform === "android" ? COLORS.paper : COLORS.ink,
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
            }}
          >
            Android (Chrome)
          </button>
        </div>
        {platform === "ios" ? (
          <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: COLORS.inkSoft, lineHeight: 1.8 }}>
            <li>
              Appuyez sur le bouton de partage <span style={{ fontWeight: 700 }}>􀈂</span> (un carré avec une flèche vers le haut), en bas de l'écran.
            </li>
            <li>Faites défiler et appuyez sur "Sur l'écran d'accueil".</li>
            <li>Appuyez sur "Ajouter" en haut à droite.</li>
          </ol>
        ) : (
          <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: COLORS.inkSoft, lineHeight: 1.8 }}>
            <li>Appuyez sur le menu (les trois points) en haut à droite de Chrome.</li>
            <li>Appuyez sur "Ajouter à l'écran d'accueil" ou "Installer l'application".</li>
            <li>Confirmez.</li>
          </ol>
        )}
      </div>

      <button onClick={onBackToSignIn} style={buttonStyle}>
        Retour à la connexion
      </button>
    </div>
  );
}

// Un seul écran, trois modes — inscription, connexion, mot de passe oublié. Bloque l'accès au
// reste de l'app tant qu'aucune session n'est active (compte réel désormais requis).
export function AuthScreen({ onAuthenticated, signupsEnabled = true }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
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
      if (!signupsEnabled) {
        setError("Les nouvelles inscriptions sont temporairement suspendues.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Les deux mots de passe ne correspondent pas.");
        return;
      }
      if (password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caractères.");
        return;
      }
      if (!firstName.trim() || !lastName.trim() || !username.trim() || !birthDate || !country) {
        setError("Merci de compléter tous les champs obligatoires.");
        return;
      }
      if (!birthDate || Number.isNaN(new Date(birthDate).getTime())) {
        setError("Date de naissance invalide.");
        return;
      }
      setLoading(true);
      const minimumAge = await getMinimumAge(country);
      if (ageFromBirthDate(birthDate) < minimumAge) {
        setLoading(false);
        setError(`Bibamus concerne des boissons alcoolisées — un âge minimum de ${minimumAge} ans est requis pour ce pays.`);
        return;
      }
      const available = await isUsernameAvailable(username.trim());
      if (!available) {
        setLoading(false);
        setError("Ce nom d'utilisateur est déjà pris — essayez-en un autre.");
        return;
      }
      const result = await signUp(email, password, { firstName: firstName.trim(), lastName: lastName.trim(), nickname: nickname.trim(), username: username.trim(), birthDate, country });
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.session) {
        setMode("confirmEmail");
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

  if (mode === "confirmEmail") {
    // Écran spécifique à la version "web app" (PWA) — à retirer entièrement une fois les
    // vraies apps App Store / Google Play disponibles, la confirmation par email restera mais
    // n'aura alors plus besoin de ces instructions de retour manuel vers l'écran d'accueil.
    return <ConfirmEmailScreen email={email} onBackToSignIn={() => setMode("signin")} />;
  }

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
            <div>
              <label style={labelStyle}>Prénom *</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} autoComplete="given-name" />
            </div>
            <div>
              <label style={labelStyle}>Nom *</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} autoComplete="family-name" />
            </div>
            <div>
              <label style={labelStyle}>Surnom (optionnel)</label>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nom d'utilisateur *</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required style={inputStyle} autoComplete="username" />
            </div>
            <div>
              <label style={labelStyle}>Date de naissance *</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none", maxWidth: "100%", minWidth: 0 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Pays *</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} required style={inputStyle}>
                <option value="">—</option>
                {PROFILE_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.fr}
                  </option>
                ))}
              </select>
            </div>
            <p style={{ fontSize: "11px", color: COLORS.inkSoft, margin: "-4px 0 0" }}>
              Le prénom, nom, surnom et nom d'utilisateur pourront être affichés aux autres Bibax — vous choisirez ce qui est visible dans vos paramètres. La date de naissance et le pays servent
              uniquement à vérifier l'âge minimum requis (contenus liés à l'alcool).
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
            {signupsEnabled ? (
              <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                Pas encore de compte ?<br />Inscrivez-vous
              </button>
            ) : (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "4px" }}>Les nouvelles inscriptions sont temporairement suspendues.</p>
            )}
          </>
        )}
        {mode === "signup" && (
          <button onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
            Déjà un compte ?<br />Connectez-vous
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
