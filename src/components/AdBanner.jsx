// ============================================================
// Bannière d'annonce : image 3:1 (ex. 1200 × 400 px), de bord à bord, cliquable (ouvre le lien de l'annonceur dans un nouvel onglet).
// Décidé par Mehdi (2026-11-21) : format bannière 3:1, de bord à bord, cliquable. Affichée sur l'accueil et tous les X publications du fil BibaPulse.
// - La hauteur est fixée par le ratio (aspect-ratio 3 / 1) : la place est réservée avant le chargement de l'image, rien ne saute à l'écran.
// - Si l'image ne se charge pas, la bannière disparaît entièrement (pas de cadre vide).
// - La mention « Annonce » (petite pastille dans le coin) rend la publicité identifiable comme telle : elle s'affiche quand l'annonce a `showLabel` (case « Mention « Annonce » » de chaque annonce dans la plateforme de gestion, Business → Marketing).
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants.js";
import { trackAdImpression, trackAdClick } from "../data/ads.js";

export const AD_ASPECT = "3 / 1";

// Un affichage est compté quand la bannière est vue pour moitié au moins pendant 1 seconde, onglet visible (décidé par Mehdi, 2026-11-21).
const IMPRESSION_RATIO = 0.5;
const IMPRESSION_MS = 1000;

// `bleed` : la bannière sort de la marge de 20 px de la page (accueil). Dans le fil Pulse, le conteneur sort déjà de la marge : `bleed={false}`.
// `spaceAbove` / `spaceBelow` : espace (px) laissé au-dessus / en dessous.
// `onFail` : appelée si l'image ne se charge pas (l'écran qui a ajouté un trait ou un espace autour de la bannière peut alors les retirer).
// `placement` ("home" ou "pulse") : emplacement où la bannière s'affiche, pour le comptage anonyme des affichages et des clics (sans lui, rien n'est compté).
export function AdBanner({ ad, bleed = true, spaceAbove = 0, spaceBelow = 0, onFail, placement }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);
  const adId = ad ? ad.id : null;

  useEffect(() => {
    if (!placement || !adId || failed || typeof IntersectionObserver === "undefined") return undefined;
    const el = ref.current;
    if (!el) return undefined;
    let visible = false;
    let timer = null;
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const start = () => {
      if (timer || !visible || document.visibilityState !== "visible") return;
      timer = setTimeout(() => {
        timer = null;
        if (visible && document.visibilityState === "visible") trackAdImpression(adId, placement);
      }, IMPRESSION_MS);
    };
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting && e.intersectionRatio >= IMPRESSION_RATIO);
        if (visible) start();
        else stop();
      },
      { threshold: [0, IMPRESSION_RATIO, 1] }
    );
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    io.observe(el);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [adId, placement, failed]);

  if (!ad || failed) return null;
  return (
    <a
      ref={ref}
      href={ad.linkUrl}
      onClick={() => placement && trackAdClick(ad.id, placement)}
      onAuxClick={(e) => e.button === 1 && placement && trackAdClick(ad.id, placement)}
      target="_blank"
      rel="sponsored noopener noreferrer"
      data-ad-id={ad.id}
      aria-label={ad.altText ? `Annonce : ${ad.altText}` : "Annonce"}
      style={{
        display: "block",
        position: "relative",
        boxSizing: "border-box",
        width: bleed ? "auto" : "100%",
        margin: `${spaceAbove}px ${bleed ? "-20px" : "0"} ${spaceBelow}px`,
        aspectRatio: AD_ASPECT,
        overflow: "hidden",
        background: COLORS.paperAlt,
        textDecoration: "none",
      }}
    >
      <img
        src={ad.imageUrl}
        alt={ad.altText}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => {
          setFailed(true);
          if (onFail) onFail();
        }}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
      {ad.showLabel && (
        <span
          data-ad-label="1"
          style={{
            position: "absolute",
            right: "8px",
            bottom: "8px",
            padding: "2px 7px",
            borderRadius: "999px",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.3px",
            lineHeight: 1.4,
            pointerEvents: "none",
          }}
        >
          Annonce
        </span>
      )}
    </a>
  );
}
