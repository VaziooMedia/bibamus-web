// ============================================================
// Avertissement d'âge légal en voyage — distinct du pays de
// résidence déclaré au profil. Détecte le pays où se trouve
// physiquement l'appareil (nécessite le réglage "Localisation"
// activé dans Permissions & consentements) et compare l'âge de
// l'utilisateur au seuil légal de CE pays précis. Simple
// avertissement, ne bloque rien — vérifié une fois par session.
// ============================================================
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { detectCurrentCountryCode, getMinimumAge } from "../data/sharedDirectories.js";
import { computeAgeFromBirthDate } from "../utils.js";

export function TravelAgeWarning({ profile }) {
  const [warning, setWarning] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!profile?.consentLocation || !profile?.birthDate) return;
    (async () => {
      const countryCode = await detectCurrentCountryCode();
      if (!countryCode) return;
      const minimumAge = await getMinimumAge(countryCode);
      const age = computeAgeFromBirthDate(profile.birthDate);
      if (age !== null && age < minimumAge) {
        setWarning({ minimumAge });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!warning || dismissed) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        background: "#3D1F1F",
        border: "2px dashed #FF3B3B",
        borderRadius: "12px",
        padding: "12px 14px",
        marginBottom: "14px",
      }}
    >
      <NavIcon name="no-entry" size={18} color="#FF3B3B" />
      <p style={{ flex: 1, fontSize: "12.5px", color: COLORS.ink, margin: 0, lineHeight: 1.4 }}>
        L'âge légal pour la consommation d'alcool est de {warning.minimumAge} ans dans le pays où vous vous trouvez actuellement.
      </p>
      <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
        <NavIcon name="x" size={16} color={COLORS.inkSoft} />
      </button>
    </div>
  );
}
