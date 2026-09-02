// ============================================================
// Accès aux 4 répertoires partagés (établissements, produits,
// brasseries & producteurs, marques) via Supabase.
//
// Contrairement à l'ancien système (un seul gros bloc JSON par
// répertoire, tout réécrit à chaque modification), chaque élément
// est maintenant sa propre ligne dans la base — donc plus besoin
// du filet de sécurité "sauvegarde + récupération automatique"
// qu'on avait mis en place côté Claude : Supabase gère déjà ça
// nativement, et une modification n'affecte plus jamais les autres
// lignes par accident.
// ============================================================

import { supabase } from "../supabaseClient.js";

// supabase-js masque le vrai message renvoyé par une Edge Function derrière un texte
// générique ("Edge Function returned a non-2xx status code") — cette fonction va lire le
// vrai contenu de la réponse pour afficher le message utile à la place.
async function extractFunctionError(error) {
  if (error?.context) {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error;
    } catch {
      // le corps n'était pas du JSON exploitable — on retombe sur le message générique
    }
  }
  return error?.message || "Une erreur est survenue.";
}

/* ---------------- AUTHENTIFICATION ---------------- */

// Vrais comptes (Supabase Auth) — remplace la génération locale du code Bibax. Le profil
// (avec le code Bibax) est désormais stocké côté serveur, lié au compte, récupérable en cas de
// changement d'appareil.

// Feature flags — pilotés depuis la plateforme de gestion, sans déploiement de code. Renvoie
// un objet { flag_key: true/false } pour une lecture simple côté app. Si un pays est fourni,
// une éventuelle surcharge par pays l'emporte sur la valeur globale (héritage) — jamais
// mélangé aux permissions utilisateur (rôle, Business...), qui restent un système séparé.
export async function loadFeatureFlags(countryCode) {
  const { data: globalFlags, error } = await supabase.from("feature_flags").select("flag_key, enabled");
  if (error) {
    console.error("loadFeatureFlags:", error);
    return {};
  }
  const result = Object.fromEntries(globalFlags.map((f) => [f.flag_key, f.enabled]));

  if (countryCode) {
    const { data: overrides } = await supabase.from("feature_flag_overrides").select("flag_key, enabled").eq("country_code", countryCode);
    (overrides || []).forEach((o) => {
      result[o.flag_key] = o.enabled;
    });
  }

  return result;
}

// Crash reporting — envoie une erreur technique pour consultation côté plateforme de gestion.
// N'échoue jamais bruyamment : un souci réseau ici ne doit pas empêcher le reste de l'app de
// continuer à fonctionner.
// Analytics — suivi simple d'usage (vues d'écran, actions clés), consultable côté plateforme
// de gestion. N'échoue jamais bruyamment : un souci ici ne doit pas gêner le reste de l'app.
export async function submitClaim(entityType, entityId, entityName, { companyName, vatNumber, officers, justification }, claimantId, claimantBibroCode) {
  const { error } = await supabase.from("entity_claims").insert({
    id: `claim-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    claimant_id: claimantId,
    claimant_bibro_code: claimantBibroCode,
    company_name: companyName,
    vat_number: vatNumber || null,
    officers: officers || null,
    justification,
    status: "pending",
  });
  if (error) return { error: error.message };
  return { ok: true };
}

// EventPublisher — émission centralisée d'un événement métier (Chantier n°9). Le domaine émet
// l'événement sans jamais connaître ses futurs consommateurs (Stats, Pulse, Badges,
// Notifications) — ceux-ci s'y abonneront plus tard sans qu'aucune ligne de ce fichier n'ait
// besoin de changer. N'échoue jamais bruyamment, comme trackEvent et reportCrash.
// BibaPulse — types d'événements déjà câblés côté domaine (chantier "architecture des
// événements métier") qui doivent aussi produire une activité sociale. Un type absent de
// cette liste ne produit jamais de PulseEvent — c'est le comportement par défaut voulu.
const PULSE_EVENT_MAP = {
  DRINK_CHECKED: "product_discovered",
  VENUE_CHECKED: "venue_visit",
  PRODUCT_ADDED: "database_contribution",
};

// Émission centralisée d'un PulseEvent — jamais d'écriture directe en base depuis le client
// (voir la fonction serveur create-pulse-event), qui applique le dédoublonnage et la
// confidentialité par défaut.
export async function createPulseEvent(eventType, objectType, objectId, options = {}) {
  try {
    // Aucune gestion manuelle de la session ici — la librairie Supabase gère déjà le
    // rafraîchissement toute seule en interne. Un rafraîchissement forcé ajouté ici en
    // parallèle risquait justement d'entrer en conflit avec ce mécanisme automatique, ce qui
    // pousse Supabase à invalider toute la session par mesure de sécurité (double utilisation
    // détectée d'un même jeton de rafraîchissement).
    const { error } = await supabase.functions.invoke("create-pulse-event", {
      body: {
        eventType,
        objectType,
        objectId,
        sourceType: objectType,
        sourceId: objectId,
        venueId: options.venueId || null,
        roomSalonCode: options.roomSalonCode || null,
        visibility: options.visibility || null,
        metadata: options.metadata || null,
      },
    });
    if (error) {
      // FunctionsHttpError cache le vrai message de la fonction dans error.context (la
      // réponse HTTP elle-même) — sans ça, la console n'affiche qu'un message générique.
      let detail = error.message;
      if (error.context?.json) {
        try {
          const body = await error.context.json();
          detail = body?.error || JSON.stringify(body);
        } catch (_) {
          try {
            detail = await error.context.text();
          } catch (_) {}
        }
      }
      console.error("createPulseEvent:", detail);
    }
  } catch (e) {
    console.error("createPulseEvent:", e);
  }
}

export async function emitEvent(type, { actorBibroCode, entityType, entityId, payload, version = 1 } = {}) {
  try {
    await supabase.from("analytics_events").insert({
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      event_type: type,
      bibro_code: actorBibroCode || null,
      entity_type: entityType || null,
      entity_id: entityId || null,
      version,
      metadata: payload || null,
    });
  } catch (e) {
    console.error("emitEvent:", e);
  }

  const pulseType = PULSE_EVENT_MAP[type];
  if (pulseType && entityType && entityId) {
    createPulseEvent(pulseType, entityType, entityId, { roomSalonCode: payload?.salonCode });
  }
}

export async function trackEvent(eventType, screen, bibroCode, metadata) {
  try {
    await supabase.from("analytics_events").insert({
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      event_type: eventType,
      screen: screen || null,
      bibro_code: bibroCode || null,
      metadata: metadata || null,
    });
  } catch (e) {
    console.error("trackEvent:", e);
  }
}

export async function reportCrash({ message, stack, source, screen, bibroCode }) {
  try {
    await supabase.from("crash_reports").insert({
      id: `crash-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      message: message || null,
      stack: stack || null,
      source: source || null,
      screen: screen || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      bibro_code: bibroCode || null,
    });
  } catch (e) {
    console.error("reportCrash:", e);
  }
}

