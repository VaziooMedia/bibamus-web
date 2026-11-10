// Interactions prédéfinies d'un PlaceCheck : de petites pastilles qu'on choisit dans la fenêtre PlaceCheck, qui apparaissent ensuite sur la
// carte et ouvrent les commentaires pour y répondre. La carte ne garde que le CODE (metadata.interaction) : le texte est reconstruit ici
// (jamais une phrase figée stockée en base, prêt pour une traduction future). Espace insécable avant « ?! » et « ? » (typographie
// française) : le point d'interrogation ne se retrouve jamais seul au début d'une ligne.
export const PLACE_INTERACTIONS = [
  { code: "WHO_WANTS_A_DRINK", label: "Qui est chaud pour un verre\u00A0?!" },
  { code: "BIBAX_AROUND", label: "Des Bibax dans le coin\u00A0?!" },
  { code: "MEET_HERE", label: "On se retrouve ici\u00A0?!" },
  { code: "DRINK_RECOMMENDATION", label: "Une recommandation de boisson\u00A0?" },
];
