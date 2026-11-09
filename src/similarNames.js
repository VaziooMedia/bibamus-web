// ============================================================
// Détection fine des doublons d'un nom (assistants d'ajout d'un Produit et d'un Lieu).
//
// La recherche du serveur (`search_drinks`, `search_venues`) ne renvoie une fiche que si CHAQUE mot tapé s'y retrouve : « Orval Trappiste
// Extra » ne remonte donc pas « Orval Extra », et « Orvall » (faute) ne remonte pas « Orval ». Ici, on interroge aussi le serveur avec le
// début de chaque mot (les plus longs, 3 au maximum), puis on classe tout ce qui revient par ressemblance avec le nom tapé, côté appli :
// aucune modification de la base.
//   - mots (sans articles) retrouvés à une faute près (1 faute dès 5 lettres, 2 dès 8), coefficient de Dice sur les mots ;
//   - coefficient de Dice sur les groupes de 3 lettres du nom compacté (fautes, mots collés ou séparés) ;
//   - un nom contenu dans l'autre (4 lettres au moins) vaut 0,85.
// Les fiches que la recherche directe (tous les mots) renvoie déjà restent toujours proposées, comme avant.
// Limite connue : une faute sur les premières lettres d'un mot (« Arval ») n'est pas rattrapée.
// ============================================================
import { searchTokens, compactSearchText, normalizeSearchText } from "./utils.js";

export const SIMILARITY_THRESHOLD = 0.6;

const STOP_WORDS = new Set(["le", "la", "les", "l", "de", "du", "des", "d", "et", "the", "a", "au", "aux"]);
const significantTokens = (s) => searchTokens(s).filter((t) => !STOP_WORDS.has(t));

const trigrams = (s) => {
  const padded = `  ${s} `;
  const set = new Set();
  for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
  return set;
};
const dice = (a, b) => {
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  a.forEach((x) => {
    if (b.has(x)) common++;
  });
  return (2 * common) / (a.size + b.size);
};

const editDistanceAtMost = (a, b, max) => {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length] <= max;
};
const allowedTypos = (token) => (token.length >= 8 ? 2 : token.length >= 5 ? 1 : 0);

// Ressemblance de deux noms, de 0 à 1 (1 = mêmes mots, aux articles, accents et ponctuation près).
export function nameSimilarity(a, b) {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const ka = ta.join("");
  const kb = tb.join("");
  if (ka === kb) return 1;

  const [shorter, longer] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  const containment = shorter.length >= 4 && longer.includes(shorter) ? 0.85 : 0;

  const free = [...tb];
  let matched = 0;
  ta.forEach((t) => {
    const i = free.findIndex((u) => u === t || editDistanceAtMost(t, u, Math.min(allowedTypos(t), allowedTypos(u))));
    if (i >= 0) {
      matched++;
      free.splice(i, 1);
    }
  });
  const tokenDice = (2 * matched) / (ta.length + tb.length);

  return Math.max(containment, tokenDice, dice(trigrams(ka), trigrams(kb)));
}

// Début d'un mot à envoyer au serveur pour rattraper une faute de frappe en fin de mot.
const probeFor = (token) => token.slice(0, Math.max(4, Math.ceil(token.length * 0.6)));

// `fetcher(texte, limite)` est la recherche du serveur (searchDrinks ou searchVenues). Retourne au plus `limit` fiches, les plus
// ressemblantes d'abord ; chaque fiche garde ses champs et reçoit `similarity` (0 à 1).
export async function findSimilarNames(query, fetcher, limit = 5) {
  const q = (query || "").trim();
  if (!q) return [];
  const probes = [...new Set(significantTokens(q).filter((t) => t.length >= 3).sort((a, b) => b.length - a.length).slice(0, 3).map(probeFor))].filter(
    (p) => p !== compactSearchText(normalizeSearchText(q))
  );
  const [direct, ...others] = await Promise.all([fetcher(q, 30), ...probes.map((p) => fetcher(p, 20))]);
  const byId = new Map();
  direct.forEach((item) => byId.set(item.id, { item, score: Math.max(SIMILARITY_THRESHOLD, nameSimilarity(q, item.name)) }));
  others.flat().forEach((item) => {
    if (byId.has(item.id)) return;
    const score = nameSimilarity(q, item.name);
    if (score >= SIMILARITY_THRESHOLD) byId.set(item.id, { item, score });
  });
  return [...byId.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, score }) => ({ ...item, similarity: score }));
}
