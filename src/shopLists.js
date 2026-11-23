// ============================================================
// Liste d'un shop modifiable depuis la plateforme de gestion : la catégorie de shop (supermarché, négociant en vin, Drink & Food Shop, cave à bières…).
//
// Même principe que le type d'un producteur (voir producerLists.js) : la liste de départ est dans le code (constants.js : SHOP_CATEGORIES) ; la plateforme
// de gestion la complète dans la base (table custom_list_items, list_key « shop_category » : élément ajouté à la main (code « perso_… »), élément de départ
// renommé ou masqué ; table custom_list_order : l'ordre d'affichage). Ce fichier ne contient que la clé (aucun accès réseau).
// ============================================================
export const SHOP_CATEGORY_LIST_KEY = "shop_category";