export async function signUp(email, password, { firstName, lastName, nickname, birthDate, country }) {
  // Les informations passent en métadonnées Supabase Auth — c'est le déclencheur côté base de
  // données (handle_new_user) qui crée ensuite la ligne de profil, jamais ce code client
  // directement (une session active n'existe pas encore tant que l'email n'est pas confirmé).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        nickname: nickname || null,
        birth_date: birthDate,
        country,
      },
    },
  });
  if (error) return { error: error.message };
  // Supabase renvoie un succès apparent même si l'email existe déjà (pour ne pas révéler quels
  // emails sont enregistrés) — mais le tableau "identities" reste vide dans ce cas précis,
  // contrairement à une vraie nouvelle inscription. C'est le seul signal fiable pour distinguer
  // les deux cas côté client.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "Un compte existe déjà avec cet email — connectez-vous plutôt, ou réinitialisez votre mot de passe." };
  }
  return { user: data.user, session: data.session };
}

// Seuil d'âge minimum pour un pays donné — piloté depuis la plateforme de gestion, plus besoin
// de déploiement de code pour ajuster un seuil ou ajouter un pays.
export async function getMinimumAge(countryCode) {
  const { data, error } = await supabase.from("market_config").select("config_value").eq("country_code", countryCode).eq("config_key", "minimum_age").maybeSingle();
  if (error || !data) return 18;
  return data.config_value;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { user: data.user, session: data.session };
}

export async function deleteMyAccount(confirmPassword) {
  const { data, error } = await supabase.functions.invoke("delete-my-account", { body: { confirmPassword } });
  if (error) return { error: await extractFunctionError(error) };
  if (data?.error) return { error: data.error };
  return { ok: true };
}

export async function lookupBibroCode(code) {
  const { data, error } = await supabase.rpc("lookup_bibro_code", { p_code: code });
  if (error) {
    console.error("lookupBibroCode:", error);
    return null;
  }
  const row = data?.[0];
  if (!row || !row.display_name) return null;
  return {
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    city: row.city,
    // Les codes pays sont stockés en minuscules avec underscores (ex. "pays_bas") — converti
    // ici en libellé lisible ("Pays-Bas") pour l'affichage.
    country: row.country ? row.country.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-") : null,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    snapchatUrl: row.snapchat_url,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

export async function loadMyProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    console.error("loadMyProfile:", error);
    return null;
  }
  return {
    myBibroCode: data.bibro_code,
    registeredAt: data.created_at || null,
    name: data.name || "",
    lastName: data.last_name || "",
    nickname: data.nickname || "",
    email: data.email || "",
    birthDate: data.birth_date || null,
    country: data.country || null,
    city: data.city || null,
    locality: data.locality || "",
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    bio: data.bio || "",
    facebookUrl: data.facebook_url || "",
    instagramUrl: data.instagram_url || "",
    tiktokUrl: data.tiktok_url || "",
    snapchatUrl: data.snapchat_url || "",
    displayNameField: data.display_name_field || "firstName",
    sharePrenom: data.share_prenom,
    shareNom: data.share_nom,
    shareSurnom: data.share_surnom,
    shareEmail: data.share_email,
    shareBirthDate: data.share_birth_date,
    birthDateSharePrecision: data.birth_date_share_precision || "full",
    shareCountry: data.share_country,
    shareCity: data.share_city,
    shareBio: data.share_bio,
    shareFacebook: data.share_facebook,
    shareInstagram: data.share_instagram,
    shareTiktok: data.share_tiktok,
    shareSnapchat: data.share_snapchat,
    shareRecords: data.share_records,
    shareVisitRanking: data.share_visit_ranking,
    avatarUrl: data.avatar_url || null,
    // isAdmin vient désormais du vrai rôle vérifié côté base de données, plus d'une passphrase
    // locale — cohérent avec les règles RLS qui vérifient ce même rôle.
    isAdmin: data.role === "admin" || data.role === "super_admin",
    active: data.active !== false,
    blockedReason: data.blocked_reason || null,
    blockedUntil: data.blocked_until || null,
  };
}

export async function updateMyProfile(
  userId,
  {
    name,
    lastName,
    nickname,
    email,
    birthDate,
    country,
    city,
    locality,
    latitude,
    longitude,
    bio,
    facebookUrl,
    instagramUrl,
    tiktokUrl,
    snapchatUrl,
    displayNameField,
    sharePrenom,
    shareNom,
    shareSurnom,
    shareEmail,
    shareBirthDate,
    birthDateSharePrecision,
    shareCountry,
    shareCity,
    shareBio,
    shareFacebook,
    shareInstagram,
    shareTiktok,
    shareSnapchat,
    shareRecords,
    shareVisitRanking,
    avatarUrl,
  }
) {
  const patch = {
    name,
    last_name: lastName,
    nickname,
    email,
    birth_date: birthDate || null,
    country,
    city,
    locality,
    latitude,
    longitude,
    bio,
    facebook_url: facebookUrl,
    instagram_url: instagramUrl,
    tiktok_url: tiktokUrl,
    snapchat_url: snapchatUrl,
    display_name_field: displayNameField,
    share_prenom: sharePrenom,
    share_nom: shareNom,
    share_surnom: shareSurnom,
    share_email: shareEmail,
    share_birth_date: shareBirthDate,
    birth_date_share_precision: birthDateSharePrecision,
    share_country: shareCountry,
    share_city: shareCity,
    share_bio: shareBio,
    share_facebook: shareFacebook,
    share_instagram: shareInstagram,
    share_tiktok: shareTiktok,
    share_snapchat: shareSnapchat,
    share_records: shareRecords,
    share_visit_ranking: shareVisitRanking,
    avatar_url: avatarUrl,
  };
  // Ne transmet que les champs réellement fournis — un appel partiel (ex. juste avatarUrl
  // après un envoi de photo) n'écrase jamais les autres champs avec des valeurs vides.
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) console.error("updateMyProfile:", error);
}

