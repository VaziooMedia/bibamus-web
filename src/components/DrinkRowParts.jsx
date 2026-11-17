// Éléments de la ligne de détails d'un produit — communs à « DrinkChecks », « Mes Produits » et « Mes Favoris > Produits » (Mon Profil).
// Fichier à part (et non dans CheckListParts.jsx) pour que MyFavoritesScreen.jsx puisse les utiliser sans import circulaire : CheckListParts importe déjà MyFavoritesScreen.
import React from "react";
import { GLUTEN_BIO_ELIGIBLE_TYPES } from "../constants.js";
import { MENTION_ICON_STYLE, BIO_ICON_STYLE } from "./BibaSoloScreen.jsx";
import { CountryFlagImg, COUNTRY_ISO_CODES } from "./icons.jsx";
import { displayedAbv } from "../utils.js";
import bioIconUrl from "../assets/brand/bio.svg";
import glutenFreeIconUrl from "../assets/brand/gluteen-free.svg";

// Éléments de la ligne de détails d'un produit (DrinkChecks, Mes Produits), à mettre dans le tableau `parts` de CheckRow, dans cet ordre : sous-catégorie, pays, degré, Bio, Sans gluten.
export const hasFlag = (country) => !!COUNTRY_ISO_CODES[country] || country === "International" || country === "Autre";

// Le pays du produit : son drapeau (le globe pour « International » / « Autre ») ; un pays sans drapeau connu garde son nom écrit ; rien s'il n'est pas renseigné.
export const flagPart = (drink) => {
  const country = drink.nationality;
  if (!country || country === "Non renseigné") return null;
  return hasFlag(country) ? <CountryFlagImg country={country} size={14} /> : country;
};

// Le degré d'alcool : « 6.5% ABV ». Rien pour les produits sans alcool par définition — Softs & Eaux, Boissons chaudes (Hot Mix excepté), Snacks —, sauf un degré
// au-dessus de 0 (règle de l'app, `displayedAbv`). Dans toutes les autres catégories, un produit à 0 s'affiche « 0.0% ABV » (la version sans alcool d'une bière, d'un vin…) ; degré inconnu : rien.
export const abvPart = (drink) => {
  const abv = drink.type === "Snacks" && !(drink.abv > 0) ? null : displayedAbv(drink);
  return abv == null ? null : `${Number(abv).toFixed(1)}% ABV`;
};

// Les icônes Bio et Sans gluten, les mêmes que dans le détail des lignes de BibaSolo (grisées, même teinte que le texte voisin) ; seulement pour les catégories où l'app les propose.
export const bioPart = (drink) => (drink.bio && GLUTEN_BIO_ELIGIBLE_TYPES.includes(drink.type) ? <img src={bioIconUrl} alt="Bio" style={BIO_ICON_STYLE} /> : null);
export const glutenFreePart = (drink) => (drink.glutenFree && GLUTEN_BIO_ELIGIBLE_TYPES.includes(drink.type) ? <img src={glutenFreeIconUrl} alt="Sans gluten" style={MENTION_ICON_STYLE} /> : null);
