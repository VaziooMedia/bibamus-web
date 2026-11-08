// ============================================================
// Dérivés des bières (Mazout, Tango, Half…), des spiritueux (Coca, Tonic, Red Bull…) et des thés / infusions (citron, lait, miel…) : une façon de servir un produit de base. Le produit
// reste le produit de base (statistiques, classements, notes) ; le dérivé n'en change que l'énergie (kcal/100ml) quand la fiche du produit en saisit une pour ce
// dérivé (drinks_directory.derivative_kcal : une Jupiler Mazout n'a pas l'énergie d'une Leffe Mazout), et s'affiche dans les commandes. Sans valeur saisie sur la fiche, le
// verre garde l'énergie du produit : un dérivé n'a JAMAIS d'énergie par défaut qui lui soit propre.
//
// Ce fichier ne contient que de la logique pure (aucun accès réseau). Il y a TROIS listes de dérivés, une pour toutes les bières, une pour
// tous les spiritueux et une pour tous les thés et infusions : table custom_list_items (list_key « beer_derivative », « spirit_derivative » ou
// « tea_derivative »), ordre dans custom_list_order ; les dérivés activés pour un produit sont dans drinks_directory.derivatives (codes de sa liste). Tout se
// gère depuis la plateforme de gestion (fiche du produit, « Dérivés du produit »). Les codes des trois listes ne se mélangent pas
// (« perso_… » pour les bières, « perso_spirit_… » pour les spiritueux, « perso_tea_… » pour les thés) : l'app lit les trois d'un coup et n'en fait qu'une liste, dans
// laquelle chaque produit ne retrouve que ses propres codes. Les verres pris en Shot n'ont jamais de dérivé (voir isShotEntry).
//
// Dans une commande de BibaRoom, le dérivé se glisse dans l'identifiant du verre : « entréeId::volumeId » devient
// « entréeId::volumeId::codeDérivé » (voir flattenMenu et findMenuEntryById dans utils.js, qui ignorent ce troisième morceau).
// Ainsi les compteurs et les tickets, qui comptent par identifiant, séparent d'eux-mêmes une bière « nature » de ses dérivés.
// ============================================================

export const BEER_DERIVATIVE_LIST_KEY = "beer_derivative";
export const SPIRIT_DERIVATIVE_LIST_KEY = "spirit_derivative";
export const TEA_DERIVATIVE_LIST_KEY = "tea_derivative";
export const DERIVATIVE_LIST_KEYS = [BEER_DERIVATIVE_LIST_KEY, SPIRIT_DERIVATIVE_LIST_KEY, TEA_DERIVATIVE_LIST_KEY];

// Un verre pris en Shot (catégorie de carte « Shots », ou ancien type « Shots ») : les dérivés d'un spiritueux ne le concernent pas.
export const isShotEntry = (entry) => entry?.menuCategory === "Shots" || entry?.type === "Shots";

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
// La liste des dérivés telle que l'app la lit : { items: [{ code, name }] } dans l'ordre d'affichage de la gestion. L'énergie n'y figure pas : elle est propre à chaque produit.
// Les lignes mal formées et les dérivés masqués sont ignorés ; ceux que l'ordre ne cite pas viennent à la fin, par nom.
export function buildDerivativeList(rows, order) {
  const items = (Array.isArray(rows) ? rows : [])
    .filter(isRow)
    .filter((r) => r.hidden !== true)
    .map((r) => ({ code: r.code, name: r.fr.trim() }));
  const rank = new Map();
  (Array.isArray(order) ? order : []).forEach((code, i) => {
    if (typeof code === "string" && !rank.has(code)) rank.set(code, i);
  });
  const placed = items.filter((d) => rank.has(d.code)).sort((a, b) => rank.get(a.code) - rank.get(b.code));
  const rest = items.filter((d) => !rank.has(d.code)).sort((a, b) => a.name.localeCompare(b.name));
  return { items: [...placed, ...rest] };
}

// Les trois listes (bières, puis spiritueux, puis thés) lues d'un coup, en une seule : `itemRows` porte list_key + code + fr + hidden,
// `orderRows` porte list_key + codes (l'ordre propre à chaque liste). Chaque liste garde son ordre ; les bières viennent d'abord.
export function buildCombinedDerivativeList(itemRows, orderRows) {
  const items = [];
  DERIVATIVE_LIST_KEYS.forEach((key) => {
    const rows = (Array.isArray(itemRows) ? itemRows : []).filter((r) => r && r.list_key === key);
    const order = (Array.isArray(orderRows) ? orderRows : []).find((r) => r && r.list_key === key)?.codes;
    items.push(...buildDerivativeList(rows, order).items);
  });
  return { items };
}

// Les volumes de verre saisis dans la gestion pour les dérivés d'un produit : { code du dérivé: cl } (colonne drinks_directory.derivative_volumes).
// Un spiritueux pris en dérivé est un verre rempli (Vodka + Red Bull = 20 cl, pas les 4 cl de la vodka seule). On ne garde que des nombres
// de 0 (exclu) à 100 cl ; tout le reste (vide, texte, tableau) est ignoré : le verre garde alors le volume du produit.
export const MAX_DERIVATIVE_VOLUME_CL = 100;
export function cleanDerivativeVolumes(raw) {
  const out = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    Object.entries(raw).forEach(([code, v]) => {
      if (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= MAX_DERIVATIVE_VOLUME_CL) out[code] = v;
    });
  }
  return out;
}

