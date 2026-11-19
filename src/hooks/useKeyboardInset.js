// ============================================================
// Clavier à l'écran (iOS Safari, Chrome Android récent) : il RECOUVRE le bas de la page — la mise en page ne rétrécit pas, seule la « fenêtre d'affichage
// visuelle » (`window.visualViewport`) rétrécit, et elle se déplace pour montrer le champ touché. Une liste de propositions qui s'ouvre sous un champ de
// recherche reste donc cachée sous le clavier. Ces outils servent à la garder visible (Mehdi, 2026-11-19) :
//
//   visibleArea()                       zone réellement visible, dans le repère de la mise en page : { top, bottom, inset, keyboard }
//   useKeyboardInset()                  hauteur (px) de la partie de la page cachée sous le clavier, 0 s'il n'y a pas de clavier — à poser en
//                                       marge basse d'un écran ou d'une fenêtre pour que tout son contenu puisse défiler au-dessus du clavier
//   useKeyboardSheet()                  pour une fenêtre qui monte du bas (feuille ancrée en bas) : marge basse du fond de la fenêtre (le clavier) et hauteur
//                                       maximale de la feuille, pour qu'elle se pose AU-DESSUS du clavier au lieu de passer dessous
//   revealField(input)                  remonte le champ vers le haut de la zone visible (défilement du conteneur qui défile), pour que sa liste
//                                       de propositions, dessous, tienne au-dessus du clavier
//   useKeyboardFit(input, list, on, key)  fait l'ensemble pour une liste : remonte le champ, puis renvoie la hauteur maximale (px) que la liste peut
//                                       prendre sous le champ (liste qui défile) — ou null sans clavier (la hauteur habituelle de la liste s'applique)
//
// Sans clavier (ordinateur, clavier physique), rien ne change : `keyboard` vaut false, aucune fonction ne bouge quoi que ce soit.
// ============================================================
import { useEffect, useLayoutEffect, useState } from "react";

// En dessous de cette différence de hauteur, ce n'est pas un clavier (barre d'adresse qui se replie…).
const MIN_KEYBOARD = 80;

export function visibleArea() {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  if (!vv) return { top: 0, bottom: typeof window !== "undefined" ? window.innerHeight : 0, inset: 0, keyboard: false };
  const keyboard = window.innerHeight - vv.height >= MIN_KEYBOARD;
  return {
    top: vv.offsetTop,
    bottom: vv.offsetTop + vv.height,
    inset: keyboard ? Math.max(0, Math.round(window.innerHeight - vv.offsetTop - vv.height)) : 0,
    keyboard,
  };
}

export function useKeyboardInset() {
  const [inset, setInset] = useState(() => visibleArea().inset);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => setInset(visibleArea().inset);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

export function useKeyboardSheet() {
  const inset = useKeyboardInset();
  if (!inset) return { overlayPaddingBottom: 0, sheetMaxHeight: "92vh" };
  const area = visibleArea();
  return { overlayPaddingBottom: inset, sheetMaxHeight: `min(92vh, ${Math.max(200, Math.round(area.bottom - area.top - 8))}px)` };
}

function scrollParentOf(el) {
  for (let e = el && el.parentElement; e; e = e.parentElement) {
    const o = getComputedStyle(e).overflowY;
    if ((o === "auto" || o === "scroll") && e.scrollHeight > e.clientHeight) return e;
  }
  return null;
}

// Marge au-dessus du champ remonté : assez pour garder son sous-titre (« Lieu », « Tags »…) en vue.
const TOP_MARGIN = 40;

export function revealField(input) {
  const area = visibleArea();
  if (!input || !area.keyboard) return;
  const scroller = scrollParentOf(input);
  if (!scroller) return;
  const top = Math.max(area.top, scroller.getBoundingClientRect().top) + TOP_MARGIN;
  const delta = input.getBoundingClientRect().top - top;
  // Le champ trop bas (ou caché sous le haut de l'écran) est remonté ; un champ déjà dans la partie haute de la zone visible reste où il est.
  if (delta > 0 || input.getBoundingClientRect().top < area.top) scroller.scrollTop += delta;
}

export function useKeyboardFit(inputRef, listRef, on, key) {
  const [maxHeight, setMaxHeight] = useState(null);
  useLayoutEffect(() => {
    if (!on) {
      setMaxHeight(null);
      return undefined;
    }
    const fit = () => {
      const list = listRef.current;
      if (!list) return;
      const area = visibleArea();
      if (!area.keyboard) {
        setMaxHeight(null);
        return;
      }
      revealField(inputRef.current);
      const room = area.bottom - list.getBoundingClientRect().top - 12;
      setMaxHeight(Math.max(120, Math.min(340, Math.floor(room))));
    };
    fit();
    const vv = window.visualViewport;
    if (!vv) return undefined;
    vv.addEventListener("resize", fit);
    return () => vv.removeEventListener("resize", fit);
  }, [on, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return maxHeight;
}
