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

/* ---------------- PERMISSIONS CENTRALISÉES ---------------- */

// Miroir côté code de la fonction SQL has_capability() — une seule matrice à consulter pour
// savoir "ce rôle a-t-il cette capacité ?", plutôt que de comparer des rôles un peu partout
// dans l'interface. À tenir à jour en même temps que la fonction SQL équivalente.
const CAPABILITY_MATRIX = {
  view_reports: ["moderator", "admin", "super_admin"],
  resolve_reports: ["moderator", "admin", "super_admin"],
  block_users: ["admin", "super_admin"],
  manage_admins: ["super_admin"],
  manage_database: ["admin", "super_admin"],
  view_all_statuses: ["moderator", "admin", "super_admin"],
  moderate_content: ["moderator", "admin", "super_admin"],
};

/* ---------------- SIGNALEMENTS ---------------- */

const ENTITY_TABLE_BY_TYPE = { venue: "public_venues", drink: "drinks_directory", brand: "brands_directory", producer: "breweries_directory" };
const ENTITY_SELECT_FIELDS = {
  venue: "id, name, street_name, street_number, city, cover_photo_url, profile_photo_url, status, certification_level",
  drink: "id, name, type, main_photo_url, status, certification_level",
  brand: "id, name, logo_url, status, certification_level",
  producer: "id, name, country, profile_photo_url, cover_photo_url, status, certification_level",
};

export async function loadReports(status = "pending") {
  const { data: reports, error } = await supabase.from("entity_reports").select("*").eq("status", status).order("created_at", { ascending: false });
  if (error) {
    console.error("loadReports:", error);
    return [];
  }

  // Récupère les détails complets de chaque fiche concernée (et, pour un doublon, de la fiche
  // identifiée aussi) — regroupé par table plutôt qu'une requête par signalement.
  const idsByTable = {};
  const addId = (entityType, id) => {
    const table = ENTITY_TABLE_BY_TYPE[entityType];
    if (!table || !id) return;
    idsByTable[table] = idsByTable[table] || new Set();
    idsByTable[table].add(id);
  };
  reports.forEach((r) => {
    addId(r.entity_type, r.entity_id);
    if (r.duplicate_of_id) addId(r.entity_type, r.duplicate_of_id);
  });

  const detailsById = {};
  await Promise.all(
    Object.entries(idsByTable).map(async ([table, ids]) => {
      const entityType = Object.keys(ENTITY_TABLE_BY_TYPE).find((k) => ENTITY_TABLE_BY_TYPE[k] === table);
      const { data } = await supabase.from(table).select(ENTITY_SELECT_FIELDS[entityType]).in("id", Array.from(ids));
      (data || []).forEach((row) => (detailsById[row.id] = row));
    })
  );

  return reports.map((r) => ({
    ...r,
    entityName: detailsById[r.entity_id]?.name || "(fiche introuvable)",
    entityDetails: detailsById[r.entity_id] || null,
    duplicateDetails: r.duplicate_of_id ? detailsById[r.duplicate_of_id] || null : null,
  }));
}

// Confirme un doublon : marque le lien officiel (duplicate_of_id) et passe la fiche au statut
// "duplicate" — plus juste qu'un archivage générique, puisque ça garde la trace de quelle
// fiche est la bonne à conserver.
// Correction directe depuis "Signalements" — un modérateur a déjà le droit de modifier ces
// champs (seuls statut/certification/doublon sont protégés), il ne manquait que l'interface.
export async function updateEntityField(entityType, entityId, patch) {
  const table = ENTITY_TABLE_BY_TYPE[entityType];
  if (!table) return { error: "Type de fiche inconnu." };
  const { error } = await supabase.from(table).update(patch).eq("id", entityId);
  if (error) return { error: error.message };
  return { ok: true };
}

// Charge une fiche complète (même format que dans la Database), quel que soit son type — pour
// pouvoir ouvrir la vraie fiche d'édition directement depuis un signalement.
export async function loadEntityDetail(entityType, entityId) {
  const table = ENTITY_TABLE_BY_TYPE[entityType];
  if (!table) return null;
  const { data, error } = await supabase.from(table).select("*").eq("id", entityId).single();
  if (error || !data) return null;
  if (entityType === "venue") return rowToVenue(data);
  if (entityType === "drink") return rowToDrink(data);
  if (entityType === "producer") return rowToBrewery(data);
  if (entityType === "brand") return rowToBrand(data);
  return null;
}

// Fusion réelle — transfère les relations (propriété Business, produits liés à une
// marque/producteur fusionné, revendications en attente), pas seulement le tombstone.
export async function mergeEntities(entityType, loserId, keeperId) {
  const { data, error } = await supabase.rpc("merge_entities", { p_entity_type: entityType, p_loser_id: loserId, p_keeper_id: keeperId });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { ok: true };
}

export async function confirmDuplicate(reportId, entityType, loserId, keeperId) {
  const mergeResult = await mergeEntities(entityType, loserId, keeperId);
  if (mergeResult.error) return { error: mergeResult.error };

  const { error: resolveError } = await supabase.from("entity_reports").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", reportId);
  if (resolveError) return { error: resolveError.message };

  return { ok: true };
}

export async function archiveReportedEntity(reportId, entityType, entityId) {
  const table = ENTITY_TABLE_BY_TYPE[entityType];
  if (!table) return { error: "Type de fiche inconnu." };

  const { error: archiveError } = await supabase.from(table).update({ status: "archived" }).eq("id", entityId);
  if (archiveError) return { error: archiveError.message };

  const { error: resolveError } = await supabase.from("entity_reports").update({ status: "archived", resolved_at: new Date().toISOString() }).eq("id", reportId);
  if (resolveError) return { error: resolveError.message };

  return { ok: true };
}

export async function resolveReport(id, resolverId) {
  const { error } = await supabase.from("entity_reports").update({ status: "resolved", resolved_by: resolverId || null, resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function dismissReport(id, resolverId) {
  const { error } = await supabase.from("entity_reports").update({ status: "dismissed", resolved_by: resolverId || null, resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

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

/* ---------------- COLLABORATEURS (comptes pro de la plateforme de gestion) ---------------- */

export async function loadAppUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, name, last_name, nickname, bibro_code, birth_date, avatar_emoji, country, city, locality, facebook_url, whatsapp_url, instagram_url, tiktok_url, snapchat_url, x_url, threads_url, linkedin_url, pinterest_url, twitch_url, app_language, active, blocked_reason, blocked_until, created_at"
    )
    .eq("role", "user")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("loadAppUsers:", error);
    return [];
  }
  return data;
}

export async function createAppUser(email, password, firstName, lastName, nickname, birthDate) {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { email, password, firstName, lastName, nickname, birthDate },
  });
  if (error) return { error: await extractFunctionError(error) };
  if (data?.error) return { error: data.error };
  return { ok: true };
}

export async function deleteAppUser(targetUserId, confirmPassword) {
  const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { targetUserId, confirmPassword } });
  if (error) return { error: await extractFunctionError(error) };
  if (data?.error) return { error: data.error };
  return { ok: true };
}

