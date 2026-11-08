import React from "react";
import { GuidedTour, shouldShowTour, twoTone } from "./GuidedTour.jsx";

// Visite de BibaGo : explique BibaRoom (la carte, puis « Créer » et « Rejoindre »). Elle se lance toute seule à la première ouverture de BibaGo d'un compte récent,
// et se rejoue à tout moment avec le bouton « ? » à côté du titre de BibaGo. Les boutons visés portent un attribut `data-tour` (SessionHubScreen dans HubScreens.jsx).
// « Vue » est retenue en base (colonne `profiles.bibago_tour_seen_at`, écrite par markBibaGoTourSeen dans sharedDirectories.js) ; seule la première fois est enregistrée, pas les rejeux.
// Le moteur (bulles, mise en lumière) et la règle « compte récent, pas déjà vue » sont dans GuidedTour.jsx.

export const shouldShowBibaGoTour = shouldShowTour;

const STEPS = [
  { id: "room", target: "room", title: twoTone("Biba", "Room"), text: "Un salon partagé pour une sortie ou une soirée : chacun y note ses tournées, et le salon fait les comptes." },
  { id: "create", target: "room-create", title: "Créer", text: "Tu organises la sortie ? Lance le salon, puis invite tes amis avec son code ou son QR code." },
  { id: "join", target: "room-join", title: "Rejoindre", text: "Un ami a déjà lancé le salon ? Entre son code à 6 caractères ou scanne son QR code." },
];

export function BibaGoTour({ onDone }) {
  return <GuidedTour steps={STEPS} label="Visite de BibaGo" onDone={onDone} />;
}
