import React, { useState, useEffect } from "react";
import { COLORS, PROFILE_COUNTRIES, COUNTRY_ISO_CODES } from "../constants.js";
import { signUp, signIn, resetPassword, getMinimumAge, detectCurrentCountryCode } from "../data/sharedDirectories.js";
import { BibamusLogo } from "./BibamusLogo.jsx";
import { AccountCreatedScreen } from "./AccountCreatedScreen.jsx";

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

// Les petites animations de l'écran (discrètes) : une étape glisse doucement en place, un message d'erreur tressaute une fois, un bouton s'enfonce un peu quand on appuie.
// Toutes sont coupées quand le système demande moins d'animations.
const AUTH_STYLES = `
  .biba-step { animation: bibaStepFromRight .32s cubic-bezier(.2,.8,.3,1) both; }
  .biba-step-back { animation-name: bibaStepFromLeft; }
  @keyframes bibaStepFromRight { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes bibaStepFromLeft { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: translateX(0); } }
  .biba-step-title { animation: bibaTitleIn .35s ease-out both; }
  @keyframes bibaTitleIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  .biba-auth-error { animation: bibaErrorShake .4s ease-out both; }
  @keyframes bibaErrorShake {
    0% { opacity: 0; transform: translateX(0); }
    20% { opacity: 1; transform: translateX(-6px); }
    40% { transform: translateX(5px); }
    60% { transform: translateX(-3px); }
    80% { transform: translateX(2px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .biba-auth-btn { transition: transform .1s, opacity .2s; }
  .biba-auth-btn:active:not(:disabled) { transform: scale(.97); }
  @media (prefers-reduced-motion: reduce) {
    .biba-step, .biba-step-title, .biba-auth-error { animation: none; }
    .biba-auth-btn { transition: none; }
    .biba-auth-btn:active:not(:disabled) { transform: none; }
  }
`;

const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// L'inscription se fait en 3 petites étapes : on fait connaissance (prénom, nom, surnom), l'âge et le pays, puis l'accès (email et mot de passe).
const SIGNUP_STEPS = [{ title: "Enchanté ! 👋" }, { title: "Encore deux infos" }, { title: "Dernière étape" }];

