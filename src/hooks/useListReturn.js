// ============================================================
// Retour d'une fiche sur une page de liste — LA NORME de l'app (décidée par Mehdi, 2026-11-16) :
// quand on ouvre la fiche d'un produit, d'un lieu, d'une marque, d'un producteur, d'un Bibax ou d'un BibaClub depuis une liste, puis qu'on revient en arrière,
// la liste se remet COMME ON L'AVAIT LAISSÉE — même hauteur de défilement (le bloc cliqué est à nouveau à sa place), même classement, même filtre, même recherche —
// et ne remonte jamais tout en haut. Toute nouvelle liste qui ouvre une fiche suit cette règle (voir docs/BIBAMUS_CONTEXT.md, « Normes de l'app »).
//
// Mode d'emploi pour une page de liste (une sous-liste ouverte depuis une fiche — Bibax en commun, checks d'un produit… — est déclarée dans FICHE_SCREENS et enveloppe en plus
// ses flèches retour vers la fiche par `leave(onBack)`) :
//   1. `const { restored, save, open } = useListReturn(<identifiant de l'écran>, mainScrollRef, { valid });`  (mainScrollRef : le conteneur qui défile, fourni par App ;
//      `valid(mémoire)` facultatif : rend false quand la mémoire ne correspond plus à ce que la page doit afficher — par exemple un autre filtre venu d'ailleurs —,
//      la page repart alors de zéro)
//   2. L'état de départ vient de `restored` (la mémoire, ou null à la première visite) : liste déjà chargée, classement, filtre, recherche…
//   3. À chaque changement de ce que la page affiche : `save({ ...état })` (dans un useEffect) ; au retour, la page s'affiche aussitôt, puis relit sa liste
//      en silence quand elle le peut et ne la remplace que si elle a changé (si la lecture échoue, on garde ce qu'on avait).
//   4. Chaque ouverture de fiche passe par `open(onOpenXxx)` : elle retient la hauteur de défilement au moment du clic.
//   5. App.jsx : l'identifiant de l'écran est le même que `screen`, et `mainScrollRef` est passé à la page. Rien d'autre : la mémoire d'une liste ne vit que tant que l'on
//      reste dans la boucle « liste <-> fiches » ; dès que l'on va ailleurs (accueil, une page parente, une autre liste…), `pruneListMemories(screen)` l'efface, et la liste
//      repart de zéro à la prochaine entrée. Une nouvelle sorte de fiche qui s'ouvre depuis une liste se déclare dans FICHE_SCREENS.
// La mémoire est gardée dans le module (pas dans le navigateur) : elle ne survit pas à un rechargement de la page.
// ============================================================
import { useState, useLayoutEffect } from "react";

const memories = new Map();

// Les écrans « fiche » : on peut les traverser (une fiche en ouvre une autre) sans perdre la mémoire des listes. Tout autre écran l'efface.
export const FICHE_SCREENS = new Set([
  "venueDetail",
  "drinkDetail",
  "brandDetail",
  "breweryDetail",
  "bibroDetail",
  "bibroHistory",
  "bibroClub",
  "bibaxProfilePreview",
  "clubDetail",
  "drinkBibaxChecks",
  "mutualBibax",
  "venueMenuCategories",
  "venueCategoryDrinks",
  "bibaxPhotos",
  "bibaxAllSuggestions",
]);

export const hasListMemory = (key) => memories.has(key);
// À appeler à chaque changement d'écran : hors d'une fiche et hors de la liste elle-même, les mémoires de liste sont effacées.
export const pruneListMemories = (screen) => {
  if (FICHE_SCREENS.has(screen)) return;
  for (const key of [...memories.keys()]) if (key !== screen) memories.delete(key);
};
const patchListMemory = (key, part) => {
  memories.set(key, { ...(memories.get(key) || {}), ...part });
};

export function useListReturn(key, mainScrollRef, { valid } = {}) {
  const [restored] = useState(() => {
    const memory = memories.get(key) || null;
    if (memory && valid && !valid(memory)) {
      memories.delete(key);
      return null;
    }
    return memory;
  });
  // Retour d'une fiche : on se replace à la hauteur où l'on était (App ne remonte pas en haut dans ce cas). La page peut encore grandir juste après (un bloc d'en-tête
  // qui se recharge, des pages de la liste) : on garde donc la hauteur voulue pendant quelques secondes — et le navigateur ne « rattrape » pas seul la hauteur quand
  // un bloc apparaît au-dessus (overflow-anchor), sinon la liste glisserait de la hauteur de ce bloc. On s'arrête au premier geste de la personne.
  useLayoutEffect(() => {
    const el = mainScrollRef?.current;
    const target = restored ? restored.scrollTop || 0 : 0;
    if (!el || !restored || target === 0) return undefined;
    const previousAnchor = el.style.overflowAnchor;
    el.style.overflowAnchor = "none";
    el.scrollTo(0, target);
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      observer.disconnect();
      clearTimeout(timer);
      el.style.overflowAnchor = previousAnchor;
      ["wheel", "touchstart", "keydown", "mousedown"].forEach((ev) => el.removeEventListener(ev, stop));
    };
    const observer = new ResizeObserver(() => {
      if (Math.abs(el.scrollTop - target) >= 2) el.scrollTo(0, target);
    });
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    observer.observe(el);
    const timer = setTimeout(stop, 2500);
    ["wheel", "touchstart", "keydown", "mousedown"].forEach((ev) => el.addEventListener(ev, stop, { passive: true }));
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    restored,
    save: (part) => patchListMemory(key, part),
    // Sous-liste (ouverte depuis une fiche) : sa flèche retour vers la fiche d'où l'on vient passe par `leave(onBack)`, qui efface sa mémoire —
    // une entrée depuis la fiche repart de zéro, comme pour toute liste.
    leave:
      (backFn) =>
      (...args) => {
        memories.delete(key);
        backFn(...args);
      },
    open:
      (openFn) =>
      (...args) => {
        patchListMemory(key, { scrollTop: mainScrollRef?.current?.scrollTop || 0 });
        openFn(...args);
      },
  };
}
