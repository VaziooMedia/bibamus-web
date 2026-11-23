// ============================================================
// Quand la barre d'accès rapide du bas (BottomNav) est masquée (voir App.jsx) : au défilement vers le bas (elle revient dès
// qu'on remonte), pendant une conversation BibaPing, pendant la rédaction d'une publication BibaPulse, et en permanence sur
// certains écrans. La carte commune de BibAtlas (Lieux, Shops, Producteurs) a besoin de toute la hauteur : le cadre de l'élément choisi s'y pose en bas de l'écran.
// Le fil BibaPulse, lui, suit la règle du défilement comme les autres pages (avant le 2026-11-21 il la cachait en permanence).
// ============================================================
export const SCREENS_WITHOUT_BOTTOM_NAV = ["atlasMap"];

export const screenHidesBottomNav = (screen) => SCREENS_WITHOUT_BOTTOM_NAV.includes(screen);

// Masquée dès qu'une seule de ces raisons s'applique. Rend toujours un vrai booléen.
export const isBottomNavHidden = ({ hiddenByScroll, bibaPingChatOpen, bibaPulseComposing, screen }) =>
  !!(hiddenByScroll || bibaPingChatOpen || bibaPulseComposing || screenHidesBottomNav(screen));
