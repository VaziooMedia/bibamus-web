# DESIGN SYSTEM — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-09. Vérifié contre le code de l'app (`src/`), version `APP_VERSION = "26.32"`. Tout ce qui suit est lisible dans le code : il n'y a pas de mention **(base)** dans ce document.

---

## Principe général

Des composants et des conventions partagés, réutilisés par tous les modules : `src/components/ui.jsx` (composants de base), `src/components/icons.jsx` (icônes et logos), `src/constants.js` (palette `COLORS`) et `src/contexts.js` (deux contextes de navigation). L'app est un **thème sombre fixe** (voir « Thème »).

Il n'existe pas de composant commun pour les réglages : chaque écran de paramètres réécrit ses propres lignes et interrupteurs (`AccountRow` / `AccountGroup`, `PrefGroup` / `NavRow` / `ToggleRow`, `SecurityRow` / `MiniToggle`, `AppearanceGroup` / `AppearanceRow`, `ShareToggle`).

## Gabarit d'application

- Colonne unique centrée : `maxWidth: 480px`, `height: 100dvh`, `paddingTop: env(safe-area-inset-top)` (`App.jsx`).
- `html, body { overflow: hidden }` : le défilement se fait dans un conteneur interne (`mainScrollRef`), pas dans la fenêtre.
- Viewport : `maximum-scale=1.0, user-scalable=no, viewport-fit=cover`. Les champs de saisie sont forcés à 16 px sous 480 px (évite le zoom automatique d'iOS).
- Navigation : un état `screen` passé en propriétés `onBack` ; **pas de routeur**. Seules deux adresses sont lues : `/delete-account` et `/spotify-callback`.

## Polices

- **Urbanist** (titres, noms de marque, chiffres) et **Work Sans** (police de base, boutons). Repli `sans-serif`. Chargées depuis Google Fonts : Urbanist 600 / 700 / 800 / 900, Work Sans 400 / 500 / 600 / 700.
- Space Mono est chargée mais **n'est utilisée nulle part**.

## Couleurs

### Palette `COLORS` (`constants.js`)

| Clé | Valeur | Rôle observé |
|---|---|---|
| `paper` | `#08131F` | Fond de page ; texte sombre sur bouton vert |
| `paperAlt` | `#28405C` | Bordures et traits, pastilles neutres, fond d'avatar |
| `surface` | `#16273D` | Cartes, champs, barre basse |
| `surfaceAlt` | `#1E3350` | Cartes secondaires |
| `ink` | `#F2F2E8` | Texte principal (blanc cassé) |
| `inkSoft` | `#8792A6` | Texte secondaire |
| **`amber`** | **`#39FF66`** | Accent et action principale. **Malgré son nom, c'est le vert fluo** : il n'y a aucun ambre dans la palette |
| `amberDark` | `#2BD955` | Intérieur de `VerifiedBadge`, statistiques |
| `wine` | `#E2564F` | Erreurs, actions destructives, « Bientôt disponible » |
| `alert` | `#E28A82` | Alertes de prix du ticket de tournée |
| `chalkBg` / `chalkBgAlt` / `chalkWhite` | `#0D1B2A` / `#16273D` / `#F2F2E8` | Ticket de tournée, en-têtes de fiches |
| `sage` | `#2E9E6B` | Chiffres de profil, boutons secondaires |
| `bobBlue` | `#5B8FC7` | BibaZERO dans la composition d'un tour |
| `bobYellow` | `#F2C94C` | Pause, Wrapped |
| `jetonFluo` | `#00C8FF` | Cyan (Wrapped, recherche) |
| `redFluo` | `#FF3B4E` | Badges « Soon », pastilles |
| `pinkFluo` | `#ef007c` | État actif de la navigation, champs obligatoires, avertissements |
| `burgundy` | `#6B1F2A` | Pastille « pas encore commandé » |
| `tabPending` | `#FF7A45` | **Définie mais jamais utilisée** |

`#39FF66` est aussi écrit en dur plus de cent fois malgré `COLORS.amber`. D'autres teintes sont également en littéral (`#FF3B3B` pour les pastilles de la barre basse, différent de `redFluo`).

### Deux roses et un cyan

- **`#FF2C8F`** (hors `COLORS`) : cercle autour d'une Story, badge « + », bouton Bix des Stories, icône de certification « utilisateur ».
- **`#ef007c`** (`COLORS.pinkFluo`) : états actifs et avertissements ; c'est aussi le rose du jeton.
- **`#00C8FF`** : cercle des **Stories officielles** Bibamus (voir `STORIES.md`).

### Règle « Biba_____ »

Les noms de marque s'écrivent en deux temps : préfixe `ink` (`#F2F2E8`, pas un blanc pur) et suffixe `amber` (`#39FF66`). C'est la règle dominante (accueil, hubs, tuiles, barre basse, logo), **pas une règle systématique**. Écarts réels :

1. Dans la barre basse, l'élément actif passe son suffixe en `pinkFluo`.
2. L'onglet « BibaPulse » actif sur fond vert n'a pas de couleur explicite de suffixe (il hérite du texte sombre).
3. Variante monochrome sur bouton vert (`LabelScanModal`).
4. La coupure n'est pas toujours après « Biba » : « Bib|Atlas », « Bib|Arena », « Biba|x », « Drink|Check », « Place|Check ».
5. Plusieurs noms sont écrits d'une seule couleur dans un texte courant ou un titre (« Créer un BibaClub », « Mes BibaClub », « BibaMusic », « ce BibaRoom »).

Le logo (`BibamusLogoFull`, `public/bibamus-logo.svg`) suit la même convention (`#F2F2E8` + `#39FF66`).

### Jetons de couleur

Six fichiers `src/assets/brand/token-*.svg` (bleu `#0040ef`, cyan `#00ffff`, vert `#39ff14`, orange `#ef4800`, rose `#ef007c`, rouge `#ef1700`). Composants : Rose, Cyan, Rouge (inutilisé), Vert ; pas de composant Bleu ni Orange. Sens observé dans les salons : **cyan = versés** dans la cagnotte, **rose = dépensés** (aussi en BibaSolo), **vert = restants**. Le vert et le cyan des jetons ne sont pas ceux de `amber` et de `jetonFluo`.

## Thème

L'app est **sombre, fixe** : pas de thème clair, pas de `prefers-color-scheme`, pas de `data-theme`. L'écran « Apparence » ne contient que deux lignes **désactivées** (« Couleur d'accent », « Icône de l'app »).

PWA (`public/manifest.json`) : nom « Bibamus », `display: standalone`, `orientation: portrait`, `start_url: /`, icônes 192 et 512 px, icône Apple 180 px. Incohérence : `theme_color` et `background_color` du manifeste valent `#0D1B2A`, la balise `theme-color` et le fond du `body` valent `#08131F`. Il n'y a pas de service worker de cache ; le seul est `firebase-messaging-sw.js`, pour les notifications push.

## Composants de base (`ui.jsx`, 14 exports)

| Composant | Rôle |
|---|---|
| `PageHeader` | En-tête : Retour, Accueil, emplacement droit, avatar. 54 fichiers l'utilisent |
| `PageFooterNav` | Pied de page Retour + Accueil + avatar, filet optionnel |
| `BackFooterLink` | Alias de `PageFooterNav` (le paramètre `label` est ignoré) |
| `HeaderAvatarButton` | Bouton rond « Mon profil » (photo, sinon avatar par défaut) |
| `EntityAvatar` | Avatar rond : photo → emoji → icône (par défaut le monogramme Bibamus, en `amber`) ; devient un bouton si `onClick`. Pas unique : plusieurs avatars sont refaits en ligne |
| `BibaxName` | Prénom + nom, surnom en italique `amber`, ville et drapeau en gris (voir `BIBAX.md`) |
| `SectionTitle` | Titre de sous-section (barre verte 4 × 16 + texte) |
| `PrimaryButton` | Bouton plein `amber`, texte `paper`, rayon 10, Work Sans. **N'impose pas `width: 100%`** |
| `ActionCard` | Carte-bouton `surface`, largeur 100 %, bordure `paperAlt` (ou `amber` si mise en avant), badge absolu |
| `CategoryTile` | Tuile de grille (104 px minimum), barre verte + titre, badge « Soon » ou pastille numérique. **Ne lit que `iconElement`**, pas `icon` |
| `MoneyAmount` | Montant en jetons ou en euros (voir plus bas) |
| `BottomNav` | Barre basse à 5 entrées |
| `ScrollToTopButton` | Bouton rond de retour en haut (z-index 90), utilisé par 5 répertoires |
| `useInfiniteScroll` | Pagination par observateur d'intersection : **aucun usage** hors de `ui.jsx` |

Autres éléments partagés : `PageTitleWithBar` (titre h1 Urbanist 20 px avec barre verte ou pastille d'icône, défini dans `AccountScreen`), `AiIcon`, `CheckButtonIcon`, `TagRestrictedBadge`, `StarsDisplay`, `RatingSlider`, `TasteScale`, `MobileTagPill`, `CheckConfirmedToast`, `CollapsibleSection`, `ErrorBoundary` + `installGlobalCrashReporting`.

### `BottomNav`

Cinq entrées : Home, BibaPulse, bouton central surélevé BibaGo (56 px, marge −30 px), BibaPing (masqué si le drapeau `nav_bibaping_visible` est faux, pastille de messages non lus), Notifications (cloche, pastille). Elle n'a **ni `position` ni `zIndex`** : c'est le dernier enfant d'une colonne flex sous le conteneur de défilement ; elle est « fixe » parce que la zone de contenu défile au-dessus. Le drapeau `nav_bibapulse_visible` n'agit pas sur la barre (seulement sur l'aperçu de l'accueil).

### Contextes de navigation (`contexts.js`)

- `NavigationContext` ne transporte qu'une fonction « aller à l'accueil ».
- `ProfileNavContext` porte `avatarUrl`, `goToProfile`, `goToSpotifyConnect`.

### Échelle réelle des z-index

Aucune échelle commune n'est écrite ; valeurs observées : 2–30 (menus déroulants, sélecteurs), 50 (composition d'un tour), 90 (`ScrollToTopButton`), 100 (`StoryCreateScreen`), 110 (modales de check-in, signalement, revendication), 200 / 210 (visionneuse de Stories), 300 (BibaPulse, toast de confirmation), 1000 (17 modales plein écran), 1100 (lecture d'étiquette), 2000 (fenêtres des 4 assistants d'ajout). Les surcouches sont en `position: fixed; inset: 0` et recouvrent la barre basse quel que soit leur z-index.

### `MoneyAmount`

`currency="jeton"` : nombre arrondi au dixième + icône de jeton (`jetonIcon` rose ou cyan, sinon un jeton bleu par défaut jamais utilisé) ; `currency="euro"` : nombre + « € » à `0.5em` en `inkSoft` ; option `centered` : le « € » sort du flux (`position: absolute`) pour centrer le nombre seul. Les autres devises passent par `formatMoney` (texte brut).

## Icônes

- **`NavIcon`** (`icons.jsx`) : un `switch` de 96 noms d'icônes SVG intégrées au code, sans bibliothèque externe. `filled` n'est géré que par `star`, `crown`, `bell`, `flame` et `heart`.
- Autres sources : `src/assets/brand/` (95 fichiers : 86 svg + 9 png, importés en `<img>`), `src/assets/flags/` (271 drapeaux svg) et 14 composants de logos et d'icônes de services dans `icons.jsx` (Spotify, Apple, Google, réseaux sociaux…).
- Autres exports d'`icons.jsx` : `COUNTRY_ISO_CODES` (par libellé de pays — voir `GEOLOCATION.md`), `CountryFlagImg`, `FlagIcon`, `WaterAlertIcon`, `VerifiedBadge`, `BibamusLogoFull`, `BibamusIcon`, `CertificationIcon` (trois niveaux : `bibamus` rosette `#39FF66`, `producteur` rosette `#FFC145`, `utilisateur` icône BibaMe `#FF2C8F`).
- Noms d'icônes **invalides** : `StoryViewer` demande `ti-door-enter` (le nom défini est `door-enter`) et n'affiche donc rien ; les tuiles de l'accueil passent `icon="ti-…"` à `CategoryTile`, qui ne lit que `iconElement` : elles n'affichent aucune icône.

## Identité du Bix

Le Bix est l'interaction propre à Bibamus (équivalent du « like »). Icône cœur : dans BibaPulse (couleur `amber`), dans les Stories (rose `#FF2C8F`) et sur les morceaux de BibaMusic. Aucun libellé « J'aime » n'est affiché.

**« Toujours une trace de qui a réagi » n'est vrai que pour BibaPulse** (liste des Bixeurs, onglet « Bix (n) », « Bixé par X et N autres »). Pour les **Stories** et **BibaMusic**, l'interface n'affiche qu'un compteur. Le même cœur sert aussi aux « Mes Favoris » du profil, alors que les favoris d'un lieu utilisent l'étoile.

Résidus de « like » dans le code, sans effet visible : `PRODUCT_LIKED`, `toggleVenueLike` (passé en propriété mais jamais appelé), champ `likes` des lieux.

## Conventions de mise en page apprises

- Un bouton ne s'étend pas à la largeur de son conteneur : il faut `width: "100%"` explicite (cas de la carte BibaLive, titre tronqué corrigé). `ActionCard` le fait déjà ; `PrimaryButton` non.
- Pour qu'un badge ou une flèche d'accès ne réduise jamais l'espace d'un texte voisin, le sortir du flux avec `position: absolute` (badge « EN COURS », flèche de la carte de salon, badge d'`ActionCard`, symbole « € » centré).

## Connu comme incomplet / non construit

- Pas de Brandbook formel (typographies, espacements, exemples permis / interdits) ; la section ci-dessus en tient lieu.
- Apparence : couleur d'accent et icône de l'app désactivées ; pas de thème clair.
- Dette de cohérence : la clé `amber` qui contient du vert ; `tabPending` et Space Mono inutilisées ; `useInfiniteScroll` inutilisé ; deux roses ; manifeste et `body` de deux fonds différents ; `#39FF66` en dur ; pas d'échelle de z-index ; pas de composant de réglages commun.
- `ScrollToTopButton` lit `window.scrollY` alors que le défilement est interne : son effet réel n'a pas été testé sur appareil.
- Assets de marque présents mais non branchés (BibaMeet, BibaCal, BibaPulse, BibAtlas, BibaMe, BibaMusic, BibaGo, jetons bleu et orange).
- **34 modules hérités de la plateforme de gestion** (`Layout`, `TopBar`, `StatsCounterBar`, `PageTitle`, `ComingSoon`, `Dashboard`, `DataTable`, panneaux de détail…) ne sont atteignables depuis aucun écran de l'app ; ils ne font pas partie du design system de l'app (voir `ADMIN-PLATFORM.md`).
