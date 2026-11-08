import React, { useState, useEffect } from "react";
import { COLORS, PROFILE_COUNTRIES, COUNTRY_ISO_CODES } from "../constants.js";
import { signUp, signIn, resetPassword, getMinimumAge, detectCurrentCountryCode } from "../data/sharedDirectories.js";

const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, fontSize: "14px", outline: "none", boxSizing: "border-box" };
const labelStyle = { fontSize: "12px", color: COLORS.inkSoft, fontWeight: 600, marginBottom: "4px", display: "block" };
const buttonStyle = { width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: COLORS.amber, color: COLORS.paper, fontWeight: 700, fontSize: "15px", cursor: "pointer" };
const secondaryButtonStyle = { padding: "14px 20px", borderRadius: "10px", border: `2px solid ${COLORS.paperAlt}`, background: "none", color: COLORS.ink, fontWeight: 700, fontSize: "15px", cursor: "pointer" };

function ageFromBirthDate(dateStr) {
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

// L'inscription se fait en 3 petites étapes : on fait connaissance (prénom, nom, surnom), l'âge et le pays, puis l'accès (email et mot de passe).
const SIGNUP_STEPS = [{ title: "Enchanté ! 👋" }, { title: "Encore deux infos" }, { title: "Dernière étape" }];

function SignupProgress({ step }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <div role="progressbar" aria-label={`Étape ${step} sur ${SIGNUP_STEPS.length}`} aria-valuemin={1} aria-valuemax={SIGNUP_STEPS.length} aria-valuenow={step} style={{ display: "flex", gap: "6px" }}>
        {SIGNUP_STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: "6px", borderRadius: "3px", background: i < step ? COLORS.amber : COLORS.paperAlt, transition: "background 0.3s" }} />
        ))}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: "12px", color: COLORS.inkSoft, textAlign: "center" }}>
        Étape {step} sur {SIGNUP_STEPS.length}
      </p>
    </div>
  );
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
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: "0 0 10px", textAlign: "center" }}>Vérifie ta boîte mail</h1>
      <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, lineHeight: 1.6, marginBottom: "22px", textAlign: "center" }}>
        Un email de confirmation vient de t'être envoyé à <strong>{email}</strong>. Cette étape confirme que ton adresse est correcte et bien la tienne.
      </p>

      <div style={{ background: COLORS.paperAlt, borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
        <p style={{ fontSize: "12.5px", color: COLORS.ink, fontWeight: 700, margin: "0 0 10px" }}>Marche à suivre :</p>
        <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: COLORS.inkSoft, lineHeight: 1.8 }}>
          <li>Ouvre l'email reçu et appuie sur le lien de confirmation.</li>
          <li>Il s'ouvrira dans ton navigateur (Safari/Chrome) — c'est normal, ferme-le une fois le message de confirmation affiché.</li>
          <li>
            Retourne sur Bibamus depuis l'icône sur ton écran d'accueil <em>(voir ci-dessous si tu ne l'as pas encore ajoutée)</em>, puis connecte-toi avec ton mot de passe.
          </li>
        </ol>
      </div>

      <div style={{ background: COLORS.paperAlt, borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
        <p style={{ fontSize: "12.5px", color: COLORS.ink, fontWeight: 700, margin: "0 0 10px" }}>Ajouter Bibamus à ton écran d'accueil</p>
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
              Appuie sur le bouton de partage <span style={{ fontWeight: 700 }}>􀈂</span> (un carré avec une flèche vers le haut), en bas de l'écran.
            </li>
            <li>Fais défiler et appuie sur "Sur l'écran d'accueil".</li>
            <li>Appuie sur "Ajouter" en haut à droite.</li>
          </ol>
        ) : (
          <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: COLORS.inkSoft, lineHeight: 1.8 }}>
            <li>Appuie sur le menu (les trois points) en haut à droite de Chrome.</li>
            <li>Appuie sur "Ajouter à l'écran d'accueil" ou "Installer l'application".</li>
            <li>Confirme.</li>
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
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [step, setStep] = useState(1); // étape de l'inscription : 1, 2 ou 3

  // Pré-remplit le pays de résidence selon la position actuelle de l'appareil, pour gagner un
  // clic — reste entièrement modifiable, et ne touche jamais à un choix déjà fait.
  useEffect(() => {
    if (mode !== "signup") return;
    (async () => {
      const isoCode = await detectCurrentCountryCode();
      if (!isoCode) return;
      const match = Object.entries(COUNTRY_ISO_CODES).find(([, iso]) => iso === isoCode);
      if (match) {
        setCountry((prev) => prev || match[0]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Le contrôle des champs d'une étape de l'inscription : le message à afficher, ou null si tout est bon.
  const signupStepError = (n) => {
    if (n === 1) {
      if (!firstName.trim()) return "Il manque ton prénom.";
      if (!lastName.trim()) return "Il manque ton nom.";
    }
    if (n === 2) {
      if (!birthDate) return "Il manque ta date de naissance.";
      if (Number.isNaN(new Date(birthDate).getTime())) return "Cette date de naissance n'est pas valide.";
      if (!country) return "Choisis ton pays.";
    }
    if (n === 3) {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Cette adresse email ne semble pas valide.";
      if (password !== confirmPassword) return "Les deux mots de passe ne correspondent pas.";
      if (password.length < 6) return "Le mot de passe doit contenir au moins 6 caractères.";
    }
    return null;
  };

  // L'âge minimum du pays choisi (piloté depuis la plateforme de gestion) : le message à afficher si la date de naissance est trop récente, sinon null.
  const signupAgeError = async () => {
    const minimumAge = await getMinimumAge(country);
    return ageFromBirthDate(birthDate) < minimumAge ? `Bibamus concerne des boissons alcoolisées — un âge minimum de ${minimumAge} ans est requis pour ce pays.` : null;
  };

  const goToStep = (n) => {
    setError(null);
    setStep(n);
  };

  // Chaque étape repart du haut de l'écran.
  useEffect(() => {
    if (mode === "signup") window.scrollTo(0, 0);
  }, [mode, step]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "forgot") {
      setLoading(true);
      const result = await resetPassword(email);
      setLoading(false);
      if (result.error) setError(result.error);
      else setMessage("Un email t'a été envoyé pour réinitialiser ton mot de passe.");
      return;
    }

    if (mode === "signup") {
      if (!signupsEnabled) {
        setError("Les nouvelles inscriptions sont temporairement suspendues.");
        return;
      }
      // Chaque étape est contrôlée avant de passer à la suivante ; l'âge minimum l'est dès l'étape 2, pour ne pas faire remplir tout le reste
      // à quelqu'un qui n'a pas l'âge.
      const stepError = signupStepError(step);
      if (stepError) {
        setError(stepError);
        return;
      }
      if (step === 2) {
        setLoading(true);
        const ageError = await signupAgeError();
        setLoading(false);
        if (ageError) {
          setError(ageError);
          return;
        }
      }
      if (step < SIGNUP_STEPS.length) {
        setStep(step + 1);
        return;
      }
      // Dernière étape : on relit tout avant d'envoyer (les contrôles de l'âge sont refaits, c'est eux qui font foi).
      for (const n of [1, 2]) {
        const earlier = signupStepError(n);
        if (earlier) {
          setStep(n);
          setError(earlier);
          return;
        }
      }
      setLoading(true);
      const ageError = await signupAgeError();
      if (ageError) {
        setLoading(false);
        setStep(2);
        setError(ageError);
        return;
      }
      const result = await signUp(email, password, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim(),
        birthDate,
        country: PROFILE_COUNTRIES.find((c) => c.code === country)?.fr || country,
      });
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

  const isSignup = mode === "signup";
  const lastStep = step === SIGNUP_STEPS.length;

  return (
    <div style={{ minHeight: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", background: COLORS.paper }}>
      <img src="/bibamus-logo.svg" alt="Bibamus" style={{ width: isSignup ? "140px" : "180px", margin: isSignup ? "0 auto 20px" : "0 auto 28px", display: "block" }} />
      {mode === "forgot" && <p style={{ textAlign: "center", color: COLORS.inkSoft, fontSize: "14px", marginBottom: "28px" }}>Mot de passe oublié</p>}
      {isSignup && (
        <>
          <SignupProgress step={step} />
          <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", margin: "0 0 22px", textAlign: "center" }}>{SIGNUP_STEPS[step - 1].title}</h1>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate={isSignup} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {isSignup && step === 1 && (
          <>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} autoComplete="given-name" />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} autoComplete="family-name" />
            </div>
            <div>
              <label style={labelStyle}>Surnom (optionnel)</label>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={inputStyle} autoComplete="nickname" />
            </div>
            <p style={{ fontSize: "11px", color: COLORS.inkSoft, margin: "-4px 0 0" }}>
              Ton prénom, ton nom et ton surnom pourront être affichés aux autres Bibax — tu choisiras ce qui est visible dans tes paramètres.
            </p>
          </>
        )}

        {isSignup && step === 2 && (
          <>
            <div>
              <label style={labelStyle}>Date de naissance</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none", maxWidth: "100%", minWidth: 0 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Pays</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} required style={inputStyle}>
                <option value="">—</option>
                {PROFILE_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.fr}
                  </option>
                ))}
              </select>
            </div>
            <p style={{ fontSize: "11px", color: COLORS.inkSoft, margin: "-4px 0 0" }}>Ta date de naissance et ton pays servent uniquement à vérifier l'âge minimum requis (contenus liés à l'alcool).</p>
          </>
        )}

        {(!isSignup || step === 3) && (
          <div>
            {isSignup && <label style={labelStyle}>Email</label>}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse email" required style={inputStyle} autoComplete="email" />
          </div>
        )}

        {mode !== "forgot" && (!isSignup || step === 3) && (
          <div>
            {isSignup && <label style={labelStyle}>Mot de passe</label>}
            <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" autoComplete={isSignup ? "new-password" : "current-password"} />
          </div>
        )}

        {isSignup && step === 3 && (
          <div>
            <label style={labelStyle}>Confirme ton mot de passe</label>
            <PasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirme ton mot de passe" autoComplete="new-password" />
          </div>
        )}

        {error && <p style={{ color: "#D64545", fontSize: "13px", margin: 0 }}>{error}</p>}
        {message && <p style={{ color: COLORS.sage, fontSize: "13px", margin: 0 }}>{message}</p>}

        <div style={{ display: "flex", gap: "10px" }}>
          {isSignup && step > 1 && (
            <button type="button" onClick={() => goToStep(step - 1)} disabled={loading} style={secondaryButtonStyle}>
              Retour
            </button>
          )}
          <button type="submit" disabled={loading} style={{ ...buttonStyle, flex: 1, width: "auto", opacity: loading ? 0.6 : 1 }}>
            {loading ? "..." : isSignup ? (lastStep ? "Créer mon compte" : "Suivant") : mode === "forgot" ? "Envoyer le lien" : "Se connecter"}
          </button>
        </div>
        {isSignup && lastStep && <p style={{ fontSize: "11.5px", color: COLORS.inkSoft, textAlign: "center", margin: "-2px 0 0" }}>Tu vas recevoir un email pour confirmer ton adresse.</p>}
      </form>

      <div style={{ marginTop: "20px", textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
        {mode === "signin" && (
          <>
            <button onClick={() => setMode("forgot")} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", cursor: "pointer" }}>
              Mot de passe oublié ?
            </button>
            {signupsEnabled ? (
              <button
                onClick={() => {
                  goToStep(1);
                  setMode("signup");
                }}
                style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
              >
                Pas encore de compte ?<br />Inscris-toi
              </button>
            ) : (
              <p style={{ fontSize: "12.5px", color: COLORS.inkSoft, marginTop: "4px" }}>Les nouvelles inscriptions sont temporairement suspendues.</p>
            )}
          </>
        )}
        {mode === "signup" && (
          <button onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: COLORS.amber, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
            Déjà un compte ?<br />Connecte-toi
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
