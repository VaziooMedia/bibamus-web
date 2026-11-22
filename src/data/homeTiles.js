import { supabase } from "../supabaseClient.js";

/* ---------------- BOUTONS DE L'ACCUEIL (BibaClub, BibaCal, BibaPlay, BibaMeet, BibaCare, BibaFlash) ----------------
   Table `home_tiles` (voir docs/DATABASE.md, « Boutons de l'accueil ») : une ligne par bouton, réglée depuis la plateforme de gestion
   (Système → Affichage) pour tous les pays à la fois :
     - `status`     : "active" (cliquable), "soon" (grisé : assombri, badge « Soon », non cliquable) ou "hidden" (n'apparaît pas) ;
     - `sort_order` : la place du bouton dans la grille (1 = en haut à gauche, puis de gauche à droite, ligne par ligne) ;
     - `subtitle`   : le sous-titre à la place de celui d'origine (vide ou absent = celui d'origine, écrit dans HomeScreen.jsx).
   Tant que la lecture n'a pas répondu, ou si elle échoue (table absente, réseau), l'accueil garde le dernier état connu de cet appareil, sinon
   l'état d'origine ci-dessous (celui d'avant la table) : jamais de message d'erreur pour la personne. */

export const HOME_TILE_KEYS = ["club", "cal", "play", "meet", "care", "flash"];

// Réglage d'origine (celui de l'accueil avant la table `home_tiles`) : état de chaque bouton, ordre de la grille, aucun sous-titre personnalisé.
export const HOME_TILE_DEFAULTS = {
  status: { club: "active", cal: "soon", play: "soon", meet: "soon", care: "soon", flash: "soon" },
  order: [...HOME_TILE_KEYS],
  subtitles: {},
};

const STATUSES = ["active", "soon", "hidden"];
const SUBTITLE_MAX = 50;
const CACHE_KEY = "bibamus.homeTiles.v2";
const OLD_CACHE_KEY = "bibamus.homeTiles"; // première version : seulement { clé: état }

// Une valeur inconnue ou absente retombe sur le réglage d'origine du bouton. L'ordre suit `sort_order` (entier) ; à égalité, ou sans valeur,
// l'ordre d'origine.
function normalize(rows) {
  const status = { ...HOME_TILE_DEFAULTS.status };
  const rank = {};
  const subtitles = {};
  HOME_TILE_KEYS.forEach((k, i) => {
    rank[k] = i + 1;
  });
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || !HOME_TILE_KEYS.includes(row.tile_key)) return;
    if (STATUSES.includes(row.status)) status[row.tile_key] = row.status;
    if (Number.isInteger(row.sort_order) && row.sort_order > 0) rank[row.tile_key] = row.sort_order;
    if (typeof row.subtitle === "string") {
      const text = row.subtitle.trim().slice(0, SUBTITLE_MAX);
      if (text) subtitles[row.tile_key] = text;
    }
  });
  const order = [...HOME_TILE_KEYS].sort((a, b) => rank[a] - rank[b] || HOME_TILE_KEYS.indexOf(a) - HOME_TILE_KEYS.indexOf(b));
  return { status, order, subtitles };
}

// Dernier réglage reçu sur cet appareil (confort par appareil : l'accueil s'affiche tout de suite dans le bon état au lieu de clignoter).
export function getCachedHomeTiles() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalize(
        Object.entries(parsed || {}).map(([tile_key, v]) => ({ tile_key, status: v && v.status, sort_order: v && v.order, subtitle: v && v.subtitle }))
      );
    }
    const old = localStorage.getItem(OLD_CACHE_KEY);
    if (old) return normalize(Object.entries(JSON.parse(old) || {}).map(([tile_key, status]) => ({ tile_key, status })));
    return null;
  } catch {
    return null;
  }
}

// Réglage des boutons : { status: { club: "active" | "soon" | "hidden", ... }, order: ["club", ...], subtitles: { club: "…" } }.
// En cas d'échec : null (l'appelant garde ce qu'il affiche). `select("*")` : la lecture marche aussi tant que les colonnes `sort_order` et `subtitle` n'existent pas.
export async function loadHomeTiles() {
  const { data, error } = await supabase.from("home_tiles").select("*");
  if (error) {
    console.error("loadHomeTiles:", error);
    return null;
  }
  const tiles = normalize(data);
  try {
    const cache = {};
    (data || []).forEach((row) => {
      if (row && HOME_TILE_KEYS.includes(row.tile_key)) cache[row.tile_key] = { status: row.status, order: row.sort_order, subtitle: row.subtitle };
    });
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* stockage indisponible : sans importance */
  }
  return tiles;
}
