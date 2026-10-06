import { supabase } from "../supabaseClient.js";
import { loadDrinksByIds, loadBreweriesByIds } from "./sharedDirectories.js";

/* ---------------- LECTURE D'ÉTIQUETTE PAR IA ----------------
   La photo (déjà préparée, voir labelScanPhoto.js) est lue par la fonction serveur « read-label » :
   l'IA ne fait que LIRE ce qui est imprimé. L'utilisateur confirme ou corrige le texte lu, puis la
   recherche (fonction SQL search_drinks_by_label) propose des produits du catalogue. Rien n'est jamais
   lié ni créé sans un choix explicite de l'utilisateur. */

const READ_TIMEOUT_MS = 45000;

const ERROR_MESSAGES = {
  unauthorized: "Votre session a expiré. Reconnectez-vous, puis réessayez.",
  daily_limit: "Vous avez atteint la limite de lectures d'étiquettes pour aujourd'hui. Réessayez demain, ou cherchez le produit à la main.",
  too_large: "La photo est trop lourde. Reprenez-la.",
  bad_image: "Ce fichier n'est pas une photo exploitable. Reprenez la photo.",
  provider_error: "Le service de lecture est momentanément indisponible. Réessayez dans un instant.",
  invalid_output: "La lecture a échoué. Réessayez, ou reprenez la photo.",
  timeout: "La lecture prend trop de temps. Réessayez.",
  network: "Connexion impossible. Vérifiez votre réseau, puis réessayez.",
  prepare: "Cette photo n'a pas pu être traitée. Reprenez-la.",
  search: "La recherche a échoué. Réessayez.",
};
export function labelErrorMessage(code) {
  return ERROR_MESSAGES[code] || "Une erreur est survenue. Réessayez.";
}

