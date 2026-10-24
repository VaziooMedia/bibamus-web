// ============================================================
// Fonction Vercel (Edge) des aperçus de partage des liens bibamus.app/@nom.
// Appelée uniquement pour les robots (WhatsApp, Messenger, Google...) : voir vercel.json. Tout le travail est dans
// src/publicCardHandler.js (testé à part) ; ce fichier ne fait que le brancher.
// ============================================================
import { handlePublicLink } from "../src/publicCardHandler.js";

export const config = { runtime: "edge" };

export default function handler(request) {
  return handlePublicLink(request);
}
