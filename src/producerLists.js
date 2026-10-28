// ============================================================
// Listes d'un producteur modifiables depuis la plateforme de gestion : type de producteur et profil du producteur.
//
// Même principe que les listes d'un lieu (voir venueLists.js, qui porte la logique commune : nettoyage des lignes reçues,
// fusion avec la liste de départ, ordre d'affichage, noms enregistrés). La liste de départ est dans le code
// (constants.js : PRODUCER_TYPES, PRODUCER_PROFILES). La plateforme de gestion la complète dans la base :
//   - table custom_list_items (list_key « producer_type » ou « producer_profile ») : un élément ajouté à la main (code
//     « perso_… »), un élément de départ renommé (même code, nouveau nom) ou supprimé (même code, hidden vrai) ;
//   - table custom_list_order : l'ordre d'affichage de la liste.
// Ce fichier ne contient que les deux clés (aucun accès réseau), pour que l'app, l'assistant « Ajouter un producteur » et
// la fonction qui prépare les aperçus de partage (api/at.js) parlent des mêmes listes.
// ============================================================
export const PRODUCER_TYPE_LIST_KEY = "producer_type";
export const PRODUCER_PROFILE_LIST_KEY = "producer_profile";
