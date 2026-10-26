import { useState, useEffect, useCallback } from "react";

// Mémoire de retour de la fiche produit. Quand on quitte l'onglet Biba360 par un lien (la fiche d'un lieu, le profil d'un
// Bibax), la fiche produit disparaît de l'écran ; sans mémoire, on y revient sur « Infos », tout en haut. Ici on garde
// de quoi revenir sur Biba360, à la hauteur de l'élément cliqué : { drinkId, tab, anchor, offset, scope }.
//
// La mémoire ne vit que tant qu'on reste dans la boucle fiche produit <-> fiche d'un lieu / profil d'un Bibax. Dès qu'on
// va ailleurs (accueil, une autre section…), elle est effacée : rouvrir plus tard ce produit repart d'« Infos ».
const LOOP_SCREENS = ["drinkDetail", "venueDetail", "bibaxProfilePreview"];

export function useDrinkReturnMemo(screen) {
  const [memo, setMemo] = useState(null);

  useEffect(() => {
    if (memo && !LOOP_SCREENS.includes(screen)) setMemo(null);
  }, [screen, memo]);

  // À appeler au clic, avant de changer d'écran. Sans mémoire valable (ouverture depuis l'onglet Infos, par exemple), on
  // efface la précédente : le retour se fait alors sur « Infos », comme avant.
  const remember = useCallback((drinkId, m) => setMemo(m && typeof m.tab === "string" && typeof m.anchor === "string" ? { ...m, drinkId } : null), []);
  // La fiche produit l'a lue : elle la garde pour elle le temps de se repositionner.
  const forget = useCallback(() => setMemo(null), []);
  // Mémoire valable pour ce produit ? (null sinon)
  const memoFor = useCallback((drinkId) => (memo && memo.drinkId === drinkId ? memo : null), [memo]);
  // Au retour sur la fiche produit, on ne remonte pas en haut de page : la fiche se replace elle-même.
  const keepsScroll = useCallback((scr, drinkId) => scr === "drinkDetail" && !!memo && memo.drinkId === drinkId, [memo]);

  return { memo, remember, forget, memoFor, keepsScroll };
}
