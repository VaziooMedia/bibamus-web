// ============================================================
// Cadre du lieu choisi sur la carte « Lieux sur la carte » : les règles pures (sans écran), pour pouvoir les tester seules.
// ============================================================

// Au plus ce nombre de tags de type d'établissement sont montrés dans le cadre ; les suivants se résument en « +N ».
export const MAP_CARD_MAX_TYPE_TAGS = 4;

// Ouvert / fermé à l'instant, d'après les horaires de Google (la seule source des horaires). Rend « open », « closed », ou
// null quand on ne sait pas (pas de lieu Google lié, lien invalide, Google injoignable, réponse sans « ouvert maintenant ») :
// dans ce cas aucune pastille n'est montrée, jamais une pastille inventée. Un lieu fermé définitivement ou temporairement
// est « fermé », même si Google n'a pas donné d'« ouvert maintenant ».
export function openStatusOf(hours) {
  if (!hours) return null;
  if (hours.status === "ERROR" || hours.status === "LINK_REQUIRED" || hours.status === "LINK_INVALID") return null;
  if (hours.closedPermanently || hours.closedTemporarily) return "closed";
  if (hours.isOpenNow === true) return "open";
  if (hours.isOpenNow === false) return "closed";
  return null;
}

// Les tags de type à montrer : les noms présentables (un type sans nom connu est null : écarté ici), au plus
// MAP_CARD_MAX_TYPE_TAGS, et le nombre de ceux qui ne tiennent pas.
export function splitTypeTags(labels, max = MAP_CARD_MAX_TYPE_TAGS) {
  const all = (labels || []).filter((l) => typeof l === "string" && l.trim() !== "");
  return { shown: all.slice(0, max), extra: Math.max(0, all.length - max) };
}

// Phrase lue par les lecteurs d'écran pour le cadre entier (un bouton : son contenu visuel ne suffit pas à dire où il mène).
export function mapCardLabel(name, status) {
  const base = `Voir la fiche de ${name}`;
  if (status === "open") return `${base}, ouvert`;
  if (status === "closed") return `${base}, fermé`;
  return base;
}