// Convertit un blob en base64 — nécessaire pour l'envoyer à la fonction serveur de
// vérification de contenu, qui reçoit du JSON plutôt qu'un fichier binaire direct.
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Photo de profil réelle — remplace l'ancien sélecteur d'emoji. Recadrage carré centré, comme
// pour les photos d'administrateurs. Passe par la vérification de contenu (Google Cloud
// Vision) avant tout envoi — bloque les cas jugés "très probables" (nudité, violence...).
export async function uploadMyAvatarPhoto(userId, blob) {
  const imageBase64 = await blobToBase64(blob);
  const path = `${userId}-${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "bibax-avatars", path, imageBase64, contentType: "image/jpeg", entityType: "profile", entityId: userId, kind: "avatar" },
  });
  if (error) return { error: await extractFunctionError(error) };
  if (data?.error) return { error: data.error };
  return { url: data.url };
}

/* ---------------- STORIES ---------------- */

// Envoie le média d'une Story (photo, pour l'instant — vidéo prévue plus tard) via le même
// pipeline de modération que le reste de l'app.
export async function uploadStoryMedia(userId, blob) {
  const imageBase64 = await blobToBase64(blob);
  const path = `${userId}-${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "stories", path, imageBase64, contentType: "image/jpeg", entityType: "story", entityId: userId, kind: "story" },
  });
  if (error) return { error: await extractFunctionError(error) };
  if (data?.error) return { error: data.error };
  return { url: data.url };
}

// Crée la Story elle-même — insertion directe protégée par RLS (chacun ne peut créer que ses
// propres Stories), pas besoin de fonction serveur pour ça.
export async function createStory({ contextType, contextId, mediaUrl, caption, sharedToPulse, pulseVisibility, locationName }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { data, error } = await supabase
    .from("stories")
    .insert({
      author_id: user.id,
      context_type: contextType,
      context_id: contextId || null,
      media_type: "image",
      media_url: mediaUrl,
      caption: caption || null,
      shared_to_pulse: contextType === "global" ? false : !!sharedToPulse,
      pulse_visibility: pulseVisibility || "relations",
      location_name: locationName || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { ok: true, id: data.id };
}

export async function loadRoomStories(salonCode) {
  const { data, error } = await supabase.rpc("get_room_stories", { p_salon_code: salonCode });
  if (error) {
    console.error("loadRoomStories:", error);
    return [];
  }
  return data.map((s) => ({
    id: s.id,
    authorId: s.author_id,
    authorName: s.author_name,
    authorLastName: s.author_last_name,
    locationName: s.location_name,
    authorAvatarUrl: s.author_avatar_url,
    mediaType: s.media_type,
    mediaUrl: s.media_url,
    caption: s.caption,
    createdAt: s.created_at,
    contextType: "room",
    sharedToPulse: s.shared_to_pulse,
    bixCount: s.bix_count,
    iBixed: s.i_bixed,
  }));
}

export async function loadPulseStories() {
  const { data, error } = await supabase.rpc("get_pulse_stories");
  if (error) {
    console.error("loadPulseStories:", error);
    return [];
  }
  return data.map((s) => ({
    id: s.id,
    authorId: s.author_id,
    authorName: s.author_name,
    authorLastName: s.author_last_name,
    locationName: s.location_name,
    authorAvatarUrl: s.author_avatar_url,
    mediaType: s.media_type,
    mediaUrl: s.media_url,
    caption: s.caption,
    createdAt: s.created_at,
    contextType: s.context_type,
    contextId: s.context_id,
    sharedToPulse: s.shared_to_pulse,
    bixCount: s.bix_count,
    iBixed: s.i_bixed,
  }));
}

export async function setStoryPulseSharing(storyId, shared) {
  const { data, error } = await supabase.rpc("set_story_pulse_sharing", { p_story_id: storyId, p_shared: shared });
  if (error) return { error: error.message };
  return data;
}

export async function loadMyStories() {
  const { data, error } = await supabase.rpc("get_my_stories");
  if (error) {
    console.error("loadMyStories:", error);
    return [];
  }
  return data.map((s) => ({
    id: s.id,
    contextType: s.context_type,
    contextId: s.context_id,
    mediaType: s.media_type,
    mediaUrl: s.media_url,
    caption: s.caption,
    createdAt: s.created_at,
    expiresAt: s.expires_at,
    sharedToPulse: s.shared_to_pulse,
  }));
}

export async function toggleStoryBix(storyId, alreadyBixed) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  if (alreadyBixed) {
    const { error } = await supabase.from("story_bix").delete().eq("story_id", storyId).eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("story_bix").insert({ story_id: storyId, user_id: user.id });
    if (error) return { error: error.message };
  }
  return { ok: true };
}

export async function deleteStory(storyId) {
  const { error } = await supabase.from("stories").delete().eq("id", storyId);
  if (error) return { error: error.message };
  return { ok: true };
}

/* ---------------- ÉTABLISSEMENTS & LIEUX ---------------- */

// Statuts visibles dans l'app grand public — jamais brouillon, rejeté, archivé ou doublon.
const APP_VISIBLE_STATUSES = ["to_process", "to_fix", "complete"];

export async function loadPublicVenues() {
  const { data, error } = await supabase.from("public_venues").select("*").in("status", APP_VISIBLE_STATUSES).order("name");
  if (error) {
    console.error("loadPublicVenues:", error);
    return [];
  }
  return data.map(rowToVenue);
}

export async function createPublicVenue(venue) {
  const row = venueToRow(venue);
  const { data, error } = await supabase.from("public_venues").insert(row).select().single();
  if (error) {
    console.error("createPublicVenue:", error);
    return null;
  }
  return rowToVenue(data);
}

export async function updatePublicVenue(id, patch) {
  const { error } = await supabase.from("public_venues").update(venueToRow(patch, true)).eq("id", id);
  if (error) console.error("updatePublicVenue:", error);
}

export async function deletePublicVenue(id) {
  const { error } = await supabase.from("public_venues").delete().eq("id", id);
  if (error) console.error("deletePublicVenue:", error);
}

function rowToVenue(row) {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    streetName: row.street_name,
    streetNumber: row.street_number,
    postalCode: row.postal_code,
    city: row.city,
    village: row.village,
    country: COUNTRY_CODE_TO_LABEL[row.country] || row.country,
    phone: row.phone,
    email: row.email,
    website: row.website,
    googleUrl: row.google_url,
    googlePlaceId: row.google_place_id,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    hasFood: row.has_food,
    defaultCurrency: row.default_currency,
    jetonUnitValue: row.jeton_unit_value,
    tags: row.tags || [],
    lat: row.lat,
    lng: row.lng,
    avatarEmoji: row.avatar_emoji,
    profilePhotoUrl: row.profile_photo_url,
    coverPhotoUrl: row.cover_photo_url,
    status: row.status,
    aliases: row.aliases || [],
    likes: row.likes || [],
    menu: row.menu || [],
    stats: row.stats || {},
    pendingContributionsCount: row.pending_contributions_count || 0,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
  };
}

