// ============================================================
// Fenêtre « Noter cette marque » — étoiles sur 5, réglables au quart d'étoile (0,25 à 5), comme la note d'un produit (même
// curseur, RatingSlider). Ouverte depuis le bouton étoile de la couverture de la fiche Marque, seulement pour une personne qui a
// le droit de noter (qui a checké un produit de la marque).
//
// Rien ne s'enregistre en déplaçant le curseur : c'est « Valider » qui enregistre. « Retirer ma note » n'apparaît que si une note
// existe déjà. onSave(valeur) et onRemove() rendent true (réussi) ou false (échec) : la fenêtre se ferme seulement après un succès,
// sinon elle reste ouverte avec un message d'erreur.
// ============================================================
import React, { useState } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { PrimaryButton } from "./ui.jsx";
import { RatingSlider } from "./RatingSlider.jsx";

export function BrandRatingModal({ brandName, myRating, onSave, onRemove, onClose }) {
  const initialValue = myRating != null ? myRating : 0.25;
  const [pendingValue, setPendingValue] = useState(initialValue);
  // Pas encore de note : « Valider » reste grisé tant que le curseur n'a pas bougé, pour qu'un simple appui ne laisse pas
  // une note de 0,25 par erreur (le curseur démarre à 0,25). Une note existante peut toujours être revalidée.
  const [touched, setTouched] = useState(myRating != null);
  const [busy, setBusy] = useState(null); // null | "save" | "remove"
  const [error, setError] = useState(false);

  const run = async (kind, action) => {
    if (busy) return;
    setError(false);
    setBusy(kind);
    const ok = await action();
    setBusy(null);
    if (ok) onClose();
    else setError(true);
  };

  return (
    <div
      onClick={() => {
        if (!busy) onClose();
      }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 110 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.surface,
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px calc(32px + env(safe-area-inset-bottom, 0px)) 20px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <button
          onClick={() => {
            if (!busy) onClose();
          }}
          disabled={!!busy}
          aria-label="Fermer"
          style={{ position: "absolute", top: "12px", right: "12px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", padding: 0, cursor: busy ? "default" : "pointer", opacity: busy ? 0.4 : 1 }}
        >
          <NavIcon name="x" size={16} color={COLORS.inkSoft} />
        </button>
        <h2 style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "20px", color: COLORS.ink, margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "4px", height: "20px", background: COLORS.amber, borderRadius: "2px", display: "inline-block" }} />
          Note cette marque
        </h2>
        {brandName && <p style={{ fontSize: "14px", fontWeight: 700, color: COLORS.amber, margin: "0 0 18px 14px", overflowWrap: "anywhere" }}>{brandName}</p>}

        <label style={{ fontSize: "12.5px", fontWeight: 600, color: COLORS.inkSoft, marginBottom: "10px", display: "block" }}>Ta note</label>
        <RatingSlider
          value={myRating != null ? myRating : 0}
          onLocalChange={(v) => {
            setPendingValue(v);
            if (v !== initialValue) setTouched(true);
          }}
        />

        {error && (
          <p role="alert" style={{ color: COLORS.wine, fontSize: "13px", margin: "14px 0 0 0" }}>
            Une erreur est survenue — merci de réessayer.
          </p>
        )}

        <PrimaryButton onClick={() => run("save", () => onSave(pendingValue))} disabled={!!busy || !touched} withCheck={busy !== "save"} style={{ width: "100%", marginTop: "20px" }}>
          {busy === "save" ? "..." : "Valider"}
        </PrimaryButton>

        {myRating != null && (
          <button
            onClick={() => run("remove", onRemove)}
            disabled={!!busy}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: COLORS.inkSoft, fontWeight: 600, fontSize: "12.5px", cursor: busy ? "default" : "pointer", padding: "16px 0 0 0", textAlign: "left" }}
          >
            <NavIcon name="x" size={13} color={COLORS.wine} />
            {busy === "remove" ? "..." : "Retirer ma note"}
          </button>
        )}
      </div>
    </div>
  );
}
