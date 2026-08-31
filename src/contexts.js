// ============================================================
// Contextes React partagés — copiés tels quels depuis le
// prototype Claude (permettent au bouton "Home" et à la photo
// de profil de fonctionner depuis n'importe quel écran, sans
// devoir passer ces informations manuellement partout).
// ============================================================
import React from "react";

export const NavigationContext = React.createContext(() => {});
export const ProfileNavContext = React.createContext({ avatarUrl: null, goToProfile: () => {} });