function venueToRow(v, partial = false) {
  const row = {
    name: v.name,
    subtitle: v.subtitle,
    street_name: v.streetName,
    street_number: v.streetNumber,
    postal_code: v.postalCode,
    city: v.city,
    village: v.village,
    country: v.country,
    phone: v.phone,
    email: v.email,
    website: v.website,
    google_url: v.googleUrl,
    facebook_url: v.facebookUrl,
    instagram_url: v.instagramUrl,
    tiktok_url: v.tiktokUrl,
    has_food: v.hasFood,
    default_currency: v.defaultCurrency,
    jeton_unit_value: v.jetonUnitValue,
    tags: v.tags,
    lat: v.lat,
    lng: v.lng,
    avatar_emoji: v.avatarEmoji,
    status: v.status,
    likes: v.likes,
    aliases: v.aliases,
    menu: v.menu,
    stats: v.stats,
    submitted_by: v.submittedBy,
    submitted_at: v.submittedAt ? new Date(v.submittedAt).toISOString() : undefined,
  };
  if (!partial) row.id = v.id;
  // Only include keys that were actually provided, so a partial update doesn't null out
  // fields the caller didn't mean to touch.
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
}

// Établissements proches — s'appuie sur PostGIS côté Supabase (fonction get_nearby_venues),
// jamais sur Geoapify pour ce calcul. Réutilisable pour tous les usages "autour de moi"
// (suggestions à la création d'un salon, écran Découvrir, BibaGo...).
export async function loadNearbyVenues(lat, lng, radiusMeters = 2000, limit = 10) {
  const { data, error } = await supabase.rpc("get_nearby_venues", { p_lat: lat, p_lng: lng, p_radius_meters: radiusMeters, p_limit: limit });
  if (error) {
    console.error("loadNearbyVenues:", error);
    return [];
  }
  return data.map((row) => ({ ...rowToVenue(row.venue), distanceMeters: row.distance_meters }));
}

// Géocode la ville déclarée d'un profil (pas d'adresse précise, juste le centre-ville) — pour
// alimenter les suggestions Bibax par vraie proximité géographique plutôt qu'une correspondance
// exacte sur le nom de ville. Réutilise la même fonction serveur que le géocodage d'adresse
// d'établissement.
export async function geocodeCityForProfile(city, countryIsoCode) {
  if (!city || !countryIsoCode) return null;
  try {
    const { data, error } = await supabase.functions.invoke("geoapify-geocode", { body: { city, countryIsoCode } });
    if (error || data?.error || data?.notFound) return null;
    return { lat: data.lat, lng: data.lng };
  } catch (e) {
    console.error("geocodeCityForProfile:", e);
    return null;
  }
}

/* ---------------- HORAIRES — GOOGLE PLACES (source unique) ---------------- */

// Google est la source unique des horaires — jamais de saisie manuelle dans Bibamus.
// L'appel réel à Google se fait côté serveur (Edge Function), la clé API n'est jamais
// exposée ici.
const GOOGLE_HOURS_CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 heures — court, jamais traité comme un fait Bibamus.

export async function loadEstablishmentOpeningHours(googlePlaceId) {
  if (!googlePlaceId) return { status: "LINK_REQUIRED" };
  try {
    // Vérifie d'abord si un résultat récent est déjà en cache — évite d'appeler Google à
    // chaque simple affichage de la fiche, réduit le coût et la dépendance à la disponibilité
    // de Google en temps réel.
    const { data: cached } = await supabase
      .from("public_venues")
      .select("google_hours_cache, google_hours_last_fetch_at")
      .eq("google_place_id", googlePlaceId)
      .maybeSingle();

    if (cached?.google_hours_cache && cached?.google_hours_last_fetch_at) {
      const age = Date.now() - new Date(cached.google_hours_last_fetch_at).getTime();
      if (age < GOOGLE_HOURS_CACHE_DURATION_MS) {
        return { status: "OK", ...cached.google_hours_cache };
      }
    }

    const { data, error } = await supabase.functions.invoke("google-place-hours", { body: { placeId: googlePlaceId } });
    if (error) {
      console.error("loadEstablishmentOpeningHours:", error);
      return { status: "ERROR" };
    }
    return data;
  } catch (e) {
    console.error("loadEstablishmentOpeningHours:", e);
    return { status: "ERROR" };
  }
}

/* ---------------- GOUVERNANCE — CONTRIBUTIONS & TRAÇABILITÉ ---------------- */

