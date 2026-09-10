// ============================================================
// Charge uniquement les produits réellement référencés dans un
// menu donné (carte d'un lieu, menu d'un événement...), plutôt
// que le répertoire produits complet — le menu d'un lieu reste
// borné (quelques dizaines à quelques centaines d'entrées) même
// quand le répertoire global grandit à plusieurs milliers de
// produits. resolveMenuItem()/computeMissingVenueItems() n'ont
// pas besoin de changer : ce hook leur fournit juste une liste
// plus petite, ciblée sur ce qu'il faut vraiment résoudre ici.
// ============================================================
import { useState, useEffect } from "react";
import { loadDrinksByIds } from "../data/sharedDirectories.js";

export function useTargetedDrinks(menu) {
  const [drinks, setDrinks] = useState([]);

  // Clé stable dérivée des identifiants référencés — évite de relancer un chargement à chaque
  // rendu simplement parce que le tableau menu a une nouvelle référence mais le même contenu.
  const ids = (menu || []).filter((item) => item.fromDirectory && item.sourceDrinkId).map((item) => item.sourceDrinkId);
  const idsKey = [...new Set(ids)].sort().join(",");

  useEffect(() => {
    if (!idsKey) {
      setDrinks([]);
      return;
    }
    let cancelled = false;
    loadDrinksByIds(idsKey.split(",")).then((results) => {
      if (!cancelled) setDrinks(results);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return drinks;
}
