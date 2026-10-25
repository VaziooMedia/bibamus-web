// ============================================================
// Carte publique d'une fiche (lieu, marque, producteur) — le texte et les balises des aperçus de partage des liens
// bibamus.app/@nom : ce que voient WhatsApp, Messenger, Google... avant même d'ouvrir l'app.
//
// Fichier PUR : aucune dépendance à React, à la base de données ni au navigateur, pour que la fonction Vercel
// api/at.js (via publicCardHandler.js) et, plus tard, l'écran de la carte publique de l'app puissent s'en servir.
//
// Ce que la carte publique montre d'une fiche : son nom, son type, sa ville et son pays, sa photo. Rien d'autre
// (la base ne le rend d'ailleurs pas : voir get_public_card). Un compte n'a JAMAIS de carte : le lien d'un compte et
// un nom qui n'existe pas donnent exactement la même page générique (et celle-ci n'est pas indexée par Google).
//
// Tout texte qui vient de la base est nettoyé (espaces, caractères de contrôle, longueur) puis échappé avant d'entrer
// dans le HTML : un nom de fiche piégé ne peut ni casser la page ni y injecter quoi que ce soit.
// ============================================================
import { BRAND_TYPES, PRODUCER_TYPES, VENUE_TYPES } from "./constants.js";
import { COUNTRY_CODE_TO_LABEL } from "./countryLabels.js";

// Même forme que le lien reconnu par l'app (voir usernameFromPath dans usernameLinks.js).
export const PUBLIC_USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,60}$/;
export const isPublicUsername = (name) => typeof name === "string" && PUBLIC_USERNAME_PATTERN.test(name);

export const KIND_LABELS = { venue: "Lieu", brand: "Marque", brewery: "Producteur" };
const TYPE_LISTS = { venue: VENUE_TYPES, brand: BRAND_TYPES, brewery: PRODUCER_TYPES };

export const GENERIC_TITLE = "Bibamus";
export const GENERIC_DESCRIPTION = "L'application sociale qui connecte les gens autour des boissons, des lieux et des moments partagés.";
// Adresse DÉFINITIVE du site : bibamus.app redirige (308) vers www.bibamus.app (constaté le 2026-10-25). L'adresse officielle
// d'une page (canonical, og:url) et l'icône par défaut doivent pointer là, pas vers une adresse qui redirige elle-même.
// Les liens de partage de l'app (BIBAMUS_URL, shareEntity.js) restent inchangés : ils passent par la redirection.
export const PUBLIC_SITE_URL = "https://www.bibamus.app";
export const DEFAULT_IMAGE_URL = `${PUBLIC_SITE_URL}/icon-512.png`;

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// Caractères qui n'ont rien à faire dans un titre : contrôles, séparateurs de ligne, marques de sens d'écriture
// (utilisées pour tromper l'affichage), espaces de largeur nulle.
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]+/g;

