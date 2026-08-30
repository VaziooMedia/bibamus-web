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

/* ---------------- AUTHENTIFICATION ---------------- */

// Vrais comptes (Supabase Auth) — remplace la génération locale du code Bibax. Le profil
// (avec le code Bibax) est désormais stocké côté serveur, lié au compte, récupérable en cas de
// changement d'appareil.

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // Génère le code Bibax et crée la ligne de profil correspondante.
  const { data: codeData, error: codeError } = await supabase.rpc("generate_bibro_code");
  if (codeError) return { error: codeError.message };

  const { error: profileError } = await supabase.from("profiles").insert({ id: data.user.id, bibro_code: codeData });
  if (profileError) return { error: profileError.message };

  return { user: data.user, session: data.session };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { user: data.user, session: data.session };
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
  return { myBibroCode: data.bibro_code, name: data.name || "", avatarEmoji: data.avatar_emoji || null };
}

export async function updateMyProfile(userId, { name, avatarEmoji }) {
  const { error } = await supabase.from("profiles").update({ name, avatar_emoji: avatarEmoji }).eq("id", userId);
  if (error) console.error("updateMyProfile:", error);
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
    googlePlaceId: row.google_place_id,
    noGooglePresence: !!row.no_google_presence,
    noFixedHours: !!row.no_fixed_hours,
    status: row.status,
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
  return data.map((row) => ({ ...rowToVenue(row), distanceMeters: row.distance_meters ?? row.distance }));
}

/* ---------------- HORAIRES — GOOGLE PLACES (source unique) ---------------- */

// Google est la source unique des horaires — jamais de saisie manuelle dans Bibamus.
// L'appel réel à Google se fait côté serveur (Edge Function), la clé API n'est jamais
// exposée ici.
export async function loadEstablishmentOpeningHours(googlePlaceId) {
  if (!googlePlaceId) return { status: "LINK_REQUIRED" };
  try {
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
  const path = `${drinkId}-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage.from("drink-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    console.error("uploadDrinkPhoto:", uploadError);
    return null;
  }
  const { data } = supabase.storage.from("drink-photos").getPublicUrl(path);
  return data.publicUrl;
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
    submitted_at: b.submittedAt ? new Date(b.submittedAt).toISOString() : undefined,
  };
  if (!partial) row.id = b.id;
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
}
