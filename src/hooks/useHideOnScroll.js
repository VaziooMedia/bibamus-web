// ============================================================
// Barre du bas (« barre d'accès rapide ») : elle se replie quand on
// fait défiler le contenu vers le bas et réapparaît dès qu'on remonte.
//
// - scrollEl : le conteneur qui défile (l'élément lui-même, pas une ref).
// - resetKey : valeur qui change à chaque changement d'écran ; la barre
//   revient alors toujours (le nouvel écran repart du haut).
//
// Garde-fous :
// - petits mouvements ignorés (le doigt qui tremble ne doit pas la faire
//   clignoter) : il faut un vrai geste dans un sens ;
// - toujours visible tout en haut de la page ;
// - rebonds de fin de page (iPhone) ignorés ;
// - la barre se replie ou revient, la zone visible change de hauteur et le
//   navigateur peut ajuster la position de défilement : les mouvements qui
//   suivent immédiatement le changement sont ignorés, sans quoi la barre
//   se remettrait à clignoter toute seule ;
// - une page à peine plus haute que l'écran ne la replie pas (une fois
//   repliée, la page ne défilerait plus et on ne pourrait plus la rappeler) ;
// - si la page devient trop courte pour défiler pendant qu'elle est repliée,
//   elle revient.
// ============================================================
import { useState, useEffect, useRef } from "react";

const TOP_ZONE_PX = 24; // en haut de la page : toujours visible
const HIDE_AFTER_PX = 14; // geste vers le bas nécessaire pour la replier
const SHOW_AFTER_PX = 8; // geste vers le haut nécessaire pour la rappeler
const MIN_SCROLL_RANGE_PX = 120; // la page doit défiler d'au moins ça pour qu'on replie la barre
const SETTLE_MS = 350; // durée d'ignorance après un changement (animation de la barre)
const RECHECK_MS = 500;

export function useHideOnScroll(scrollEl, resetKey) {
  const [hidden, setHidden] = useState(false);
  const s = useRef({ last: 0, acc: 0, lockUntil: 0, hidden: false });

  // Nouvel écran : la barre revient et le suivi repart de zéro.
  useEffect(() => {
    s.current.last = 0;
    s.current.acc = 0;
    s.current.hidden = false;
    s.current.lockUntil = Date.now() + SETTLE_MS;
    setHidden(false);
  }, [resetKey]);

  useEffect(() => {
    if (!scrollEl) return undefined;
    const st = s.current;
    st.last = scrollEl.scrollTop;
    st.acc = 0;

    const change = (value) => {
      st.hidden = value;
      st.acc = 0;
      st.lockUntil = Date.now() + SETTLE_MS;
      setHidden(value);
    };

    const onScroll = () => {
      const top = scrollEl.scrollTop;
      const range = scrollEl.scrollHeight - scrollEl.clientHeight;
      if (Date.now() < st.lockUntil) {
        st.last = top;
        st.acc = 0;
        return;
      }
      // Rebond au-delà des extrémités : ignoré.
      if (top < 0 || top > range) {
        st.last = Math.min(Math.max(top, 0), Math.max(range, 0));
        return;
      }
      const delta = top - st.last;
      st.last = top;
      if (top <= TOP_ZONE_PX) {
        st.acc = 0;
        if (st.hidden) change(false);
        return;
      }
      if (delta === 0) return;
      if (Math.sign(delta) !== Math.sign(st.acc)) st.acc = 0;
      st.acc += delta;
      if (!st.hidden && st.acc > HIDE_AFTER_PX && range > MIN_SCROLL_RANGE_PX) change(true);
      else if (st.hidden && st.acc < -SHOW_AFTER_PX) change(false);
    };

    scrollEl.addEventListener("scroll", onScroll, { passive: true });

    // Repliée mais la page ne défile plus (contenu raccourci entre-temps) : on la rappelle.
    const recheck = setInterval(() => {
      if (st.hidden && Date.now() >= st.lockUntil && scrollEl.scrollHeight - scrollEl.clientHeight <= 0) change(false);
    }, RECHECK_MS);

    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      clearInterval(recheck);
    };
  }, [scrollEl]);

  return hidden;
}
