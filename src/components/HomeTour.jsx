import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { COLORS } from "../constants.js";

// Visite de l'accueil : montrée une seule fois, à la première connexion d'un nouveau compte. L'écran s'assombrit, chaque bouton important est mis en lumière à tour de rôle
// et une bulle l'explique (BibaSolo, BibAtlas, DrinkCheck, PlaceCheck, BibaPulse, BibaGo). Les boutons visés sont repérés par un attribut `data-tour` (HomeScreen.jsx et la
// barre du bas dans ui.jsx) : une étape dont le bouton n'est pas à l'écran est sautée.
// Pas de base de données : on retient « vu » dans le navigateur de l'appareil, et on ne la montre qu'aux comptes récents (les anciens comptes ne la voient jamais).

const TOUR_RECENT_DAYS = 7; // un compte plus ancien que ça n'est plus « nouveau » : pas de visite
const tourSeenKey = (userId) => `bibamus-home-tour-seen-${userId}`;

// Faut-il montrer la visite ? Oui si le compte a moins de TOUR_RECENT_DAYS jours et qu'elle n'a pas déjà été vue sur cet appareil. Sans date d'inscription connue, non.
// `storage` est injectable pour les tests ; si le stockage de l'appareil est indisponible (mode privé…), elle se montre au plus une fois par ouverture (voir App.jsx).
export function shouldShowHomeTour(userId, registeredAt, { storage = typeof localStorage !== "undefined" ? localStorage : null, now = Date.now() } = {}) {
  if (!userId || !registeredAt) return false;
  const registered = new Date(registeredAt).getTime();
  if (Number.isNaN(registered) || now - registered > TOUR_RECENT_DAYS * 24 * 3600 * 1000) return false;
  try {
    return storage?.getItem(tourSeenKey(userId)) !== "1";
  } catch {
    return true;
  }
}

export function markHomeTourSeen(userId, { storage = typeof localStorage !== "undefined" ? localStorage : null } = {}) {
  try {
    storage?.setItem(tourSeenKey(userId), "1");
  } catch {
    // stockage indisponible : la visite ne se remontrera pas avant la prochaine ouverture de l'app
  }
}

const twoTone = (ink, accent) => (
  <>
    <span style={{ color: COLORS.ink }}>{ink}</span>
    <span style={{ color: COLORS.amber }}>{accent}</span>
  </>
);

// L'ordre de la visite. La première étape n'a pas de cible : c'est l'accueil, au centre de l'écran.
const STEPS = [
  { id: "intro" },
  { id: "solo", target: "solo", title: twoTone("Biba", "Solo"), text: "Ton journal perso : note ce que tu bois, sans salon." },
  { id: "atlas", target: "atlas", title: twoTone("Bib", "Atlas"), text: "Le répertoire des lieux, boissons et marques : cherche, découvre, scanne une étiquette." },
  { id: "drinkcheck", target: "drinkcheck", title: twoTone("Drink", "Check"), text: "Partage la boisson que tu bois en ce moment." },
  { id: "placecheck", target: "placecheck", title: twoTone("Place", "Check"), text: "Partage le lieu où tu es en ce moment." },
  { id: "pulse", target: "pulse", title: twoTone("Biba", "Pulse"), text: "Le fil d'activité de tes Bibax." },
  { id: "go", target: "go", title: twoTone("Biba", "Go"), text: "Crée ou rejoins un salon pour boire à plusieurs." },
];

const SPOT_PAD = 8; // marge de la mise en lumière autour du bouton
const BUBBLE_GAP = 16; // distance entre la mise en lumière et la bulle
const SIDE_MARGIN = 16;

const findTarget = (step) => (step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null);

// Le rectangle qui englobe le bouton et tout ce qui déborde de lui (le rond de BibaGo dépasse de la barre du bas).
function targetRect(el) {
  const base = el.getBoundingClientRect();
  let { left, top, right, bottom } = base;
  el.querySelectorAll("*").forEach((child) => {
    const r = child.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  });
  return { left: Math.round(left), top: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) };
}

const STYLES = `
  .biba-tour-spot { transition: left .3s ease, top .3s ease, width .3s ease, height .3s ease; }
  .biba-tour-bubble { animation: bibaTourIn .25s ease-out both; }
  @keyframes bibaTourIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .biba-tour-btn { transition: transform .1s; }
  .biba-tour-btn:active { transform: scale(.97); }
  @media (prefers-reduced-motion: reduce) { .biba-tour-spot, .biba-tour-btn { transition: none; } .biba-tour-bubble { animation: none; } .biba-tour-btn:active { transform: none; } }
`;

