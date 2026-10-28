// ============================================================
// Aperçus de partage des liens bibamus.app/@nom — le travail de la fonction Vercel api/at.js.
//
// Qui l'appelle : seulement les ROBOTS (WhatsApp, Messenger, Google, Telegram, Slack...) quand ils demandent un lien
// /@nom ; vercel.json leur réserve cette route. Une personne qui ouvre le lien n'est jamais routée ici : elle reçoit
// directement l'app, comme avant. Cette fonction ne peut donc pas, même en panne, empêcher quelqu'un d'ouvrir un lien.
//
// Ce qu'elle fait : prend la page d'accueil de l'app (index.html), demande à la base la carte publique de ce @nom
// (get_public_card : seulement une fiche « complet », jamais un compte), puis renvoie cette même page avec un titre, une
// description et une image adaptés à la fiche.
//   - fiche « complet » trouvée   -> aperçu riche (nom, type, ville, photo), indexable par Google ;
//   - compte, nom inconnu, fiche pas encore « complet », nom invalide -> page générique IDENTIQUE, non indexée ;
//   - panne de la base ou de la page de base -> réponse 503 (« réessaie plus tard »), jamais mise en cache : un robot
//     ne retient ainsi pas une page générique à la place de la vraie.
// ============================================================
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabaseConfig.js";
import { cardHeadTags, genericHeadTags, GENERIC_TITLE, injectHead, isPublicUsername, PUBLIC_SITE_URL, publicCardTexts } from "./publicCard.js";
import { customNames, VENUE_TYPE_LIST_KEY } from "./venueLists.js";
import { PRODUCER_TYPE_LIST_KEY } from "./producerLists.js";

// La liste de types modifiable de chaque genre de fiche qui en a une (une marque n'en a pas).
const TYPE_LIST_KEYS = { venue: VENUE_TYPE_LIST_KEY, brewery: PRODUCER_TYPE_LIST_KEY };
const typeListKeyFor = (kind) => (typeof kind === "string" && Object.prototype.hasOwnProperty.call(TYPE_LIST_KEYS, kind) ? TYPE_LIST_KEYS[kind] : null);

const TIMEOUT_MS = 3000;
// Les noms de types sont un détail de l'aperçu : on ne leur laisse que 1,5 s (en plus de la carte), pour qu'un robot ne
// patiente jamais beaucoup plus de 4,5 s au total.
const TYPE_NAMES_TIMEOUT_MS = 1500;

// Le robot peut revenir dans 5 minutes pour une fiche, 1 minute pour une page générique (une fiche qui vient de passer
// « complet » ne reste pas longtemps invisible). Jamais de cache pour une panne.
const CACHE_CARD = "public, max-age=0, s-maxage=300, stale-while-revalidate=3600";
const CACHE_GENERIC = "public, max-age=0, s-maxage=60";

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
  // La même adresse donne l'app aux personnes et cette page aux robots.
  vary: "User-Agent",
};

// La page de base est lue sur le site lui-même. L'adresse vient de la requête, mais seuls nos domaines (et les
// déploiements d'essai de Vercel) sont acceptés ; tout le reste retombe sur le site officiel.
export function trustedOrigin(host) {
  const h = String(host || "").toLowerCase();
  if (h === "bibamus.app" || h === "www.bibamus.app") return `https://${h}`;
  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app$/.test(h)) return `https://${h}`;
  return PUBLIC_SITE_URL;
}

// Appel réseau borné dans le temps, lecture de la réponse comprise (un serveur qui répond puis se tait ne bloque pas
// la fonction). Rend ce que `read` tire de la réponse, ou null si la réponse n'est pas un succès.
async function timedRequest(fetchImpl, url, init, timeoutMs, read) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    return res.ok ? await read(res) : null;
  } finally {
    clearTimeout(timer);
  }
}

