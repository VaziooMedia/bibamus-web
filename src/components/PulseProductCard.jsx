import React, { useEffect, useState } from "react";
import { COLORS, SUBTYPE_LABELS } from "../constants.js";
import { NavIcon } from "./icons.jsx";
import { EntityAvatar } from "./ui.jsx";
import { RatingFraction } from "./NotesCard.jsx";
import { styleTagLabel, hasStyleLabel, registerCustomStyleLabels } from "../data/styleTagLabels.js";
import { OTHER_STYLE_TYPES } from "../data/otherStyleLabels.js";
import { loadCustomBeerCiderStylesOnce, loadCustomListStyleLabelsOnce } from "../data/sharedDirectories.js";

// Fiche produit en petit, dans une carte du fil BibaPulse (DrinkCheck) : photo, nom, sous-catégorie, style et note moyenne.
// Toute la fiche est un bouton qui ouvre le produit. Les données viennent du produit lui-même (jamais copiées dans la carte) :
//   - sous-catégorie : même libellé que partout ailleurs (SUBTYPE_LABELS), à défaut le type du produit ;
//   - style : les styles du produit, avec le nom enregistré en base quand il a été modifié depuis la plateforme de gestion (même
//     chargement, une seule lecture par session, que sur la fiche produit) ;
//   - note moyenne : la moyenne des notes du produit (drink.ratings), même calcul et même format que la bannière de la fiche ;
//     sans aucune note, rien n'est affiché à la place.
export function PulseProductCard({ drink, onOpen }) {
  const [, setStyleLabelsTick] = useState(0);
  const styles = Array.isArray(drink.styles) ? drink.styles : [];
  const usesListStyles = OTHER_STYLE_TYPES.includes(drink.type);
  const unknownStylesKey = styles.filter((code) => !hasStyleLabel(code)).join(",");
  const isBeer = drink.type === "Bières & Cidres";
  const needsStyleLabels = usesListStyles ? styles.length > 0 : !!unknownStylesKey || (isBeer && styles.length > 0);
  useEffect(() => {
    if (!needsStyleLabels) return;
    let cancelled = false;
    (usesListStyles ? loadCustomListStyleLabelsOnce : loadCustomBeerCiderStylesOnce)().then((list) => {
      if (registerCustomStyleLabels(list) && !cancelled) setStyleLabelsTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [needsStyleLabels, usesListStyles, unknownStylesKey, drink.id]);

  const ratingValues = Object.values(drink.ratings || {}).filter((v) => typeof v === "number" && isFinite(v));
  const ratingAverage = ratingValues.length > 0 ? ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length : null;
  const subtypeLabel = SUBTYPE_LABELS[drink.beverageSubtype] || drink.type || "";
  const detail = [subtypeLabel, styles.map((code) => styleTagLabel(code)).join(", ")].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={onOpen || undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        textAlign: "left",
        background: COLORS.surfaceAlt,
        border: `2px solid ${COLORS.paperAlt}`,
        borderRadius: "10px",
        padding: "8px 10px",
        color: COLORS.ink,
        cursor: onOpen ? "pointer" : "default",
        font: "inherit",
      }}
    >
      <EntityAvatar photoUrl={drink.photoUrl} photoEmoji={drink.avatarEmoji} size={44} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 700, fontSize: "14px", overflowWrap: "anywhere" }}>{drink.name}</span>
        {detail && (
          <span style={{ display: "block", marginTop: "2px", fontSize: "11.5px", color: COLORS.inkSoft, overflowWrap: "anywhere" }}>{detail}</span>
        )}
      </span>
      {ratingAverage != null && (
        <span
          title="Note moyenne"
          style={{ display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0, background: "#000", border: `2px solid ${COLORS.amber}`, borderRadius: "8px", padding: "3px 8px" }}
        >
          <NavIcon name="star" size={13} color={COLORS.amber} filled />
          <span style={{ fontFamily: "'Urbanist', sans-serif", fontWeight: 800, fontSize: "12px", color: COLORS.chalkWhite, whiteSpace: "nowrap" }}>
            <RatingFraction value={ratingAverage} />
          </span>
        </span>
      )}
    </button>
  );
}
