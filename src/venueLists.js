// ============================================================
// Listes d'un lieu modifiables depuis la plateforme de gestion : types d'établissement et aménités.
//
// La liste de départ est dans le code (constants.js). La plateforme de gestion la complète dans la base :
//   - table custom_list_items (list_key « venue_type » ou « amenity ») : un élément ajouté à la main (code « perso_… »),
//     un élément de départ renommé (même code, nouveau nom) ou supprimé (même code, hidden vrai) ;
//   - table custom_list_order : l'ordre d'affichage de la liste (la suite des codes ; un élément absent vient à la fin).
// Ce fichier ne contient que de la logique pure (aucun accès réseau) : il sert à l'app, à l'assistant « Ajouter un
// lieu » et à la fonction qui prépare les aperçus de partage.
// ============================================================
import { VENUE_TYPES } from "./constants.js";

export const VENUE_TYPE_LIST_KEY = "venue_type";
export const AMENITY_LIST_KEY = "amenity";

const isRow = (r) => r && typeof r === "object" && typeof r.code === "string" && r.code !== "" && typeof r.fr === "string" && r.fr.trim() !== "";

// Les lignes reçues de la base, réduites à { code, fr, hidden } : une ligne mal formée est ignorée plutôt que de casser l'écran.
export function cleanListRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter(isRow).map((r) => ({ code: r.code, fr: r.fr.trim(), hidden: r.hidden === true }));
}

// L'ordre reçu de la base : la suite des codes (textes seulement), vide si absent ou mal formé.
export function cleanOrder(codes) {
  return Array.isArray(codes) ? codes.filter((c) => typeof c === "string") : [];
}

// La liste affichée : celle du code avec les modifications de la gestion. Un élément de départ renommé garde sa place sous
// son nouveau nom ; supprimé (masqué), il disparaît ; les éléments ajoutés à la main suivent, triés par nom.
export function mergeList(builtin, rows) {
  const custom = cleanListRows(rows);
  if (custom.length === 0) return builtin;
  const builtinCodes = new Set(builtin.map((t) => t.code));
  const changes = new Map();
  const added = [];
  custom.forEach((c) => {
    if (builtinCodes.has(c.code)) changes.set(c.code, c);
    else if (!c.hidden) added.push({ code: c.code, fr: c.fr });
  });
  const kept = builtin.flatMap((t) => {
    const change = changes.get(t.code);
    if (!change) return [t];
    if (change.hidden) return [];
    return [{ ...t, fr: change.fr }];
  });
  added.sort((a, b) => a.fr.localeCompare(b.fr));
  return [...kept, ...added];
}

// L'ordre d'affichage enregistré. Sans ordre, la liste garde son ordre ; les éléments absents de l'ordre viennent à la
// fin, dans leur ordre d'origine ; les codes de l'ordre qui n'existent plus sont ignorés.
export function applyOrder(items, order) {
  const codes = cleanOrder(order);
  if (codes.length === 0) return items;
  const rank = new Map();
  codes.forEach((code, i) => {
    if (!rank.has(code)) rank.set(code, i);
  });
  const placed = items.filter((t) => rank.has(t.code)).sort((a, b) => rank.get(a.code) - rank.get(b.code));
  const rest = items.filter((t) => !rank.has(t.code));
  return [...placed, ...rest];
}

// La liste à proposer (modifications de la gestion et ordre appliqués), à partir de ce que rend loadVenueListsOnce().
export const orderedList = (builtin, rows, order) => applyOrder(mergeList(builtin, rows), order);

// Les noms enregistrés en base qui l'emportent sur les noms de départ : { code: nom } pour les éléments renommés ou
// ajoutés (jamais un élément masqué).
export function customNames(rows) {
  const out = {};
  cleanListRows(rows).forEach((r) => {
    if (!r.hidden) out[r.code] = r.fr;
  });
  return out;
}

// --- Noms des types d'établissement pour l'affichage (fiche d'un lieu) ---------------------------------------------
// Les noms venus de la base sont mémorisés ici, comme pour les styles de bière (voir styleTagLabels.js) : un type ajouté
// à la main n'existe pas dans le code, un type de départ renommé l'emporte sur son nom d'origine.
const typeNames = new Map();

// Mémorise ces noms. Rend vrai si l'un d'eux change ce qu'on affiche (l'écran ne se redessine que dans ce cas).
export function registerVenueTypeNames(rows) {
  let changed = false;
  Object.entries(customNames(rows)).forEach(([code, fr]) => {
    const before = venueTypeLabel(code);
    typeNames.set(code, fr);
    if (venueTypeLabel(code) !== before) changed = true;
  });
  return changed;
}

// Le nom d'un type d'établissement, ou null s'il est inconnu (un code « perso_… » dont le nom n'est pas encore chargé n'est
// jamais montré tel quel).
export function venueTypeLabel(code) {
  const custom = typeNames.get(code);
  if (custom) return custom;
  const builtin = VENUE_TYPES.find((t) => t.code === code);
  return builtin ? builtin.fr : null;
}

// Le nom à afficher pour un code de type d'établissement, ou null s'il n'y a rien de présentable : un code « perso_… » dont
// le nom n'est pas (encore) chargé n'est jamais montré tel quel ; un ancien code inconnu est montré tel quel.
export function venueTypeDisplayName(code) {
  if (code === null || code === undefined || code === "") return null;
  return venueTypeLabel(code) ?? (String(code).startsWith("perso_") ? null : String(code));
}
