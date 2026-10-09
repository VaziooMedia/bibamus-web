// ============================================================
// Fonctions utilitaires partagées — copiées telles quelles
// depuis le prototype Claude.
// ============================================================
import { DRINK_TYPES, MENU_CATEGORIES, DRINK_TYPE_MIGRATIONS, NON_ALCOHOLIC_DRINK_TYPES, SERVING_MODE_LABELS, MONTH_NAMES_FR, DRINK_FIELD_LABELS } from "./constants.js";

export const normalizeForSearch = (text) =>
  (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Recherche centralisée — utilisée par tous les écrans de la Database plutôt que chacun son
// propre filtre dispersé. Une entité est trouvée par son nom canonique OU l'un de ses alias
// (traductions, anciens noms...), sans jamais dupliquer la fiche elle-même. extraFields permet
// d'inclure d'autres champs texte pertinents (ex. le nom de la brasserie pour un produit).
export function searchEntities(entities, query, extraFields = []) {
  const q = normalizeForSearch(query);
  if (!q) return entities;
  return entities.filter((e) => {
    if (normalizeForSearch(e.name).includes(q)) return true;
    if (Array.isArray(e.aliases) && e.aliases.some((a) => normalizeForSearch(a).includes(q))) return true;
    return extraFields.some((field) => normalizeForSearch(e[field]).includes(q));
  });
}

export const formatCompactCount = (n) => {
  if (n < 1000) return String(n);
  if (n < 1000000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0).replace(".", ",")}k`;
  return `${(n / 1000000).toFixed(n % 1000000 >= 100000 ? 1 : 0).replace(".", ",")}M`;
};

export const sameVenueByNameCity = (a, b) =>
  (a.name || "").trim().toLowerCase() === (b.name || "").trim().toLowerCase() &&
  (a.city || "").trim().toLowerCase() === (b.city || "").trim().toLowerCase();

export const formatAddress = (venue) => {
  const streetPart = [venue.streetName, venue.streetNumber].filter(Boolean).join(", ");
  const postalPart = venue.postalCode ? `B-${venue.postalCode}` : "";
  const cityBase = [postalPart, venue.city].filter(Boolean).join(" ");
  const cityPart = venue.village ? `${cityBase} (${venue.village})`.trim() : cityBase;
  return [streetPart, cityPart].filter(Boolean).join(" - ");
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch {
    return dateStr;
  }
};

export const formatTime = (timestamp) => {
  if (!timestamp) return "";
  try {
    return new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
  } catch {
    return "";
  }
};

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const randomCode = (length) => {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
};

export const capitalizeFirst = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : str);

export const todayISO = () => new Date().toISOString().slice(0, 10);

let idCounter = 0;
export const nextId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  idCounter += 1;
  return `${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
};

export const kcalForDrink = (drink) =>
  drink.kcalPer100ml != null && drink.volumeCl != null ? Math.round((drink.kcalPer100ml * drink.volumeCl) / 10) : null;

export const normalizeDrinkType = (type) => {
  if (!type) return "";
  if (DRINK_TYPES.includes(type)) return type;
  return DRINK_TYPE_MIGRATIONS[type] || type;
};

export const normalizeMenuItemType = (type) => {
  if (!type) return "";
  if (MENU_CATEGORIES.includes(type)) return type;
  return DRINK_TYPE_MIGRATIONS[type] || type;
};

// Une entrée de carte porte désormais plusieurs volumes (champ volumes) au lieu d'un seul
// volumeCl/price posés directement dessus — les entrées déjà enregistrées avant ce changement
// n'ont que l'ancienne forme ; on la retrouve ici sans jamais la réécrire.
export const normalizeVolumes = (item) => item.volumes || [{ id: item.id, cl: item.volumeCl ?? null, price: item.price ?? 0, isDefault: true }];

// Une entrée de la carte porte potentiellement plusieurs volumes — on en fait ici un "produit
// virtuel" par volume, avec un identifiant composé entréeId::volumeId, pour que le reste de
// l'écran continue de raisonner sur une simple liste de produits. findMenuEntryById sait
// retrouver le bon volume à partir de cet identifiant composé quand on affiche une commande.
export const flattenMenu = (menu) =>
  menu.flatMap((entry) => normalizeVolumes(entry).map((v) => ({ ...entry, id: `${entry.id}::${v.id}`, volumeCl: v.cl, price: v.price, isDefault: v.isDefault })));

// Un identifiant de commande (drinkId) désigne soit directement une entrée de la carte (ancien
// format à un seul volume), soit un volume précis au sein d'une entrée qui en a plusieurs —
// repéré par un identifiant composé "entréeId::volumeId". Centralise cette résolution pour que
// chaque écran qui affiche le nom/prix d'une commande n'ait pas à connaître cette distinction.
export const findMenuEntryById = (menu, id) => {
  if (!id) return null;
  const direct = menu.find((d) => d.id === id);
  if (direct) return direct;
  const [entryId, volId] = id.split("::");
  const entry = menu.find((d) => d.id === entryId);
  if (!entry) return null;
  const vol = normalizeVolumes(entry).find((v) => v.id === volId);
  if (!vol) return null;
  return { ...entry, volumeCl: vol.cl, price: vol.price };
};

// Produits du répertoire que cette personne a consommés dans ce salon — ce que liste le Drink
// Check. Deux pièges évités ici : (1) un identifiant de commande est le plus souvent composé
// "entréeId::volumeId" (voir flattenMenu), il faut donc passer par findMenuEntryById et non un
// simple menu.find(d => d.id === …), qui ne trouve jamais rien ; (2) dans une tournée lancée par
// quelqu'un d'autre, "self" désigne cette autre personne — mes verres sont ceux dont le
// participant porte MON code (ou, pour une très ancienne tournée sans code, l'entrée "moi").
export const directoryDrinkIdsConsumedBy = (event, myBibroCode) => {
  const orderIds = new Set();
  (event.rounds || []).forEach((r) => {
    (r.orders || []).forEach((o) => {
      const friend = (r.friends || []).find((f) => f.id === o.friendId);
      const isMine = friend ? (!!myBibroCode && friend.code === myBibroCode) || (!!friend.isSelf && !friend.code) : o.friendId === "self";
      if (isMine) orderIds.add(o.drinkId);
    });
  });
  (event.personalOrders || []).forEach((o) => orderIds.add(o.drinkId));
  // @Home : chaque verre « Je me sers » porte le code de la personne qui l'a pris.
  (event.homeDrinks || []).forEach((h) => {
    if (myBibroCode && h.code === myBibroCode) orderIds.add(h.drinkId);
  });
  const sourceIds = [];
  orderIds.forEach((id) => {
    const entry = findMenuEntryById(event.menu || [], id);
    if (entry?.fromDirectory && entry?.sourceDrinkId && !sourceIds.includes(entry.sourceDrinkId)) sourceIds.push(entry.sourceDrinkId);
  });
  return sourceIds;
};

// @Home — ce que chaque personne a bu, par participant puis par produit (et volume), pour l'écran
// du salon. Les plus servis d'abord ; à égalité, par prénom. Un verre est une entrée de
// event.homeDrinks : { id, code, name, drinkId, timestamp }.
export const homeDrinksByPerson = (event) => {
  const people = new Map();
  (event.homeDrinks || []).forEach((h) => {
    if (!h || !h.code) return;
    let person = people.get(h.code);
    if (!person) {
      const participant = (event.participants || []).find((p) => p.code === h.code);
      person = { code: h.code, name: participant?.name || h.name || h.code, total: 0, items: new Map() };
      people.set(h.code, person);
    }
    const entry = findMenuEntryById(event.menu || [], h.drinkId);
    const item = person.items.get(h.drinkId) || { drinkId: h.drinkId, name: entry?.name || "Boisson", volumeCl: entry?.volumeCl ?? null, count: 0 };
    item.count += 1;
    person.items.set(h.drinkId, item);
    person.total += 1;
  });
  return [...people.values()]
    .map((p) => ({ ...p, items: [...p.items.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
};

export const resolveMenuItem = (item, drinksDirectory) => {
  if (!item.fromDirectory || !item.sourceDrinkId) return item;
  const master = drinksDirectory.find((d) => d.id === item.sourceDrinkId);
  if (!master) return item;
  return {
    ...item,
    name: master.name,
    type: normalizeDrinkType(master.type),
    photoUrl: master.photoUrl,
    kcalPer100ml: master.kcalPer100ml,
    beerTags: master.beerTags,
    abv: master.abv,
    brand: master.brand,
    brewery: master.brewery,
    nationality: master.nationality,
    glutenFree: master.glutenFree,
    bio: master.bio,
    isGeneric: master.isGeneric,
    countsAsDrinkId: master.countsAsDrinkId || null,
  };
};

// @Home — prépare « Je me sers » (fonction pure, testée à part). Renvoie : la nouvelle entrée de
// carte à ajouter au salon (null si ce produit existe déjà à ce volume, ajouté par moi ou par
// quelqu'un d'autre), le verre à ranger dans event.homeDrinks, et la ligne de statistiques
// (round_orders : lieu @home, donc sans prix). drink_id est le vrai identifiant du catalogue.
export const buildHomeServe = (event, source, { volumeCl = null } = {}, me = {}) => {
  const cl = volumeCl ?? null;
  let entry = null;
  let vol = null;
  for (const d of event.menu || []) {
    if (!(d.fromDirectory && d.sourceDrinkId === source.id)) continue;
    const v = normalizeVolumes(d).find((x) => (x.cl ?? null) === cl);
    if (v) {
      entry = d;
      vol = v;
      break;
    }
  }
  let newEntry = null;
  if (!entry) {
    newEntry = resolveMenuItem(
      { id: `local-${Date.now()}-${Math.random()}`, fromDirectory: true, sourceDrinkId: source.id, servingMode: "", volumes: [{ id: nextId(), cl, price: 0, isDefault: true }] },
      [source]
    );
    entry = newEntry;
    vol = newEntry.volumes[0];
  }
  const serveId = `home-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    newEntry,
    homeDrink: { id: serveId, code: me.code, name: me.name, drinkId: `${entry.id}::${vol.id}`, timestamp: Date.now() },
    order: { bibro_code: me.code, guest_name: null, drink_id: source.id, unit_price: null, unit_volume_cl: cl, unit_kcal_per_100ml: source.kcalPer100ml ?? entry.kcalPer100ml ?? null },
  };
};

// Applique / annule un « Je me sers » sur l'état du salon (fonctions pures, partagées avec les tests).
export const withHomeServe = (e, newEntry, homeDrink) => ({
  ...e,
  menu: newEntry && !(e.menu || []).some((d) => d.id === newEntry.id) ? [...(e.menu || []), newEntry] : e.menu,
  homeDrinks: [...(e.homeDrinks || []), homeDrink],
});
export const withoutHomeDrink = (e, serveId) => ({ ...e, homeDrinks: (e.homeDrinks || []).filter((h) => h.id !== serveId) });

// ------------------------------------------------------------
// Lignes de statistiques (round_orders) d'un salon : une tournée, ou un verre pris hors tournée.
//
// Un identifiant de commande est le plus souvent COMPOSÉ « entréeId::volumeId » (voir flattenMenu) :
// il faut donc le résoudre avec findMenuEntryById, jamais avec un simple menu.find(d => d.id === …),
// qui ne trouve rien — les lignes partaient alors sans produit, sans prix, sans volume ni calories.
// drink_id doit être le vrai identifiant du catalogue (drinks_directory), jamais l'id local de la carte
// du salon ; une entrée qui ne vient pas du répertoire n'a pas de produit à compter (drink_id NULL).
// ------------------------------------------------------------
const statsRowFor = (drink) => ({
  drink_id: drink?.fromDirectory && drink?.sourceDrinkId ? drink.sourceDrinkId : null,
  unit_price: drink?.price ?? null,
  unit_volume_cl: drink?.volumeCl ?? null,
  unit_kcal_per_100ml: drink?.kcalPer100ml ?? null,
});

// Une ligne par verre commandé dans la tournée. Chaque participant est résolu vers son vrai compte
// Bibax quand il en a un (via son code), sinon seulement son prénom (invité sans compte).
export const roundOrderRows = (menu, orders, friends) =>
  (orders || []).map((o) => {
    const friend = (friends || []).find((f) => f.id === o.friendId);
    return {
      bibro_code: friend?.code || null,
      guest_name: friend?.code ? null : friend?.name || null,
      ...statsRowFor(findMenuEntryById(menu || [], o.drinkId)),
    };
  });

// Identifiant de « tournée » propre à un verre pris hors tournée : record_round_orders refuse deux fois le
// même, et c'est ce qui permet de retirer ce verre seul (delete_round_orders) si on se trompe de tap.
export const personalRoundId = (orderId) => `perso-${orderId}`;

// Le verre que JE prends hors tournée : une ligne à mon nom, sans prix (reçu gratuitement), qui compte
// comme une vraie consommation. Rien à enregistrer sans compte Bibax ni produit du répertoire.
export const personalDrinkRecord = (event, orderId, drinkId, myBibroCode) => {
  if (!myBibroCode) return null;
  const row = statsRowFor(findMenuEntryById(event.menu || [], drinkId));
  if (!row.drink_id) return null;
  return { roundId: personalRoundId(orderId), order: { bibro_code: myBibroCode, guest_name: null, ...row, unit_price: null } };
};

export const computeMissingVenueItems = (event, venue, drinksDirectory) => {
  if (!venue || !venue.menu) return [];
  return venue.menu
    .map((vItem) => resolveMenuItem(vItem, drinksDirectory))
    .filter((vItem) => !event.menu.some((eItem) => normalizeForSearch(eItem.name) === normalizeForSearch(vItem.name)));
};

export const formatMoney = (value, currency) => {
  if (currency === "jeton") {
    const n = Math.round(value * 10) / 10;
    return `${n % 1 === 0 ? n : n.toFixed(1)} jeton${n !== 1 ? "s" : ""}`;
  }
  return `${value.toFixed(2).replace(".", ",")} €`;
};

// Accord grammatical basé sur le genre déclaré — "male"/"female" donnent l'accord classique,
// tout le reste (non-binaire, gender fluid, autre, non précisé, ou absent) garde l'écriture
// inclusive comme choix neutre par défaut.
export const genderAgree = (gender, masculine, feminine, neutral = `${masculine}·${feminine.slice(masculine.length)}`) => {
  if (gender === "male") return masculine;
  if (gender === "female") return feminine;
  return neutral;
};

// Reproduit exactement le format des clés de COUNTRY_ISO_CODES (minuscule, sans accent,
// tirets/apostrophes/espaces remplacés par un underscore) — pour retrouver le vrai nom
// correctement capitalisé (depuis COUNTRIES) à partir d'un code ISO détecté.
export const slugifyCountryName = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-'\s]/g, "_");

export const drinkTypeLabel = (type) => {
  if (type === "Bières") return "Bières & Cidres";
  if (type === "Vins & bulles") return "Vins & Bulles";
  if (type === "Softs & eaux") return "Softs & Eaux";
  return type;
};

export const isAlcoholicDrink = (drink) => {
  if (!drink) return false;
  if (typeof drink.abv === "number") return drink.abv > 0.5;
  if (NON_ALCOHOLIC_DRINK_TYPES.includes(drink.type)) return false;
  if (drink.type === "Cocktails / Mocktails") return false;
  return true;
};


export function drinkSummaryParts(d, includeType = true) {
  const abvText = d.abv != null ? `${d.abv.toFixed(1)}% ABV` : null;
  const producer = d.brewery || null; // brasserie/producteur specifically — not the brand, usually already in the title

  let parts;
  if (d.isGeneric) {
    parts = [abvText, "Produit générique"];
  } else {
    switch (d.type) {
      case "Bières & Cidres":
        parts = [abvText, producer];
        break;
      case "Vins & Bulles":
        parts = [abvText, producer];
        break;
      case "Spiritueux":
        parts = [abvText];
        break;
      case "Cocktails / Mocktails":
        parts = [abvText, producer];
        break;
      case "Softs & Eaux":
        parts = [producer];
        break;
      case "Boissons chaudes":
        parts = d.abv != null && d.abv > 0 ? [abvText] : [];
        break;
      case "Snacks":
        parts = [d.snackType || null, d.weightG != null ? `${d.weightG} g.` : null];
        break;
      default:
        parts = [abvText, d.brand || d.brewery || null];
    }
  }

  return [includeType && d.type ? drinkTypeLabel(d.type) : null, ...parts].filter(Boolean);
}

export function drinkSummaryLine(d, includeType = true) {
  return drinkSummaryParts(d, includeType).join(" · ");
}

export const normalizeForDuplicateCheck = (name) => (name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

export const isValidVenuePhone = (phone) => !phone || !phone.trim() || /^\+\d/.test(phone.trim());

export const ensureLeafletLoaded = (onReady, onError) => {
  if (window.L) {
    onReady();
    return;
  }
  if (!document.getElementById("leaflet-css")) {
    const cssLink = document.createElement("link");
    cssLink.id = "leaflet-css";
    cssLink.rel = "stylesheet";
    cssLink.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
    document.head.appendChild(cssLink);
  }
  const existing = document.getElementById("leaflet-js");
  if (existing) {
    existing.addEventListener("load", onReady);
    if (onError) existing.addEventListener("error", onError);
    return;
  }
  const script = document.createElement("script");
  script.id = "leaflet-js";
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
  script.onload = onReady;
  script.onerror = onError || null;
  document.body.appendChild(script);
};

export const formatDDMMYYYY = (timestamp) => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export const formatDrinkFieldValue = (field, value) => {
  if (field === "glutenFree" || field === "bio" || field === "isGeneric") return value ? "Oui" : "Non";
  if (value === null || value === undefined || value === "") return "—";
  if (field === "kcalPer100ml") return `${value} kcal`;
  if (field === "abv") return `${value.toFixed(1)}%`;
  if (field === "volumeCl") return `${String(value).replace(".", ",")} cl.`;
  if (field === "weightG") return `${value} g.`;
  if (field === "averagePrice") return `${String(value).replace(".", ",")} €`;
  if (field === "servingMode") return SERVING_MODE_LABELS[value] || value;
  if (field === "beerTags") return Array.isArray(value) && value.length ? value.join(", ") : "—";
  return String(value);
};

// Le champ WhatsApp est saisi côté plateforme de gestion comme un numéro de téléphone
// (indicatif + numéro, ex. "+32 470123456"), pas comme une URL. On construit ici le vrai
// lien wa.me en ne gardant que les chiffres, pour que le clic ouvre WhatsApp plutôt que
// de tenter de charger "+32 470123456" comme une adresse web.
export const buildWhatsAppLink = (value) => {
  if (!value) return "";
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return `https://wa.me/${digitsOnly}`;
};

export const normalizeUrl = (url) => {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) return trimmed;
  return `https://${trimmed}`;
};

export const mapsUrlFor = (venue) => {
  const query = formatAddress(venue) || venue.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};


export const buildAlcoholDaysMap = (events, manualAlcoholFreeDays = []) => {
  const map = {};
  events.forEach((ev) => {
    (ev.personalOrders || []).forEach((o) => {
      const drink = (ev.menu || []).find((d) => d.id === o.drinkId);
      if (!drink || !o.timestamp) return;
      const dateKey = new Date(o.timestamp).toISOString().slice(0, 10);
      if (isAlcoholicDrink(drink)) map[dateKey] = true;
      else if (!(dateKey in map)) map[dateKey] = false;
    });
  });
  // Manual check-ins fill the real gap: no event that day doesn't mean "unknown", it usually
  // means "didn't go out" — but only the person can confirm that, and real order data always
  // wins if the two ever disagree.
  manualAlcoholFreeDays.forEach((dateKey) => {
    if (map[dateKey] !== true) map[dateKey] = false;
  });
  return map;
};

export const realMoneySpentFor = (ev) => {
  const eventTip = ev.tip || 0;
  const roundTips = (ev.rounds || []).reduce((s, r) => s + (r.tip || 0), 0);
  const tip = eventTip + roundTips;
  if (ev.currency === "euro") {
    return (ev.finalTotal != null ? ev.finalTotal : ev.rounds.reduce((s, r) => s + r.total, 0)) + tip;
  }
  const purchased = (ev.ticketPurchases || []).filter((p) => !p.carriedOver).reduce((s, p) => s + p.quantity, 0);
  return purchased * (ev.jetonUnitValue || 0) + tip;
};

export const realMoneySpentSince = (ev, cutoffDate) => {
  if (!cutoffDate) return realMoneySpentFor(ev);
  const passes = (ts) => ts != null && ts >= cutoffDate;
  const roundTips = (ev.rounds || []).filter((r) => passes(r.timestamp)).reduce((s, r) => s + (r.tip || 0), 0);
  const eventTip = passes(ev.createdAt) ? ev.tip || 0 : 0;
  if (ev.currency === "euro") {
    // finalTotal is a single override with no per-contribution timestamp of its own — only usable
    // if the event itself is new enough; otherwise fall back to individually-timestamped rounds.
    const base =
      ev.finalTotal != null
        ? passes(ev.createdAt)
          ? ev.finalTotal
          : 0
        : (ev.rounds || []).filter((r) => passes(r.timestamp)).reduce((s, r) => s + r.total, 0);
    return base + roundTips + eventTip;
  }
  const purchased = (ev.ticketPurchases || []).filter((p) => !p.carriedOver && passes(p.timestamp)).reduce((s, p) => s + p.quantity, 0);
  return purchased * (ev.jetonUnitValue || 0) + roundTips + eventTip;
};

export const computeCurrentStreak = (alcoholDaysMap, wantAlcohol) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 3650; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (alcoholDaysMap[key] === wantAlcohol) streak++;
    else break;
  }
  return streak;
};

export const computeLongestAlcoholFreeStreak = (alcoholDaysMap) => {
  const freeDates = Object.keys(alcoholDaysMap)
    .filter((k) => alcoholDaysMap[k] === false)
    .sort();
  let longest = 0;
  let current = 0;
  let prevDate = null;
  freeDates.forEach((key) => {
    const d = new Date(key + "T00:00:00");
    if (prevDate) {
      const dayDiff = Math.round((d - prevDate) / 86400000);
      current = dayDiff === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    prevDate = d;
  });
  return longest;
};

export const formatMemberSince = (timestamp) => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return `${MONTH_NAMES_FR[d.getMonth()]} ${d.getFullYear()}`;
};


export const formatSharedBirthDate = (value) => {
  if (!value) return "";
  if (value.startsWith("--")) {
    // "--MM-DD" splits to ["", "", "MM", "DD"] because of the leading double dash.
    const parts = value.split("-");
    const mm = parseInt(parts[2], 10);
    const dd = parseInt(parts[3], 10);
    if (!mm || !dd) return value;
    return `${dd} ${MONTH_NAMES_FR[mm - 1]}`;
  }
  try {
    const d = new Date(value + "T00:00:00");
    return `${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return value;
  }
};

export const computeAgeFromBirthDate = (isoDate) => {
  if (!isoDate || isoDate.startsWith("--")) return null;
  try {
    const birth = new Date(isoDate + "T00:00:00");
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const hadBirthdayThisYear = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
    if (!hadBirthdayThisYear) age--;
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
};
export const computeDrinkDiff = (original, submitted) => {
  const diff = {};
  Object.keys(DRINK_FIELD_LABELS).forEach((field) => {
    const before = original[field];
    const after = submitted[field];
    const same = Array.isArray(before) || Array.isArray(after) ? JSON.stringify(before || []) === JSON.stringify(after || []) : (before ?? "") === (after ?? "");
    if (!same) diff[field] = after;
  });
  return diff;
};

// Garantit qu'un événement a toujours tous les champs attendus, même si l'objet vient d'une
// ancienne sauvegarde (stockage local, ou salon Supabase) créée avant que ces champs existent —
// évite un plantage à l'affichage plutôt que de devoir corriger chaque lecture individuellement.
export const normalizeEvent = (e) => ({
  ...e,
  menu: e.menu || [],
  rounds: e.rounds || [],
  knownFriends: e.knownFriends || [],
  personalOrders: e.personalOrders || [],
  homeDrinks: e.homeDrinks || [],
  ticketPurchases: e.ticketPurchases || [],
  participants: e.participants || [],
  playlist: e.playlist || [],
  spotifyPlaylistId: e.spotifyPlaylistId || null,
  spotifyPlaylistUrl: e.spotifyPlaylistUrl || null,
  nowPlayingUri: e.nowPlayingUri || null,
  nowPlayingTrack: e.nowPlayingTrack || null,
  playedUris: e.playedUris || [],
  djCode: e.djCode || null,
  bibaBob: e.bibaBob || {},
  pot: e.pot || null,
  splitParticipants: e.splitParticipants || null,
  finalTotal: e.finalTotal != null ? e.finalTotal : null,
  tip: e.tip || 0,
  jetonUnitValue: e.jetonUnitValue || 0,
  closed: !!e.closed,
  paused: !!e.paused,
  isHome: !!e.isHome,
  salonCode: e.salonCode || null,
  // Rejette les échos temps réel plus anciens que ce qu'on a déjà en local — sans ça, notre
  // propre écriture qui revient via l'abonnement au salon peut écraser une action plus récente
  // encore en train de se propager (ex. cliquer "Payer" ne marche pas du premier coup).
  updatedAt: e.updatedAt || 0,
});

export const formatDuration = (startMs, endMs) => {
  if (!startMs || !endMs || endMs < startMs) return "";
  const totalMinutes = Math.round((endMs - startMs) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m}`;
};

// Vraie préparation pour le jour où l'app sera vraiment traduite (elle ne l'est pas encore —
// aujourd'hui, tout le texte de l'interface reste en dur en français) : dès que app_language
// sera vraiment exploité quelque part, cette vraie fonction résout le vrai nom à afficher pour
// une vraie fiche (lieu/produit/marque/producteur), en préférant sa vraie traduction dans la
// vraie langue active de l'utilisateur si elle existe, sinon son vrai nom par défaut.
// appLanguageCode est le vrai code court stocké sur le profil (ex. "nl"), pas le vrai label
// complet utilisé dans translations[].lang (ex. "Néerlandais") — ces vraies 2 listes ne sont
// pas encore alignées (app_language n'a que 4 langues, translations en propose 9, et l'anglais
// y est distingué UK/US) : le mapping ci-dessous fait le vrai lien entre les deux.
const APP_LANGUAGE_CODE_TO_TRANSLATION_LABEL = {
  fr: "Français",
  nl: "Néerlandais",
  de: "Allemand",
  en: ["Anglais (UK)", "Anglais (US)"], // pas de vrai distinction UK/US côté app_language — UK d'abord par défaut
};

export function displayName(entity, appLanguageCode) {
  if (!entity) return "";
  const target = APP_LANGUAGE_CODE_TO_TRANSLATION_LABEL[appLanguageCode];
  if (!target || !entity.translations || entity.translations.length === 0) return entity.name;
  const candidates = Array.isArray(target) ? target : [target];
  for (const label of candidates) {
    const match = entity.translations.find((t) => t.lang === label && t.value?.trim());
    if (match) return match.value;
  }
  return entity.name;
}

// Vraie normalisation de recherche — pour retrouver une fiche même sans taper le vrai nom
// exact (accents, tirets, abréviations courantes). Reproduit côté client la vraie même vraie
// logique que la vraie colonne search_text calculée en base (voir migration SQL dédiée), pour
// que les vraies recherches purement locales (déjà en mémoire) se comportent pareil que les
// vraies recherches côté serveur.
export function normalizeSearchText(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents (Jägermeister → jagermeister)
    .replace(/[-'’`]/g, " ") // tirets/apostrophes → espace (Belle-Vue → belle vue)
    .replace(/\./g, "") // points (St. → St)
    .replace(/\bsainte\b/g, "ste")
    .replace(/\bsaint\b/g, "st") // Saint ↔ St
    .replace(/\s+/g, " ")
    .trim();
}
