// Index alphabétique sur le bord droit d'une liste rangée de A à Z (« A–Z ») : une fine colonne de lettres ; toucher une lettre — ou y glisser le doigt — fait sauter la liste
// à la première ligne qui commence par cette lettre. Une lettre sans élément est grisée ; la toucher mène à la suivante qui en a. Pendant qu'on touche, une bulle montre la lettre.
// La colonne se loge dans la marge de 20 px de la page (entre la carte et le bord de l'écran) : elle ne recouvre rien. Elle reste à l'écran pendant que la liste défile
// (position « sticky » dans le conteneur qui défile).
// Affiché seulement à partir de 30 éléments (`showAlphaIndex`).
// À poser comme PREMIER enfant d'un bloc `position: relative` qui contient la liste.
//   available : les lettres qui ont au moins un élément ("#" = un chiffre ou un symbole) ;
//   scrollRef : le conteneur qui défile (mainScrollRef de App) ;
//   targetFor(lettre) : l'élément de la liste où sauter (la ligne du premier élément de cette lettre, voir `alphaRowFor` dans CheckListParts.jsx).
import React, { useRef, useState } from "react";
import { COLORS } from "../constants.js";

const ALPHABET = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");

// L'index ne s'affiche que sur une liste de 30 éléments ou plus (décidé par Mehdi, 2026-11-17) : en dessous, la liste se parcourt d'un coup d'œil.
// Le nombre est celui des éléments affichés (la catégorie choisie incluse). Les écrans testent `showAlphaIndex(classement, nombre)`.
export const ALPHA_INDEX_MIN = 30;
export const showAlphaIndex = (sort, count) => sort === "alpha" && count >= ALPHA_INDEX_MIN;

export function AlphaIndex({ available, scrollRef, targetFor, top = 96 }) {
  const stripRef = useRef(null);
  const [active, setActive] = useState(null); // { letter, y } pendant qu'on touche
  const have = new Set(available);
  const letters = have.has("#") ? ["#", ...ALPHABET] : ALPHABET;

  const jump = (clientY) => {
    const strip = stripRef.current;
    if (!strip) return;
    const rect = strip.getBoundingClientRect();
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height - 1);
    const index = Math.floor((y / rect.height) * letters.length);
    // Lettre sans élément : la suivante qui en a ; à la fin de l'alphabet, la dernière qui en a.
    const letter = letters.slice(index).find((l) => have.has(l)) || [...letters].reverse().find((l) => have.has(l));
    if (!letter) return;
    setActive({ letter, y });
    const container = scrollRef?.current;
    const target = targetFor(letter);
    if (!container || !target) return;
    container.scrollTop += target.getBoundingClientRect().top - container.getBoundingClientRect().top - 12;
  };

  return (
    <div style={{ position: "sticky", top: `${top}px`, height: 0, zIndex: 6 }}>
      <div
        ref={stripRef}
        data-alpha-index
        role="group"
        aria-label="Index alphabétique"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          jump(e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) jump(e.clientY);
        }}
        onPointerUp={() => setActive(null)}
        onPointerCancel={() => setActive(null)}
        style={{
          position: "absolute",
          right: "-19px",
          top: 0,
          width: "18px",
          height: "min(440px, calc(100dvh - 250px))",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "2px 0",
          boxSizing: "border-box",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          cursor: "pointer",
        }}
      >
        {letters.map((l) => (
          <span key={l} data-alpha-letter={l} style={{ fontFamily: "'Urbanist', sans-serif", fontSize: "10px", fontWeight: 800, lineHeight: 1, color: have.has(l) ? COLORS.amber : COLORS.paperAlt }}>
            {l}
          </span>
        ))}
        {active && (
          <div
            data-alpha-bubble
            style={{
              position: "absolute",
              right: "30px",
              top: `${active.y - 24}px`,
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: COLORS.amber,
              color: COLORS.paper,
              fontFamily: "'Urbanist', sans-serif",
              fontWeight: 800,
              fontSize: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            {active.letter}
          </div>
        )}
      </div>
    </div>
  );
}
