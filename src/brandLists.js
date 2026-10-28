// ============================================================
// Listes d'une marque modifiables depuis la plateforme de gestion : classification et type de marque.
//
// Même principe que les listes d'un lieu et d'un producteur (voir venueLists.js, qui porte la logique commune : nettoyage
// des lignes reçues, fusion avec la liste de départ, ordre d'affichage, noms enregistrés). La liste de départ est dans le
// code (constants.js : BRAND_CLASSIFICATIONS, BRAND_TYPES). La plateforme de gestion la complète dans la base :
//   - table custom_list_items (list_key « brand_type » ou « brand_classification ») : un élément ajouté à la main (code
//     « perso_… »), un élément de départ renommé (même code, nouveau nom) ou supprimé (même code, hidden vrai) ;
//   - table custom_list_order : l'ordre d'affichage de la liste.
// Ce fichier ne contient que les deux clés (aucun accès réseau), pour que l'app, l'assistant « Ajouter une marque » et la
// fonction qui prépare les aperçus de partage (api/at.js) parlent des mêmes listes.
// ============================================================
export const BRAND_TYPE_LIST_KEY = "brand_type";
export const BRAND_CLASSIFICATION_LIST_KEY = "brand_classification";
