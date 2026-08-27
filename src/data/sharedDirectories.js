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
    openingHours: row.opening_hours || {},
    hasTerrace: !!row.has_terrace,
    wheelchairAccessible: !!row.wheelchair_accessible,
    hasWifi: !!row.has_wifi,
    googlePlaceId: row.google_place_id,
    googlePlaceIdCheckedAt: row.google_place_id_checked_at,
    noGooglePresence: !!row.no_google_presence,
    googleHoursLastFetchAt: row.google_hours_last_fetch_at,
    googleHoursLastStatus: row.google_hours_last_status,
    ownerManaged: !!row.owner_managed,
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
    snapchat_url: v.snapchatUrl,
    restaurant_guru_url: v.restaurantGuruUrl,
    tripadvisor_url: v.tripadvisorUrl,
    has_food: v.hasFood,
    default_currency: v.defaultCurrency,
    jeton_unit_value: v.jetonUnitValue,
    tags: v.tags,
    lat: v.lat,
    lng: v.lng,
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
    opening_hours: v.openingHours,
    has_terrace: v.hasTerrace,
    wheelchair_accessible: v.wheelchairAccessible,
    has_wifi: v.hasWifi,
    owner_managed: v.ownerManaged,
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

export async function uploadVenuePhoto(venueId, file, kind) {
  const dims = kind === "cover" ? [1200, 400] : [400, 400];
  const blob = await resizeImageTo(file, dims[0], dims[1]);
  const path = `${venueId}-${kind}-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage.from("venue-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    console.error("uploadVenuePhoto:", uploadError);
    return null;
  }
  const { data } = supabase.storage.from("venue-photos").getPublicUrl(path);
  return data.publicUrl;
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
  const path = `${drinkId}-main-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage.from("drink-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    console.error("uploadDrinkMainPhoto:", uploadError);
    return null;
  }
  const { data } = supabase.storage.from("drink-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadDrinkGalleryPhoto(drinkId, file) {
  const blob = await resizeImageTo(file, 1000, 1000);
  const path = `${drinkId}-gallery-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
  const { error: uploadError } = await supabase.storage.from("drink-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    console.error("uploadDrinkGalleryPhoto:", uploadError);
    return null;
  }
  const { data } = supabase.storage.from("drink-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function loadDrinksDirectory() {
  const { data, error } = await supabase.from("drinks_directory").select("*").order("name");
  if (error) {
    console.error("loadDrinksDirectory:", error);
    return [];
  }
  return data.map(rowToDrink);
}

// Un statut vide en base ("null") équivaut à "en attente" — traité comme tel dans les comptages.
function applyStatusFilter(query, status) {
  if (status === "pending") return query.or("status.is.null,status.eq.pending");
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
  let query = supabase.from("drinks_directory").select("*, brands_directory(name)", { count: "exact" });
  query = applyTypeFilter(query, type);
  if (search && search.trim()) query = query.ilike("name", `%${search.trim()}%`);
  // "brandName" résulte d'une jointure, pas d'une vraie colonne — on trie par brand_id à la place.
  const realSortKey = sortKey === "brandName" ? "brand_id" : sortKey;
  query = query.order(realSortKey, { ascending: sortDir === 1, nullsFirst: false });
  query = query.range(page * pageSize, page * pageSize + pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("loadDrinksPage:", error);
    return { items: [], total: 0 };
  }
  return {
    items: data.map((row) => ({ ...rowToDrink(row), brandName: row.brands_directory?.name || null })),
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
    brandId: row.brand_id,
    producerIds: row.producer_ids || [],
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
    is_generic: d.isGeneric,
    average_price: d.averagePrice,
    average_jeton_value: d.averageJetonValue,
    avatar_emoji: d.avatarEmoji,
    brand_id: d.brandId,
    producer_ids: d.producerIds,
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
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    snapchatUrl: row.snapchat_url,
    producerTypes: row.producer_types || [],
    producerProfiles: row.producer_profiles || [],
    status: row.status,
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
    facebook_url: b.facebookUrl,
    instagram_url: b.instagramUrl,
    tiktok_url: b.tiktokUrl,
    snapchat_url: b.snapchatUrl,
    producer_types: b.producerTypes,
    producer_profiles: b.producerProfiles,
    status: b.status,
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
  const path = `${breweryId}-${kind}-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage.from("brewery-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    console.error("uploadBreweryPhoto:", uploadError);
    return null;
  }
  const { data } = supabase.storage.from("brewery-photos").getPublicUrl(path);
  return data.publicUrl;
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
    alternateName: row.alternate_name,
    slogan: row.slogan,
    logoUrl: row.logo_url,
    foundedYear: row.founded_year,
    originCountry: row.origin_country,
    originCity: row.origin_city,
    classification: row.classification,
    brandTypes: row.brand_types || [],
    website: row.website,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    snapchatUrl: row.snapchat_url,
    producerId: row.producer_id,
    brandOwner: row.brand_owner,
    status: row.status,
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
    classification: b.classification,
    brand_types: b.brandTypes,
    website: b.website,
    facebook_url: b.facebookUrl,
    instagram_url: b.instagramUrl,
    tiktok_url: b.tiktokUrl,
    snapchat_url: b.snapchatUrl,
    producer_id: b.producerId,
    brand_owner: b.brandOwner,
    status: b.status,
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
  const path = `${brandId}-logo-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage.from("brand-logos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    console.error("uploadBrandLogo:", uploadError);
    return null;
  }
  const { data } = supabase.storage.from("brand-logos").getPublicUrl(path);
  return data.publicUrl;
}