export async function updateAppUserProfile(userId, patch) {
  const { error } = await supabase
    .from("profiles")
    .update({
      name: patch.firstName,
      last_name: patch.lastName,
      nickname: patch.nickname,
      birth_date: patch.birthDate || null,
      country: patch.country,
      locality: patch.locality,
      city: patch.city,
      facebook_url: patch.facebookUrl,
      whatsapp_url: patch.whatsappUrl,
      instagram_url: patch.instagramUrl,
      tiktok_url: patch.tiktokUrl,
      snapchat_url: patch.snapchatUrl,
      x_url: patch.xUrl,
      threads_url: patch.threadsUrl,
      linkedin_url: patch.linkedinUrl,
      pinterest_url: patch.pinterestUrl,
      twitch_url: patch.twitchUrl,
      app_language: patch.appLanguage,
      active: patch.active,
      blocked_reason: patch.active === false ? patch.blockedReason || null : null,
      blocked_until: patch.active === false ? patch.blockedUntil || null : null,
    })
    .eq("id", userId);
  if (error) return { error: error.message };
  return { ok: true };
}

const CLAIM_ENTITY_TABLE = { venue: "public_venues", drink: "drinks_directory", brand: "brands_directory", producer: "breweries_directory" };

// Toutes les fiches liées au compte Business actuellement connecté, tous types confondus.
export async function loadMyBusinessEntities(userId) {
  const tables = [
    { table: "public_venues", type: "venue", label: "Établissement" },
    { table: "drinks_directory", type: "drink", label: "Produit" },
    { table: "brands_directory", type: "brand", label: "Marque" },
    { table: "breweries_directory", type: "producer", label: "Producteur" },
  ];
  const results = await Promise.all(
    tables.map(async ({ table, type, label }) => {
      const { data } = await supabase.from(table).select("id, name, status").eq("business_owner_id", userId);
      return (data || []).map((row) => ({ ...row, entityType: type, entityTypeLabel: label }));
    })
  );
  return results.flat();
}

export async function loadClaims(status = "pending") {
  const { data, error } = await supabase.from("entity_claims").select("*").eq("status", status).order("created_at", { ascending: false });
  if (error) {
    console.error("loadClaims:", error);
    return [];
  }

  const claimantIds = [...new Set(data.map((c) => c.claimant_id).filter(Boolean))];
  if (claimantIds.length === 0) return data;

  const { data: claimants } = await supabase.from("profiles").select("id, name, last_name, email").in("id", claimantIds);
  const byId = Object.fromEntries((claimants || []).map((p) => [p.id, p]));

  return data.map((c) => ({ ...c, claimant: byId[c.claimant_id] || null }));
}

const BUSINESS_FIELDS =
  "id, email, name, last_name, active, company_name, vat_number, company_email, company_phone, company_street, company_street_number, " +
  "company_address_line2, company_postal_code, company_city, company_country, contact_function, contact_email, contact_phone, contact_languages, " +
  "business_label, business_status";

export async function loadBusinessAccountsFull() {
  const { data, error } = await supabase.from("profiles").select(BUSINESS_FIELDS).eq("role", "business").order("company_name");
  if (error) {
    console.error("loadBusinessAccountsFull:", error);
    return [];
  }
  return data;
}

const BUSINESS_ENTITY_TABLE = { venue: "public_venues", drink: "drinks_directory", brand: "brands_directory", producer: "breweries_directory" };

export async function unlinkEntityFromBusiness(entityType, entityId, entityName) {
  const table = BUSINESS_ENTITY_TABLE[entityType];
  if (!table) return { error: "Type de fiche inconnu." };
  const { error } = await supabase.from(table).update({ business_owner_id: null }).eq("id", entityId);
  if (error) return { error: error.message };
  await supabase.rpc("log_audit_event", { p_action: "ownership_revoked", p_entity_type: entityType, p_entity_id: entityId, p_entity_name: entityName || null, p_details: null });
  return { ok: true };
}

export async function linkEntityToBusiness(entityType, entityId, businessId, entityName) {
  const table = BUSINESS_ENTITY_TABLE[entityType];
  if (!table) return { error: "Type de fiche inconnu." };
  // Le lien précédent (le cas échéant) permet de distinguer une première attribution d'un
  // transfert d'un compte Business à un autre (ex. revente d'un établissement).
  const { data: current } = await supabase.from(table).select("business_owner_id").eq("id", entityId).single();
  const previousOwnerId = current?.business_owner_id || null;

  const { error } = await supabase.from(table).update({ business_owner_id: businessId }).eq("id", entityId);
  if (error) return { error: error.message };

  const action = previousOwnerId && previousOwnerId !== businessId ? "ownership_transferred" : "ownership_granted";
  await supabase.rpc("log_audit_event", {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_entity_name: entityName || null,
    p_details: previousOwnerId ? { from_business_id: previousOwnerId, to_business_id: businessId } : { to_business_id: businessId },
  });
  return { ok: true };
}

// Recherche par nom, pour retrouver une fiche à lier manuellement (transfert suite à une
// revente, par exemple) — indépendamment de son propriétaire Business actuel, s'il en a un.
export async function searchEntitiesByName(entityType, query) {
  const table = BUSINESS_ENTITY_TABLE[entityType];
  if (!table || !query.trim()) return [];
  const { data, error } = await supabase.from(table).select("id, name, business_owner_id").ilike("name", `%${query.trim()}%`).limit(8);
  if (error) {
    console.error("searchEntitiesByName:", error);
    return [];
  }
  return data;
}

// Organisation et abonnement d'un compte Business — architecture posée pour le chantier B2B,
// pas encore utilisée pour restreindre quoi que ce soit (aucune fonctionnalité payante
// n'existe encore), affichée ici à titre informatif.
export async function loadOrganizationForProfile(profileId) {
  const { data: membership } = await supabase.from("memberships").select("organization_id").eq("profile_id", profileId).maybeSingle();
  if (!membership) return null;
  const [{ data: org }, { data: sub }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", membership.organization_id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("organization_id", membership.organization_id).maybeSingle(),
  ]);
  return { organization: org, subscription: sub };
}

export async function loadBusinessAccountById(userId) {
  const { data, error } = await supabase.from("profiles").select(BUSINESS_FIELDS).eq("id", userId).single();
  if (error) {
    console.error("loadBusinessAccountById:", error);
    return null;
  }
  return data;
}