export function HomeTour({ firstName, onDone }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const step = STEPS[index];

  // Prochaine étape dont le bouton est à l'écran, ou -1 s'il n'y en a plus.
  const nextIndex = (from) => {
    for (let j = from + 1; j < STEPS.length; j++) if (!STEPS[j].target || findTarget(STEPS[j])) return j;
    return -1;
  };
  const isLast = nextIndex(index) === -1;
  const goNext = () => {
    const next = nextIndex(index);
    if (next === -1) onDone();
    else setIndex(next);
  };

  const measure = useCallback(() => {
    setViewport((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
    const el = findTarget(step);
    if (!el) {
      setRect(null);
      return;
    }
    const next = targetRect(el);
    setRect((prev) => (prev && prev.left === next.left && prev.top === next.top && prev.width === next.width && prev.height === next.height ? prev : next));
  }, [step]);

  // À chaque étape : ramène le bouton à l'écran, le mesure, et le re-mesure (l'écran peut bouger : chargement, rotation…). Une cible absente fait passer à l'étape suivante.
  useLayoutEffect(() => {
    if (step.target) {
      const el = findTarget(step);
      if (!el) {
        const next = nextIndex(index);
        if (next === -1) onDone();
        else setIndex(next);
        return undefined;
      }
      el.scrollIntoView?.({ block: "nearest" });
    }
    measure();
    const timer = setInterval(measure, 400);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bubbleWidth = Math.min(300, viewport.w - 2 * SIDE_MARGIN);
  let bubblePlace;
  let arrow = null;
  if (rect) {
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(SIDE_MARGIN, Math.min(centerX - bubbleWidth / 2, viewport.w - bubbleWidth - SIDE_MARGIN));
    const below = rect.top + rect.height / 2 < viewport.h * 0.5; // cible dans la moitié haute : la bulle se met dessous, sinon dessus
    bubblePlace = below
      ? { left, top: rect.top + rect.height + SPOT_PAD + BUBBLE_GAP }
      : { left, bottom: viewport.h - rect.top + SPOT_PAD + BUBBLE_GAP };
    arrow = { below, left: Math.max(22, Math.min(centerX - left - 7, bubbleWidth - 36)) };
  } else {
    bubblePlace = { left: (viewport.w - bubbleWidth) / 2, top: viewport.h / 2, transform: "translateY(-50%)" };
  }

  const isIntro = !step.target;
  return (
    <div role="dialog" aria-modal="true" aria-label="Visite de l'accueil" style={{ position: "fixed", inset: 0, zIndex: 10000, overflow: "hidden", touchAction: "none" }}>
      <style>{STYLES}</style>
      {rect ? (
        <div
          className="biba-tour-spot"
          style={{
            position: "fixed",
            left: rect.left - SPOT_PAD,
            top: rect.top - SPOT_PAD,
            width: rect.width + 2 * SPOT_PAD,
            height: rect.height + 2 * SPOT_PAD,
            boxSizing: "border-box",
            borderRadius: "20px",
            border: `2px solid ${COLORS.amber}`,
            boxShadow: "0 0 0 100vmax rgba(4, 10, 18, 0.84)",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4, 10, 18, 0.84)" }} />
      )}

      <div
        key={step.id}
        className="biba-tour-bubble"
        style={{
          position: "fixed",
          width: `${bubbleWidth}px`,
          boxSizing: "border-box",
          background: COLORS.surface,
          border: `2px solid ${COLORS.paperAlt}`,
          borderRadius: "16px",
          padding: "16px",
          color: COLORS.ink,
          fontFamily: "'Work Sans', sans-serif",
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          ...bubblePlace,
        }}
      >
        {arrow && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: `${arrow.left}px`,
              [arrow.below ? "top" : "bottom"]: "-9px",
              width: "14px",
              height: "14px",
              background: COLORS.surface,
              borderLeft: arrow.below ? `2px solid ${COLORS.paperAlt}` : "none",
              borderTop: arrow.below ? `2px solid ${COLORS.paperAlt}` : "none",
              borderRight: arrow.below ? "none" : `2px solid ${COLORS.paperAlt}`,
              borderBottom: arrow.below ? "none" : `2px solid ${COLORS.paperAlt}`,
              transform: "rotate(45deg)",
            }}
          />
        )}
        <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", margin: "0 0 6px" }}>{isIntro ? `Bienvenue${firstName ? ` ${firstName}` : ""} !` : step.title}</h2>
        <p style={{ fontSize: "14px", lineHeight: 1.5, margin: "0 0 14px", color: COLORS.inkSoft }}>{isIntro ? "Petit tour de l'accueil." : step.text}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div aria-hidden="true" style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
            {STEPS.map((s, i) => (
              <span key={s.id} style={{ width: i === index ? "16px" : "6px", height: "6px", borderRadius: "3px", background: i === index ? COLORS.amber : COLORS.paperAlt }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {!isLast && (
              <button type="button" onClick={onDone} style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: "13.5px", cursor: "pointer", padding: "8px 4px", whiteSpace: "nowrap" }}>
                Passer
              </button>
            )}
            <button
              type="button"
              className="biba-tour-btn"
              onClick={goNext}
              style={{ padding: "10px 16px", borderRadius: "10px", border: "none", background: COLORS.amber, color: COLORS.paper, fontWeight: 700, fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {isIntro ? "C'est parti !" : isLast ? "Terminé" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