// Lit l'étiquette. Retourne { ok: true, reading, suggestedQuery, suggestedAbv, remaining } ou { ok: false, code }.
export async function readLabelPhoto(imageBase64, { signal } = {}) {
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  if (signal) {
    if (signal.aborted) return { ok: false, code: "aborted" };
    signal.addEventListener("abort", onAbort, { once: true });
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctl.abort();
  }, READ_TIMEOUT_MS);
  try {
    const { data, error } = await supabase.functions.invoke("read-label", { body: { imageBase64 }, signal: ctl.signal });
    if (error) {
      if (timedOut) return { ok: false, code: "timeout" };
      if (signal?.aborted) return { ok: false, code: "aborted" };
      let code = null;
      try {
        const body = await error.context?.json?.();
        code = body?.code || null;
      } catch (e) {
        // corps vide ou non JSON : on retombe sur « réseau »
      }
      return { ok: false, code: code || "network" };
    }
    if (!data?.reading) return { ok: false, code: "invalid_output" };
    return { ok: true, scanId: data.scan_id || null, reading: data.reading, suggestedQuery: data.suggested_query || "", suggestedAbv: data.suggested_abv ?? null, remaining: data.remaining ?? null };
  } catch (e) {
    if (timedOut) return { ok: false, code: "timeout" };
    if (signal?.aborted) return { ok: false, code: "aborted" };
    return { ok: false, code: "network" };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

// Cherche dans le catalogue avec les mots lus (confirmés par l'utilisateur) et le degré lu.
// Retourne { ok: true, candidates: [{ id, name, brewery, abv, type, score }] } du meilleur au moins bon.
export async function searchDrinksByLabel(query, abv = null, limit = 5) {
  const q = (query || "").trim();
  if (!q) return { ok: true, candidates: [] };
  const { data, error } = await supabase.rpc("search_drinks_by_label", { p_query: q, p_abv: Number.isFinite(abv) ? abv : null, p_limit: limit });
  if (error) {
    console.error("searchDrinksByLabel:", error);
    return { ok: false, code: "search" };
  }
  return { ok: true, candidates: (data || []).map((r) => ({ id: r.id, name: r.name, brewery: r.brewery, abv: r.abv, type: r.type, score: r.score })) };
}

// Complète les produits proposés avec ce qu'il faut pour les reconnaître d'un coup d'œil : photo (rond-profil), pays,
// ABV, étiquettes (0.0 %, bio, sans gluten) et noms des producteurs. Ne retarde jamais les résultats : au bout de
// timeoutMs, ou si le chargement échoue, les produits sont affichés avec ce que la recherche a déjà donné.
// Retourne la même liste, chaque produit ayant en plus { drink: fiche complète ou null, producers: [noms] }.
export async function enrichCandidates(candidates, { timeoutMs = 1500 } = {}) {
  const basic = candidates.map((c) => ({ ...c, drink: null, producers: c.brewery ? [c.brewery] : [] }));
  if (basic.length === 0) return basic;
  const load = (async () => {
    const drinks = await loadDrinksByIds(candidates.map((c) => c.id));
    if (!drinks.length) return basic;
    const byId = new Map(drinks.map((d) => [d.id, d]));
    const producerIds = [...new Set(drinks.flatMap((d) => d.producerIds || []))];
    const producers = producerIds.length ? await loadBreweriesByIds(producerIds) : [];
    const nameById = new Map(producers.map((p) => [p.id, p.name]));
    return candidates.map((c) => {
      const drink = byId.get(c.id) || null;
      const names = (drink?.producerIds || []).map((id) => nameById.get(id)).filter(Boolean);
      return { ...c, drink, producers: names.length ? names : c.brewery ? [c.brewery] : [] };
    });
  })().catch(() => basic);
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(basic), timeoutMs);
  });
  try {
    return await Promise.race([load, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- Mesure continue : ce que l'utilisateur confirme et choisit ----------------
   Enregistré dans le journal des lectures (sans image), pour savoir si le bon produit était proposé, à quelle place, et ce
   qui a été corrigé. Ne bloque jamais l'écran : un échec d'enregistrement est ignoré. */

// Une recherche vient d'être faite avec ce texte (éventuellement corrigé), ce degré, et ces produits proposés dans l'ordre.
export function reportLabelSearch({ scanId, text, abv = null, shownIds = [] }) {
  if (!scanId) return Promise.resolve(false);
  return supabase
    .rpc("report_label_search", { p_scan_id: scanId, p_confirmed_text: text, p_confirmed_abv: Number.isFinite(abv) ? abv : null, p_shown_ids: shownIds })
    .then(({ error }) => !error)
    .catch(() => false);
}

// Issue de la lecture : « chosen » (produit choisi), « none » (aucun de ceux-là) ou « abandoned » (fermé sans choisir).
export function reportLabelOutcome({ scanId, outcome, drinkId = null }) {
  if (!scanId) return Promise.resolve(false);
  return supabase
    .rpc("report_label_outcome", { p_scan_id: scanId, p_outcome: outcome, p_chosen_drink_id: outcome === "chosen" ? drinkId : null })
    .then(({ error }) => !error)
    .catch(() => false);
}

/* ---------------- Aides de présentation ---------------- */

// Valeurs que l'IA écrit parfois à la place d'un champ vide (« null », « N/A »…) : elles ne sont jamais un nom de produit.
const EMPTY_VALUES = ["null", "undefined", "none", "n/a", "nil"];
const isEmptyText = (v) => typeof v !== "string" || !v.trim() || EMPTY_VALUES.includes(v.trim().toLowerCase());
const DROPPED_WORDS = new Set(["null", "undefined"]);

const normalizeWord = (w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Retire les mots répétés (« MALMEDY TRIPLE Triple » → « MALMEDY TRIPLE »), sans tenir compte des
// majuscules ni des accents, les signes seuls (« - ») et les mots « null » / « undefined » laissés par l'IA.
export function dedupeWords(text) {
  const seen = new Set();
  const out = [];
  for (const w of String(text || "").split(/\s+/)) {
    const k = normalizeWord(w);
    if (!k || seen.has(k) || DROPPED_WORDS.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  return out.join(" ");
}

// Texte proposé à la confirmation : marque + nom + variante lus, sans mot répété. Si l'IA n'a rien pu
// ranger dans ces champs mais a lu du texte (étiquette en partie cachée), on propose ce texte brut
// (lignes complètes seulement, 8 mots au plus) pour que l'utilisateur le corrige.
export function buildLabelQuery(reading) {
  const parts = [reading?.brand_text, reading?.product_name_text, reading?.variant_text].filter((x) => !isEmptyText(x));
  const joined = dedupeWords(parts.join(" "));
  if (joined) return joined;
  const lines = String(reading?.raw_label_text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !isEmptyText(l) && !/[\[\]]|\.\.\./.test(l));
  return dedupeWords(lines.join(" ")).split(" ").filter(Boolean).slice(0, 8).join(" ");
}

const FIELD_LABELS = {
  brand_text: "la marque",
  product_name_text: "le nom",
  variant_text: "la variante",
  producer_text: "le producteur",
  abv_percent: "le degré",
  container_volume_ml: "le volume",
  vintage_year: "le millésime",
};
// Champs sur lesquels l'IA a signalé un doute, en français (« la marque », « le degré »…).
export function uncertainFieldLabels(reading) {
  return (reading?.uncertain_fields || []).map((f) => FIELD_LABELS[f]).filter(Boolean);
}

// Conseil de prise de vue quand l'IA signale une photo difficile.
export function photoAdvice(reading) {
  const w = reading?.warnings || [];
  if (w.includes("blur")) return "La photo semble floue : si le texte lu est incomplet, reprenez-la plus nette.";
  if (w.includes("glare")) return "Un reflet gêne la lecture : si le texte lu est incomplet, reprenez la photo en évitant le reflet.";
  if (w.includes("low_light")) return "La photo semble sombre : si le texte lu est incomplet, reprenez-la mieux éclairée.";
  if (w.includes("partial_label")) return "L'étiquette n'est que partiellement visible : si le texte lu est incomplet, reprenez la photo.";
  return null;
}

// Message quand la photo n'est pas exploitable (statut de l'image rendu par l'IA).
export function unusablePhotoMessage(status) {
  if (status === "multiple_products") return "Plusieurs produits apparaissent sur la photo. Photographiez une seule bouteille ou canette à la fois.";
  if (status === "no_label") return "Aucune étiquette n'est visible sur cette photo.";
  return "L'étiquette n'est pas lisible sur cette photo.";
}
