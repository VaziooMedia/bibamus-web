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
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
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

export const resolveMenuItem = (item, drinksDirectory) => {
  if (!item.fromDirectory || !item.sourceDrinkId) return item;
  const master = drinksDirectory.find((d) => d.id === item.sourceDrinkId);
  if (!master) return item;
  return {
    ...item,
    name: master.name,
    type: normalizeDrinkType(master.type),
    kcalPer100ml: master.kcalPer100ml,
    beerTags: master.beerTags,
    abv: master.abv,
    brand: master.brand,
    brewery: master.brewery,
    nationality: master.nationality,
    glutenFree: master.glutenFree,
    bio: master.bio,
    countsAsDrinkId: master.countsAsDrinkId || null,
  };
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


export function drinkSummaryLine(d, includeType = true) {
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

  return [includeType && d.type ? drinkTypeLabel(d.type) : null, ...parts].filter(Boolean).join(" · ");
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
  ticketPurchases: e.ticketPurchases || [],
  participants: e.participants || [],
  playlist: e.playlist || [],
  spotifyPlaylistId: e.spotifyPlaylistId || null,
  spotifyPlaylistUrl: e.spotifyPlaylistUrl || null,
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
