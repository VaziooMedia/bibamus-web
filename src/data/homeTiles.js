import { supabase } from "../supabaseClient.js";

/* ---------------- BOUTONS DE L'ACCUEIL (BibaClub, BibaCal, BibaPlay, BibaMeet, BibaCare, BibaFlash) ----------------
   Table `home_tiles` (voir docs/DATABASE.md, « Boutons de l'accueil ») : une ligne par bouton, avec un état réglé depuis la plateforme de gestion
   (page « Home ») pour tous les pays à la fois :
     - "active" : le bouton est cliquable ;
     - "soon"   : le bouton est grisé (assombri, badge « Soon », non cliquable) ;
     - "hidden" : le bouton n'apparaît pas.
   Tant que la lecture n'a pas répondu, ou si elle échoue (table absente, réseau), l'accueil garde le dernier état connu de cet appareil, sinon
   l'état d'origine ci-dessous (celui d'avant la table) : jamais de message d'erreur pour la personne. */

export const HOME_TILE_KEYS = ["club", "cal", "play", "meet", "care", "flash"];

// État d'origine de chaque bouton (celui de l'accueil avant la table `home_tiles`).
export const HOME_TILE_DEFAULTS = { club: "active", cal: "soon", play: "soon", meet: "soon", care: "soon", flash: "soon" };

const STATUSES = ["active", "soon", "hidden"];
const CACHE_KEY = "bibamus.homeTiles";

// Une valeur inconnue ou absente retombe sur l'état d'origine du bouton.
function normalize(rows) {
  const tiles = { ...HOME_TILE_DEFAULTS };
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (row && HOME_TILE_KEYS.includes(row.tile_key) && STATUSES.includes(row.status)) tiles[row.tile_key] = row.status;
  });
  return tiles;
}

// Dernier état reçu sur cet appareil (confort par appareil : l'accueil s'affiche tout de suite dans le bon état au lieu de clignoter).
export function getCachedHomeTiles() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalize(Object.entries(parsed || {}).map(([tile_key, status]) => ({ tile_key, status })));
  } catch {
    return null;
  }
}

// État de chaque bouton : { club: "active" | "soon" | "hidden", ... }. En cas d'échec : null (l'appelant garde ce qu'il affiche).
export async function loadHomeTiles() {
  const { data, error } = await supabase.from("home_tiles").select("tile_key, status");
  if (error) {
    console.error("loadHomeTiles:", error);
    return null;
  }
  const tiles = normalize(data);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tiles));
  } catch {
    /* stockage indisponible : sans importance */
  }
  return tiles;
}