export async function updateBusinessAccount(userId, patch) {
  const { error } = await supabase
    .from("profiles")
    .update({
      name: patch.firstName,
      last_name: patch.lastName,
      company_name: patch.companyName,
      vat_number: patch.vatNumber,
      company_email: patch.companyEmail,
      company_phone: patch.companyPhone,
      company_street: patch.companyStreet,
      company_street_number: patch.companyStreetNumber,
      company_address_line2: patch.companyAddressLine2,
      company_postal_code: patch.companyPostalCode,
      company_city: patch.companyCity,
      company_country: patch.companyCountry,
      contact_function: patch.contactFunction,
      contact_email: patch.contactEmail,
      contact_phone: patch.contactPhone,
      contact_languages: patch.contactLanguages,
      business_label: patch.businessLabel,
      business_status: patch.businessStatus,
      active: patch.active,
    })
    .eq("id", userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function loadBusinessAccounts() {
  const { data, error } = await supabase.from("profiles").select("id, name, last_name, email, company_name").eq("role", "business").order("company_name");
  if (error) {
    console.error("loadBusinessAccounts:", error);
    return [];
  }
  return data;
}

// Lie une fiche à un compte Business (existant ou nouvellement créé) et marque la
// revendication comme approuvée.
export async function approveClaim(claimId, entityType, entityId, businessId, entityName) {
  const table = CLAIM_ENTITY_TABLE[entityType];
  if (!table) return { error: "Type de fiche inconnu." };

  const { error: linkError } = await supabase.from(table).update({ business_owner_id: businessId }).eq("id", entityId);
  if (linkError) return { error: linkError.message };

  const { error: claimError } = await supabase.from("entity_claims").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", claimId);
  if (claimError) return { error: claimError.message };

  await supabase.rpc("log_audit_event", {
    p_action: "ownership_granted",
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_entity_name: entityName || null,
    p_details: { claim_id: claimId, to_business_id: businessId },
  });

  return { ok: true };
}

export async function rejectClaim(claimId, reason) {
  const { error } = await supabase.from("entity_claims").update({ status: "rejected", rejection_reason: reason || null, reviewed_at: new Date().toISOString() }).eq("id", claimId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function loadAuditLog(filters = {}) {
  let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  const { data, error } = await query;
  if (error) {
    console.error("loadAuditLog:", error);
    return [];
  }
  return data;
}

export async function loadMyActivity() {
  const { data, error } = await supabase.rpc("my_audit_activity");
  if (error) {
    console.error("loadMyActivity:", error);
    return [];
  }
  return data;
}

// Seuil d'âge minimum pour un pays donné — piloté depuis "Configuration pays", plus besoin de
// déploiement de code pour ajuster un seuil ou ajouter un pays.
export async function getMinimumAge(countryCode) {
  const { data, error } = await supabase.from("market_config").select("config_value").eq("country_code", countryCode).eq("config_key", "minimum_age").maybeSingle();
  if (error || !data) return 18;
  return data.config_value;
}

export async function loadAnalyticsEvents() {
  const { data, error } = await supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(5000);
  if (error) {
    console.error("loadAnalyticsEvents:", error);
    return [];
  }
  return data;
}

export async function loadCrashReports() {
  const { data, error } = await supabase.from("crash_reports").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) {
    console.error("loadCrashReports:", error);
    return [];
  }
  return data;
}

export async function loadFeatureFlagOverrides(flagKey) {
  const { data, error } = await supabase.from("feature_flag_overrides").select("*").eq("flag_key", flagKey).order("country_code");
  if (error) {
    console.error("loadFeatureFlagOverrides:", error);
    return [];
  }
  return data;
}

export async function setFeatureFlagOverride(flagKey, countryCode, enabled) {
  const { error } = await supabase
    .from("feature_flag_overrides")
    .upsert({ flag_key: flagKey, country_code: countryCode, enabled, updated_at: new Date().toISOString() }, { onConflict: "flag_key,country_code" });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function removeFeatureFlagOverride(flagKey, countryCode) {
  const { error } = await supabase.from("feature_flag_overrides").delete().eq("flag_key", flagKey).eq("country_code", countryCode);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function loadFeatureFlags() {
  const { data, error } = await supabase.from("feature_flags").select("*").order("flag_key");
  if (error) {
    console.error("loadFeatureFlags:", error);
    return [];
  }
  return data;
}

export async function updateFeatureFlag(flagKey, enabled) {
  const { error } = await supabase.from("feature_flags").update({ enabled, updated_at: new Date().toISOString() }).eq("flag_key", flagKey);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function loadCountryRules() {
  const { data, error } = await supabase.from("market_config").select("country_code, config_value, updated_at").eq("config_key", "minimum_age").order("country_code");
  if (error) {
    console.error("loadCountryRules:", error);
    return [];
  }
  return data.map((r) => ({ country_code: r.country_code, minimum_age: r.config_value, updated_at: r.updated_at }));
}

export async function updateCountryRule(countryCode, minimumAge) {
  const { error } = await supabase
    .from("market_config")
    .upsert({ country_code: countryCode, config_key: "minimum_age", config_value: minimumAge, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function loadCollaborators() {
  const { data, error } = await supabase.from("profiles").select("id, email, name, last_name, birth_date, avatar_url, role, active, can_moderate").order("name");
  if (error) {
    console.error("loadCollaborators:", error);
    return [];
  }
  return data;
}

// Passe par la fonction serveur dédiée — un compte ne peut jamais être créé directement
// depuis le navigateur, quel que soit le rôle de la personne connectée.
export async function createCollaborator(email, password, firstName, lastName, birthDate, role, canModerate, extra = {}) {
  const { data, error } = await supabase.functions.invoke("admin-create-collaborator", {
    body: { email, password, firstName, lastName, birthDate, role, canModerate, ...extra },
  });
  if (error) return { error: await extractFunctionError(error) };
  if (data?.error) return { error: data.error };
  return { ok: true, userId: data.userId };
}

// Modification de la fiche (nom/prénom/date de naissance/rôle/statut actif/modération) — le
// rôle, le statut actif, et le droit de modération restent malgré tout protégés côté base de
// données (réservés au super_admin), peu importe qui appelle cette fonction.
export async function updateCollaboratorProfile(userId, { firstName, lastName, birthDate, role, active, canModerate }) {
  const { error } = await supabase
    .from("profiles")
    .update({ name: firstName, last_name: lastName, birth_date: birthDate || null, role, active, can_moderate: canModerate })
    .eq("id", userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteCollaborator(targetUserId, confirmPassword) {
  const { data, error } = await supabase.functions.invoke("admin-delete-collaborator", { body: { targetUserId, confirmPassword } });
  if (error) return { error: await extractFunctionError(error) };
  if (data?.error) return { error: data.error };
  return { ok: true };
}

// Convertit un blob en base64 — nécessaire pour l'envoyer à la fonction serveur de pipeline
// média (vérification de contenu + enregistrement dans media_assets).
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function uploadAdminAvatar(userId, file) {
  const blob = await resizeImageTo(file, 400, 400);
  const imageBase64 = await blobToBase64(blob);
  const path = `${userId}-${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "admin-avatars", path, imageBase64, contentType: "image/jpeg", entityType: "admin", entityId: userId, kind: "avatar" },
  });
  if (error) {
    console.error("uploadAdminAvatar:", error);
    return null;
  }
  if (data?.error) {
    console.error("uploadAdminAvatar:", data.error);
    return null;
  }
  return data.url;
}

/* ---------------- ÉTABLISSEMENTS & LIEUX ---------------- */

export async function loadPublicVenues() {
  const { data, error } = await supabase.from("public_venues").select("*").order("name");
  if (error) {
    console.error("loadPublicVenues:", error);
    return [];
  }
  return data.map(rowToVenue);
}

// Répartition des appréciations d'un lieu (système à 5 paliers positifs) — réservé à la
// plateforme de gestion : les utilisateurs finaux ne voient que le label et le nombre total,
// jamais cette répartition détaillée par palier.
export async function loadVenueRatingSummary(venueId) {
  const { data, error } = await supabase.rpc("get_venue_rating_summary", { p_venue_id: venueId });
  if (error) {
    console.error("loadVenueRatingSummary:", error);
    return null;
  }
  return data?.[0] || null;
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
  if (error) {
    console.error("updatePublicVenue:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function deletePublicVenue(id) {
  const { data, error } = await supabase.from("public_venues").delete().eq("id", id).select();
  if (error) {
    console.error("deletePublicVenue:", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Vous n'avez pas les droits nécessaires pour supprimer cette fiche." };
  }
  return { ok: true };
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
    country: row.country,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    website: row.website,
    googleUrl: row.google_url,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    snapchatUrl: row.snapchat_url,
    restaurantGuruUrl: row.restaurant_guru_url,
    tripadvisorUrl: row.tripadvisor_url,
    hasFood: row.has_food,
    defaultCurrency: row.default_currency,
    jetonUnitValue: row.jeton_unit_value,
    tags: row.tags || [],
    lat: row.lat,
    lng: row.lng,
    avatarEmoji: row.avatar_emoji,
    profilePhotoUrl: row.profile_photo_url,
    coverPhotoUrl: row.cover_photo_url,
    acceptedPaymentMethods: row.accepted_payment_methods || [],
    venueType: row.venue_type,
    venueTypes: row.venue_types || [],
    hasDogs: !!row.has_dogs,
    canDance: !!row.can_dance,
    reservationPossible: !!row.reservation_possible,
    goodForGroups: !!row.good_for_groups,
    privatizationPossible: !!row.privatization_possible,
    hasPrivateRoom: !!row.has_private_room,
    smokingArea: !!row.smoking_area,
    menuPdfUrl: row.menu_pdf_url,
    hasTerrace: !!row.has_terrace,
    wheelchairAccessible: !!row.wheelchair_accessible,
    hasWifi: !!row.has_wifi,
    googlePlaceId: row.google_place_id,
    googlePlaceIdCheckedAt: row.google_place_id_checked_at,
    noGooglePresence: !!row.no_google_presence,
    noFixedHours: !!row.no_fixed_hours,
    googleHoursLastFetchAt: row.google_hours_last_fetch_at,
    googleHoursLastStatus: row.google_hours_last_status,
    geocodeSource: row.geocode_source,
    geocodeConfidence: row.geocode_confidence,
    geocodeStatus: row.geocode_status,
    geocodedAt: row.geocoded_at,
    ownerManaged: !!row.owner_managed,
    status: row.status,
    aliases: row.aliases || [],
    certificationLevel: row.certification_level,
    duplicateOfId: row.duplicate_of_id,
    openReportsCount: row.open_reports_count || 0,
    likes: row.likes || [],
    menu: row.menu || [],
    stats: row.stats || {},
    pendingEdit: row.pending_edit || null,
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
    whatsapp: v.whatsapp,
    email: v.email,
    website: v.website,
    google_url: v.googleUrl,
    facebook_url: v.facebookUrl,
    instagram_url: v.instagramUrl,
    tiktok_url: v.tiktokUrl,
    snapchat_url: v.snapchatUrl,
    restaurant_guru_url: v.restaurantGuruUrl,
    tripadvisor_url: v.tripadvisorUrl,
    has_food: v.hasFood,
    default_currency: v.defaultCurrency,
    jeton_unit_value: v.jetonUnitValue,
    tags: v.tags,
    lat: v.lat,
    lng: v.lng,
    geocode_status: v.geocodeStatus,
    geocode_source: v.geocodeSource,
    geocode_confidence: v.geocodeConfidence,
    avatar_emoji: v.avatarEmoji,
    profile_photo_url: v.profilePhotoUrl,
    cover_photo_url: v.coverPhotoUrl,
    accepted_payment_methods: v.acceptedPaymentMethods,
    venue_type: v.venueType,
    venue_types: v.venueTypes,
    has_dogs: v.hasDogs,
    can_dance: v.canDance,
    reservation_possible: v.reservationPossible,
    good_for_groups: v.goodForGroups,
    privatization_possible: v.privatizationPossible,
    has_private_room: v.hasPrivateRoom,
    smoking_area: v.smokingArea,
    menu_pdf_url: v.menuPdfUrl,
    has_terrace: v.hasTerrace,
    wheelchair_accessible: v.wheelchairAccessible,
    has_wifi: v.hasWifi,
    owner_managed: v.ownerManaged,
    status: v.status,
    aliases: v.aliases,
    certification_level: v.certificationLevel,
    duplicate_of_id: v.duplicateOfId,
    likes: v.likes,
    menu: v.menu,
    stats: v.stats,
    pending_edit: v.pendingEdit,
    submitted_by: v.submittedBy,
    submitted_at: v.submittedAt ? new Date(v.submittedAt).toISOString() : undefined,
  };
  if (!partial) row.id = v.id;
  // Only include keys that were actually provided, so a partial update doesn't null out
  // fields the caller didn't mean to touch.
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
}

/* ---------------- HORAIRES — GOOGLE PLACES (source unique) ---------------- */

// Les horaires ne sont jamais encodés à la main — Google est la source unique. Ces fonctions
// ne gèrent QUE la liaison (recherche + confirmation du Google Place ID) ; l'appel réel à
// Google se fait côté serveur (Edge Function Supabase), jamais depuis le navigateur, pour ne
// jamais exposer la clé API.

export async function searchGooglePlaceMatches({ name, address }) {
  try {
    const { data, error } = await supabase.functions.invoke("google-place-search", { body: { name, address } });
    if (error) {
      console.error("searchGooglePlaceMatches:", error);
      return null;
    }
    return data?.candidates || [];
  } catch (e) {
    console.error("searchGooglePlaceMatches:", e);
    return null;
  }
}

export async function linkGooglePlace(venueId, googlePlaceId) {
  const { error } = await supabase
    .from("public_venues")
    .update({ google_place_id: googlePlaceId, google_place_id_checked_at: new Date().toISOString() })
    .eq("id", venueId);
  if (error) console.error("linkGooglePlace:", error);
}

// Geoapify géocode l'adresse (adresse → lat/lng) — jamais de calcul de proximité ici, ça reste
// le rôle de PostGIS côté Supabase (fonction get_nearby_venues). N'écrit rien elle-même ; c'est
// l'appelant qui enregistre ensuite le résultat sur la fiche.
export async function geocodeAddress({ streetName, streetNumber, postalCode, city, countryIsoCode }) {
  try {
    const { data, error } = await supabase.functions.invoke("geoapify-geocode", {
      body: { streetName, streetNumber, postalCode, city, countryIsoCode },
    });
    if (error) {
      console.error("geocodeAddress:", error);
      return null;
    }
    return data;
  } catch (e) {
    console.error("geocodeAddress:", e);
    return null;
  }
}

export async function saveGeocodeResult(venueId, { lat, lng, source, confidence, status }) {
  const { error } = await supabase
    .from("public_venues")
    .update({
      lat,
      lng,
      geocode_source: source,
      geocode_confidence: confidence,
      geocode_status: status,
      geocoded_at: new Date().toISOString(),
    })
    .eq("id", venueId);
  if (error) console.error("saveGeocodeResult:", error);
}

export async function unlinkGooglePlace(venueId) {
  const { error } = await supabase
    .from("public_venues")
    .update({ google_place_id: null, google_place_id_checked_at: null, google_hours_last_fetch_at: null, google_hours_last_status: null })
    .eq("id", venueId);
  if (error) console.error("unlinkGooglePlace:", error);
}

export async function setNoGooglePresence(venueId, value) {
  const { error } = await supabase.from("public_venues").update({ no_google_presence: value }).eq("id", venueId);
  if (error) console.error("setNoGooglePresence:", error);
}

export async function setNoFixedHours(venueId, value) {
  const { error } = await supabase.from("public_venues").update({ no_fixed_hours: value }).eq("id", venueId);
  if (error) console.error("setNoFixedHours:", error);
}

/* ---------------- PHOTOS D'ÉTABLISSEMENTS ---------------- */

async function resizeImageTo(file, targetW, targetH, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  // Recadrage centré pour remplir exactement le format demandé (carré pour le profil,
  // bannière large pour la couverture), plutôt que de déformer l'image.
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

// ============================================================
// Stories officielles Bibamus — déposées uniquement depuis la
// plateforme de gestion, visibles par tout le monde dans l'app.
// ============================================================
export async function uploadOfficialStoryMedia(adminUserId, file) {
  const blob = await resizeImageTo(file, 720, 1280);
  const imageBase64 = await blobToBase64(blob);
  const path = `official-${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "stories", path, imageBase64, contentType: "image/jpeg", entityType: "story", entityId: adminUserId, kind: "story" },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { url: data.url };
}

export async function createOfficialStory(mediaUrl, caption, createdBy) {
  const { error } = await supabase.from("official_stories").insert({ media_url: mediaUrl, caption: caption || null, created_by: createdBy });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function loadOfficialStoriesAdmin() {
  const { data, error } = await supabase.from("official_stories").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("loadOfficialStoriesAdmin:", error);
    return [];
  }
  return data.map((s) => ({ id: s.id, mediaUrl: s.media_url, caption: s.caption, createdAt: s.created_at }));
}

export async function deleteOfficialStory(id) {
  const { error } = await supabase.from("official_stories").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function uploadVenuePhoto(venueId, file, kind) {
  const dims = kind === "cover" ? [1200, 400] : [400, 400];
  const blob = await resizeImageTo(file, dims[0], dims[1]);
  const imageBase64 = await blobToBase64(blob);
  const path = `${venueId}-${kind}-${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "venue-photos", path, imageBase64, contentType: "image/jpeg", entityType: "venue", entityId: venueId, kind: kind === "cover" ? "cover" : "profile_photo" },
  });
  if (error) {
    console.error("uploadVenuePhoto:", error);
    return null;
  }
  if (data?.error) {
    console.error("uploadVenuePhoto:", data.error);
    return null;
  }
  return data.url;
}

export async function uploadVenueMenuPdf(venueId, file) {
  const path = `${venueId}-menu-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage.from("venue-menus").upload(path, file, { contentType: "application/pdf", upsert: true });
  if (uploadError) {
    console.error("uploadVenueMenuPdf:", uploadError);
    return null;
  }
  const { data } = supabase.storage.from("venue-menus").getPublicUrl(path);
  return data.publicUrl;
}

/* ---------------- PRODUITS (RÉPERTOIRE DES BOISSONS) ---------------- */

// Chargements allégés (juste id + nom) pour alimenter les menus déroulants avec recherche —
// bien plus légers qu'un chargement complet des fiches, pour les liens marque/producteur.
export async function loadBrandsForSelect() {
  const { data, error } = await supabase.from("brands_directory").select("id, name").order("name");
  if (error) {
    console.error("loadBrandsForSelect:", error);
    return [];
  }
  return data;
}

export async function loadBreweriesForSelect() {
  const { data, error } = await supabase.from("breweries_directory").select("id, name").order("name");
  if (error) {
    console.error("loadBreweriesForSelect:", error);
    return [];
  }
  return data;
}

export async function uploadDrinkMainPhoto(drinkId, file) {
  const blob = await resizeImageTo(file, 800, 800);
  const imageBase64 = await blobToBase64(blob);
  const path = `${drinkId}-main-${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "drink-photos", path, imageBase64, contentType: "image/jpeg", entityType: "drink", entityId: drinkId, kind: "profile_photo" },
  });
  if (error) {
    console.error("uploadDrinkMainPhoto:", error);
    return null;
  }
  if (data?.error) {
    console.error("uploadDrinkMainPhoto:", data.error);
    return null;
  }
  return data.url;
}

export async function uploadDrinkGalleryPhoto(drinkId, file) {
  const blob = await resizeImageTo(file, 1000, 1000);
  const imageBase64 = await blobToBase64(blob);
  const path = `${drinkId}-gallery-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "drink-photos", path, imageBase64, contentType: "image/jpeg", entityType: "drink", entityId: drinkId, kind: "gallery" },
  });
  if (error) {
    console.error("uploadDrinkGalleryPhoto:", error);
    return null;
  }
  if (data?.error) {
    console.error("uploadDrinkGalleryPhoto:", data.error);
    return null;
  }
  return data.url;
}

export async function uploadDrinkAwardBadge(drinkId, file) {
  const blob = await resizeImageTo(file, 600, 600);
  const imageBase64 = await blobToBase64(blob);
  const path = `${drinkId}-award-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "drink-photos", path, imageBase64, contentType: "image/jpeg", entityType: "drink", entityId: drinkId, kind: "award_badge" },
  });
  if (error) {
    console.error("uploadDrinkAwardBadge:", error);
    return null;
  }
  if (data?.error) {
    console.error("uploadDrinkAwardBadge:", data.error);
    return null;
  }
  return data.url;
}

export async function loadDrinksDirectory() {
  const { data, error } = await supabase.from("drinks_directory").select("*").order("name");
  if (error) {
    console.error("loadDrinksDirectory:", error);
    return [];
  }
  return data.map(rowToDrink);
}

// Un statut vide en base ("null") équivaut à "à traiter" — traité comme tel dans les comptages.
function applyStatusFilter(query, status) {
  if (status === "to_process") return query.or("status.is.null,status.eq.to_process,status.eq.draft");
  return query.eq("status", status);
}

const KNOWN_DRINK_TYPES = ["bieres_cidres", "vins_bulles", "spiritueux", "cocktails_mocktails", "softs_eaux", "boissons_chaudes", "snacks", "generiques"];

function applyTypeFilter(query, type) {
  if (!type) return query;
  if (type === "__other__") return query.not("type", "in", `(${KNOWN_DRINK_TYPES.map((t) => `"${t}"`).join(",")})`);
  return query.eq("type", type);
}

// Charge une SEULE page de produits, filtrée et triée côté serveur — jamais l'ensemble du
// répertoire d'un coup, pour rester rapide même avec des dizaines ou centaines de milliers de
// produits.
export async function loadDrinksPage({ type, search, sortKey = "name", sortDir = 1, page = 0, pageSize = 50 } = {}) {
  // Jointure sur une seule profondeur seulement — une double jointure imbriquée (produit → marque
  // → producteur) s'est révélée trop fragile : si Supabase n'arrive pas à résoudre sans ambiguïté
  // l'une des deux relations, la requête ENTIÈRE échoue et plus aucun produit ne s'affiche.
  let query = supabase.from("drinks_directory").select("*, brands_directory(name, producer_id)", { count: "exact" });
  query = applyTypeFilter(query, type);
  if (search && search.trim()) query = query.ilike("name", `%${search.trim()}%`);
  // "brandName"/"producerName" résultent d'une jointure, pas d'une vraie colonne — on trie par brand_id à la place.
  const realSortKey = sortKey === "brandName" || sortKey === "producerName" ? "brand_id" : sortKey;
  query = query.order(realSortKey, { ascending: sortDir === 1, nullsFirst: false });
  query = query.range(page * pageSize, page * pageSize + pageSize - 1);

  const [{ data, error, count }, { data: breweriesData }] = await Promise.all([
    query,
    supabase.from("breweries_directory").select("id, name"),
  ]);
  if (error) {
    console.error("loadDrinksPage:", error);
    return { items: [], total: 0 };
  }
  const producerNameById = {};
  (breweriesData || []).forEach((b) => (producerNameById[b.id] = b.name));

  return {
    items: data.map((row) => ({
      ...rowToDrink(row),
      brandName: row.brands_directory?.name || null,
      producerName: row.brands_directory?.producer_id ? producerNameById[row.brands_directory.producer_id] || null : null,
    })),
    total: count || 0,
  };
}

// Un seul décompte rapide (via count exact, sans jamais rapatrier les lignes elles-mêmes) —
// utilisé pour les blocs de statistiques, avec un filtre de catégorie optionnel pour qu'ils
// restent justes une fois qu'une catégorie est sélectionnée.
export async function countDrinks({ type, status } = {}) {
  let query = supabase.from("drinks_directory").select("id", { count: "exact", head: true });
  query = applyTypeFilter(query, type);
  if (status) query = applyStatusFilter(query, status);
  const { count, error } = await query;
  if (error) {
    console.error("countDrinks:", error);
    return 0;
  }
  return count || 0;
}

// Compte les produits par catégorie (les 8 blocs), y compris "Autres - Divers" — 8 petites
// requêtes de comptage exact, bien plus légères qu'un chargement complet du répertoire pour
// ensuite compter en mémoire.
export async function countDrinksByType() {
  const results = await Promise.all([...KNOWN_DRINK_TYPES.map((t) => countDrinks({ type: t })), countDrinks({ type: "__other__" })]);
  const map = {};
  KNOWN_DRINK_TYPES.forEach((t, i) => (map[t] = results[i]));
  map.autres = results[KNOWN_DRINK_TYPES.length];
  return map;
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
  if (error) {
    console.error("updateDrink:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function deleteDrink(id) {
  const { data, error } = await supabase.from("drinks_directory").delete().eq("id", id).select();
  if (error) {
    console.error("deleteDrink:", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Vous n'avez pas les droits nécessaires pour supprimer cette fiche." };
  }
  return { ok: true };
}

function rowToDrink(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
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
    status: row.status,
    aliases: row.aliases || [],
    certificationLevel: row.certification_level,
    duplicateOfId: row.duplicate_of_id,
    openReportsCount: row.open_reports_count || 0,
    isGeneric: row.is_generic,
    averagePrice: row.average_price,
    averageJetonValue: row.average_jeton_value,
    avatarEmoji: row.avatar_emoji,
    brandId: row.brand_id,
    producerIds: row.producer_ids || [],
    defaultVolumeCl: row.default_volume_cl,
    defaultServingMode: row.default_serving_mode,
    beverageSubtype: row.beverage_subtype,
    originRegion: row.origin_region,
    originCity: row.origin_city,
    mainPhotoUrl: row.main_photo_url,
    galleryPhotos: row.gallery_photos || [],
    styles: row.styles || [],
    productStatus: row.product_status,
    alternateName: row.alternate_name,
    launchYear: row.launch_year,
    // Niveau 2 — composition bière
    malts: row.malts || [],
    hops: row.hops || [],
    yeast: row.yeast,
    cereals: row.cereals || [],
    fruits: row.fruits || [],
    spices: row.spices || [],
    otherIngredients: row.other_ingredients || [],
    allergens: row.allergens || [],
    // Niveau 2 — fabrication bière
    fermentationType: row.fermentation_type,
    bottleRefermented: row.bottle_refermented,
    filtered: row.filtered,
    pasteurized: row.pasteurized,
    dryHopping: row.dry_hopping,
    beerAging: row.beer_aging,
    barrelType: row.barrel_type,
    // Niveau 2 — composition & fabrication cidre/poiré
    mainFruit: row.main_fruit,
    fruitVarieties: row.fruit_varieties,
    fruitOrigin: row.fruit_origin,
    pureJuice: row.pure_juice,
    concentrateUsed: row.concentrate_used,
    ciderFermentation: row.cider_fermentation,
    carbonationMethod: row.carbonation_method,
    ciderFiltered: row.cider_filtered,
    ciderPasteurized: row.cider_pasteurized,
    ciderAging: row.cider_aging,
    ciderBarrelType: row.cider_barrel_type,
    // Niveau 2 — profil gustatif
    tasteBitterness: row.taste_bitterness,
    tasteSweetness: row.taste_sweetness,
    tasteAcidity: row.taste_acidity,
    tasteBody: row.taste_body,
    tasteFruitiness: row.taste_fruitiness,
    tasteHoppiness: row.taste_hoppiness,
    tasteMaltiness: row.taste_maltiness,
    tasteTannin: row.taste_tannin,
    tasteCarbonation: row.taste_carbonation,
    // Niveau 2 — arômes & saveurs
    flavorNotes: row.flavor_notes || [],
    // Niveau 2 — service & consommation
    servingTemperature: row.serving_temperature,
    recommendedGlass: row.recommended_glass,
    foodPairings: row.food_pairings || [],
    occasion: row.occasion,
    // Niveau 2 — caractéristiques & labels
    alcoholFree: !!row.alcohol_free,
    lowAlcohol: !!row.low_alcohol,
    glutenReduced: !!row.gluten_reduced,
    vegan: row.vegan,
    sugarFree: !!row.sugar_free,
    lactoseFree: !!row.lactose_free,
    certifications: row.certifications || [],
    // Niveau 2 — présentation
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    productHistory: row.product_history,
    officialUrl: row.official_url,
    videoLinks: row.video_links || [],
    awardBadges: row.award_badges || [],
    // Niveau 3 — données techniques bière
    ibu: row.ibu,
    colorEbc: row.color_ebc,
    colorSrm: row.color_srm,
    originalGravity: row.original_gravity,
    finalGravity: row.final_gravity,
    platoDegree: row.plato_degree,
    apparentAttenuation: row.apparent_attenuation,
    finalPh: row.final_ph,
    carbonationTechnical: row.carbonation_technical,
    relativeBitterness: row.relative_bitterness,
    realExtract: row.real_extract,
    // Niveau 3 — procédé brassicole avancé
    mashingProcess: row.mashing_process,
    hoppingDetails: row.hopping_details,
    dryHopDetail: row.dry_hop_detail,
    yeastStrain: row.yeast_strain,
    primaryFermentation: row.primary_fermentation,
    secondaryFermentation: row.secondary_fermentation,
    conditioningProcess: row.conditioning_process,
    maturationDetails: row.maturation_details,
    barrelDetails: row.barrel_details,
    blendDetails: row.blend_details,
    // Niveau 3 — données techniques cidre/poiré
    ciderInitialGravity: row.cider_initial_gravity,
    ciderFinalGravity: row.cider_final_gravity,
    residualSugar: row.residual_sugar,
    totalAcidity: row.total_acidity,
    ciderPh: row.cider_ph,
    tanninLevel: row.tannin_level,
    ciderCarbonationTechnical: row.cider_carbonation_technical,
    detailedVarieties: row.detailed_varieties,
    appleType: row.apple_type,
    pressingMethod: row.pressing_method,
    defecationKeeving: row.defecation_keeving,
    malolacticFermentation: row.malolactic_fermentation,
    ciderBlendDetails: row.cider_blend_details,
    ciderAgingDetails: row.cider_aging_details,
    // Niveau 3 — traçabilité & sources
    infoSource: row.info_source,
    sourceUrl: row.source_url,
    verificationDate: row.verification_date,
    contributor: row.contributor,
    verificationStatus: row.verification_status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    description: row.description,
    snackType: row.snack_type,
    weightG: row.weight_g,
    countsAsDrinkId: row.counts_as_drink_id,
    ratings: row.ratings || {},
    ratingDates: row.rating_dates || {},
    ratedServingModes: row.rated_serving_modes || {},
    pendingEdit: row.pending_edit || null,
  };
}

function drinkToRow(d, partial = false) {
  const row = {
    name: d.name,
    type: d.type,
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
    aliases: d.aliases,
    certification_level: d.certificationLevel,
    duplicate_of_id: d.duplicateOfId,
    is_generic: d.isGeneric,
    average_price: d.averagePrice,
    average_jeton_value: d.averageJetonValue,
    avatar_emoji: d.avatarEmoji,
    brand_id: d.brandId,
    producer_ids: d.producerIds,
    default_volume_cl: d.defaultVolumeCl,
    default_serving_mode: d.defaultServingMode,
    beverage_subtype: d.beverageSubtype,
    origin_region: d.originRegion,
    origin_city: d.originCity,
    main_photo_url: d.mainPhotoUrl,
    gallery_photos: d.galleryPhotos,
    styles: d.styles,
    product_status: d.productStatus,
    alternate_name: d.alternateName,
    launch_year: d.launchYear,
    malts: d.malts,
    hops: d.hops,
    yeast: d.yeast,
    cereals: d.cereals,
    fruits: d.fruits,
    spices: d.spices,
    other_ingredients: d.otherIngredients,
    allergens: d.allergens,
    fermentation_type: d.fermentationType,
    bottle_refermented: d.bottleRefermented,
    filtered: d.filtered,
    pasteurized: d.pasteurized,
    dry_hopping: d.dryHopping,
    beer_aging: d.beerAging,
    barrel_type: d.barrelType,
    main_fruit: d.mainFruit,
    fruit_varieties: d.fruitVarieties,
    fruit_origin: d.fruitOrigin,
    pure_juice: d.pureJuice,
    concentrate_used: d.concentrateUsed,
    cider_fermentation: d.ciderFermentation,
    carbonation_method: d.carbonationMethod,
    cider_filtered: d.ciderFiltered,
    cider_pasteurized: d.ciderPasteurized,
    cider_aging: d.ciderAging,
    cider_barrel_type: d.ciderBarrelType,
    taste_bitterness: d.tasteBitterness,
    taste_sweetness: d.tasteSweetness,
    taste_acidity: d.tasteAcidity,
    taste_body: d.tasteBody,
    taste_fruitiness: d.tasteFruitiness,
    taste_hoppiness: d.tasteHoppiness,
    taste_maltiness: d.tasteMaltiness,
    taste_tannin: d.tasteTannin,
    taste_carbonation: d.tasteCarbonation,
    flavor_notes: d.flavorNotes,
    serving_temperature: d.servingTemperature,
    recommended_glass: d.recommendedGlass,
    food_pairings: d.foodPairings,
    occasion: d.occasion,
    alcohol_free: d.alcoholFree,
    low_alcohol: d.lowAlcohol,
    gluten_reduced: d.glutenReduced,
    vegan: d.vegan,
    sugar_free: d.sugarFree,
    lactose_free: d.lactoseFree,
    certifications: d.certifications,
    short_description: d.shortDescription,
    full_description: d.fullDescription,
    product_history: d.productHistory,
    official_url: d.officialUrl,
    video_links: d.videoLinks,
    award_badges: d.awardBadges,
    ibu: d.ibu,
    color_ebc: d.colorEbc,
    color_srm: d.colorSrm,
    original_gravity: d.originalGravity,
    final_gravity: d.finalGravity,
    plato_degree: d.platoDegree,
    apparent_attenuation: d.apparentAttenuation,
    final_ph: d.finalPh,
    carbonation_technical: d.carbonationTechnical,
    relative_bitterness: d.relativeBitterness,
    real_extract: d.realExtract,
    mashing_process: d.mashingProcess,
    hopping_details: d.hoppingDetails,
    dry_hop_detail: d.dryHopDetail,
    yeast_strain: d.yeastStrain,
    primary_fermentation: d.primaryFermentation,
    secondary_fermentation: d.secondaryFermentation,
    conditioning_process: d.conditioningProcess,
    maturation_details: d.maturationDetails,
    barrel_details: d.barrelDetails,
    blend_details: d.blendDetails,
    cider_initial_gravity: d.ciderInitialGravity,
    cider_final_gravity: d.ciderFinalGravity,
    residual_sugar: d.residualSugar,
    total_acidity: d.totalAcidity,
    cider_ph: d.ciderPh,
    tannin_level: d.tanninLevel,
    cider_carbonation_technical: d.ciderCarbonationTechnical,
    detailed_varieties: d.detailedVarieties,
    apple_type: d.appleType,
    pressing_method: d.pressingMethod,
    defecation_keeving: d.defecationKeeving,
    malolactic_fermentation: d.malolacticFermentation,
    cider_blend_details: d.ciderBlendDetails,
    cider_aging_details: d.ciderAgingDetails,
    info_source: d.infoSource,
    source_url: d.sourceUrl,
    verification_date: d.verificationDate,
    contributor: d.contributor,
    verification_status: d.verificationStatus,
    submitted_by: d.submittedBy,
    submitted_at: d.submittedAt ? new Date(d.submittedAt).toISOString() : undefined,
    description: d.description,
    snack_type: d.snackType,
    weight_g: d.weightG,
    counts_as_drink_id: d.countsAsDrinkId,
    ratings: d.ratings,
    rating_dates: d.ratingDates,
    rated_serving_modes: d.ratedServingModes,
    pending_edit: d.pendingEdit,
  };
  if (!partial) row.id = d.id;
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
}

/* ---------------- CONDITIONNEMENTS / VARIANTES (réutilise drink_barcodes) ---------------- */

// Une variante = un conditionnement précis (bouteille 33cl, canette 50cl, fût...) rattaché à un
// produit. Le code-barres est optionnel — une variante peut exister sans qu'on le connaisse
// encore. Cette table est la même que celle utilisée par le scanner dans l'app.
function rowToVariant(row) {
  return {
    id: row.id,
    drinkId: row.product_id,
    barcode: row.barcode,
    container: row.container,
    volumeMl: row.volume_ml,
    marketCountry: row.market_country,
    verified: !!row.verified,
  };
}

export async function loadDrinkVariants(drinkId) {
  const { data, error } = await supabase.from("drink_barcodes").select("*").eq("product_id", drinkId).order("created_at");
  if (error) {
    console.error("loadDrinkVariants:", error);
    return [];
  }
  return data.map(rowToVariant);
}

export async function createDrinkVariant({ drinkId, container, volumeMl, barcode, marketCountry }) {
  const row = {
    id: `variant-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    product_id: drinkId,
    container: container || null,
    volume_ml: volumeMl || null,
    barcode: barcode || null,
    market_country: marketCountry || null,
    verified: false,
  };
  const { data, error } = await supabase.from("drink_barcodes").insert(row).select().single();
  if (error) {
    console.error("createDrinkVariant:", error);
    return null;
  }
  return rowToVariant(data);
}

export async function updateDrinkVariant(id, { container, volumeMl, barcode, marketCountry }) {
  const patch = { container: container || null, volume_ml: volumeMl || null, barcode: barcode || null, market_country: marketCountry || null };
  const { error } = await supabase.from("drink_barcodes").update(patch).eq("id", id);
  if (error) console.error("updateDrinkVariant:", error);
}

export async function deleteDrinkVariant(id) {
  const { error } = await supabase.from("drink_barcodes").delete().eq("id", id);
  if (error) console.error("deleteDrinkVariant:", error);
}

/* ---------------- BRASSERIES & PRODUCTEURS ---------------- */

export async function loadBreweriesDirectory() {
  const { data, error } = await supabase.from("breweries_directory").select("*").order("name");
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
  if (error) {
    console.error("updateBrewery:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function deleteBrewery(id) {
  const { data, error } = await supabase.from("breweries_directory").delete().eq("id", id).select();
  if (error) {
    console.error("deleteBrewery:", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Vous n'avez pas les droits nécessaires pour supprimer cette fiche." };
  }
  return { ok: true };
}

function rowToBrewery(row) {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    country: row.country,
    profilePhotoUrl: row.profile_photo_url,
    coverPhotoUrl: row.cover_photo_url,
    streetName: row.street_name,
    streetNumber: row.street_number,
    postalCode: row.postal_code,
    city: row.city,
    village: row.village,
    lat: row.lat,
    lng: row.lng,
    phone: row.phone,
    email: row.email,
    website: row.website,
    googleUrl: row.google_url,
    whatsappUrl: row.whatsapp_url,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    linkedinUrl: row.linkedin_url,
    youtubeUrl: row.youtube_url,
    tiktokUrl: row.tiktok_url,
    snapchatUrl: row.snapchat_url,
    producerTypes: row.producer_types || [],
    producerProfiles: row.producer_profiles || [],
    linkedVenueId: row.linked_venue_id,
    status: row.status,
    aliases: row.aliases || [],
    certificationLevel: row.certification_level,
    duplicateOfId: row.duplicate_of_id,
    openReportsCount: row.open_reports_count || 0,
    ownerManaged: !!row.owner_managed,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    pendingEdit: row.pending_edit || null,
  };
}

function breweryToRow(b, partial = false) {
  const row = {
    name: b.name,
    subtitle: b.subtitle,
    country: b.country,
    profile_photo_url: b.profilePhotoUrl,
    cover_photo_url: b.coverPhotoUrl,
    street_name: b.streetName,
    street_number: b.streetNumber,
    postal_code: b.postalCode,
    city: b.city,
    village: b.village,
    lat: b.lat,
    lng: b.lng,
    phone: b.phone,
    email: b.email,
    website: b.website,
    google_url: b.googleUrl,
    whatsapp_url: b.whatsappUrl,
    facebook_url: b.facebookUrl,
    instagram_url: b.instagramUrl,
    tiktok_url: b.tiktokUrl,
    snapchat_url: b.snapchatUrl,
    linkedin_url: b.linkedinUrl,
    youtube_url: b.youtubeUrl,
    producer_types: b.producerTypes,
    producer_profiles: b.producerProfiles,
    linked_venue_id: b.linkedVenueId,
    status: b.status,
    aliases: b.aliases,
    certification_level: b.certificationLevel,
    duplicate_of_id: b.duplicateOfId,
    owner_managed: b.ownerManaged,
    submitted_by: b.submittedBy,
    submitted_at: b.submittedAt ? new Date(b.submittedAt).toISOString() : undefined,
    pending_edit: b.pendingEdit,
  };
  if (!partial) row.id = b.id;
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
}

export async function uploadBreweryPhoto(breweryId, file, kind) {
  const dims = kind === "cover" ? [1200, 400] : [400, 400];
  const blob = await resizeImageTo(file, dims[0], dims[1]);
  const imageBase64 = await blobToBase64(blob);
  const path = `${breweryId}-${kind}-${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "brewery-photos", path, imageBase64, contentType: "image/jpeg", entityType: "producer", entityId: breweryId, kind: kind === "cover" ? "cover" : "profile_photo" },
  });
  if (error) {
    console.error("uploadBreweryPhoto:", error);
    return null;
  }
  if (data?.error) {
    console.error("uploadBreweryPhoto:", data.error);
    return null;
  }
  return data.url;
}

/* ---------------- MARQUES ---------------- */

export async function loadBrandsDirectory() {
  const { data, error } = await supabase.from("brands_directory").select("*").order("name");
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
  if (error) {
    console.error("updateBrand:", error);
    return { error: error.message };
  }
  return { ok: true };
}

export async function deleteBrand(id) {
  const { data, error } = await supabase.from("brands_directory").delete().eq("id", id).select();
  if (error) {
    console.error("deleteBrand:", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Vous n'avez pas les droits nécessaires pour supprimer cette fiche." };
  }
  return { ok: true };
}

function rowToBrand(row) {
  return {
    id: row.id,
    name: row.name,
    alternateName: row.alternate_name,
    slogan: row.slogan,
    logoUrl: row.logo_url,
    foundedYear: row.founded_year,
    originCountry: row.origin_country,
    originCity: row.origin_city,
    classifications: row.classifications || [],
    brandTypes: row.brand_types || [],
    website: row.website,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    youtubeUrl: row.youtube_url,
    snapchatUrl: row.snapchat_url,
    producerId: row.producer_id,
    brandOwner: row.brand_owner,
    status: row.status,
    aliases: row.aliases || [],
    certificationLevel: row.certification_level,
    duplicateOfId: row.duplicate_of_id,
    openReportsCount: row.open_reports_count || 0,
    ownerManaged: !!row.owner_managed,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    pendingEdit: row.pending_edit || null,
  };
}

function brandToRow(b, partial = false) {
  const row = {
    name: b.name,
    alternate_name: b.alternateName,
    slogan: b.slogan,
    logo_url: b.logoUrl,
    founded_year: b.foundedYear,
    origin_country: b.originCountry,
    origin_city: b.originCity,
    classifications: b.classifications,
    brand_types: b.brandTypes,
    website: b.website,
    facebook_url: b.facebookUrl,
    instagram_url: b.instagramUrl,
    tiktok_url: b.tiktokUrl,
    snapchat_url: b.snapchatUrl,
    youtube_url: b.youtubeUrl,
    producer_id: b.producerId,
    brand_owner: b.brandOwner,
    status: b.status,
    aliases: b.aliases,
    certification_level: b.certificationLevel,
    duplicate_of_id: b.duplicateOfId,
    owner_managed: b.ownerManaged,
    submitted_by: b.submittedBy,
    submitted_at: b.submittedAt ? new Date(b.submittedAt).toISOString() : undefined,
    pending_edit: b.pendingEdit,
  };
  if (!partial) row.id = b.id;
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
}

export async function uploadBrandLogo(brandId, file) {
  const blob = await resizeImageTo(file, 400, 400);
  const imageBase64 = await blobToBase64(blob);
  const path = `${brandId}-logo-${Date.now()}.jpg`;
  const { data, error } = await supabase.functions.invoke("moderate-and-upload-photo", {
    body: { bucket: "brand-logos", path, imageBase64, contentType: "image/jpeg", entityType: "brand", entityId: brandId, kind: "logo" },
  });
  if (error) {
    console.error("uploadBrandLogo:", error);
    return null;
  }
  if (data?.error) {
    console.error("uploadBrandLogo:", data.error);
    return null;
  }
  return data.url;
}
