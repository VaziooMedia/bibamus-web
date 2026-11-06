// ============================================================
// Dérivés des bières (Mazout, Tango, Half…) : une façon de servir une bière de base. Le produit reste la bière de base
// (statistiques, classements, notes) ; le dérivé n'en change que l'énergie (kcal/100ml) et s'affiche dans les commandes.
//
// Ce fichier ne contient que de la logique pure (aucun accès réseau). La liste des dérivés est commune à toutes les bières :
// table custom_list_items (list_key « beer_derivative », colonne kcal_per_100ml facultative), ordre dans custom_list_order ;
// les dérivés activés pour un produit sont dans drinks_directory.derivatives (codes). Tout se gère depuis la plateforme de
// gestion (fiche d'une bière, « Dérivés du produit »).
//
// Dans une commande de BibaRoom, le dérivé se glisse dans l'identifiant du verre : « entréeId::volumeId » devient
// « entréeId::volumeId::codeDérivé » (voir flattenMenu et findMenuEntryById dans utils.js, qui ignorent ce troisième morceau).
// Ainsi les compteurs et les tickets, qui comptent par identifiant, séparent d'eux-mêmes une bière « nature » de ses dérivés.
// ============================================================

export const BEER_DERIVATIVE_LIST_KEY = "beer_derivative";

const SEP = "::";

// Le code du dérivé d'un identifiant de verre (« entrée::volume::code »), ou null s'il n'en porte pas.
export function variantOfDrinkId(drinkId) {
  const parts = String(drinkId ?? "").split(SEP);
  return parts.length >= 3 && parts[2] !== "" ? parts.slice(2).join(SEP) : null;
}

// L'identifiant du verre sans son dérivé (« entrée::volume »).
export function baseDrinkId(drinkId) {
  const id = String(drinkId ?? "");
  const parts = id.split(SEP);
  return parts.length >= 3 ? parts.slice(0, 2).join(SEP) : id;
}

// L'identifiant du verre avec un dérivé. Sans code, ou pour un identifiant qui n'est pas de la forme « entrée::volume »
// (très ancienne carte à un seul volume), il est rendu tel quel : le dérivé ne se choisit que dans la carte de commande.
export function drinkIdWithVariant(drinkId, variantCode) {
  const base = baseDrinkId(drinkId);
  if (!variantCode || base.split(SEP).length !== 2) return base;
  return `${base}${SEP}${variantCode}`;
}

const isRow = (r) => r && typeof r === "object" && typeof r.code === "string" && r.code !== "" && typeof r.fr === "string" && r.fr.trim() !== "";
const cleanKcal = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

// La liste des dérivés telle que l'app la lit : { items: [{ code, name, kcalPer100ml }] } dans l'ordre d'affichage de la gestion.
// Les lignes mal formées et les dérivés masqués sont ignorés ; ceux que l'ordre ne cite pas viennent à la fin, par nom.
export function buildDerivativeList(rows, order) {
  const items = (Array.isArray(rows) ? rows : [])
    .filter(isRow)
    .filter((r) => r.hidden !== true)
    .map((r) => ({ code: r.code, name: r.fr.trim(), kcalPer100ml: cleanKcal(r.kcal_per_100ml) }));
  const rank = new Map();
  (Array.isArray(order) ? order : []).forEach((code, i) => {
    if (typeof code === "string" && !rank.has(code)) rank.set(code, i);
  });
  const placed = items.filter((d) => rank.has(d.code)).sort((a, b) => rank.get(a.code) - rank.get(b.code));
  const rest = items.filter((d) => !rank.has(d.code)).sort((a, b) => a.name.localeCompare(b.name));
  return { items: [...placed, ...rest] };
}

// Les dérivés qu'un produit peut devenir, dans l'ordre de la liste : seuls ceux qui existent encore (non supprimés, non masqués).
export function derivativesForProduct(list, codes) {
  if (!list || !Array.isArray(codes) || codes.length === 0) return [];
  const wanted = new Set(codes.filter((c) => typeof c === "string"));
  return list.items.filter((d) => wanted.has(d.code));
}

// Une table code → énergie (kcal/100ml) des seuls dérivés qui en ont une.
export function derivativeKcalByCode(list) {
  const out = {};
  (list?.items || []).forEach((d) => {
    if (d.kcalPer100ml != null) out[d.code] = d.kcalPer100ml;
  });
  return out;
}

// L'énergie d'un verre : celle du dérivé quand il en a une, sinon celle du produit (qui peut être vide).
export function kcalPer100mlWithVariant(productKcal, variantCode, kcalByCode) {
  if (variantCode && kcalByCode && kcalByCode[variantCode] != null) return kcalByCode[variantCode];
  return productKcal ?? null;
}

// Le nom d'un dérivé (« Mazout »), ou null s'il n'existe plus.
export function derivativeName(list, variantCode) {
  return (list?.items || []).find((d) => d.code === variantCode)?.name || null;
}

// La liste lue pendant cette session, gardée ici pour les calculs qui n'ont pas le temps d'attendre une lecture (nom, énergie d'un
// verre déjà commandé : ticket, historique, ligne de statistiques). Renseignée par la lecture de la liste (sharedDirectories.js).
let rememberedList = null;
export const rememberDerivativeList = (list) => {
  rememberedList = list && Array.isArray(list.items) ? list : null;
};
export const rememberedDerivativeList = () => rememberedList;

// Une entrée de carte (déjà résolue sur un volume) devenue le verre « entrée + dérivé » : son code, son nom (null si le dérivé n'existe
// plus ou si la liste n'est pas encore lue) et l'énergie du dérivé quand il en a une, sinon celle du produit. Le prix ne change pas.
export function withDerivative(entry, variantCode) {
  if (!entry || !variantCode) return entry;
  return {
    ...entry,
    variantCode,
    variantName: derivativeName(rememberedList, variantCode),
    kcalPer100ml: kcalPer100mlWithVariant(entry.kcalPer100ml, variantCode, derivativeKcalByCode(rememberedList)),
  };
}

// Le libellé d'un verre dans un ticket ou un historique : « Jupiler · Mazout » (le nom du produit seul s'il n'a pas de dérivé).
export const drinkLabel = (entry) => (entry?.variantName ? `${entry.name} · ${entry.variantName}` : entry?.name);
