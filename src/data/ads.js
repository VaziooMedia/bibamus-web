import { supabase } from "../supabaseClient.js";

/* ---------------- ANNONCES (BANNIÈRES) ----------------
   Une annonce est une bannière 3:1 (ex. 1200 × 400 px) qui s'affiche de bord à bord sur l'accueil et dans le fil BibaPulse.
   Les annonces actives d'un emplacement ("home" ou "pulse") viennent de la fonction serveur `get_active_ads(p_placement)`
   (à créer côté base : voir docs/DATABASE.md). Tant qu'elle n'existe pas, ou qu'aucune annonce n'est active, la lecture
   renvoie une liste vide et RIEN ne s'affiche : aucune place réservée, aucun message d'erreur pour la personne. */

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

// Annonces actives d'un emplacement : [{ id, imageUrl, linkUrl, altText }] — l'ordre est celui du serveur (le serveur décide de la rotation / de la pondération).
// Une ligne sans image https ou sans lien https valide est ignorée. Toute erreur de lecture donne [] (consignée dans la console).
export async function loadActiveAds(placement) {
  if (!AD_PLACEMENTS.includes(placement)) return [];
  const { data, error } = await supabase.rpc("get_active_ads", { p_placement: placement });
  if (error || !Array.isArray(data)) {
    console.error("loadActiveAds:", error || "réponse inattendue");
    return [];
  }
  const ads = [];
  data.forEach((row) => {
    const imageUrl = httpsUrl(row?.image_url);
    const linkUrl = httpsUrl(row?.link_url);
    if (!row?.id || !imageUrl || !linkUrl) return;
    ads.push({ id: row.id, imageUrl, linkUrl, altText: typeof row.alt_text === "string" ? row.alt_text : "" });
  });
  return ads;
}
