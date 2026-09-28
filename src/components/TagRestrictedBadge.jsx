// ============================================================
// Repère « Tags x » en rose fluo — indique qu'un Bibax a restreint ses tags. Partagé par les deux
// sélecteurs de tag (PulseContentForm pour BibaPulse, StoryCreateScreen pour les Stories) pour un
// aspect identique aux deux endroits.
// ============================================================
import React from "react";
import { COLORS } from "../constants.js";

export function TagRestrictedBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", flexShrink: 0, fontSize: "12px", fontWeight: 700, color: COLORS.pinkFluo }}>
      Tags
      {/* Rond et croix sont dessinés ENSEMBLE, dans le même repère (centre exact : 8,8). Un rond en CSS avec une
          icône posée dedans laissait la croix décalée d'un demi-pixel : deux mesures qui s'arrondissent chacune à leur façon. */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7.25" stroke={COLORS.pinkFluo} strokeWidth="1.5" />
        <path d="M5.375 5.375 10.625 10.625M10.625 5.375 5.375 10.625" stroke={COLORS.pinkFluo} strokeWidth="0.75" strokeLinecap="round" />
      </svg>
    </span>
  );
}
