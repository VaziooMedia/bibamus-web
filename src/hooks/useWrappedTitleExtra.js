// ============================================================
// Nom d'une fiche (Produit, Marque) sur plusieurs lignes : de combien de pixels le nom dépasse-t-il une ligne ?
//
// Sur ces fiches, le nom est posé à droite de l'avatar, juste sous la couverture, et les icônes (Partager, cloche, cœur ou étoile)
// sont posées sous la première ligne du nom. Un nom long passe sur 2 lignes (ou plus) : sans correction, sa 2e ligne passe sous les
// icônes. La fiche descend donc les icônes, et tout ce qui est en dessous, d'autant de pixels que le nom a de lignes en plus.
//
// Usage : const [titleRef, titleExtra] = useWrappedTitleExtra(); mettre titleRef sur la ligne du nom (le bloc qui contient le titre et
// l'icône de certification) ; titleExtra vaut 0 pour un nom sur une seule ligne, 24 pour deux lignes, 48 pour trois...
// La mesure se refait toute seule quand la taille du bloc change (autre fiche, police chargée plus tard, rotation de l'écran).
// ============================================================
import { useState, useRef, useLayoutEffect } from "react";

// Une ligne du nom : 19 px × interligne 1,25 = 23,75 px.
const ONE_LINE_PX = 24;

export function useWrappedTitleExtra() {
  const ref = useRef(null);
  const [extra, setExtra] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setExtra(Math.max(0, Math.ceil(el.getBoundingClientRect().height - ONE_LINE_PX)));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, extra];
}
