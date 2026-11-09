import React, { useEffect, useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";

// Visionneuse de photo (ronde, choix de Mehdi du 2026-11-09) : la photo s'agrandit au centre de l'écran, sur un fond sombre. Elle se ferme en touchant
// n'importe où (photo comprise), avec la croix en haut à droite, ou avec la touche Échap. Surcouche plein écran
// comme les autres modales de l'app (`position: fixed; inset: 0`, z-index 1000).
export function PhotoLightbox({ url, alt = "", onClose }) {
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
      {/* Les photos de rond-profil sont toutes carrées (400 x 400 px) : elles s'affichent dans un grand rond, comme dans le petit rond (les coins sont coupés). Jamais plus grand que 400 px (la photo n'est pas étirée). Rebord vert fluo de 3 px (compris dans les 400 px). */}
      <img src={url} alt={alt} style={{ width: "min(100%, 400px, calc(100vh - 48px))", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "50%", border: `3px solid ${COLORS.amber}`, boxSizing: "border-box", display: "block" }} />
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

// Rond-profil qui agrandit sa photo quand on le touche (visionneuse ci-dessus). Sans photo (monogramme, emoji ou icône de repli), le rond n'est pas cliquable.
// Même propriétés qu'EntityAvatar, plus `alt` (nom lu pour la visionneuse). L'état d'ouverture est porté ici : aucun écran n'a rien d'autre à gérer.
export function ZoomableAvatar({ photoUrl, alt = "", ...avatarProps }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EntityAvatar photoUrl={photoUrl} {...avatarProps} onClick={photoUrl ? () => setOpen(true) : undefined} />
      {open && photoUrl && <PhotoLightbox url={photoUrl} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
