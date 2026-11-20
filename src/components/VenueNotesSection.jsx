// ============================================================
// Carte « Notes » de l'onglet Biba360 d'une fiche Lieu (Mehdi, 2026-11-21) : trois lignes, You (mon appréciation), Bibax (celle de mes Bibax),
// Bibamus (celle de tous, exactement le mot de la bannière de la fiche). L'appréciation d'un lieu est un palier (RATING_LABELS), pas une note étoilée :
// voir VenueNotesCard.
//   - You : mon palier (`get_my_venue_rating`), ou un tiret si je n'ai pas apprécié ce lieu.
//   - Bibamus : le mot de la bannière (`get_venue_rating_summary` : « Excellent », ou « Premières appréciations » tant que les avis sont peu nombreux) et le nombre d'avis ; un tiret sans avis.
//   - Bibax : la moyenne des appréciations de mes Bibax (`get_my_bibax_venue_rating`), arrondie au palier le plus proche, et leur nombre ; un tiret sans avis ou si la lecture échoue.
// ============================================================
import React, { useState, useEffect } from "react";
import { RATING_LABELS } from "../constants.js";
import { VenueNotesCard } from "./NotesCard.jsx";
import { venueRatingText } from "./VenueRatingDisplay.jsx";
import { loadMyVenueRating, loadVenueRatingSummary, loadMyBibaxVenueRating } from "../data/sharedDirectories.js";

const labelOfValue = (value) => RATING_LABELS.find((l) => l.value === value)?.fr || null;

// Palier le plus proche d'une moyenne (3,4 → 3 « Excellent » ; 3,5 → 4 « Exceptionnel »), toujours entre 1 et 5.
export const nearestRatingLabel = (average) => labelOfValue(Math.min(5, Math.max(1, Math.round(average))));

export function VenueNotesSection({ venueId }) {
  const [mine, setMine] = useState(null);
  const [summary, setSummary] = useState(null);
  const [bibax, setBibax] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setMine(null);
    setSummary(null);
    setBibax(null);
    loadMyVenueRating(venueId).then((v) => !cancelled && setMine(v));
    loadVenueRatingSummary(venueId).then((v) => !cancelled && setSummary(v));
    loadMyBibaxVenueRating(venueId).then((v) => !cancelled && setBibax(v));
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  const mineText = typeof mine === "number" ? labelOfValue(mine) : null;
  const everyoneText = summary ? venueRatingText(summary) : null;
  const bibaxText = bibax && bibax.count > 0 && typeof bibax.average === "number" ? nearestRatingLabel(bibax.average) : null;

  return (
    <VenueNotesCard
      mine={mineText ? { text: mineText } : null}
      bibax={bibaxText ? { text: bibaxText, count: bibax.count } : null}
      everyone={everyoneText ? { text: everyoneText, count: summary.rating_count } : null}
    />
  );
}
