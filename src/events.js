// ============================================================
// BIBAMUS — Vocabulaire commun des événements métier
// (Chantier n°9). Toute action métier significative émet l'un
// de ces événements plutôt que d'appeler directement les
// modules qui pourraient s'y intéresser (Stats, Pulse, Badges,
// Notifications — à construire plus tard). Ces modules
// s'abonneront à ces événements le jour où ils existeront, sans
// jamais avoir à modifier le code source de l'action elle-même
// (le Check, l'ajout d'un produit, la création d'un salon...).
//
// Chaque type est versionné (voir emitEvent) — un changement de
// forme du contenu (payload) doit passer par une nouvelle
// version plutôt que de casser silencieusement un futur
// consommateur.
// ============================================================

export const EVENT_TYPES = {
  DRINK_CHECKED: "DRINK_CHECKED",
  VENUE_CHECKED: "VENUE_CHECKED",
  PRODUCT_ADDED: "PRODUCT_ADDED",
  CONTRIBUTION_APPROVED: "CONTRIBUTION_APPROVED",
  BIBAROOM_CREATED: "BIBAROOM_CREATED",
  BIBAROOM_JOINED: "BIBAROOM_JOINED",
  PRODUCT_LIKED: "PRODUCT_LIKED",
};
