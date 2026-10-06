// Interrupteurs de fonctionnalités.
//
// BARCODE_SCAN_ENABLED : lecture des codes-barres dans la caméra de scan.
// EN VEILLE (false) : la base de codes-barres est encore presque vide, car les produits sont encodés à la main, sans
// leur code. Un code scanné serait donc presque toujours refusé. La caméra sert uniquement à lire l'étiquette.
// Tout le code reste en place et testé : passer à true pour réactiver la lecture des codes-barres.
export const BARCODE_SCAN_ENABLED = false;