// Table générique partagée par les 4 piliers (venue/drink/brand/producer) — chaque champ
// proposé est sa PROPRE ligne, jamais un bloc fourre-tout, pour permettre d'accepter ou
// refuser champ par champ et garder l'historique complet (rien n'est jamais écrasé).

function rowToContribution(row) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    fieldPath: row.field_path,
    proposedValue: row.proposed_value,
    previousValue: row.previous_value,
    sourceType: row.source_type,
    sourceId: row.source_id,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    appliedAt: row.applied_at,
  };
}

// entityType: 'venue' | 'drink' | 'brand' | 'producer'
// fields: { champ: nouvelle_valeur } — un diff, comme avant. currentEntity sert à capturer la
// valeur remplacée (previous_value), pour l'historique.
/* ---------------- SIGNALEMENTS ---------------- */

export async function submitReport(entityType, entityId, reason, comment, reportedBy, duplicateOf) {
  const { error } = await supabase.from("entity_reports").insert({
    id: `report-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    entity_type: entityType,
    entity_id: entityId,
    reason,
    comment: comment || null,
    reported_by: reportedBy || null,
    status: "pending",
    duplicate_of_id: duplicateOf?.id || null,
    duplicate_of_name: duplicateOf?.name || null,
  });
  if (error) {
    console.error("submitReport:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function proposeContribution(entityType, entityId, fields, currentEntity, sourceId) {
  const rows = Object.entries(fields).map(([fieldPath, proposedValue]) => ({
    id: `contrib-${Date.now()}-${Math.floor(Math.random() * 100000)}-${fieldPath}`,
    entity_type: entityType,
    entity_id: entityId,
    field_path: fieldPath,
    proposed_value: proposedValue,
    previous_value: currentEntity ? currentEntity[fieldPath] ?? null : null,
    source_type: "bibax",
    source_id: sourceId || null,
    status: "pending_review",
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("data_contributions").insert(rows);
  if (error) {
    console.error("proposeContribution:", error);
    return;
  }
  await incrementPendingCount(entityType, entityId, rows.length);
}

export async function loadContributionsForEntity(entityType, entityId, status = "pending_review") {
  let query = supabase.from("data_contributions").select("*").eq("entity_type", entityType).eq("entity_id", entityId);
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("created_at");
  if (error) {
    console.error("loadContributionsForEntity:", error);
    return [];
  }
  return data.map(rowToContribution);
}

const ENTITY_TABLES = { venue: "public_venues", drink: "drinks_directory", brand: "brands_directory", producer: "breweries_directory" };

async function incrementPendingCount(entityType, entityId, delta) {
  const table = ENTITY_TABLES[entityType];
  if (!table) return;
  const { data } = await supabase.from(table).select("pending_contributions_count").eq("id", entityId).single();
  const current = data?.pending_contributions_count || 0;
  await supabase.from(table).update({ pending_contributions_count: Math.max(0, current + delta) }).eq("id", entityId);
}

// Applique la valeur proposée sur la vraie fiche, marque la contribution "published", et
// archive (sans supprimer) toute contribution précédemment publiée pour ce même champ.
export async function approveContribution(contribution, reviewerId) {
  const table = ENTITY_TABLES[contribution.entityType];
  if (!table) return;

  await supabase
    .from("data_contributions")
    .update({ status: "superseded" })
    .eq("entity_type", contribution.entityType)
    .eq("entity_id", contribution.entityId)
    .eq("field_path", contribution.fieldPath)
    .eq("status", "published");

  await supabase
    .from(table)
    .update({ [contribution.fieldPath]: contribution.proposedValue })
    .eq("id", contribution.entityId);

  await supabase
    .from("data_contributions")
    .update({ status: "published", reviewed_by: reviewerId || null, reviewed_at: new Date().toISOString(), applied_at: new Date().toISOString() })
    .eq("id", contribution.id);

  await incrementPendingCount(contribution.entityType, contribution.entityId, -1);
}

export async function rejectContribution(contribution, reviewerId) {
  await supabase
    .from("data_contributions")
    .update({ status: "rejected", reviewed_by: reviewerId || null, reviewed_at: new Date().toISOString() })
    .eq("id", contribution.id);
  await incrementPendingCount(contribution.entityType, contribution.entityId, -1);
}

/* ---------------- PRODUITS (RÉPERTOIRE DES BOISSONS) ---------------- */

/* ---------------- DÉGUSTATIONS (serveur, remplace le localStorage) ---------------- */

export async function loadMyTastedDrinkIds() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from("tasted_drinks").select("drink_id").eq("user_id", user.id);
  if (error) {
    console.error("loadMyTastedDrinkIds:", error);
    return [];
  }
  return data.map((r) => r.drink_id);
}

export async function setDrinkTastedServer(drinkId, tasted) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  if (tasted) {
    const { error } = await supabase.from("tasted_drinks").insert({ user_id: user.id, drink_id: drinkId });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("tasted_drinks").delete().eq("user_id", user.id).eq("drink_id", drinkId);
    if (error) return { error: error.message };
  }
  return { ok: true };
}

/* ---------------- MES PHOTOS ---------------- */

export async function loadMyMediaAssets() {
  const { data, error } = await supabase.rpc("get_my_media_assets");
  if (error) {
    console.error("loadMyMediaAssets:", error);
    return [];
  }
  return data.map((r) => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    kind: r.kind,
    url: r.url,
    createdAt: r.created_at,
  }));
}

export async function deleteMyMediaAsset(id) {
  const { error } = await supabase.rpc("delete_my_media_asset", { p_id: id });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function loadMyProfileStats(userId) {
  const [{ data: tastedCount }, { data: venuesCount }] = await Promise.all([
    supabase.rpc("get_tasted_drinks_count", { p_user_id: userId }),
    supabase.rpc("get_venue_checkins_count", { p_user_id: userId }),
  ]);
  return { tastedDrinksCount: tastedCount ?? 0, venueCheckinsCount: venuesCount ?? 0 };
}

export async function loadDrinksDirectory() {
  const { data, error } = await supabase.from("drinks_directory").select("*").in("status", APP_VISIBLE_STATUSES).order("name");
  if (error) {
    console.error("loadDrinksDirectory:", error);
    return [];
  }
  return data.map(rowToDrink);
}

export async function createDrink(drink) {
  const { data, error } = await supabase.from("drinks_directory").insert(drinkToRow(drink)).select().single();
  if (error) {
    console.error("createDrink:", error);
    return null;
  }
  return rowToDrink(data);
}

export async function updateDrink(id, patch) {
  const { error } = await supabase.from("drinks_directory").update(drinkToRow(patch, true)).eq("id", id);
  if (error) console.error("updateDrink:", error);
}

export async function deleteDrink(id) {
  const { error } = await supabase.from("drinks_directory").delete().eq("id", id);
  if (error) console.error("deleteDrink:", error);
}

// bibamus-admin stocke le type de produit sous forme de code technique stable (chantier
// multilingue) — ex. "bieres_cidres" — alors que l'app grand public affiche et compare encore
// sur le libellé français. Cette correspondance traduit à la frontière, dans les deux sens,
// pour que les deux applications restent d'accord sur la valeur réellement stockée.
const DRINK_TYPE_CODE_TO_LABEL = {
  bieres_cidres: "Bières & Cidres",
  vins_bulles: "Vins & Bulles",
  spiritueux: "Spiritueux",
  cocktails_mocktails: "Cocktails / Mocktails",
  softs_eaux: "Softs & Eaux",
  boissons_chaudes: "Boissons chaudes",
  snacks: "Snacks",
  generiques: "Génériques",
};
const DRINK_TYPE_LABEL_TO_CODE = Object.fromEntries(Object.entries(DRINK_TYPE_CODE_TO_LABEL).map(([code, label]) => [label, code]));

function rowToDrink(row) {
  return {
    id: row.id,
    name: row.name,
    type: DRINK_TYPE_CODE_TO_LABEL[row.type] || row.type,
    defaultVolumeCl: row.default_volume_cl,
    defaultServingMode: row.default_serving_mode,
    brewery: row.brewery,
    brand: row.brand,
    nationality: row.nationality,
    abv: row.abv,
    kcalPer100ml: row.kcal_per_100ml,
    volumeCl: row.volume_cl,
    glutenFree: row.gluten_free,
    bio: row.bio,
    servingMode: row.serving_mode,
    beerTags: row.beer_tags || [],
    aliases: row.aliases || [],
    status: row.status,
    isGeneric: row.is_generic,
    averagePrice: row.average_price,
    averageJetonValue: row.average_jeton_value,
    avatarEmoji: row.avatar_emoji,
    photoUrl: row.photo_url,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    description: row.description,
    snackType: row.snack_type,
    weightG: row.weight_g,
    countsAsDrinkId: row.counts_as_drink_id,
    ratings: row.ratings || {},
    ratingDates: row.rating_dates || {},
    ratedServingModes: row.rated_serving_modes || {},
    pendingContributionsCount: row.pending_contributions_count || 0,
  };
}

function drinkToRow(d, partial = false) {
  const row = {
    name: d.name,
    type: DRINK_TYPE_LABEL_TO_CODE[d.type] || d.type,
    brewery: d.brewery,
    brand: d.brand,
    nationality: d.nationality,
    abv: d.abv,
    kcal_per_100ml: d.kcalPer100ml,
    volume_cl: d.volumeCl,
    gluten_free: d.glutenFree,
    bio: d.bio,
    serving_mode: d.servingMode,
    beer_tags: d.beerTags,
    status: d.status,
    is_generic: d.isGeneric,
    aliases: d.aliases,
    average_price: d.averagePrice,
    average_jeton_value: d.averageJetonValue,
    avatar_emoji: d.avatarEmoji,
    photo_url: d.photoUrl,
    submitted_by: d.submittedBy,
    submitted_at: d.submittedAt ? new Date(d.submittedAt).toISOString() : undefined,
    description: d.description,
    snack_type: d.snackType,
    weight_g: d.weightG,
    counts_as_drink_id: d.countsAsDrinkId,
    ratings: d.ratings,
    rating_dates: d.ratingDates,
    rated_serving_modes: d.ratedServingModes,
  };
  if (!partial) row.id = d.id;
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
}

/* ---------------- PHOTOS DE PRODUITS ---------------- */

// Compresse et redimensionne l'image côté appareil avant l'envoi — un smartphone produit
// souvent des photos de plusieurs Mo, largement plus grandes que nécessaire pour un affichage
// mobile, et ça évite de saturer inutilement le stockage et de ralentir le chargement des fiches.
// Recadrage carré centré — pour une photo de profil, contrairement à resizeImage() qui garde
// le ratio d'origine (adapté aux photos de produits/lieux, pas à un avatar rond).
async function resizeImageSquare(file, targetW, targetH, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const srcRatio = bitmap.width / bitmap.height;
  const targetRatio = targetW / targetH;
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (srcRatio > targetRatio) {
    sw = bitmap.height * targetRatio;
    sx = (bitmap.width - sw) / 2;
  } else {
    sh = bitmap.width / targetRatio;
    sy = (bitmap.height - sh) / 2;
  }
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function resizeImage(file, maxDim = 1000, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function uploadDrinkPhoto(drinkId, file) {
  const blob = await resizeImage(file);
  const imageBase64 = await blobToBase64(blob);
  const path = `${drinkId}-${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "drink-photos", path, imageBase64, contentType: "image/jpeg", entityType: "drink", entityId: drinkId, kind: "gallery" },
  });
  if (error) return { error: await extractFunctionError(error) };
  if (data?.error) return { error: data.error };
  return { url: data.url };
}


