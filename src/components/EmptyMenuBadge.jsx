// ============================================================
// Badge rouge « ! » posé sur le bouton « Produits » d'un BibaRoom quand la carte est vide, et sa bulle d'aide.
// La bulle s'affiche au survol du badge (souris). Elle est dessinée ici plutôt que par le navigateur (attribut `title`) pour
// suivre le style de l'app ; elle reste toujours entière dans l'écran (décalée vers la gauche ou la droite si besoin) et ne
// capte aucun clic : toucher le badge ouvre « Produits » comme avant.
// ============================================================
import React, { useRef, useState, useLayoutEffect } from "react";
import { COLORS } from "../constants.js";

const BUBBLE_MAX_W = 270;
const SCREEN_MARGIN = 12;
const ARROW = 12;
// Les deux bordures de 2 px (celle du badge, d'où part la bulle, et celle de la bulle, où est posée la pointe) décalent les repères de 2 px.
const BORDER = 2;
const LABEL = "Aucun produit présent sur la carte. Ajoutes-en via BibAtlas ou via les Produits génériques";

export function EmptyMenuBadge() {
  const badgeRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [shown, setShown] = useState(false);
  const [place, setPlace] = useState({ width: BUBBLE_MAX_W, left: 0, arrow: 24 });

  // Calcule la largeur et le décalage de la bulle pour qu'elle reste entre les bords de l'écran, puis la fait apparaître en douceur.
  useLayoutEffect(() => {
    if (!hover) {
      setShown(false);
      return undefined;
    }
    const rect = badgeRef.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const width = Math.min(BUBBLE_MAX_W, vw - 2 * SCREEN_MARGIN);
    const wanted = rect.left - 8;
    const left = Math.max(SCREEN_MARGIN, Math.min(wanted, vw - width - SCREEN_MARGIN));
    const centre = rect.left + rect.width / 2;
    setPlace({ width, left: left - rect.left - BORDER, arrow: Math.max(14, Math.min(width - 14 - ARROW, centre - left - BORDER - ARROW / 2)) });
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [hover]);

  return (
    <span
      ref={badgeRef}
      role="img"
      aria-label={LABEL}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute",
        top: "-9px",
        left: "-9px",
        background: COLORS.wine,
        color: "#fff",
        borderRadius: "999px",
        minWidth: "23px",
        height: "23px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: 800,
        border: "2px solid #fff",
        padding: "0 5px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
      }}
    >
      !
      {hover && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 12px)",
            left: `${place.left}px`,
            width: `${place.width}px`,
            boxSizing: "border-box",
            padding: "10px 14px 11px",
            borderRadius: "12px",
            background: COLORS.surfaceAlt,
            border: `2px solid ${COLORS.wine}`,
            boxShadow: "0 10px 24px rgba(0,0,0,0.5)",
            textAlign: "left",
            fontWeight: 400,
            pointerEvents: "none",
            zIndex: 50,
            opacity: shown ? 1 : 0,
            transform: shown ? "translateY(0)" : "translateY(-4px)",
            transition: "opacity 0.15s ease, transform 0.15s ease",
          }}
        >
          {/* Petite pointe vers le badge */}
          <span
            aria-hidden="true"
            style={{ position: "absolute", top: `${-ARROW / 2 - 2}px`, left: `${place.arrow}px`, width: `${ARROW}px`, height: `${ARROW}px`, background: COLORS.surfaceAlt, borderTop: `2px solid ${COLORS.wine}`, borderLeft: `2px solid ${COLORS.wine}`, transform: "rotate(45deg)" }}
          />
          <span style={{ display: "block", position: "relative", fontSize: "13.5px", fontWeight: 700, lineHeight: 1.35, color: COLORS.ink }}>Aucun produit présent sur la carte.</span>
          <span style={{ display: "block", position: "relative", marginTop: "4px", fontSize: "12.5px", lineHeight: 1.45, color: COLORS.inkSoft }}>
            Ajoutes-en via{" "}
            <span style={{ fontWeight: 700, color: COLORS.ink }}>
              Bib<span style={{ color: COLORS.amber }}>Atlas</span>
            </span>{" "}
            ou via les <span style={{ fontWeight: 700, color: COLORS.pinkFluo }}>Produits génériques</span>
          </span>
        </span>
      )}
    </span>
  );
}