function SignupProgress({ step }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <div role="progressbar" aria-label={`Étape ${step} sur ${SIGNUP_STEPS.length}`} aria-valuemin={1} aria-valuemax={SIGNUP_STEPS.length} aria-valuenow={step} style={{ display: "flex", gap: "6px" }}>
        {SIGNUP_STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: "6px", borderRadius: "3px", background: COLORS.paperAlt, overflow: "hidden" }}>
            <div style={{ height: "100%", width: i < step ? "100%" : "0%", background: COLORS.amber, borderRadius: "3px", transition: "width 0.45s cubic-bezier(.3,.7,.3,1)" }} />
          </div>
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
// Allégé : pas d'explication sur le mail de confirmation (tout le monde sait comment ça marche) ; les instructions pour ajouter Bibamus à l'écran d'accueil sont repliées tant qu'on ne les demande pas.
function ConfirmEmailScreen({ email, onBackToSignIn }) {
  const [platform, setPlatform] = useState("ios");
  const [showHomeScreen, setShowHomeScreen] = useState(false);

  const platformButtonStyle = (active) => ({
    flex: 1,
    padding: "7px",
    borderRadius: "8px",
    border: `2px solid ${active ? COLORS.amber : COLORS.paper}`,
    background: active ? COLORS.amber : "none",
    color: active ? COLORS.paper : COLORS.ink,
    fontWeight: 700,
    fontSize: "12.5px",
    cursor: "pointer",
  });

  return (
    <div style={{ minHeight: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", background: COLORS.paper }}>
      <BibamusLogo width={140} style={{ margin: "0 auto 22px" }} />
      <div style={{ fontSize: "44px", textAlign: "center", marginBottom: "10px" }}>📩</div>
      <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "22px", margin: "0 0 8px", textAlign: "center" }}>Vérifie ta boîte mail</h1>
      <p style={{ fontSize: "13.5px", color: COLORS.inkSoft, lineHeight: 1.5, margin: "0 0 22px", textAlign: "center" }}>
        Un email vient de partir vers <strong style={{ color: COLORS.ink, wordBreak: "break-all" }}>{email}</strong>.
      </p>

      <button
        type="button"
        onClick={() => setShowHomeScreen((v) => !v)}
        aria-expanded={showHomeScreen}
        style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13px", cursor: "pointer", padding: "6px", marginBottom: showHomeScreen ? "8px" : "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
      >
        Ajouter Bibamus à ton écran d'accueil
        <span aria-hidden="true" style={{ display: "inline-block", transform: showHomeScreen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          ▾
        </span>
      </button>

      {showHomeScreen && (
        <div style={{ background: COLORS.paperAlt, borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            <button type="button" onClick={() => setPlatform("ios")} style={platformButtonStyle(platform === "ios")}>
              iPhone (Safari)
            </button>
            <button type="button" onClick={() => setPlatform("android")} style={platformButtonStyle(platform === "android")}>
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
      )}

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
  const [direction, setDirection] = useState("forward"); // le sens du dernier changement d'étape : l'étape arrive de la droite (suivant) ou de la gauche (retour)
  const [created, setCreated] = useState(null); // { next } pendant l'animation qui suit la création du compte

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

  const moveToStep = (n) => {
    setDirection(n < step ? "back" : "forward");
    setStep(n);
  };

  const goToStep = (n) => {
    setError(null);
    moveToStep(n);
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
        moveToStep(step + 1);
        return;
      }
      // Dernière étape : on relit tout avant d'envoyer (les contrôles de l'âge sont refaits, c'est eux qui font foi).
      for (const n of [1, 2]) {
        const earlier = signupStepError(n);
        if (earlier) {
          moveToStep(n);
          setError(earlier);
          return;
        }
      }
      setLoading(true);
      const ageError = await signupAgeError();
      if (ageError) {
        setLoading(false);
        moveToStep(2);
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
      // Compte créé : l'animation de chargement (sautée si le système demande moins d'animations), puis l'écran suivant.
      const next = () => (result.session ? onAuthenticated(result.session) : setMode("confirmEmail"));
      if (prefersReducedMotion()) next();
      else setCreated({ next });
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

  if (created) {
    return (
      <AccountCreatedScreen
        onDone={() => {
          setCreated(null);
          created.next();
        }}
      />
    );
  }

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
      <style>{AUTH_STYLES}</style>
      <BibamusLogo width={isSignup ? 140 : 180} style={{ margin: isSignup ? "0 auto 20px" : "0 auto 28px" }} />
      {mode === "forgot" && <p style={{ textAlign: "center", color: COLORS.inkSoft, fontSize: "14px", marginBottom: "28px" }}>Mot de passe oublié</p>}
      {isSignup && (
        <>
          <SignupProgress step={step} />
          <h1 key={step} className="biba-step-title" style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "24px", margin: "0 0 22px", textAlign: "center" }}>
            {SIGNUP_STEPS[step - 1].title}
          </h1>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate={isSignup} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div key={`${mode}-${step}`} className={isSignup ? `biba-step${direction === "back" ? " biba-step-back" : ""}` : undefined} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
        </div>

        {error && (
          <p key={error} role="alert" className="biba-auth-error" style={{ color: "#D64545", fontSize: "13px", margin: 0 }}>
            {error}
          </p>
        )}
        {message && <p style={{ color: COLORS.sage, fontSize: "13px", margin: 0 }}>{message}</p>}

        <div style={{ display: "flex", gap: "10px" }}>
          {isSignup && step > 1 && (
            <button type="button" className="biba-auth-btn" onClick={() => goToStep(step - 1)} disabled={loading} style={secondaryButtonStyle}>
              Retour
            </button>
          )}
          <button type="submit" className="biba-auth-btn" disabled={loading} style={{ ...buttonStyle, flex: 1, width: "auto", opacity: loading ? 0.6 : 1 }}>
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
