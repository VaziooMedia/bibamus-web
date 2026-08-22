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

/* ---------------- ÉTABLISSEMENTS & LIEUX ---------------- */

export async function loadPublicVenues() {
  const { data, error } = await supabase.from("public_venues").select("*").order("name");
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
    country: row.country,
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
    status: row.status,
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

/* ---------------- PRODUITS (RÉPERTOIRE DES BOISSONS) ---------------- */

export async function loadDrinksDirectory() {
  const { data, error } = await supabase.from("drinks_directory").select("*").order("name");
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
    isGeneric: row.is_generic,
    averagePrice: row.average_price,
    averageJetonValue: row.average_jeton_value,
    avatarEmoji: row.avatar_emoji,
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
    is_generic: d.isGeneric,
    average_price: d.averagePrice,
    average_jeton_value: d.averageJetonValue,
    avatar_emoji: d.avatarEmoji,
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
  if (error) console.error("updateBrewery:", error);
}

export async function deleteBrewery(id) {
  const { error } = await supabase.from("breweries_directory").delete().eq("id", id);
  if (error) console.error("deleteBrewery:", error);
}

function rowToBrewery(row) {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    pendingEdit: row.pending_edit || null,
  };
}

function breweryToRow(b, partial = false) {
  const row = {
    name: b.name,
    country: b.country,
    status: b.status,
    submitted_by: b.submittedBy,
    submitted_at: b.submittedAt ? new Date(b.submittedAt).toISOString() : undefined,
    pending_edit: b.pendingEdit,
  };
  if (!partial) row.id = b.id;
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
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
    pendingEdit: row.pending_edit || null,
  };
}

function brandToRow(b, partial = false) {
  const row = {
    name: b.name,
    status: b.status,
    submitted_by: b.submittedBy,
    submitted_at: b.submittedAt ? new Date(b.submittedAt).toISOString() : undefined,
    pending_edit: b.pendingEdit,
  };
  if (!partial) row.id = b.id;
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
}