export async function loadBreweriesDirectory() {
  const { data, error } = await supabase.from("breweries_directory").select("*").in("status", APP_VISIBLE_STATUSES).order("name");
  if (error) {
    console.error("loadBreweriesDirectory:", error);
    return [];
  }
  return data.map(rowToBrewery);
}

export async function createBrewery(brewery) {
  const { data, error } = await supabase.from("breweries_directory").insert(breweryToRow(brewery)).select().single();
  if (error) {
    console.error("createBrewery:", error);
    return null;
  }
  return rowToBrewery(data);
}

export async function updateBrewery(id, patch) {
  const { error } = await supabase.from("breweries_directory").update(breweryToRow(patch, true)).eq("id", id);
  if (error) console.error("updateBrewery:", error);
}

export async function deleteBrewery(id) {
  const { error } = await supabase.from("breweries_directory").delete().eq("id", id);
  if (error) console.error("deleteBrewery:", error);
}

// Même logique de frontière que pour le type de produit — bibamus-admin stocke le pays sous
// forme de code technique (ex. "belgique"), l'app grand public affiche et compare encore sur
// le libellé français.
const COUNTRY_CODE_TO_LABEL = {
  belgique: "Belgique",
  france: "France",
  pays_bas: "Pays-Bas",
  allemagne: "Allemagne",
  luxembourg: "Luxembourg",
  algerie: "Algérie",
  autriche: "Autriche",
  bulgarie: "Bulgarie",
  canada: "Canada",
  chypre: "Chypre",
  cote_d_ivoire: "Côte d'Ivoire",
  croatie: "Croatie",
  cuba: "Cuba",
  danemark: "Danemark",
  espagne: "Espagne",
  estonie: "Estonie",
  etats_unis: "États-Unis",
  finlande: "Finlande",
  grece: "Grèce",
  hongrie: "Hongrie",
  irlande: "Irlande",
  islande: "Islande",
  italie: "Italie",
  lettonie: "Lettonie",
  lituanie: "Lituanie",
  malte: "Malte",
  maroc: "Maroc",
  mexique: "Mexique",
  norvege: "Norvège",
  pologne: "Pologne",
  portugal: "Portugal",
  republique_tcheque: "République tchèque",
  roumanie: "Roumanie",
  royaume_uni: "Royaume-Uni",
  senegal: "Sénégal",
  slovaquie: "Slovaquie",
  slovenie: "Slovénie",
  suede: "Suède",
  suisse: "Suisse",
  tunisie: "Tunisie",
  venezuela: "Vénézuéla",
  autre: "Autre",
};
const COUNTRY_LABEL_TO_CODE = Object.fromEntries(Object.entries(COUNTRY_CODE_TO_LABEL).map(([code, label]) => [label, code]));

