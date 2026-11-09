import React, { useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";

// Visionneuse de photo (carrée ou ronde) : la photo s'agrandit au centre de l'écran, sur un fond sombre. Elle se ferme en touchant
// n'importe où (photo comprise), avec la croix en haut à droite, ou avec la touche Échap. Surcouche plein écran
// comme les autres modales de l'app (`position: fixed; inset: 0`, z-index 1000).
export function PhotoLightbox({ url, alt = "", onClose, round = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Photo"}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px", boxSizing: "border-box" }}
    >
      {/* Les photos de rond-profil sont toutes carrées (400 x 400 px) : le carré est affiché tel quel, ou en rond (round) comme dans le petit rond. Jamais plus grand que 400 px (la photo n'est pas étirée). */}
      <img src={url} alt={alt} style={{ width: "min(100%, 400px, calc(100vh - 48px))", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: round ? "50%" : "12px", display: "block" }} />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Fermer"
        style={{ position: "absolute", top: "16px", right: "16px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.14)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
      >
        <NavIcon name="x" size={20} color={COLORS.ink} />
      </button>
    </div>
  );
}
