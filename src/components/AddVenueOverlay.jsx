// ============================================================
// « Ajouter un lieu » par-dessus l'écran en cours — le même assistant que sur BibAtlas (SubmitVenueWizardScreen), mais ouvert en surcouche
// plein écran au lieu de changer d'écran : ce qu'on avait déjà saisi dessous (la note et la photo d'un DrinkCheck, le texte d'une publication
// BibaPulse, le titre d'un salon…) reste intact. Utilisé par les sélecteurs de lieu quand la recherche ne trouve pas le bon lieu
// (voir AddAfterSearch).
//
// `onChosen(lieu)` : le lieu à prendre comme choix, relu en base comme un résultat de recherche. Appelé une fois la surcouche fermée :
//   - quand le lieu vient d'être créé ;
//   - quand on touche un lieu « similaire déjà existant » de l'assistant (on ne rouvre pas sa fiche : on le choisit).
// `onClose()` : fermer sans rien choisir (flèche retour de l'assistant).
// ============================================================
import React, { useContext } from "react";
import { createPortal } from "react-dom";
import { COLORS } from "../constants.js";
import { ProfileNavContext } from "../contexts.js";
import { EVENT_TYPES } from "../events.js";
import { emitEvent, trackEvent, loadVenuesByIds } from "../data/sharedDirectories.js";
import { SubmitVenueWizardScreen } from "./SubmitVenueWizardScreen.jsx";

export function AddVenueOverlay({ initialName = "", onChosen, onClose }) {
  const { myBibroCode } = useContext(ProfileNavContext);

  const finish = async (venueId) => {
    const [venue] = await loadVenuesByIds([venueId]);
    onClose();
    if (venue) onChosen?.(venue);
  };

  return createPortal(
    <div
      role="dialog"
      aria-label="Ajouter un lieu"
      data-add-venue-overlay="1"
      onClick={(e) => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: COLORS.paper, color: COLORS.ink, overflowY: "auto", overscrollBehavior: "contain", display: "flex", justifyContent: "center", fontFamily: "'Work Sans', sans-serif" }}
    >
      <div style={{ width: "100%", maxWidth: "480px", minHeight: "100%", display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <SubmitVenueWizardScreen
          initialName={initialName}
          onCancel={onClose}
          onOpenExisting={finish}
          onDone={(createdId) => {
            emitEvent(EVENT_TYPES.PRODUCT_ADDED, { actorBibroCode: myBibroCode, entityType: "venue", entityId: createdId });
            trackEvent("venue_added", "venue", myBibroCode);
            finish(createdId);
          }}
        />
      </div>
    </div>,
    document.body
  );
}