// Texte sur une seule ligne, sans caractère invisible, au plus `max` caractères (avec « … » si coupé).
export function cleanText(value, max) {
  if (typeof value !== "string") return "";
  const s = value.replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();
  const chars = Array.from(s);
  if (chars.length <= max) return s;
  return chars.slice(0, max - 1).join("").trimEnd() + "…";
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Seule une adresse https simple est acceptée comme image (jamais un lien « javascript: » ou « data: »).
export function safeImageUrl(value) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length <= 2048 && /^https:\/\/[^\s"'<>\\]+$/.test(s) ? s : null;
}

// Les trois premiers types connus, dans l'ordre de la fiche (un code inconnu est ignoré, jamais affiché tel quel).
export function typeLabels(kind, types, max = 3) {
  const list = hasOwn(TYPE_LISTS, kind) ? TYPE_LISTS[kind] : [];
  if (!Array.isArray(types)) return [];
  const out = [];
  for (const code of types) {
    if (typeof code !== "string") continue;
    const found = list.find((t) => t.code === code);
    if (found && !out.includes(found.fr)) out.push(found.fr);
    if (out.length >= max) break;
  }
  return out;
}

// « Namur, Belgique ». Pays inconnu, « autre » ou « international » : on n'affiche que la ville.
export function placeText(city, country) {
  const c = cleanText(city, 80);
  const label = typeof country === "string" && hasOwn(COUNTRY_CODE_TO_LABEL, country) && country !== "autre" && country !== "international" ? COUNTRY_CODE_TO_LABEL[country] : "";
  return [c, label].filter(Boolean).join(", ");
}

// Les textes d'une carte, prêts à afficher — ou null si la ligne reçue n'a pas la forme d'une carte.
export function publicCardTexts(card) {
  if (!card || typeof card !== "object" || typeof card.kind !== "string" || !hasOwn(KIND_LABELS, card.kind)) return null;
  const name = cleanText(card.name, 80);
  if (!name) return null;
  const kindLabel = KIND_LABELS[card.kind];
  const types = typeLabels(card.kind, card.types);
  const place = placeText(card.city, card.country);
  const summary = [types.length > 0 ? types.join(", ") : kindLabel, place].filter(Boolean).join(" · ");
  const cover = safeImageUrl(card.cover_url);
  const photo = safeImageUrl(card.photo_url);
  return {
    kind: card.kind,
    kindLabel,
    name,
    types,
    place,
    title: `${name} · Bibamus`,
    description: cleanText(`${summary}. Découvre ${name} sur Bibamus.`, 200),
    imageUrl: cover || photo || null,
    imageIsWide: Boolean(cover),
    username: isPublicUsername(card.username) ? card.username : null,
  };
}

const metaName = (name, content) => `<meta name="${name}" content="${escapeHtml(content)}" />`;
const metaProp = (prop, content) => `<meta property="${prop}" content="${escapeHtml(content)}" />`;

// Balises d'une page de fiche : visible de tous, indexable, avec l'adresse « officielle » du lien (le @nom tel qu'enregistré).
export function cardHeadTags(texts) {
  const image = texts.imageUrl || DEFAULT_IMAGE_URL;
  const lines = [
    metaName("description", texts.description),
    metaName("robots", "index, follow"),
  ];
  if (texts.username) lines.push(`<link rel="canonical" href="${escapeHtml(`${PUBLIC_SITE_URL}/@${texts.username}`)}" />`);
  lines.push(
    metaProp("og:type", "website"),
    metaProp("og:site_name", "Bibamus"),
    metaProp("og:title", texts.title),
    metaProp("og:description", texts.description),
  );
  if (texts.username) lines.push(metaProp("og:url", `${PUBLIC_SITE_URL}/@${texts.username}`));
  lines.push(
    metaProp("og:image", image),
    metaName("twitter:card", texts.imageUrl && texts.imageIsWide ? "summary_large_image" : "summary"),
    metaName("twitter:title", texts.title),
    metaName("twitter:description", texts.description),
    metaName("twitter:image", image),
  );
  return lines.join("\n    ");
}

// Balises de la page générique : compte, nom inconnu, fiche pas encore « complet »... toutes la même, sans aucune trace du
// nom demandé, et NON indexée (on ne veut pas de milliers de pages vides dans Google).
export function genericHeadTags() {
  return [
    metaName("description", GENERIC_DESCRIPTION),
    metaName("robots", "noindex"),
    metaProp("og:type", "website"),
    metaProp("og:site_name", "Bibamus"),
    metaProp("og:title", GENERIC_TITLE),
    metaProp("og:description", GENERIC_DESCRIPTION),
    metaProp("og:image", DEFAULT_IMAGE_URL),
    metaName("twitter:card", "summary"),
    metaName("twitter:title", GENERIC_TITLE),
    metaName("twitter:description", GENERIC_DESCRIPTION),
    metaName("twitter:image", DEFAULT_IMAGE_URL),
  ].join("\n    ");
}

// Balises que la page de base pourrait déjà contenir un jour (description, robots, aperçus, adresse officielle) : on les
// retire avant d'ajouter celles de la fiche, pour ne jamais en avoir deux (un robot garderait la première).
const EXISTING_META = /<meta\s[^>]*?\b(?:name|property)\s*=\s*["'](?:description|robots|og:[^"']*|twitter:[^"']*)["'][^>]*>\s*/gi;
const EXISTING_CANONICAL = /<link\s[^>]*?\brel\s*=\s*["']canonical["'][^>]*>\s*/gi;

// Remplace le titre de la page de base et ajoute les balises avant la fin de l'en-tête. Rend null si la page de base n'a
// pas d'en-tête reconnaissable (on ne fabrique jamais une page à moitié).
export function injectHead(html, title, tagsHtml) {
  if (typeof html !== "string" || !/<\/head>/i.test(html)) return null;
  const titleTag = `<title>${escapeHtml(title)}</title>`;
  let out = html.replace(EXISTING_META, "").replace(EXISTING_CANONICAL, "");
  out = /<title[^>]*>[\s\S]*?<\/title>/i.test(out)
    ? out.replace(/<title[^>]*>[\s\S]*?<\/title>/i, () => titleTag)
    : out.replace(/<\/head>/i, () => `  ${titleTag}\n  </head>`);
  // Fonctions de remplacement (et non des textes) : un « $& » dans un nom ne doit rien déclencher.
  return out.replace(/<\/head>/i, () => `  ${tagsHtml}\n  </head>`);
}
