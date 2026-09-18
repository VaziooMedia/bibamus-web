// ============================================================
// Profil public d'un Bibax — la projection visible par les autres.
//
// Fichier séparé de sharedDirectories.js : il n'y a ici qu'une fonction, et
// isoler ce chargement évite de toucher à un fichier de deux mille lignes
// pour vingt lignes de code.
//
// Toute la confidentialité est appliquée côté base (lookup_bibro_code) : un
// champ absent signifie que la personne ne le partage pas, jamais qu'il a été
// oublié. Ne jamais compléter ce qui manque par une autre source.
// ============================================================

import { supabase } from "../supabaseClient.js";

// Les codes pays sont stockés en minuscules avec underscores (ex. "pays_bas") — converti ici
// en libellé lisible ("Pays-Bas") pour l'affichage et la correspondance avec les drapeaux.
function prettifyCountry(raw) {
  return raw
    ? raw
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("-")
    : null;
}

export async function loadPublicProfile(bibroCode) {
  const { data, error } = await supabase.rpc("lookup_bibro_code", { p_code: bibroCode });
  if (error) {
    console.error("loadPublicProfile:", error);
    return undefined; // undefined = échec ; null = profil introuvable ou bloqué
  }
  const row = data?.[0];
  if (!row || !row.display_name) return null;
  return {
    userId: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    bio: row.bio,
    city: row.city,
    locality: row.locality,
    country: prettifyCountry(row.country),
    birthDate: row.birth_date,
    shareAge: row.share_age,
    registeredAt: row.registered_at,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    snapchatUrl: row.snapchat_url,
    whatsappUrl: row.whatsapp_url,
    xUrl: row.x_url,
    threadsUrl: row.threads_url,
    linkedinUrl: row.linkedin_url,
    pinterestUrl: row.pinterest_url,
    twitchUrl: row.twitch_url,
    mutualBibaxCount: row.mutual_bibax_count || 0,
  };
}

// Où en est ma relation avec cette personne : none | sent | received | accepted.
// Renvoyé par la base plutôt que deviné ici : la fiche publique n'a pas accès à la liste des
// relations, et l'action proposée doit être juste dès l'ouverture de l'écran.
export async function loadBibaxRelationStatus(otherUserId) {
  if (!otherUserId) return { status: "none", relationshipId: null };
  const { data, error } = await supabase.rpc("get_bibax_relation_status", { p_other_user_id: otherUserId });
  if (error) {
    console.error("loadBibaxRelationStatus:", error);
    return { status: "none", relationshipId: null };
  }
  const row = data?.[0];
  return { status: row?.status || "none", relationshipId: row?.relationship_id || null };
}
