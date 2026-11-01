#!/usr/bin/env node
// ============================================================
// Régénère src/data/otherStyleLabels.js : les noms des styles des Softs & Eaux, des Boissons chaudes et des
// Cocktails / Mocktails, copiés depuis les listes de départ de la plateforme de gestion (dépôt Bibamus-Management :
// src/data/softStyles.js, hotStyles.js et cocktailStyles.js).
//
// À lancer quand un style de DÉPART change dans le code de la gestion (ajouté, renommé, supprimé). Un style
// ajouté ou renommé depuis la fiche produit de la gestion, lui, passe par la base (custom_list_items) : rien à faire ici.
//
//   node scripts/generate-other-style-labels.mjs [--check] [chemin-du-dépôt-de-gestion]
//
//   sans option : réécrit src/data/otherStyleLabels.js (seulement s'il change) et résume ce qui a bougé ;
//   --check     : n'écrit rien ; dit si le fichier est à jour (code de sortie 0) ou non (1) — à lancer avant une mise en ligne ;
//   chemin      : le dépôt de gestion. À défaut : la variable GESTION_DIR, sinon un dossier voisin « bibamus-management »
//                 ou « Bibamus-Management ».
//
// Code de sortie 2 : le script s'arrête sans rien écrire (dépôt introuvable, liste de la gestion non reprise ici,
// code en double, ou code qui existe déjà parmi les styles des bières et des vins).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src/data/otherStyleLabels.js");

// Les listes reprises : [clé dans custom_list_items (list_key), titre, fichier de la gestion, nom de l'export].
// Une liste de plus dans la gestion se déclare ici ; si sa catégorie est nouvelle, elle va aussi dans OTHER_STYLE_TYPES
// (modèle ci-dessous) et dans le chargement de la fiche produit (DrinkDetailScreen.jsx).
const LISTS = [
  ["water_style", "Eau", "softStyles.js", "WATER_STYLES"],
  ["soda_style", "Soda", "softStyles.js", "SODA_STYLE_GROUPS"],
  ["juice_style", "Jus", "softStyles.js", "JUICE_STYLE_GROUPS"],
  ["energy_style", "Energy", "softStyles.js", "ENERGY_STYLE_GROUPS"],
  ["sport_style", "Sport", "softStyles.js", "SPORT_STYLE_GROUPS"],
  ["dairy_style", "Lactée", "softStyles.js", "DAIRY_STYLE_GROUPS"],
  ["syrup_style", "Sirop", "softStyles.js", "SYRUP_STYLE_GROUPS"],
  ["coffee_style", "Café", "hotStyles.js", "COFFEE_STYLE_GROUPS"],
  ["tea_style", "Thé", "hotStyles.js", "TEA_STYLE_GROUPS"],
  ["infusion_style", "Infusion", "hotStyles.js", "INFUSION_STYLE_GROUPS"],
  ["hot_milk_style", "Hot Milk", "hotStyles.js", "HOT_MILK_STYLE_GROUPS"],
  ["soup_style", "Soupe", "hotStyles.js", "SOUP_STYLE_GROUPS"],
  ["hot_mix_style", "Hot Mix", "hotStyles.js", "HOT_MIX_STYLE_GROUPS"],
  ["cereal_chicory_style", "Céréales & Chicorée", "hotStyles.js", "CEREAL_CHICORY_STYLE_GROUPS"],
  ["cocktail_style", "Cocktails", "cocktailStyles.js", "COCKTAIL_STYLE_GROUPS"],
  ["mocktail_style", "Mocktails", "cocktailStyles.js", "MOCKTAIL_STYLE_GROUPS"],
];
const SOURCE_FILES = [...new Set(LISTS.map((l) => l[2]))];
const OTHER_STYLE_TYPES = ["Softs & Eaux", "Boissons chaudes", "Cocktails / Mocktails"];

class Stop extends Error {}
const stop = (message) => {
  throw new Stop(message);
};

// ---------- arguments ----------
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const unknownFlags = args.filter((a) => a.startsWith("-") && a !== "--check");
if (unknownFlags.length > 0) {
  console.error(`Option inconnue : ${unknownFlags.join(", ")}. Usage : node scripts/generate-other-style-labels.mjs [--check] [chemin-du-dépôt-de-gestion]`);
  process.exit(2);
}
const pathArgs = args.filter((a) => !a.startsWith("-"));

