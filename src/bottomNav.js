// ============================================================
// Quand la barre d'accès rapide du bas (BottomNav) est masquée (voir App.jsx) : au défilement, pendant une conversation
// BibaPing, sur BibaPulse, et en permanence sur certains écrans. La carte des lieux a besoin de toute la hauteur : le cadre
// du lieu choisi s'y pose en bas de l'écran.
// ============================================================
export const SCREENS_WITHOUT_BOTTOM_NAV = ["venueMap"];

export const screenHidesBottomNav = (screen) => SCREENS_WITHOUT_BOTTOM_NAV.includes(screen);

// Masquée dès qu'une seule de ces raisons s'applique. Rend toujours un vrai booléen.
export const isBottomNavHidden = ({ hiddenByScroll, bibaPingChatOpen, bibaPulseOpen, screen }) =>
  !!(hiddenByScroll || bibaPingChatOpen || bibaPulseOpen || screenHidesBottomNav(screen));
