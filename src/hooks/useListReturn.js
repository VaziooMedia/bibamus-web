// ============================================================
// Retour d'une fiche sur une page de liste — LA NORME de l'app (décidée par Mehdi, 2026-11-16) :
// quand on ouvre la fiche d'un produit, d'un lieu, d'une marque, d'un producteur ou d'un Bibax depuis une liste, puis qu'on revient en arrière,
// la liste se remet COMME ON L'AVAIT LAISSÉE — même hauteur de défilement (le bloc cliqué est à nouveau à sa place), même classement, même filtre —
// et ne remonte jamais tout en haut. Toute nouvelle liste qui ouvre une fiche suit cette règle (voir docs/BIBAMUS_CONTEXT.md, « Normes de l'app »).
//
// Mode d'emploi pour une page de liste :
//   1. `const { restored, save, open } = useListReturn(<identifiant de l'écran>, mainScrollRef);`  (mainScrollRef : le conteneur qui défile, fourni par App)
//   2. L'état de départ vient de `restored` (la mémoire, ou null à la première visite) : liste déjà chargée, classement, filtre…
//   3. À chaque changement de ce que la page affiche : `save({ ...état })` (dans un useEffect) ; au retour, la page s'affiche aussitôt, puis relit sa liste
//      en silence et ne la remplace que si elle a changé (si la lecture échoue, on garde ce qu'on avait).
//   4. Chaque ouverture de fiche passe par `open(onOpenXxx)` : elle retient la hauteur de défilement au moment du clic.
//   5. App.jsx : l'identifiant de l'écran est le même ; l'entrée depuis la page parent passe par `enterList(identifiant)` (elle vide la mémoire : une
//      entrée repart toujours de zéro) et le retour en haut automatique de App est sauté tant que `hasListMemory(identifiant)` est vrai.
// La mémoire est gardée dans le module (pas dans le navigateur) : elle ne survit pas à un rechargement de la page.
// ============================================================
import { useState, useLayoutEffect } from "react";

const memories = new Map();

export const hasListMemory = (key) => memories.has(key);
export const clearListMemory = (key) => {
  memories.delete(key);
};
const patchListMemory = (key, part) => {
  memories.set(key, { ...(memories.get(key) || {}), ...part });
};

export function useListReturn(key, mainScrollRef) {
  const [restored] = useState(() => memories.get(key) || null);
  // Retour d'une fiche : on se replace à la hauteur où l'on était (App ne remonte pas en haut dans ce cas).
  useLayoutEffect(() => {
    if (restored) mainScrollRef?.current?.scrollTo(0, restored.scrollTop || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    restored,
    save: (part) => patchListMemory(key, part),
    open:
      (openFn) =>
      (...args) => {
        patchListMemory(key, { scrollTop: mainScrollRef?.current?.scrollTop || 0 });
        openFn(...args);
      },
  };
}
