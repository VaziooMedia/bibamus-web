// ============================================================
// Liens bibamus.app/@nom — un lien court vers un compte, un lieu, une marque ou un producteur.
//
// - usernameLinkUrl : le lien à partager pour un @nom.
// - usernameFromPath : le @nom d'une adresse « /@nom » (rien d'autre n'est reconnu).
// - mémorisation : un lien ouvert sans être connecté est gardé sur l'appareil (24 h, un seul à la
//   fois) pour être ouvert juste après la connexion ou l'inscription, même si la page est
//   rechargée entre-temps.
// Les règles d'un nom (longueur, caractères) restent celles du serveur : ici on ne fait que
// reconnaître la forme d'une adresse et borner la longueur.
// ============================================================
import { BIBAMUS_URL } from "./shareEntity.js";

const STORAGE_KEY = "bibamus_pending_username_link";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// « https://bibamus.app/@nom » ; sans nom, le lien général de l'app.
export function usernameLinkUrl(username) {
  const name = (username || "").trim();
  return name ? `${BIBAMUS_URL}/@${name}` : BIBAMUS_URL;
}

// « /@nom » ou « /@nom/ » (le « @ » peut arriver encodé en « %40 ») → « nom » ; tout autre chemin → null.
export function usernameFromPath(pathname) {
  let path = pathname || "";
  try {
    path = decodeURIComponent(path);
  } catch (e) {
    return null;
  }
  const match = /^\/@([A-Za-z0-9._-]{1,60})\/?$/.exec(path);
  return match ? match[1] : null;
}

export function rememberPendingUsernameLink(name) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, at: Date.now() }));
  } catch (e) {
    // best-effort
  }
}

export function readPendingUsernameLink() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { name, at } = JSON.parse(raw);
    if (typeof name !== "string" || !name || typeof at !== "number" || Date.now() - at > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return name;
  } catch (e) {
    return null;
  }
}

export function clearPendingUsernameLink() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // best-effort
  }
}