function findManagementDir() {
  const asked = pathArgs[0] || process.env.GESTION_DIR;
  const candidates = asked ? [path.resolve(asked)] : ["../bibamus-management", "../Bibamus-Management", "../../bibamus-management", "../../Bibamus-Management"].map((p) => path.resolve(ROOT, p));
  for (const dir of candidates) {
    if (SOURCE_FILES.every((f) => fs.existsSync(path.join(dir, "src/data", f)))) return dir;
  }
  stop(
    asked
      ? `Dépôt de gestion introuvable à « ${path.resolve(asked)} » (il doit contenir src/data/${SOURCE_FILES.join(", ")}).`
      : "Dépôt de gestion introuvable à côté de celui-ci. Indique son chemin : node scripts/generate-other-style-labels.mjs <chemin-du-dépôt-de-gestion> (ou variable GESTION_DIR)."
  );
}

// ---------- lecture de la gestion ----------
async function readManagement(dir) {
  const modules = {};
  for (const f of SOURCE_FILES) modules[f] = await import(pathToFileURL(path.join(dir, "src/data", f)).href + "?t=" + Date.now());

  // Une liste de la gestion que ce script ne connaît pas serait ignorée sans bruit : on s'arrête plutôt.
  const known = new Set(LISTS.map((l) => `${l[2]}:${l[3]}`));
  const unknown = [];
  for (const f of SOURCE_FILES) {
    for (const name of Object.keys(modules[f])) {
      if (/(_STYLES|_STYLE_GROUPS)$/.test(name) && !known.has(`${f}:${name}`)) unknown.push(`${f} → ${name}`);
    }
  }
  if (unknown.length > 0) {
    stop(`Liste(s) de styles de la gestion non reprise(s) : ${unknown.join(", ")}. Ajoute-les au tableau LISTS de ce script (clé de liste de customLists.js, titre), puis relance.`);
  }

  const entries = []; // [code, nom, clé de liste]
  const seen = new Map();
  for (const [key, title, file, exportName] of LISTS) {
    const data = modules[file][exportName];
    if (!Array.isArray(data) || data.length === 0) stop(`${file} : « ${exportName} » (${title}) est absent ou vide.`);
    const tags = data[0] && Array.isArray(data[0].tags) ? data.flatMap((g) => g.tags) : data; // liste en groupes ou liste plate
    for (const t of tags) {
      if (!t || typeof t.code !== "string" || !t.code || typeof t.fr !== "string" || !t.fr) stop(`${file} : « ${exportName} » (${title}) contient une entrée sans code ou sans nom : ${JSON.stringify(t)}.`);
      if (seen.has(t.code)) stop(`Code en double « ${t.code} » : ${seen.get(t.code)} et ${title}. Un code ne peut avoir qu'un nom.`);
      seen.set(t.code, title);
      entries.push([t.code, t.fr, key]);
    }
  }
  return { entries, lists: LISTS.map(([key, title, file, exportName]) => ({ key, title, count: (modules[file][exportName][0]?.tags ? modules[file][exportName].flatMap((g) => g.tags) : modules[file][exportName]).length })) };
}

// Les codes des bières, cidres et vins de l'app : un code repris ici ne doit pas en faire partie (l'app donnerait alors le nom de la bière).
async function assertNoClashWithBeersAndWines(entries) {
  let mod;
  try {
    mod = await import(pathToFileURL(path.join(ROOT, "src/data/styleTagLabels.js")).href + "?t=" + Date.now());
  } catch (e) {
    console.warn(`⚠ Contrôle des codes de bières et de vins ignoré (styleTagLabels.js illisible : ${e.message.split("\n")[0]}).`);
    return;
  }
  const groups = [mod.BEER_CIDER_STYLE_GROUPS, mod.WINE_STYLE_GROUPS, mod.WINE_EFFERVESCENT_STYLE_GROUPS].flat().filter(Boolean);
  const taken = new Set(groups.flatMap((g) => g.tags.map((t) => t.code)));
  const clashes = entries.filter(([code]) => taken.has(code)).map(([code]) => code);
  if (clashes.length > 0) stop(`Code(s) déjà utilisé(s) par des styles de bières, de cidres ou de vins : ${clashes.slice(0, 8).join(", ")}${clashes.length > 8 ? "…" : ""}.`);
}

