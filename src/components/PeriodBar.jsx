// Les barres de période (« Aujourd'hui », « Mardi 17/11 ») et les dates, communes à « Mon Historique » (Mon Profil) et à BibaSolo (accueil et Historique).
// Décidé par Mehdi le 2026-11-18 : un petit trait vertical vert fluo devant le texte ; le nom du jour en blanc, la date en vert fluo (couleur du style de la barre) avec ses « / »
// en blanc ; « Aujourd'hui » tout en blanc ; dans les lignes de date des cartes, les « / » en blanc.
import React from "react";
import { COLORS } from "../constants.js";

// Le texte avec chaque « / » écrit en blanc (`ink`) ; le reste garde la couleur de son parent.
export function slashWhite(text) {
  return String(text)
    .split("/")
    .map((chunk, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span style={{ color: COLORS.ink }}>/</span>}
        {chunk}
      </React.Fragment>
    ));
}

// Le texte d'une barre de période : le nom du jour en blanc, la date (« 17/11 », avec l'année si ce n'est pas l'année en cours) dans la couleur du parent (`amber`) avec ses « / » blancs ;
// « Aujourd'hui » est tout en blanc.
export function periodLabel(text) {
  const white = { color: COLORS.ink };
  const m = /^(\S+) (\d{2}\/\d{2}(?:\/\d{4})?)$/.exec(text);
  if (!m) return <span style={white}>{text}</span>;
  return (
    <>
      <span style={white}>{m[1]}</span> {slashWhite(m[2])}
    </>
  );
}

// Le petit trait vertical vert fluo (3 px × 14 px) posé devant le texte d'une barre de période (le `gap` de la barre y ajoute 8 px).
export function PeriodBarMark() {
  return <span aria-hidden="true" style={{ width: "3px", height: "14px", borderRadius: "2px", background: COLORS.amber, flexShrink: 0, marginRight: "-2px" }} />;
}
