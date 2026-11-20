// ============================================================
// « Ajouter un produit » par-dessus l'écran en cours — le même assistant que sur BibAtlas (SubmitDrinkWizardScreen), mais ouvert en surcouche
// plein écran au lieu de changer d'écran, comme AddVenueOverlay pour les lieux. Utilisé par la recherche générale de BibAtlas (onglet Produits)
// quand le produit cherché n'existe pas (voir AddAfterSearch). Les listes de Produits de BibAtlas, elles, passent par la route « submitDrink » d'App.
//
// `onChosen(drinkId)` : l'identifiant du produit à ouvrir, appelé une fois la surcouche fermée :
//   - quand le produit vient d'être créé ;
//   - quand on touche un produit « similaire déjà existant » de l'assistant (rien n'est créé : on ouvre sa fiche).
// `onClose()` : fermer sans rien choisir (flèche retour de l'assistant). Un brouillon déjà créé en base est alors supprimé par l'assistant lui-même.
// ============================================================
import React, { useContext } from "react";
import { createPortal } from "react-dom";
import { COLORS } from "../constants.js";
import { ProfileNavContext } from "../contexts.js";
import { EVENT_TYPES } from "../events.js";
import { emitEvent, trackEvent } from "../data/sharedDirectories.js";
import { SubmitDrinkWizardScreen } from "./SubmitDrinkWizardScreen.jsx";

export function AddDrinkOverlay({ initialName = "", breweriesDirectory, brandsDirectory, onChosen, onClose }) {
  const { myBibroCode } = useContext(ProfileNavContext);

  const finish = (drinkId) => {
    onClose();
    if (drinkId) onChosen?.(drinkId);
  };

  return createPortal(
    <div
      role="dialog"
      aria-label="Ajouter un produit"
      data-add-drink-overlay="1"
      onClick={(e) => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: COLORS.paper, color: COLORS.ink, overflowY: "auto", overscrollBehavior: "contain", display: "flex", justifyContent: "center", fontFamily: "'Work Sans', sans-serif" }}
    >
      <div style={{ width: "100%", maxWidth: "480px", minHeight: "100%", display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <SubmitDrinkWizardScreen
          initialName={initialName}
          breweriesDirectory={breweriesDirectory}
          brandsDirectory={brandsDirectory}
          onCancel={onClose}
          onOpenExisting={finish}
          onDone={(createdId) => {
            emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: myBibroCode, entityType: "drink", entityId: createdId });
            trackEvent("drink_added", "drink", myBibroCode);
            finish(createdId);
          }}
        />
      </div>
    </div>,
    document.body
  );
}
