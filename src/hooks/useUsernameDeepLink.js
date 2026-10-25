// ============================================================
// Ouvre le compte, le lieu, la marque ou le producteur d'un lien bibamus.app/@nom.
//
// Au démarrage : si l'adresse est « /@nom », le nom est retenu (et mémorisé sur l'appareil) et
// l'adresse est remise à « / » — sans ça, un rechargement renverrait sans fin vers ce lien, l'app
// ne changeant jamais l'adresse du navigateur par elle-même. Sans lien dans l'adresse, un lien
// mémorisé lors d'une visite précédente (non connecté, moins de 24 h) est repris.
// Dès que l'app est prête (connectée, profil et répertoires chargés), le serveur est interrogé
// (lookup_username) ; le lien n'est jamais ouvert deux fois. Un lien qui ne mène à rien (nom
// inconnu, compte bloqué ou désactivé, fiche non publiée, fiche absorbée par une fusion) donne
// toujours la même réponse neutre via onNotFound.
// Rend { pending } : le nom du lien en attente (null s'il n'y en a pas, ou une fois ouvert). Tant que la personne n'est pas
// connectée, l'app s'en sert pour lui montrer d'abord la carte publique de la fiche (PublicLinkGate).
// ============================================================
import { useState, useEffect, useRef } from "react";
import { lookupUsername } from "../data/sharedDirectories.js";
import { usernameFromPath, rememberPendingUsernameLink, readPendingUsernameLink, clearPendingUsernameLink } from "../usernameLinks.js";

export function useUsernameDeepLink({ ready, myBibroCode, brandsDirectory, breweriesDirectory, onOpenVenue, onOpenBrand, onOpenBrewery, onOpenBibax, onOpenMyProfile, onNotFound }) {
  const [pending, setPending] = useState(() => {
    const fromPath = usernameFromPath(window.location.pathname);
    if (fromPath) {
      window.history.replaceState(null, "", "/");
      rememberPendingUsernameLink(fromPath);
      return fromPath;
    }
    return readPendingUsernameLink();
  });

  // Les gestionnaires changent à chaque affichage : on garde toujours les plus récents sans relancer l'effet.
  const latest = useRef({});
  latest.current = { myBibroCode, brandsDirectory, breweriesDirectory, onOpenVenue, onOpenBrand, onOpenBrewery, onOpenBibax, onOpenMyProfile, onNotFound };
  const handled = useRef(null);

  useEffect(() => {
    if (!pending || !ready || handled.current === pending) return;
    handled.current = pending;
    clearPendingUsernameLink();
    (async () => {
      const found = await lookupUsername(pending);
      setPending(null);
      const h = latest.current;
      if (!found) return h.onNotFound();
      if (found.kind === "venue") return h.onOpenVenue(found.id);
      if (found.kind === "brand") return (h.brandsDirectory || []).some((b) => b.id === found.id) ? h.onOpenBrand(found.id) : h.onNotFound();
      if (found.kind === "brewery") return (h.breweriesDirectory || []).some((b) => b.id === found.id) ? h.onOpenBrewery(found.id) : h.onNotFound();
      if (found.kind === "user" && found.bibroCode) return found.bibroCode === h.myBibroCode ? h.onOpenMyProfile() : h.onOpenBibax(found.bibroCode);
      return h.onNotFound();
    })();
  }, [pending, ready]);

  return { pending };
}
