#!/usr/bin/env node
// ============================================================
// Régénère src/data/spiritStyleLabels.js : les noms des styles des Spiritueux (16 sous-catégories), copiés depuis la liste de
// départ de la plateforme de gestion (dépôt Bibamus-Management : src/data/spiritStyles.js, export SPIRIT_STYLE_GROUPS_BY_SUBTYPE).
//
// À lancer quand un style de spiritueux change dans le code de la gestion (ajouté, renommé, supprimé). Contrairement aux bières
// ou aux softs, les styles de spiritueux n'ont pas de table en base : cette liste figée est la seule source, côté gestion comme côté app.
//
//   node scripts/generate-spirit-style-labels.mjs [--check] [chemin-du-dépôt-de-gestion]
//
//   sans option : réécrit src/data/spiritStyleLabels.js (seulement s'il change) et résume ce qui a bougé ;
//   --check     : n'écrit rien ; dit si le fichier est à jour (code de sortie 0) ou non (1) — à lancer avant une mise en ligne ;
//   chemin      : le dépôt de gestion. À défaut : la variable GESTION_DIR, sinon un dossier voisin « bibamus-management »
//                 ou « Bibamus-Management ».
//
// Code de sortie 2 : le script s'arrête sans rien écrire (dépôt introuvable, liste de la gestion absente, vide ou mal formée,
// liste de styles de spiritueux que ce script ne connaît pas, code en double, ou code qui existe déjà parmi les styles des
// bières, des vins ou des autres boissons).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src/data/spiritStyleLabels.js");
const SOURCE_FILE = "spiritStyles.js";
const EXPORT_NAME = "SPIRIT_STYLE_GROUPS_BY_SUBTYPE";

class Stop extends Error {}
const stop = (message) => {
  throw new Stop(message);
};

// ---------- arguments ----------
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const unknownFlags = args.filter((a) => a.startsWith("-") && a !== "--check");
if (unknownFlags.length > 0) {
  console.error(`Option inconnue : ${unknownFlags.join(", ")}. Usage : node scripts/generate-spirit-style-labels.mjs [--check] [chemin-du-dépôt-de-gestion]`);
  process.exit(2);
}
const pathArgs = args.filter((a) => !a.startsWith("-"));

function findManagementDir() {
  const asked = pathArgs[0] || process.env.GESTION_DIR;
  const candidates = asked
    ? [path.resolve(asked)]
    : ["../bibamus-management", "../Bibamus-Management", "../../bibamus-management", "../../Bibamus-Management"].map((p) => path.resolve(ROOT, p));
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "src/data", SOURCE_FILE))) return dir;
  }
  stop(
    asked
      ? `Dépôt de gestion introuvable à « ${path.resolve(asked)} » (il doit contenir src/data/${SOURCE_FILE}).`
      : "Dépôt de gestion introuvable à côté de celui-ci. Indique son chemin : node scripts/generate-spirit-style-labels.mjs <chemin-du-dépôt-de-gestion> (ou variable GESTION_DIR)."
  );
}

// ---------- lecture de la gestion ----------
async function readManagement(dir) {
  const mod = await import(pathToFileURL(path.join(dir, "src/data", SOURCE_FILE)).href + "?t=" + Date.now());

  // Une liste de styles de spiritueux de la gestion que ce script ne connaît pas serait ignorée sans bruit : on s'arrête plutôt.
  const unknown = Object.keys(mod).filter((name) => /(_STYLES|_STYLE_GROUPS|_STYLE_GROUPS_BY_SUBTYPE)$/.test(name) && name !== EXPORT_NAME);
  if (unknown.length > 0) {
    stop(`Liste(s) de styles de la gestion non reprise(s) : ${unknown.map((n) => `${SOURCE_FILE} → ${n}`).join(", ")}. Ajoute-les à ce script, puis relance.`);
  }

  const data = mod[EXPORT_NAME];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) stop(`${SOURCE_FILE} : « ${EXPORT_NAME} » est absent ou vide.`);

  const groups = {}; // sous-catégorie → [{ title, tags: [{ code, fr }] }]
  const entries = []; // [code, nom, sous-catégorie]
  const seen = new Map();
  for (const [sub, list] of Object.entries(data)) {
    if (!Array.isArray(list) || list.length === 0) stop(`${SOURCE_FILE} : la sous-catégorie « ${sub} » est vide ou mal formée.`);
    groups[sub] = [];
    for (const g of list) {
      if (!g || typeof g.title !== "string" || !g.title || !Array.isArray(g.tags) || g.tags.length === 0) stop(`${SOURCE_FILE} : « ${sub} » contient un groupe sans titre ou sans style : ${JSON.stringify(g)}.`);
      const tags = [];
      for (const t of g.tags) {
        if (!t || typeof t.code !== "string" || !t.code || typeof t.fr !== "string" || !t.fr) stop(`${SOURCE_FILE} : « ${sub} » contient une entrée sans code ou sans nom : ${JSON.stringify(t)}.`);
        if (seen.has(t.code)) stop(`Code en double « ${t.code} » : ${seen.get(t.code)} et ${sub}. Un code ne peut avoir qu'un nom.`);
        seen.set(t.code, sub);
        entries.push([t.code, t.fr, sub]);
        tags.push({ code: t.code, fr: t.fr });
      }
      groups[sub].push({ title: g.title, tags });
    }
  }
  return { groups, entries };
}

