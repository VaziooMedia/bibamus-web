// ============================================================
// « Ajouter un shop » par-dessus l'écran en cours — le même assistant que partout ailleurs (SubmitShopWizardScreen), ouvert en surcouche plein écran
// (comme AddVenueOverlay pour les lieux) : la recherche et sa position de défilement restent intactes dessous. Utilisé par l'écran Shops et par l'onglet
// Shops de la recherche BibAtlas quand le shop cherché n'existe pas (voir AddAfterSearch).
//
// `onChosen(shopId, shop)` : le shop à ouvrir, appelé une fois la surcouche fermée (`shop` : la fiche tout juste créée, absent pour un shop déjà existant) :
//   - quand le shop vient d'être créé (on ouvre sa fiche) ;
//   - quand on touche un shop « similaire déjà existant » de l'assistant (on ouvre sa fiche au lieu d'en créer un second).
// `onClose()` : fermer sans rien créer (flèche retour de l'assistant).
// ============================================================
import React, { useContext } from "react";
import { createPortal } from "react-dom";
import { COLORS } from "../constants.js";
import { ProfileNavContext } from "../contexts.js";
import { trackEvent } from "../data/sharedDirectories.js";
import { SubmitShopWizardScreen } from "./SubmitShopWizardScreen.jsx";

export function AddShopOverlay({ initialName = "", onChosen, onClose }) {
  const { myBibroCode } = useContext(ProfileNavContext);

  const finish = (shopId, created) => {
    onClose();
    if (shopId) onChosen?.(shopId, created);
  };

  return createPortal(
    <div
      role="dialog"
      aria-label="Ajouter un shop"
      data-add-shop-overlay="1"
      onClick={(e) => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: COLORS.paper, color: COLORS.ink, overflowY: "auto", overscrollBehavior: "contain", display: "flex", justifyContent: "center", fontFamily: "'Work Sans', sans-serif" }}
    >
      <div style={{ width: "100%", maxWidth: "480px", minHeight: "100%", display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <SubmitShopWizardScreen
          initialName={initialName}
          onCancel={onClose}
          onOpenExisting={(id) => finish(id)}
          onDone={(created) => {
            // Pas de carte BibaPulse « contribution » pour un shop à ce stade (la fonction Edge create-pulse-event ne connaît pas ce type) : seulement la statistique.
            trackEvent("shop_added", "shop", myBibroCode);
            finish(created.id, created);
          }}
        />
      </div>
    </div>,
    document.body
  );
}