// ---------- le fichier ----------
function render(entries, lists) {
  const total = entries.length;
  let body = "";
  let lastKey = null;
  for (const [code, fr, key] of entries) {
    if (key !== lastKey) {
      const l = lists.find((x) => x.key === key);
      body += `${lastKey === null ? "" : "\n"}  // ${l.title} (${l.count}) — liste « ${key} »\n`;
      lastKey = key;
    }
    body += `  [${JSON.stringify(code)}, ${JSON.stringify(fr)}],\n`;
  }
  const keys = LISTS.map((l) => `  ${JSON.stringify(l[0])},`).join("\n");
  return `// ============================================================
// Noms des styles des Softs & Eaux, des Boissons chaudes et des Cocktails / Mocktails — copiés fidèlement
// depuis les listes de départ de la plateforme de gestion (src/data/softStyles.js, hotStyles.js et
// cocktailStyles.js ; ${total} styles en ${LISTS.length} listes). Les Snacks n'ont pas de styles.
//
// FICHIER GÉNÉRÉ — ne pas le modifier à la main : node scripts/generate-other-style-labels.mjs
// (sans option pour le réécrire, avec --check pour vérifier qu'il est à jour).
//
// Utilisé uniquement pour AFFICHER les styles déjà choisis sur une fiche produit : la sélection se fait côté
// plateforme de gestion. Un code ajouté à la main (« perso_… ») ou un nom modifié depuis la gestion ne
// se trouve pas ici : il est lu en base (table custom_list_items, clés ci-dessous) et l'emporte sur ce nom.
// Un style de départ ajouté, renommé ou supprimé dans le code de la gestion se reporte ici avec le script ci-dessus.
// ============================================================

// Clés de ces listes dans custom_list_items (list_key).
export const OTHER_STYLE_LIST_KEYS = [
${keys}
];

// Types de produit (tels que l'app les nomme) dont les styles viennent de ces listes.
export const OTHER_STYLE_TYPES = [${OTHER_STYLE_TYPES.map((t) => JSON.stringify(t)).join(", ")}];

// code → nom. Une Map : un code comme « constructor » ne doit jamais tomber sur une propriété d'objet.
export const OTHER_STYLE_LABELS = new Map([
${body}]);
`;
}

// Les entrées du fichier actuel (pour dire ce qui a changé).
function readCurrent() {
  if (!fs.existsSync(OUT)) return { text: null, map: new Map() };
  const text = fs.readFileSync(OUT, "utf8");
  const map = new Map();
  for (const m of text.matchAll(/^ {2}\[("(?:[^"\\]|\\.)*"), ("(?:[^"\\]|\\.)*")\],$/gm)) map.set(JSON.parse(m[1]), JSON.parse(m[2]));
  return { text, map };
}

function summarize(current, entries) {
  const next = new Map(entries.map(([c, fr]) => [c, fr]));
  const added = [...next].filter(([c]) => !current.has(c));
  const removed = [...current].filter(([c]) => !next.has(c));
  const renamed = [...next].filter(([c, fr]) => current.has(c) && current.get(c) !== fr);
  const lines = [];
  const show = (label, list, fmt) => {
    if (list.length === 0) return;
    lines.push(`  ${list.length} ${label} :`);
    list.slice(0, 15).forEach((x) => lines.push(`    ${fmt(x)}`));
    if (list.length > 15) lines.push(`    … et ${list.length - 15} autre(s)`);
  };
  show("style(s) ajouté(s)", added, ([c, fr]) => `+ ${c} → ${fr}`);
  show("style(s) supprimé(s)", removed, ([c, fr]) => `- ${c} (${fr})`);
  show("style(s) renommé(s)", renamed, ([c, fr]) => `~ ${c} : « ${current.get(c)} » → « ${fr} »`);
  return { lines, changed: added.length + removed.length + renamed.length };
}

// ---------- programme ----------
try {
  const dir = findManagementDir();
  const { entries, lists } = await readManagement(dir);
  await assertNoClashWithBeersAndWines(entries);
  const wanted = render(entries, lists);
  const current = readCurrent();
  const { lines, changed } = summarize(current.map, entries);

  if (current.text === wanted) {
    console.log(`À jour : ${entries.length} styles en ${LISTS.length} listes, identiques à ceux de la gestion (${dir}).`);
    process.exit(0);
  }
  const what = changed > 0 ? lines.join("\n") : "  (aucun style ne change ; seule la mise en forme ou l'en-tête du fichier diffère)";
  if (checkOnly) {
    console.log(`Pas à jour — src/data/otherStyleLabels.js diffère de la gestion (${dir}) :\n${what}\nLance « node scripts/generate-other-style-labels.mjs » pour le réécrire.`);
    process.exit(1);
  }
  fs.writeFileSync(OUT, wanted);
  console.log(`src/data/otherStyleLabels.js réécrit : ${entries.length} styles en ${LISTS.length} listes (source : ${dir}).\n${what}`);
} catch (e) {
  if (e instanceof Stop) {
    console.error(`Arrêt, rien n'a été écrit : ${e.message}`);
    process.exit(2);
  }
  throw e;
}