// Les codes des bières, des cidres, des vins et des autres boissons de l'app : un code repris ici ne doit pas en faire partie (l'app donnerait alors le nom d'un autre style).
async function assertNoClash(entries) {
  let beersWines;
  let others;
  try {
    beersWines = await import(pathToFileURL(path.join(ROOT, "src/data/styleTagLabels.js")).href + "?t=" + Date.now());
    others = await import(pathToFileURL(path.join(ROOT, "src/data/otherStyleLabels.js")).href + "?t=" + Date.now());
  } catch (e) {
    console.warn(`⚠ Contrôle des codes des autres boissons ignoré (fichier illisible : ${e.message.split("\n")[0]}).`);
    return;
  }
  const groups = [beersWines.BEER_CIDER_STYLE_GROUPS].flat().filter(Boolean);
  const taken = new Set([...groups.flatMap((g) => g.tags.map((t) => t.code)), ...others.OTHER_STYLE_LABELS.keys()]);
  const clashes = entries.filter(([code]) => taken.has(code)).map(([code]) => code);
  if (clashes.length > 0) stop(`Code(s) déjà utilisé(s) par des styles de bières, de cidres, de vins ou d'autres boissons : ${clashes.slice(0, 8).join(", ")}${clashes.length > 8 ? "…" : ""}.`);
}

// ---------- le fichier ----------
function render(groups, entries) {
  const subs = Object.keys(groups);
  let body = "";
  subs.forEach((sub, si) => {
    body += `  ${/^[A-Za-z_$][\w$]*$/.test(sub) ? sub : JSON.stringify(sub)}: [\n`;
    for (const g of groups[sub]) {
      body += `    {\n      title: ${JSON.stringify(g.title)},\n      tags: [\n`;
      for (const t of g.tags) body += `        { code: ${JSON.stringify(t.code)}, fr: ${JSON.stringify(t.fr)} },\n`;
      body += `      ],\n    },\n`;
    }
    body += `  ],\n${si < subs.length - 1 ? "\n" : ""}`;
  });
  return `// ============================================================
// Noms des styles des Spiritueux — copiés fidèlement depuis la liste de départ de la plateforme de gestion (dépôt
// Bibamus-Management, src/data/spiritStyles.js : ${EXPORT_NAME}, ${subs.length} sous-catégories, ${entries.length} styles).
//
// FICHIER GÉNÉRÉ — ne pas le modifier à la main : node scripts/generate-spirit-style-labels.mjs
// (sans option pour le réécrire, avec --check pour vérifier qu'il est à jour).
//
// Un tableau de groupes par sous-catégorie (beverageSubtype), comme dans la gestion. Utilisé uniquement pour AFFICHER les
// styles déjà choisis (fiche produit, carte BibaPulse, filtre de la liste des produits) : la sélection se fait côté gestion.
// Les styles de spiritueux n'ont pas de table en base (contrairement aux bières et aux softs) : un style ajouté, renommé ou supprimé
// dans le code de la gestion se reporte ici avec le script ci-dessus.
// ============================================================

export const ${EXPORT_NAME} = {
${body}};
`;
}

// Les entrées du fichier actuel (pour dire ce qui a changé).
function readCurrent() {
  if (!fs.existsSync(OUT)) return { text: null, map: new Map() };
  const text = fs.readFileSync(OUT, "utf8");
  const map = new Map();
  for (const m of text.matchAll(/^ {8}\{ code: ("(?:[^"\\]|\\.)*"), fr: ("(?:[^"\\]|\\.)*") \},$/gm)) map.set(JSON.parse(m[1]), JSON.parse(m[2]));
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
  const { groups, entries } = await readManagement(dir);
  await assertNoClash(entries);
  const wanted = render(groups, entries);
  const current = readCurrent();
  const { lines, changed } = summarize(current.map, entries);
  const subCount = Object.keys(groups).length;

  if (current.text === wanted) {
    console.log(`À jour : ${entries.length} styles en ${subCount} sous-catégories, identiques à ceux de la gestion (${dir}).`);
    process.exit(0);
  }
  const what = current.text === null ? "  (première génération du fichier)" : changed > 0 ? lines.join("\n") : "  (aucun style ne change ; seule la mise en forme, l'ordre ou l'en-tête du fichier diffère)";
  if (checkOnly) {
    console.log(`Pas à jour — src/data/spiritStyleLabels.js diffère de la gestion (${dir}) :\n${what}\nLance « node scripts/generate-spirit-style-labels.mjs » pour le réécrire.`);
    process.exit(1);
  }
  fs.writeFileSync(OUT, wanted);
  console.log(`src/data/spiritStyleLabels.js réécrit : ${entries.length} styles en ${subCount} sous-catégories (source : ${dir}).\n${what}`);
} catch (e) {
  if (e instanceof Stop) {
    console.error(`Arrêt, rien n'a été écrit : ${e.message}`);
    process.exit(2);
  }
  throw e;
}
