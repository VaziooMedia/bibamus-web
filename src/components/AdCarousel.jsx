// ============================================================
// Carrousel d'annonces de l'accueil (décidé par Mehdi, 2026-11-21) : plusieurs annonces actives sur l'accueil défilent l'une après l'autre.
// - Une seule annonce : la bannière seule, sans points ni défilement.
// - Plusieurs : on les fait glisser sur le côté (chaque annonce s'arrête au bord, comme les extraits BibaPulse) et elles défilent d'elles-mêmes toutes les
//   `seconds` secondes (durée réglée dans la plateforme de gestion, Business → Marketing → Réglages). Un balayage de la personne relance le décompte.
//   Petits points DANS l'image, en bas au centre (décidé par Mehdi, 2026-11-21) : l'annonce affichée en amber, les autres en blanc translucide
//   (lisibles sur n'importe quelle image), cerclés d'un fin trait sombre. Ils ne prennent aucune place sous la bannière.
// - Le défilement automatique s'arrête pour qui a demandé moins d'animations (prefers-reduced-motion) : on balaie à la main.
// - Une annonce dont l'image ne se charge pas est retirée du carrousel ; s'il n'en reste aucune, `onEmpty` est appelée (l'accueil retire alors son trait rose).
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { AdBanner } from "./AdBanner.jsx";

const DOT_SIZE = 6;
const DOT_GAP = 5;
const DOT_IDLE = "rgba(255,255,255,0.6)";
// Alignés sur le centre de la pastille « Annonce » (bas 8 px, haut d'environ 18 px) : les deux se lisent sur la même ligne.
const DOTS_BOTTOM = 14;

const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function AdCarousel({ ads, seconds, spaceAbove = 0, spaceBelow = 0, onEmpty }) {
  const [failed, setFailed] = useState(() => new Set());
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef(null);
  const live = ads.filter((a) => !failed.has(a.id));
  const count = live.length;

  const markFailed = (id) => setFailed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  useEffect(() => {
    if (count === 0 && onEmpty) onEmpty();
  }, [count, onEmpty]);

  // Si des annonces disparaissent, on ne reste pas sur un rang qui n'existe plus.
  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  // Défilement automatique : à chaque changement de rang (automatique ou au doigt), le décompte repart de zéro.
  useEffect(() => {
    if (count < 2 || prefersReducedMotion()) return undefined;
    const timer = setTimeout(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const next = (index + 1) % count;
      el.scrollTo({ left: next * el.clientWidth, behavior: next === 0 ? "auto" : "smooth" });
    }, seconds * 1000);
    return () => clearTimeout(timer);
  }, [index, count, seconds]);

  if (count === 0) return null;
  if (count === 1) return <AdBanner ad={live[0]} spaceAbove={spaceAbove} spaceBelow={spaceBelow} onFail={() => markFailed(live[0].id)} />;

  const onScroll = (e) => {
    const el = e.currentTarget;
    const i = Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / (el.clientWidth || 1))));
    setIndex((prev) => (prev === i ? prev : i));
  };

  return (
    <div data-ad-carousel style={{ position: "relative", margin: `${spaceAbove}px -20px ${spaceBelow}px` }}>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="region"
        aria-roledescription="carrousel"
        aria-label="Annonces"
        style={{ display: "flex", overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", scrollbarWidth: "none", overscrollBehaviorX: "contain" }}
      >
        {live.map((ad) => (
          <div key={ad.id} style={{ flex: "0 0 100%", minWidth: 0, scrollSnapAlign: "start", scrollSnapStop: "always" }}>
            <AdBanner ad={ad} bleed={false} onFail={() => markFailed(ad.id)} />
          </div>
        ))}
      </div>
      <div
        data-ad-dots
        aria-hidden="true"
        style={{ position: "absolute", left: 0, right: 0, bottom: `${DOTS_BOTTOM}px`, display: "flex", justifyContent: "center", alignItems: "center", gap: `${DOT_GAP}px`, pointerEvents: "none" }}
      >
        {live.map((ad, i) => (
          <span key={ad.id} style={{ width: `${DOT_SIZE}px`, height: `${DOT_SIZE}px`, borderRadius: "50%", background: i === index ? COLORS.amber : DOT_IDLE, boxShadow: "0 0 0 1px rgba(0,0,0,0.35)" }} />
        ))}
      </div>
    </div>
  );
}