// Les dérivés qu'un produit peut devenir, dans l'ordre PROPRE À CE PRODUIT (celui de ses codes cochés dans la gestion : un rhum a le cola en premier,
// un gin le tonic) : seuls ceux qui existent encore (non supprimés, non masqués) ; un code en double compte une fois.
// `volumes` (facultatif) = les volumes de verre du produit : chaque dérivé porte alors `volumeCl` (null s'il n'en a pas pour ce produit).
export function derivativesForProduct(list, codes, volumes) {
  if (!list || !Array.isArray(codes) || codes.length === 0) return [];
  const byCode = new Map(list.items.map((d) => [d.code, d]));
  const out = [];
  const seen = new Set();
  for (const code of codes) {
    const d = typeof code === "string" ? byCode.get(code) : null;
    if (!d || seen.has(code)) continue;
    seen.add(code);
    out.push({ ...d, volumeCl: volumes && volumes[d.code] != null ? volumes[d.code] : null });
  }
  return out;
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

// Les volumes de verre des dérivés par produit, lus avec les dérivés cochés (loadDrinkDerivatives) et gardés ici pour la même raison : le
// ticket, l'historique et les lignes de statistiques n'ont pas le temps d'attendre une lecture. { identifiant du produit: { code: cl } }.
const rememberedVolumes = new Map();
export const rememberDerivativeVolumes = (productId, volumes) => {
  if (typeof productId === "string" && productId !== "") rememberedVolumes.set(productId, cleanDerivativeVolumes(volumes));
};
export const rememberedDerivativeVolume = (productId, variantCode) => rememberedVolumes.get(productId)?.[variantCode] ?? null;

// L'énergie (kcal/100ml) d'un dérivé saisie dans la gestion pour CE produit : { code du dérivé: kcal } (colonne drinks_directory.derivative_kcal). On ne garde que
// des nombres de 0 (inclus : un « zéro » peut valoir 0) à 900 ; tout le reste (vide, texte, tableau) est ignoré : le verre garde alors l'énergie du produit.
export const MAX_DERIVATIVE_KCAL = 900;
export function cleanDerivativeKcal(raw) {
  const out = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    Object.entries(raw).forEach(([code, v]) => {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX_DERIVATIVE_KCAL) out[code] = v;
    });
  }
  return out;
}

// Les énergies des dérivés par produit, lues avec les dérivés cochés (loadDrinkDerivatives) et gardées ici comme les volumes : { identifiant du produit: { code: kcal } }.
const rememberedKcal = new Map();
export const rememberDerivativeKcal = (productId, kcal) => {
  if (typeof productId === "string" && productId !== "") rememberedKcal.set(productId, cleanDerivativeKcal(kcal));
};
export const rememberedDerivativeKcal = (productId, variantCode) => rememberedKcal.get(productId)?.[variantCode] ?? null;

// L'énergie d'un verre : celle saisie pour CE produit et ce dérivé quand il y en a une, sinon celle du produit (qui peut être vide). Jamais une valeur propre au dérivé.
export function kcalPer100mlWithVariant(productKcal, productId, variantCode) {
  const own = variantCode ? rememberedDerivativeKcal(productId, variantCode) : null;
  return own != null ? own : productKcal ?? null;
}

// Le volume (texte du champ) après un clic sur une pastille, pour « Je me sers » et BibaSolo où la personne voit et peut corriger le volume.
// - le dérivé choisi a un volume sur la fiche (Vodka + Red Bull = 20 cl) : ce volume ;
// - on le quitte (autre dérivé sans volume, ou pastille décochée) alors que le champ affiche toujours ce volume : on revient à `volumeAvant`,
//   le volume qu'avait le verre avant le dérivé ;
// - sinon (pas de volume sur le dérivé, ou volume corrigé à la main depuis) : le champ n'est pas touché.
export function volumeAfterVariantChange({ currentText, previous, next, volumeAvant }) {
  if (next && next.volumeCl != null) return String(next.volumeCl);
  if (previous && previous.volumeCl != null && String(currentText ?? "").trim() === String(previous.volumeCl)) return String(volumeAvant ?? "");
  return String(currentText ?? "");
}

// Une entrée de carte (déjà résolue sur un volume) devenue le verre « entrée + dérivé » : son code, son nom (null si le dérivé n'existe
// plus ou si la liste n'est pas encore lue), l'énergie saisie pour ce produit et ce dérivé quand il y en a une (sinon celle du produit) et, pour un produit du répertoire,
// le volume du verre saisi dans la gestion pour ce produit et ce dérivé (Vodka + Red Bull = 20 cl) à la place du volume de l'entrée. Le prix
// ne change pas. Une entrée créée par « Je me sers » (`homeServed`) garde le volume saisi par la personne.
export function withDerivative(entry, variantCode) {
  if (!entry || !variantCode) return entry;
  const volumeCl = entry.fromDirectory && !entry.homeServed ? rememberedDerivativeVolume(entry.sourceDrinkId, variantCode) : null;
  return {
    ...entry,
    ...(volumeCl != null ? { volumeCl } : {}),
    variantCode,
    variantName: derivativeName(rememberedList, variantCode),
    kcalPer100ml: kcalPer100mlWithVariant(entry.kcalPer100ml, entry.fromDirectory ? entry.sourceDrinkId : null, variantCode),
  };
}

// Le libellé d'un verre dans un ticket ou un historique : « Jupiler · Mazout » (le nom du produit seul s'il n'a pas de dérivé).
export const drinkLabel = (entry) => (entry?.variantName ? `${entry.name} · ${entry.variantName}` : entry?.name);
