import { supabase } from "../supabaseClient.js";

/* ---------------- ANNONCES (BANNIÈRES) ----------------
   Une annonce est une bannière 3:1 (ex. 1200 × 400 px) qui s'affiche de bord à bord sur l'accueil et dans le fil BibaPulse.
   Les annonces actives d'un emplacement ("home" ou "pulse") viennent de la fonction serveur `get_active_ads(p_placement)`
   (voir docs/DATABASE.md, « Annonces »), qui applique l'interrupteur, les dates et les emplacements de chaque annonce et les
   réglages de la table ad_settings. Quand aucune annonce n'est active, ou que la lecture échoue, la liste est vide et RIEN ne
   s'affiche : aucune place réservée, aucun message d'erreur pour la personne. */

export const AD_PLACEMENTS = ["home", "pulse"];

// Une adresse n'est acceptée que si elle est en https (une image ou un lien en http, ou un « javascript: », est écarté).
function httpsUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

// Valeurs de repli (réglages de départ de la table ad_settings) quand le serveur ne les renvoie pas ou renvoie une valeur hors limites.
export const AD_DEFAULT_EVERY_N = 10;
export const AD_DEFAULT_CAROUSEL_SECONDS = 5;

const intInRange = (value, min, max, fallback) => (Number.isInteger(value) && value >= min && value <= max ? value : fallback);

// Annonces actives d'un emplacement : { ads: [{ id, imageUrl, linkUrl, altText, showLabel }], everyN, carouselSeconds } — l'ordre est celui du serveur
// (`sort_order`). `everyN` (une annonce toutes les N publications, Pulse, au moins 3) et `carouselSeconds` (durée de chaque annonce du carrousel de l'accueil,
// 2 à 60) viennent de la table ad_settings, via la même fonction. Une ligne sans image https ou sans lien https valide est ignorée.
// Toute erreur de lecture donne aucune annonce (consignée dans la console) : rien ne s'affiche.
export async function loadActiveAds(placement) {
  const none = { ads: [], everyN: AD_DEFAULT_EVERY_N, carouselSeconds: AD_DEFAULT_CAROUSEL_SECONDS };
  if (!AD_PLACEMENTS.includes(placement)) return none;
  const { data, error } = await supabase.rpc("get_active_ads", { p_placement: placement });
  if (error || !Array.isArray(data)) {
    console.error("loadActiveAds:", error || "réponse inattendue");
    return none;
  }
  const ads = [];
  data.forEach((row) => {
    const imageUrl = httpsUrl(row?.image_url);
    const linkUrl = httpsUrl(row?.link_url);
    if (!row?.id || !imageUrl || !linkUrl) return;
    ads.push({ id: row.id, imageUrl, linkUrl, altText: typeof row.alt_text === "string" ? row.alt_text : "", showLabel: row.show_label === true });
  });
  const first = data[0] || {};
  return {
    ads,
    everyN: intInRange(first.every_n, 3, 1000, AD_DEFAULT_EVERY_N),
    carouselSeconds: intInRange(first.carousel_seconds, 2, 60, AD_DEFAULT_CAROUSEL_SECONDS),
  };
}

/* ---------------- COMPTAGE (affichages et clics) ----------------
   Compteurs ANONYMES par annonce, emplacement et jour (décidé par Mehdi, 2026-11-21) : table `ad_stats_daily`, alimentée par la fonction serveur
   `track_ad_event(p_ad_id, p_placement, p_event)` (voir docs/DATABASE.md, « Annonces »). Aucune donnée sur la personne n'est envoyée.
   Règles : un affichage = la bannière est vue pour moitié au moins pendant 1 seconde (voir AdBanner), compté UNE seule fois par annonce et par emplacement
   et par ouverture de l'app ; un clic = chaque appui sur la bannière. Un échec de comptage ne se voit jamais : la bannière s'affiche comme si de rien n'était. */

const countedImpressions = new Set();

async function sendAdEvent(adId, placement, event) {
  try {
    const { error } = await supabase.rpc("track_ad_event", { p_ad_id: adId, p_placement: placement, p_event: event });
    if (error) console.debug("track_ad_event:", error.message);
  } catch (e) {
    console.debug("track_ad_event:", e);
  }
}

export function trackAdImpression(adId, placement) {
  if (!adId || !AD_PLACEMENTS.includes(placement)) return;
  const key = `${placement}:${adId}`;
  if (countedImpressions.has(key)) return;
  countedImpressions.add(key);
  sendAdEvent(adId, placement, "impression");
}

export function trackAdClick(adId, placement) {
  if (!adId || !AD_PLACEMENTS.includes(placement)) return;
  sendAdEvent(adId, placement, "click");
}