function rowToBrewery(row) {
  return {
    id: row.id,
    name: row.name,
    aliases: row.aliases || [],
    country: COUNTRY_CODE_TO_LABEL[row.country] || row.country,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    pendingContributionsCount: row.pending_contributions_count || 0,
  };
}

function breweryToRow(b, partial = false) {
  const row = {
    name: b.name,
    country: COUNTRY_LABEL_TO_CODE[b.country] || b.country,
    status: b.status,
    submitted_by: b.submittedBy,
    aliases: b.aliases,
    submitted_at: b.submittedAt ? new Date(b.submittedAt).toISOString() : undefined,
  };
  if (!partial) row.id = b.id;
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
}

/* ---------------- CODES-BARRES ---------------- */

// Un code-barres n'est jamais l'identité d'une boisson — plusieurs conditionnements (bouteille,
// canette, différents volumes) d'une même bière ont chacun leur propre code, tous rattachés à
// la même fiche. Le scan sert uniquement de raccourci vers une fiche existante, jamais à créer
// automatiquement un nouveau produit.

export async function lookupBarcode(barcode) {
  const { data, error } = await supabase.from("drink_barcodes").select("*").eq("barcode", barcode).maybeSingle();
  if (error) {
    console.error("lookupBarcode:", error);
    return null;
  }
  if (!data) return null;
  return { productId: data.product_id, container: data.container, volumeMl: data.volume_ml, verified: data.verified };
}

export async function associateBarcode({ barcode, productId, format, container, volumeMl, addedBy }) {
  const { error } = await supabase.from("drink_barcodes").insert({
    id: `barcode-${Date.now()}`,
    barcode,
    product_id: productId,
    format: format || null,
    container: container || null,
    volume_ml: volumeMl || null,
    added_by: addedBy || null,
    verified: false,
  });
  if (error) {
    console.error("associateBarcode:", error);
    return false;
  }
  return true;
}

/* ---------------- MARQUES ---------------- */

export async function loadBrandsDirectory() {
  const { data, error } = await supabase.from("brands_directory").select("*").in("status", APP_VISIBLE_STATUSES).order("name");
  if (error) {
    console.error("loadBrandsDirectory:", error);
    return [];
  }
  return data.map(rowToBrand);
}

export async function createBrand(brand) {
  const { data, error } = await supabase.from("brands_directory").insert(brandToRow(brand)).select().single();
  if (error) {
    console.error("createBrand:", error);
    return null;
  }
  return rowToBrand(data);
}

export async function updateBrand(id, patch) {
  const { error } = await supabase.from("brands_directory").update(brandToRow(patch, true)).eq("id", id);
  if (error) console.error("updateBrand:", error);
}

export async function deleteBrand(id) {
  const { error } = await supabase.from("brands_directory").delete().eq("id", id);
  if (error) console.error("deleteBrand:", error);
}

function rowToBrand(row) {
  return {
    aliases: row.aliases || [],
    id: row.id,
    name: row.name,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    pendingContributionsCount: row.pending_contributions_count || 0,
  };
}

function brandToRow(b, partial = false) {
  const row = {
    name: b.name,
    status: b.status,
    submitted_by: b.submittedBy,
    aliases: b.aliases,
    submitted_at: b.submittedAt ? new Date(b.submittedAt).toISOString() : undefined,
  };
  if (!partial) row.id = b.id;
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
}

/* ---------------- BIBAPULSE ---------------- */

export async function loadPulseFeed(before = null, limit = 20) {
  const { data, error } = await supabase.rpc("get_pulse_feed", { p_limit: limit, p_before: before });
  if (error) {
    console.error("loadPulseFeed:", error);
    return [];
  }
  return data.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorAvatarUrl: row.actor_avatar_url,
    actorLastName: row.actor_last_name,
    actorBibroCode: row.actor_bibro_code,
    objectType: row.object_type,
    objectId: row.object_id,
    venueId: row.venue_id,
    roomSalonCode: row.room_salon_code,
    visibility: row.visibility,
    metadata: row.metadata,
    bixCount: row.bix_count,
    commentsCount: row.comments_count,
    incomingCount: row.incoming_count,
    lastBixerName: row.last_bixer_name,
    santeCount: row.sante_count,
    iSaidSante: row.i_said_sante,
    createdAt: row.created_at,
    iBixed: row.i_bixed,
    iAmIncoming: row.i_am_incoming,
  }));
}

