// ============================================================
// Les lignes de détails d'un Bibax, les mêmes partout (décidé par Mehdi, 2026-11-18) :
//   ligne 1 : prénom + nom (écrite par l'appelant) ;
//   ligne 2 : @nom (le « @ » en vert fluo) puis surnom en italique ;
//   ligne 3 : commune (village) puis drapeau du pays.
// Une ligne sans contenu n'est pas affichée. Chaque ligne est une `DotLine` (points vert fluo entre les éléments, sans retour à la ligne, « … » si c'est trop long).
// Mes Bibax (la liste), les Suggestions, les Demandes, Bibax en commun et le carrousel de l'accueil les utilisent ; Mes Favoris > Bibax suit le même modèle avec ses propres réglages.
// ============================================================
import React, { useLayoutEffect, useRef, useState } from "react";
import { COLORS } from "../constants.js";
import { DotLine } from "./MyFavoritesScreen.jsx";
import { flagPart } from "./DrinkRowParts.jsx";
import { MutualPill } from "./ui.jsx";

// Le « @nom » : « @ » en vert fluo, le reste dans la couleur de la ligne.
export const usernamePart = (username) => (username ? { node: <><span style={{ color: COLORS.amber }}>@</span>{username}</> } : null);

// Les éléments des lignes 2 et 3 : [[@nom, surnom], [commune (village), drapeau]]. Un nom de village n'est affiché qu'avec sa commune.
export function bibaxDetailParts({ username, nickname, city, locality, country }) {
  const commune = city ? (locality ? `${city} (${locality})` : city) : "";
  return [
    [usernamePart(username), nickname ? { node: <span style={{ fontStyle: "italic", color: COLORS.amber, paddingRight: "2px" }}>{nickname}</span> } : null].filter(Boolean),
    [commune || null, flagPart({ nationality: country })].filter(Boolean),
  ];
}

// Les deux lignes de détails (sous le nom), prêtes à afficher. `center` : centrées (cartes de l'accueil).
export function BibaxDetailLines({ username, nickname, city, locality, country, center = false }) {
  return bibaxDetailParts({ username, nickname, city, locality, country }).map((parts, i) => (parts.length > 0 ? <DotLine key={i} parts={parts} noWrap center={center} /> : null));
}

// Texte sur une seule ligne qui, s'il est trop long pour sa place, défile doucement (pause, aller jusqu'au bout, pause, retour) au lieu d'être coupé par « … ».
// Si le texte tient, il reste fixe. Si la personne a demandé moins d'animations (réglage du téléphone), on garde le « … ». `style` : mise en forme de l'appelant (graisse, minWidth…).
export function ScrollText({ children, style }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [dist, setDist] = useState(0);
  const still = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useLayoutEffect(() => {
    if (still || !outerRef.current || !innerRef.current) return undefined;
    const measure = () => {
      const d = innerRef.current.offsetWidth - outerRef.current.clientWidth;
      setDist(d > 1 ? Math.ceil(d) : 0);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(outerRef.current);
    return () => {
      if (ro) ro.disconnect();
    };
  }, [children, still]);
  if (still) return <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...style }}>{children}</span>;
  return (
    <span ref={outerRef} style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", ...style }}>
      <span ref={innerRef} style={{ display: "inline-block", ...(dist ? { animation: `bibaScrollText ${Math.max(5, 3 + dist / 20)}s ease-in-out infinite`, "--scroll-dist": `-${dist}px` } : null) }}>{children}</span>
    </span>
  );
}

// Un bloc complet (nom + lignes de détails) pour les cartes : à la place de `BibaxName`. `style` : mise en page de l'appelant (flex, taille et couleur du nom). `wrapName` : le nom passe à la ligne au lieu d'être coupé par « … » (carte du Bibax trouvé). `mutual` : le nombre de Bibax en commun, en 4ᵉ ligne (« 0 Bibax en commun » à 0 ; rien si le nombre est inconnu : null). `nameAfter` : un élément placé juste après le nom, sur la ligne 1 (la flèche d'accès au profil de « Tes Bibax qui ont checké ce produit »).
export function BibaxIdentity({ name, lastName, username, nickname, city, locality, country, style, wrapName = false, scrollName = false, nameAfter = null, mutual = null }) {
  const fullName = [name, lastName].filter(Boolean).join(" ") || "Bibax";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0, ...style }}>
      {nameAfter ? (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", minWidth: 0 }}>
          {scrollName && !wrapName ? (
            <ScrollText style={{ fontWeight: 700, minWidth: 0 }}>{fullName}</ScrollText>
          ) : (
            <span style={{ fontWeight: 700, minWidth: 0, ...(wrapName ? { overflowWrap: "anywhere" } : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }) }}>{fullName}</span>
          )}
          {nameAfter}
        </div>
      ) : (
        scrollName && !wrapName ? (
          <ScrollText style={{ fontWeight: 700 }}>{fullName}</ScrollText>
        ) : (
          <span style={{ fontWeight: 700, ...(wrapName ? { overflowWrap: "anywhere" } : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }) }}>{fullName}</span>
        )
      )}
      <BibaxDetailLines username={username} nickname={nickname} city={city} locality={locality} country={country} />
      {mutual != null && (
        <div>
          <MutualPill n={mutual} />
        </div>
      )}
    </div>
  );
}
