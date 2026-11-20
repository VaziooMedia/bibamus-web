// ============================================================
// Contextes React partagés — copiés tels quels depuis le
// prototype Claude (permettent au bouton "Home" et à la photo
// de profil de fonctionner depuis n'importe quel écran, sans
// devoir passer ces informations manuellement partout).
// ============================================================
import React from "react";

export const NavigationContext = React.createContext(() => {});
// `myBibroCode` : le code Bibro de la personne connectée, pour les actions métier lancées depuis un écran qui ne le reçoit pas (ex. « Ajouter un lieu » en surcouche, AddVenueOverlay).
export const ProfileNavContext = React.createContext({ avatarUrl: null, myBibroCode: null, goToProfile: () => {}, goToSpotifyConnect: (_returnScreen, _returnEventId) => {} });