export async function togglePulseBix(pulseEventId, alreadyBixed) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  if (alreadyBixed) {
    const { error } = await supabase.from("pulse_bix").delete().eq("pulse_event_id", pulseEventId).eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("pulse_bix").insert({ pulse_event_id: pulseEventId, user_id: user.id });
    if (error) return { error: error.message };
  }
  return { ok: true };
}

export async function toggleFollow(targetBibroCode) {
  const { data, error } = await supabase.rpc("toggle_follow", { p_target_code: targetBibroCode });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return data;
}

export async function togglePulseIncoming(pulseEventId, alreadyIncoming) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  if (alreadyIncoming) {
    const { error } = await supabase.from("pulse_incoming").delete().eq("pulse_event_id", pulseEventId).eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("pulse_incoming").insert({ pulse_event_id: pulseEventId, user_id: user.id });
    if (error) return { error: error.message };
  }
  return { ok: true };
}

export async function toggleSanteReaction(pulseEventId) {
  const { error } = await supabase.rpc("toggle_pulse_sante", { p_pulse_event_id: pulseEventId });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function loadPulseReactors(pulseEventId) {
  const { data, error } = await supabase.rpc("get_pulse_reactors", { p_pulse_event_id: pulseEventId });
  if (error) {
    console.error("loadPulseReactors:", error);
    return { bix: [], incoming: [], sante: [] };
  }
  return {
    bix: data.filter((r) => r.kind === "bix").map((r) => ({ userId: r.user_id, name: r.name, lastName: r.last_name, avatarUrl: r.avatar_url })),
    incoming: data.filter((r) => r.kind === "incoming").map((r) => ({ userId: r.user_id, name: r.name, lastName: r.last_name, avatarUrl: r.avatar_url })),
    sante: data.filter((r) => r.kind === "sante").map((r) => ({ userId: r.user_id, name: r.name, lastName: r.last_name, avatarUrl: r.avatar_url })),
  };
}

export async function loadPulseComments(pulseEventId) {
  const { data, error } = await supabase.rpc("get_pulse_comments", { p_pulse_event_id: pulseEventId });
  if (error) {
    console.error("loadPulseComments:", error);
    return [];
  }
  return data.map((c) => ({ id: c.id, userId: c.user_id, userName: c.user_name, userAvatarUrl: c.user_avatar_url, body: c.body, createdAt: c.created_at }));
}

export async function postPulseComment(pulseEventId, body) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { error } = await supabase.from("pulse_comments").insert({ pulse_event_id: pulseEventId, user_id: user.id, body: body.trim() });
  if (error) return { error: error.message };
  return { ok: true };
}

/* ---------------- RELATIONS BIBAX (mutuelles, façon Facebook) ---------------- */

export async function sendBibaxRequest(targetBibroCode) {
  const { data, error } = await supabase.rpc("send_bibax_request", { p_target_code: targetBibroCode });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return data;
}

export async function respondBibaxRequest(relationshipId, accept) {
  const { data, error } = await supabase.rpc("respond_bibax_request", { p_relationship_id: relationshipId, p_accept: accept });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return data;
}

export async function removeBibax(relationshipId) {
  const { data, error } = await supabase.rpc("remove_bibax", { p_relationship_id: relationshipId });
  if (error) return { error: error.message };
  return data;
}

export async function removeBibaxByCode(bibroCode) {
  const { data, error } = await supabase.rpc("remove_bibax_by_code", { p_target_code: bibroCode });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return data;
}

export async function loadMyBibax() {
  const { data, error } = await supabase.rpc("get_my_bibax");
  if (error) {
    console.error("loadMyBibax:", error);
    return [];
  }
  return data.map((r) => ({ relationshipId: r.relationship_id, userId: r.user_id, name: r.name, lastName: r.last_name, nickname: r.nickname, avatarUrl: r.avatar_url, bibroCode: r.bibro_code, city: r.city, locality: r.locality }));
}

export async function loadPendingBibaxRequests() {
  const { data, error } = await supabase.rpc("get_pending_bibax_requests");
  if (error) {
    console.error("loadPendingBibaxRequests:", error);
    return [];
  }
  return data.map((r) => ({ relationshipId: r.relationship_id, userId: r.user_id, name: r.name, lastName: r.last_name, nickname: r.nickname, avatarUrl: r.avatar_url, bibroCode: r.bibro_code, city: r.city, locality: r.locality, createdAt: r.created_at }));
}

export async function loadSentBibaxRequests() {
  const { data, error } = await supabase.rpc("get_sent_bibax_requests");
  if (error) {
    console.error("loadSentBibaxRequests:", error);
    return [];
  }
  return data.map((r) => ({ relationshipId: r.relationship_id, userId: r.user_id, name: r.name, lastName: r.last_name, nickname: r.nickname, avatarUrl: r.avatar_url, bibroCode: r.bibro_code, city: r.city, locality: r.locality, createdAt: r.created_at }));
}

export async function cancelBibaxRequest(relationshipId) {
  const { data, error } = await supabase.rpc("cancel_bibax_request", { p_relationship_id: relationshipId });
  if (error) return { error: error.message };
  return data;
}

export async function loadBibaxSuggestions(limit = 10) {
  const { data, error } = await supabase.rpc("get_bibax_suggestions", { p_limit: limit });
  if (error) {
    console.error("loadBibaxSuggestions:", error);
    return [];
  }
  return data.map((r) => ({ userId: r.user_id, name: r.name, lastName: r.last_name, nickname: r.nickname, avatarUrl: r.avatar_url, bibroCode: r.bibro_code, city: r.city, locality: r.locality, mutualCount: r.mutual_count, distanceKm: r.distance_km }));
}