// La page d'accueil de l'app, ou null si on ne l'obtient pas telle quelle (panne, page de connexion de Vercel sur un
// déploiement protégé, redirection...). On reconnaît la vraie page à son point d'ancrage de l'app (id="root").
async function fetchBaseHtml(origin, fetchImpl, timeoutMs) {
  try {
    const html = await timedRequest(fetchImpl, `${origin}/index.html`, { method: "GET", headers: { accept: "text/html" } }, timeoutMs, (res) => res.text());
    return typeof html === "string" && html.length < 200000 && /id\s*=\s*["']root["']/.test(html) && /<\/head>/i.test(html) ? html : null;
  } catch {
    return null;
  }
}

// { card } (une ligne ou null) ou { error: true } si la base n'a pas répondu correctement.
async function fetchCard(name, fetchImpl, timeoutMs) {
  try {
    const rows = await timedRequest(
      fetchImpl,
      `${SUPABASE_URL}/rest/v1/rpc/get_public_card`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ p_username: name }),
      },
      timeoutMs,
      (res) => res.json(),
    );
    return Array.isArray(rows) ? { card: rows.length > 0 ? rows[0] : null } : { error: true };
  } catch {
    return { error: true };
  }
}

// Les noms des types d'établissement ou de producteur enregistrés par la plateforme de gestion (types ajoutés ou renommés),
// ou null si la lecture échoue : l'aperçu garde alors les noms de départ. Ce n'est jamais une panne (la carte, elle, reste
// indispensable). `listKey` : VENUE_TYPE_LIST_KEY ou PRODUCER_TYPE_LIST_KEY.
async function fetchTypeNames(listKey, fetchImpl, timeoutMs) {
  try {
    const rows = await timedRequest(
      fetchImpl,
      `${SUPABASE_URL}/rest/v1/custom_list_items?select=code,fr,hidden&list_key=eq.${listKey}`,
      { method: "GET", headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}`, accept: "application/json" } },
      timeoutMs,
      (res) => res.json(),
    );
    return Array.isArray(rows) ? customNames(rows) : null;
  } catch {
    return null;
  }
}

function unavailable(baseHtml, isHead) {
  const headers = { "cache-control": "no-store", "retry-after": "120", "x-content-type-options": "nosniff" };
  if (baseHtml) {
    // Les robots lisent le 503 ; une personne qui tomberait ici malgré tout verrait quand même l'app.
    return new Response(isHead ? null : baseHtml, { status: 503, headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
  }
  return new Response(isHead ? null : "Service momentanément indisponible. Réessaie dans quelques minutes.", {
    status: 503,
    headers: { ...headers, "content-type": "text/plain; charset=utf-8" },
  });
}

export async function handlePublicLink(request, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = {}) {
  const isHead = request.method === "HEAD";
  if (request.method !== "GET" && !isHead) {
    return new Response("Méthode non permise.", { status: 405, headers: { allow: "GET, HEAD", "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" } });
  }

  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  const origin = trustedOrigin(url.host);

  const [baseHtml, found] = await Promise.all([
    fetchBaseHtml(origin, fetchImpl, timeoutMs),
    isPublicUsername(name) ? fetchCard(name, fetchImpl, timeoutMs) : Promise.resolve({ card: null }),
  ]);
  if (!baseHtml) return unavailable(null, isHead);
  if (found.error) return unavailable(baseHtml, isHead);

  // Pour un lieu ou un producteur seulement (une marque n'a pas de liste de types modifiable).
  const typeListKey = found.card ? typeListKeyFor(found.card.kind) : null;
  const typeNames = typeListKey ? await fetchTypeNames(typeListKey, fetchImpl, Math.min(timeoutMs, TYPE_NAMES_TIMEOUT_MS)) : null;
  const texts = found.card ? publicCardTexts(found.card, typeNames) : null;
  const html = texts ? injectHead(baseHtml, texts.title, cardHeadTags(texts)) : injectHead(baseHtml, GENERIC_TITLE, genericHeadTags());
  if (!html) return unavailable(null, isHead);

  return new Response(isHead ? null : html, { status: 200, headers: { ...HTML_HEADERS, "cache-control": texts ? CACHE_CARD : CACHE_GENERIC } });
}
