// ============================================================
// Icône « info » d'une ligne produit de la Carte boissons, et sa bulle : elle explique de bien vérifier les trois données par défaut du produit
// (prix, volume, type de service) et de cocher le rond « Données par défaut vérifiées » une fois qu'elles sont justes.
// Même présentation que les autres icônes « info » de l'app (BibaSolo) : icône verte fluo, bulle à bord vert fluo qui s'ouvre au toucher.
// La bulle est dessinée à part, au niveau de la page (portail) : les blocs de la carte sont rognés à leurs bords arrondis et la couperaient.
// Elle reste entière dans l'écran, se pose sous l'icône (au-dessus s'il n'y a pas la place) et se ferme en touchant ailleurs, avec Échap,
// en faisant défiler la page, ou en touchant l'icône d'un autre produit.
// ============================================================
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

const BUBBLE_W = 250;
const SCREEN_MARGIN = 12;
const GAP = 10;
const ARROW = 12;

export function DefaultDataInfo() {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const buttonRef = useRef(null);
  const bubbleRef = useRef(null);
  const width = typeof document === "undefined" ? BUBBLE_W : Math.min(BUBBLE_W, document.documentElement.clientWidth - 2 * SCREEN_MARGIN);

  // Calcule où poser la bulle (largeur, décalage, dessous ou dessus de l'icône, position de la pointe) avant qu'elle ne soit visible.
  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      return;
    }
    const icon = buttonRef.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const height = bubbleRef.current.offsetHeight;
    const centre = icon.left + icon.width / 2;
    const left = Math.max(SCREEN_MARGIN, Math.min(centre - width / 2, vw - width - SCREEN_MARGIN));
    const below = icon.bottom + GAP + height <= vh - SCREEN_MARGIN || icon.top - GAP - height < SCREEN_MARGIN;
    setPlace({
      left,
      top: below ? icon.bottom + GAP : icon.top - GAP - height,
      below,
      arrow: Math.max(14, Math.min(width - 14 - ARROW, centre - left - ARROW / 2)),
    });
  }, [open, width]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onPointerDown = (e) => {
      if (buttonRef.current?.contains(e.target) || bubbleRef.current?.contains(e.target)) return;
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
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-default-data-info="1"
        onClick={() => setOpen((o) => !o)}
        aria-label="À propos des données par défaut"
        aria-expanded={open}
        style={{ background: "none", border: "none", padding: "8px", margin: 0, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, opacity: open ? 1 : 0.6 }}
      >
        <NavIcon name="info" size={14} color={COLORS.amber} />
      </button>
      {open &&
        createPortal(
          <div
            ref={bubbleRef}
            data-default-data-bubble="1"
            role="note"
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
                  left: `${place.arrow}px`,
                  [place.below ? "top" : "bottom"]: `${-ARROW / 2 - 2}px`,
                  width: `${ARROW}px`,
                  height: `${ARROW}px`,
                  background: COLORS.surface,
                  ...(place.below
                    ? { borderTop: `2px solid ${COLORS.amber}`, borderLeft: `2px solid ${COLORS.amber}` }
                    : { borderBottom: `2px solid ${COLORS.amber}`, borderRight: `2px solid ${COLORS.amber}` }),
                  transform: "rotate(45deg)",
                }}
              />
            )}
            <span style={{ display: "block", position: "relative", fontSize: "13px", fontWeight: 700 }}>Données par défaut</span>
            <span style={{ display: "block", position: "relative", marginTop: "3px", color: COLORS.inkSoft }}>
              Vérifie bien le prix, le volume et le type de service : ce sont des données par défaut, peut-être pas exactes. Coche le rond une fois les trois vérifiés.
            </span>
          </div>,
          document.body
        )}
    </>
  );
}
