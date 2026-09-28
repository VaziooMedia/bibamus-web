// ============================================================
// Parcours « Check depuis l'accueil » — les boutons DrinkCheck et PlaceCheck de l'accueil ouvrent la
// recherche d'un produit ou d'un lieu ; choisir un résultat ouvre sa fiche avec la fenêtre de check
// déjà ouverte, et la confirmation ramène sur le Pulse (ou l'accueil) — voir App.jsx.
//
// Ce parcours n'a de sens que tant qu'on reste dans la recherche ou sur la fiche choisie : dès qu'on
// part ailleurs, il s'arrête, pour qu'une fiche ouverte plus tard ne déclenche pas un check par surprise.
// ============================================================
const FLOW_SCREENS = {
  drink: ["drinksDirectory", "drinkDetail"],
  venue: ["venueDirectory", "venueMap", "venueDetail"],
};

// hasOwnProperty : un nom de parcours comme "toString" ne doit jamais retrouver une méthode héritée des objets.
export const isHomeCheckScreen = (flow, screen) => Object.prototype.hasOwnProperty.call(FLOW_SCREENS, flow) && FLOW_SCREENS[flow].includes(screen);
