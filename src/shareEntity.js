// ============================================================
// Bouton « Partager » — passe par le vrai menu de partage du système d'exploitation
// (navigator.share), qui propose Facebook, Instagram, WhatsApp, Messages... selon ce que
// l'utilisateur a installé. Aucun lien direct par réseau : ce sont ces mêmes apps qui
// apparaissent déjà dans ce menu natif sur iPhone comme sur Safari Mac.
//
// L'app ne sait pas encore ouvrir une fiche précise depuis un lien (pas de vraies routes par
// produit/lieu — tout se passe par état interne, jamais par URL) : le lien partagé pointe donc
// vers bibamus.app en général, pas vers CETTE fiche précisément. Le nom et le texte, eux,
// désignent bien la fiche partagée.
// ============================================================
const BIBAMUS_URL = "https://bibamus.app";

// À appeler uniquement si canShareEntity() est vrai (voir plus bas) — sinon navigator.share
// n'existe pas et l'appel échouerait.
export async function shareEntity({ title, text }) {
  try {
    await navigator.share({ title, text, url: BIBAMUS_URL });
    return { ok: true };
  } catch (err) {
    // L'utilisateur a fermé le menu de partage sans rien choisir — pas une vraie erreur.
    if (err && err.name === "AbortError") return { ok: true };
    console.error("shareEntity:", err);
    return { error: "Le partage a échoué." };
  }
}

// Le bouton ne s'affiche que si le partage natif existe réellement (essentiellement absent des
// navigateurs de bureau plus anciens) — jamais un bouton qui échouerait au clic.
export function canShareEntity() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
