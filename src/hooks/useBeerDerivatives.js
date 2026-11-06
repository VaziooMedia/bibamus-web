import { useCallback, useEffect, useMemo, useState } from "react";
import { getBeerDerivativeListCached, loadBeerDerivativeListOnce, loadDrinkDerivatives } from "../data/sharedDirectories.js";
import { derivativesForProduct } from "../beerDerivatives.js";

// La liste commune des dérivés (bières et spiritueux réunis), lue une fois par session. Pour les écrans qui n'affichent que le nom ou l'énergie d'un verre déjà commandé
// (ticket, historique) : l'écran se redessine dès que la liste est là. null tant qu'elle n'est pas lue (ou si la lecture échoue).
export function useBeerDerivativeList() {
  const [list, setList] = useState(() => getBeerDerivativeListCached());
  useEffect(() => {
    let off = false;
    loadBeerDerivativeListOnce().then((l) => {
      if (!off && l) setList(l);
    });
    return () => {
      off = true;
    };
  }, []);
  return list;
}

// Les dérivés (bières : Mazout, Tango… ; spiritueux : Coca, Tonic…) d'une carte de commande : la liste commune (une lecture par session) et, tant que
// cette liste n'est pas vide, les dérivés activés pour les produits demandés. `forProduct(identifiantDuProduit)` rend les
// dérivés que ce produit peut devenir, dans l'ordre de la gestion ([] sans dérivé, ou tant que la lecture n'est pas finie :
// la carte s'affiche alors comme avant). Un échec de lecture ne change rien non plus. Chaque dérivé rendu porte `volumeCl` : le volume du verre
// saisi dans la gestion pour ce produit et ce dérivé (spiritueux : Vodka + Red Bull = 20 cl), ou null (le verre garde le volume du produit).
export function useBeerDerivatives(sourceDrinkIds) {
  const list = useBeerDerivativeList();
  const [infoById, setInfoById] = useState({}); // { id: { codes, volumes } }
  const key = useMemo(() => [...new Set((sourceDrinkIds || []).filter((id) => typeof id === "string" && id !== ""))].sort().join("|"), [sourceDrinkIds]);

  const hasDerivatives = !!list && list.items.length > 0;
  useEffect(() => {
    if (!hasDerivatives || !key) return undefined;
    let off = false;
    loadDrinkDerivatives(key.split("|")).then((byId) => {
      if (!off) setInfoById((prev) => ({ ...prev, ...byId }));
    });
    return () => {
      off = true;
    };
  }, [hasDerivatives, key]);

  const forProduct = useCallback((id) => (id ? derivativesForProduct(list, infoById[id]?.codes, infoById[id]?.volumes) : []), [list, infoById]);
  return { list, forProduct };
}
