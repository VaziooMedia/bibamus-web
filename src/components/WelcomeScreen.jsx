import React, { useRef, useState } from "react";
import { COLORS } from "../constants.js";
import bibaSoloIconUrl from "../assets/brand/bibasolo.svg";
import loupeIconUrl from "../assets/brand/loupe.svg";
import { NavIcon, BibamusLogoFull } from "./icons.jsx";

// Écran de bienvenue : montré une seule fois, à la première connexion d'un nouveau compte, avant l'accueil. Trois cartes à balayer présentent BibaRoom, BibaSolo et BibAtlas.
// Pas de base de données : on retient « vu » dans le navigateur de l'appareil, et on ne le montre qu'aux comptes récents (les anciens comptes ne le voient jamais).

const WELCOME_RECENT_DAYS = 7; // un compte plus ancien que ça n'est plus « nouveau » : pas d'écran de bienvenue
const welcomeSeenKey = (userId) => `bibamus-welcome-seen-${userId}`;

// Faut-il montrer l'écran de bienvenue ? Oui si le compte a moins de WELCOME_RECENT_DAYS jours et que l'écran n'a pas déjà été vu sur cet appareil. Sans date d'inscription connue, non.
// `storage` est injectable pour les tests ; si le stockage de l'appareil est indisponible (mode privé…), l'écran se montre au plus une fois par ouverture (voir App.jsx).
export function shouldShowWelcome(userId, registeredAt, { storage = typeof localStorage !== "undefined" ? localStorage : null, now = Date.now() } = {}) {
  if (!userId || !registeredAt) return false;
  const registered = new Date(registeredAt).getTime();
  if (Number.isNaN(registered) || now - registered > WELCOME_RECENT_DAYS * 24 * 3600 * 1000) return false;
  try {
    return storage?.getItem(welcomeSeenKey(userId)) !== "1";
  } catch {
    return true;
  }
}

export function markWelcomeSeen(userId, { storage = typeof localStorage !== "undefined" ? localStorage : null } = {}) {
  try {
    storage?.setItem(welcomeSeenKey(userId), "1");
  } catch {
    // stockage indisponible : l'écran ne se remontrera pas avant la prochaine ouverture de l'app
  }
}

const imgIcon = (src, alt) => <img src={src} alt={alt} style={{ width: "54px", height: "54px", display: "block" }} />;

const CARDS = [
  {
    id: "room",
    icon: <NavIcon name="bibago-nav" size={40} color={COLORS.amber} />,
    title: (
      <>
        <span style={{ color: COLORS.ink }}>Biba</span>
        <span style={{ color: COLORS.amber }}>Room</span>
      </>
    ),
    tagline: "Trinque à plusieurs",
    text: "Crée un salon ou rejoins celui de tes amis : tournées, cagnotte et addition partagées.",
  },
  {
    id: "solo",
    icon: imgIcon(bibaSoloIconUrl, ""),
    title: (
      <>
        <span style={{ color: COLORS.ink }}>Biba</span>
        <span style={{ color: COLORS.amber }}>Solo</span>
      </>
    ),
    tagline: "Ton journal perso",
    text: "Note ce que tu bois, sans salon : prix, lieu, calories.",
  },
  {
    id: "atlas",
    icon: imgIcon(loupeIconUrl, ""),
    title: (
      <>
        <span style={{ color: COLORS.ink }}>Bib</span>
        <span style={{ color: COLORS.amber }}>Atlas</span>
      </>
    ),
    tagline: "Explore",
    text: "Le répertoire des lieux, boissons et marques : cherche, découvre, scanne une étiquette.",
  },
];

const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STYLES = `
  .biba-welcome-track { scrollbar-width: none; -ms-overflow-style: none; }
  .biba-welcome-track::-webkit-scrollbar { display: none; }
  .biba-welcome-dot { transition: width .25s, background .25s; }
  .biba-welcome-btn { transition: transform .1s; }
  .biba-welcome-btn:active { transform: scale(.97); }
  @media (prefers-reduced-motion: reduce) { .biba-welcome-dot, .biba-welcome-btn { transition: none; } .biba-welcome-btn:active { transform: none; } }
`;

export function WelcomeScreen({ firstName, onDone }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const last = index === CARDS.length - 1;

  const goTo = (i) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.paper, color: COLORS.ink, display: "flex", justifyContent: "center", fontFamily: "'Work Sans', sans-serif" }}>
      <style>{STYLES}</style>
      <div style={{ width: "100%", maxWidth: "480px", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", padding: "max(20px, env(safe-area-inset-top, 0px)) 0 max(24px, env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", minHeight: "36px" }}>
          <BibamusLogoFull height={30} />
          <button
            type="button"
            onClick={onDone}
            style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "14px", cursor: "pointer", padding: "8px 0 8px 12px", visibility: last ? "hidden" : "visible" }}
          >
            Passer
          </button>
        </div>

        <h1 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "28px", margin: "28px 24px 0", textAlign: "center" }}>Bienvenue{firstName ? ` ${firstName}` : ""} !</h1>

        <div
          ref={trackRef}
          className="biba-welcome-track"
          onScroll={(e) => {
            const el = e.currentTarget;
            const next = Math.round(el.scrollLeft / el.clientWidth);
            if (next !== index) setIndex(next);
          }}
          style={{ flex: 1, minHeight: 0, display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", overscrollBehaviorX: "contain" }}
        >
          {CARDS.map((card) => (
            <section
              key={card.id}
              aria-label={card.tagline}
              style={{ flex: "0 0 100%", scrollSnapAlign: "center", boxSizing: "border-box", padding: "0 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}
            >
              <div
                aria-hidden="true"
                style={{ width: "124px", height: "124px", borderRadius: "50%", background: COLORS.surface, border: `2px solid ${COLORS.paperAlt}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "26px" }}
              >
                {card.icon}
              </div>
              <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "30px", margin: "0 0 6px" }}>{card.title}</h2>
              <p style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 700, fontSize: "18px", margin: "0 0 10px", color: COLORS.ink }}>{card.tagline}</p>
              <p style={{ fontSize: "14px", lineHeight: 1.55, margin: 0, color: COLORS.inkSoft, maxWidth: "290px" }}>{card.text}</p>
            </section>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
          {CARDS.map((card, i) => (
            <button
              key={card.id}
              type="button"
              aria-label={`Carte ${i + 1} sur ${CARDS.length}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className="biba-welcome-dot"
              style={{ width: i === index ? "24px" : "8px", height: "8px", borderRadius: "4px", border: "none", padding: 0, cursor: "pointer", background: i === index ? COLORS.amber : COLORS.paperAlt }}
            />
          ))}
        </div>

        <div style={{ padding: "0 24px" }}>
          <button
            type="button"
            className="biba-welcome-btn"
            onClick={() => (last ? onDone() : goTo(index + 1))}
            style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: COLORS.amber, color: COLORS.paper, fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
          >
            {last ? "C'est parti !" : "Suivant"}
          </button>
        </div>
      </div>
    </div>
  );
}
