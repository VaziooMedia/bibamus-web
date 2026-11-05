// ============================================================
// Petite bulle d'explication accrochée à un bouton, ouverte par un appui sur ce bouton (aujourd'hui : le bouton étoile grisé de la
// fiche Marque, pour dire pourquoi on ne peut pas noter). Même aspect que les autres bulles de l'app (icône « info » de BibaSolo et de la
// Carte boissons) : fond de carte, bord vert fluo, pointe vers le bouton.
//
// Elle se pose À GAUCHE du bouton, centrée sur lui : sur la couverture d'une fiche, au-dessus du bouton il y a le bouton de profil, et
// en dessous le nom de la fiche ; à gauche il n'y a que la bannière de la note, qu'elle recouvre le temps de la lire.
// Elle est dessinée au niveau de la page (portail) pour n'être rognée par aucun bloc, reste entière dans l'écran, et se ferme toute
// seule après `durationMs`, en touchant ailleurs, avec Échap, en faisant défiler la page ou en tournant l'écran.
// Pour la rouvrir (et repartir de zéro côté minuteur) : la redessiner avec une autre `key`.
// ============================================================
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { COLORS } from "../constants.js";

const BUBBLE_W = 230;
const SCREEN_MARGIN = 12;
const GAP = 12;
const ARROW = 12;

export function HintBubble({ anchorRef, onClose, durationMs = 4500, children }) {
  const [place, setPlace] = useState(null);
  const bubbleRef = useRef(null);
  // onClose est relu à chaque rendu sans relancer le minuteur (la page se redessine souvent).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const width = typeof document === "undefined" ? BUBBLE_W : Math.min(BUBBLE_W, document.documentElement.clientWidth - 90);

  // Où poser la bulle (à gauche du bouton, centrée sur lui, entière dans l'écran) et où mettre la pointe, avant qu'elle ne soit visible.
  useLayoutEffect(() => {
    if (!anchorRef.current || !bubbleRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const height = bubbleRef.current.offsetHeight;
    const centre = a.top + a.height / 2;
    const top = Math.max(SCREEN_MARGIN, Math.min(centre - height / 2, vh - height - SCREEN_MARGIN));
    setPlace({
      left: Math.max(SCREEN_MARGIN, a.left - GAP - width),
      top,
      arrow: Math.max(14, Math.min(height - 14 - ARROW, centre - top - ARROW / 2)),
    });
  }, [anchorRef, width]);

  useEffect(() => {
    const close = () => closeRef.current && closeRef.current();
    const timer = setTimeout(close, durationMs);
    const onPointerDown = (e) => {
      if (anchorRef.current?.contains(e.target) || bubbleRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [anchorRef, durationMs]);

  return createPortal(
    <div
      ref={bubbleRef}
      data-hint-bubble="1"
      role="status"
      style={{
        position: "fixed",
        left: `${place ? place.left : 0}px`,
        top: `${place ? place.top : 0}px`,
        width: `${width}px`,
        boxSizing: "border-box",
        zIndex: 60,
        visibility: place ? "visible" : "hidden",
        background: COLORS.surface,
        border: `2px solid ${COLORS.amber}`,
        borderRadius: "12px",
        padding: "10px 12px",
        fontSize: "12px",
        lineHeight: 1.4,
        color: COLORS.ink,
        boxShadow: "0 10px 24px rgba(0,0,0,.55)",
      }}
    >
      {place && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: `${place.arrow}px`,
            right: `${-ARROW / 2 - 2}px`,
            width: `${ARROW}px`,
            height: `${ARROW}px`,
            background: COLORS.surface,
            borderTop: `2px solid ${COLORS.amber}`,
            borderRight: `2px solid ${COLORS.amber}`,
            transform: "rotate(45deg)",
          }}
        />
      )}
      <span style={{ display: "block", position: "relative" }}>{children}</span>
    </div>,
    document.body
  );
}
