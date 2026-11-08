import React, { useMemo } from "react";
import { GuidedTour, shouldShowTour, twoTone } from "./GuidedTour.jsx";

// Visite de l'accueil : montrée une seule fois, à la première connexion d'un nouveau compte. L'écran s'assombrit, chaque bouton important est mis en lumière à tour de rôle
// (cadre arrondi en rose fluo, le reste de la visite en vert fluo) et une bulle l'explique (BibAtlas, BibaSolo, DrinkCheck, PlaceCheck, BibaPulse, BibaGo). Les boutons visés sont repérés par un attribut `data-tour` (HomeScreen.jsx et la
// barre du bas dans ui.jsx) : une étape dont le bouton n'est pas à l'écran est sautée. Le moteur (bulles, mise en lumière) est dans GuidedTour.jsx.
// « Vu » est retenu en base (colonne `profiles.home_tour_seen_at`, écrite par markHomeTourSeen dans sharedDirectories.js) : la visite ne revient pas sur un autre appareil.
// On ne la montre qu'aux comptes récents (les anciens comptes ne la voient jamais).

// Faut-il montrer la visite ? Oui pour un compte de moins de 7 jours qui ne l'a pas déjà vue (ou passée) : règle commune à toutes les visites (GuidedTour.jsx).
export const shouldShowHomeTour = shouldShowTour;

// L'ordre de la visite (après l'étape d'introduction, au centre de l'écran, construite avec le prénom).
const STEPS = [
  { id: "atlas", target: "atlas", title: twoTone("Bib", "Atlas"), text: "Le répertoire des lieux, boissons et marques : cherche, découvre, scanne une étiquette." },
  { id: "solo", target: "solo", title: twoTone("Biba", "Solo"), text: "Ton journal perso : note ce que tu bois, sans salon." },
  { id: "drinkcheck", target: "drinkcheck", title: twoTone("Drink", "Check"), text: "Partage la boisson que tu bois en ce moment." },
  { id: "placecheck", target: "placecheck", title: twoTone("Place", "Check"), text: "Partage le lieu où tu es en ce moment." },
  { id: "pulse", target: "pulse", title: twoTone("Biba", "Pulse"), text: "Le fil d'activité de tes Bibax." },
  { id: "go", target: "go", title: twoTone("Biba", "Go"), text: "Crée ou rejoins un salon pour boire à plusieurs." },
];

export function HomeTour({ firstName, onDone }) {
  const steps = useMemo(
    () => [{ id: "intro", title: `Bienvenue${firstName ? ` ${firstName}` : ""} !`, text: "Petit tour de l'accueil.", cta: "C'est parti !" }, ...STEPS],
    [firstName]
  );
  return <GuidedTour steps={steps} label="Visite de l'accueil" onDone={onDone} />;
}
