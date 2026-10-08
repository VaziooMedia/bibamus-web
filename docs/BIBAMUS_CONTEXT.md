# BIBAMUS — Contexte du projet

> Ce document est la référence générale de Bibamus. Il doit permettre à une nouvelle conversation Claude — ou à toute personne rejoignant le projet — de comprendre rapidement ce qu'est Bibamus sans relire l'historique des échanges. Il reste volontairement une synthèse : le détail de chaque module est dans les documents spécialisés listés en fin de fichier.
> Dernière mise à jour : 2026-10-09. Les faits du produit et de la pile technique sont vérifiés contre le code de l'app (`src/`, version `26.32`). Les passages d'intention (vision, public visé) ne sont pas vérifiables dans le code et sont repris tels quels. Ce qui relève d'un autre dépôt ou d'un service externe est marqué **(hors dépôt)**.

---

## Vision générale

**Bibamus est l'application sociale qui connecte les gens autour des boissons, des lieux et des moments partagés, portée par une base de données complète dédiée à l'univers des boissons.**

- **Public visé** : grand public consommateur dans un premier temps ; élargissement aux professionnels (établissements, marques, producteurs) une fois l'audience suffisamment étendue. Le code prépare déjà ce passage : parcours de revendication d'une fiche (`ClaimModal`, drapeau `claims_enabled`), trois niveaux de certification (utilisateur, Bibamus, producteur).
- **Logique sociale** : les activités réalisées dans Bibamus (déguster, checker, rejoindre un salon, contribuer à la base de données) génèrent naturellement le contenu social de l'app — jamais un réseau social généraliste où l'on publie n'importe quoi. Le code le confirme : aucun écran de rédaction libre dans BibaPulse ; les cartes viennent des checks.
- **Identité propre** : le vocabulaire et les mécaniques sont pensés pour ne pas être une copie d'Instagram ou de Snapchat avec un vernis « boissons ». Le **Bix** (équivalent du « like ») en est l'exemple le plus concret. Signature : **Connect. Drink. Bix.** (intention produit : cette phrase n'apparaît nulle part dans le code).

---

## Architecture fonctionnelle — vue d'ensemble

| Module | Rôle |
|---|---|
| **Home** | Accueil : Stories, BibaLive (salons en cours, section de l'accueil et non un écran), aperçu BibaPulse (3 dernières cartes), suggestions Bibax (3 affichées), six tuiles — BibaGo, BibaPlay, BibaMeet *(« Soon »)*, BibAtlas, BibaCal *(« Soon »)*, BibaPing — et quatre boutons ronds (recherche, BibaSolo, DrinkCheck, PlaceCheck). BibaPulse n'a pas de tuile : il est dans la barre basse |
| **BibaGo** | Trois cartes : **BibaRoom** (créer / rejoindre), **BibaSolo** et BibArena *(« Soon »)* |
| **BibaRoom** | Salon partagé (tournées, cagnotte, addition, consommation libre) à trois onglets Room / Pulse / Ping — voir `BIBAROOM.md` |
| **BibaSolo** | Journal personnel de consommations sans salon : boisson, prix en € ou en jetons, lieu optionnel, calories, BibaZERO et WaterAlert solo |
| **BibaMusic** | Playlist collaborative d'un BibaRoom (Spotify, Bix par morceau) |
| **BibArena** | Événements de plus grande envergure — **non construit** : carte « Soon », aucun écran |
| **BibaPulse** | Fil d'activité social — voir `BIBAPULSE.md` |
| **BibAtlas** | Répertoire : lieux, produits, marques, producteurs ; recherche, carte, lecture d'étiquette par IA, revendication de fiche |
| **Bibax** | Le compte utilisateur et la relation **mutuelle** entre deux comptes (demande + confirmation) — voir `BIBAX.md`. Dans le code, l'ancien nom « Bibro » subsiste (`BibrosScreens`, `myBibroCode`) |
| **Stories** | Contenu éphémère de 24 h ; contextes `global`, `room` et `official` — voir `STORIES.md` |
| **BibaPing** | Messagerie : tête-à-tête, groupes, chat de salon |
| **BibaPlay** | Plateforme de jeux avec un seul jeu, **Predict** (pronostics sportifs entre amis) ; carte « D'autres jeux : Bientôt » |
| **BibaMe** | Hub profil : Mes BibaClub, Mes Statistiques (dont **Wrapped**, « Ton année Bibamus »), Mes Produits, Mes Favoris, Mon Historique, Mes Photos, BibaCare *(« Bientôt »)*, réglages — voir `PROFILE.md` |
| **BibaClub** | Clubs ; un salon peut être rattaché à un club |
| **BibaZERO / WaterAlert / BibAzard** | BibaZERO : statut par participant pour qui ne boit pas, avec PIN et joker, **hors modes de salon** et aussi en BibaSolo ; WaterAlert : rappels d'eau ; BibAzard : roulette de boisson au hasard |
| **DrinkCheck / PlaceCheck** | Accès rapides de l'accueil vers le répertoire de produits ou de lieux avec un flux de check |
| **Transverses** | Notifications, recherche globale, paramètres (compte, sécurité, notifications, préférences, apparence, connexions, aide), import de données (administrateurs) |

Non construits à ce jour (cartes ou tuiles « Soon » ou « Bientôt ») : BibArena, BibaMeet, BibaCal, BibaCare, autres jeux de BibaPlay, thème personnalisable, vidéo dans les Stories, export image de Wrapped, lecture des codes-barres (drapeau `BARCODE_SCAN_ENABLED = false` : la caméra sert à lire l'étiquette).

**Vocabulaire à noter** : « BibaCheck » n'existe pas dans le code (il dit DrinkCheck et PlaceCheck) ; « BibaZERO » s'écrit parfois `BibaZero` ; l'ancien nom « BibaBob » subsiste dans les identifiants de code.

---

## Pile technique

- **Frontend app** : React 18 et Vite 5, JavaScript / JSX (pas de TypeScript), dépôt GitHub `VaziooMedia/bibamus-web` (**public**). Déployé sur Vercel *(hors dépôt : seul indice, `vercel.json`, réécriture SPA)*, domaine `bibamus.app` *(hébergeur du domaine hors dépôt)*.
- **Plateforme de gestion** : dépôt GitHub distinct `VaziooMedia/Bibamus-Management`, annoncée sur `admin.bibamus.app` **(hors dépôt)** — voir `ADMIN-PLATFORM.md`.
- **Backend** : Supabase, projet `rkmmrzkqzqpntgiguajz` (celui du client de l'app). Le partage du même projet avec la plateforme de gestion est très probable mais **non prouvé** depuis ce dépôt.
- **Fonctions Edge** appelées par l'app : `read-label`, `moderate-and-upload-photo`, `create-pulse-event`, `upload-pulse-photo`, `delete-my-account`, `send-push-notification`, `Spotify-playback-control-ts`, `geoapify-geocode`, `google-place-hours`. `ai-complete-entity` est utilisée par la plateforme de gestion seulement. Elles se déploient séparément de l'app. Les sources livrées avec les scripts SQL (hors dépôt) sont : create-pulse-event (v3, v4, v5), read-label, send-push-notification, spotify-playback-control, upload-pulse-photo, ai-complete-entity.
- **Services tiers** : Firebase Cloud Messaging (notifications push), Spotify (API, connexion PKCE), Geoapify (autocomplétion d'adresse), Google Places (horaires, via fonction Edge), BigDataCloud (géocodage inverse du pays), Leaflet et tuiles OpenStreetMap (cartes), Google Cloud Vision (modération de photos), OpenAI (lecture d'étiquette, propositions de la plateforme de gestion), `@zxing` (bibliothèque de lecture de codes-barres). Voir `GEOLOCATION.md`.
- **Workflow de déploiement** : le dépôt montre un flux Git par branche (branche de travail, poussée sur `origin`, fusion dans `main` puis redéploiement). Historiquement : édition locale, zip, dépôt sur GitHub. Les changements SQL sont livrés en scripts `.sql` à exécuter à la main dans l'éditeur SQL de Supabase ; la plupart des objets de base (tables `salons`, `stories`…, nombreuses fonctions) ne sont **pas** dans le dépôt — voir `DATABASE.md`.
- **Drapeaux de fonctionnalités** : table `feature_flags` (+ surcharges par pays), valeur « visible » si la clé est absente. Utilisés par le code : `signups_enabled`, `maintenance_mode`, `nav_bibameet_visible`, `nav_bibapulse_visible`, `nav_games_visible`, `nav_bibaping_visible`, `nav_atlas_visible`, `stories_enabled`, `claims_enabled`.
- **i18n** : l'app est **monolingue** (français) ; aucune bibliothèque d'internationalisation. Seules existent des structures préparatoires (styles `{ code, fr }`, colonnes `translations` des fiches). La cible EN / NL / DE n'est pas commencée — voir `MULTILINGUAL.md`.
- **Version** : `APP_VERSION` dans `constants.js`, à incrémenter à chaque envoi.

---

## Décisions validées

- **Le Bix remplace le « like » partout** dans l'interface (aucun « J'aime » affiché). Quelques résidus techniques subsistent dans le code (`PRODUCT_LIKED`, `toggleVenueLike`). Le Bix est une trace de qui a réagi dans BibaPulse ; dans les Stories et BibaMusic, l'interface n'affiche aujourd'hui qu'un compteur.
- **BibaPulse** : le contenu est généré par les actions réelles dans l'app (jamais une publication libre). Le client n'offre que deux visibilités, « Public » et « Mes Bibax » (`relations`) ; le défaut est `public` pour un Drink Check, `relations` pour un Place Check. Le regroupement (anti-doublon sur 30 minutes) se fait côté serveur.
- **Bibax mutuel** (demande + confirmation) plutôt qu'un suivi à sens unique. La visibilité « relations » repose sur les Bibax confirmés. Le suivi à sens unique entre personnes n'est plus utilisé (`toggleFollow` n'a plus d'appelant) ; en revanche le **suivi de lieux et de produits est actif** (cloche sur les fiches) et une cloche « Suivre sur Pulse » existe sur la fiche d'un Bibax.
- **Stories V1** : le contexte (où c'est créé : `global`, `room`, `official`) est séparé de l'audience (qui la voit). Une Story de salon peut être partagée dans BibaPulse sans duplication. `arena` n'existe que comme réglage de préférences : aucun code ne crée de Story `arena`.
- **BibaRoom** : le code du salon (6 caractères) fait office de clé d'accès ; les Stories de salon suivent le même principe.
- **Localisation des profils** : « Commune de résidence » obligatoire à l'enregistrement du profil (à l'inscription, seul le pays est demandé) ; elle est **suggérée par pays mais en texte libre** côté client (liste de 6 suggestions au plus, pas de liste fermée). « Ville / Village » optionnel en texte libre (aucun écran ne l'édite aujourd'hui). « Région » abandonnée.
- **Nom d'utilisateur abandonné** (distinct du prénom, du nom et du surnom). Son ancienne justification — « l'ajout d'un Bibax se fait par code, jamais par recherche » — est **périmée** : on peut aussi ajouter un Bibax par QR code et par **recherche de nom** (le nom affiché respecte les réglages de partage).
- **Horaires d'établissements** : toujours issus de Google, jamais encodés à la main dans l'app.

## Décisions abandonnées

- Suivi « follows » à sens unique pour la visibilité BibaPulse — remplacé par le système Bibax mutuel.
- **BibaFree** (salon solo) — retiré. Le besoin « solo » est servi par un module distinct, **BibaSolo**, et non par un BibaRoom à une seule personne (un paramètre `mode` « solo » reste par défaut dans `NewEventScreen`, sans écran qui l'utilise).
- Nom d'utilisateur comme identifiant de recherche — jamais utilisé en pratique, retiré.

## Questions ouvertes

- **Modèle d'accès de la table `salons`** : aucun script livré ne le définit ; il faut décider si l'on rejoint un salon sans compte (l'app actuelle exige déjà une session) avant d'écrire la règle. Voir `SECURITY.md`.
- **BibArena** : conception documentée, aucune construction commencée.
- **Proximité par position ponctuelle** entre personnes (au-delà de la ville déclarée) : mise de côté volontairement, question de confidentialité à trancher le jour venu. La position ponctuelle du navigateur est déjà utilisée pour les **lieux** (jamais pour les personnes).
- **Revue de sécurité et de documentation légale** ouverte le 2026-10-09 : le suivi est dans `SECURITY.md` et dans une note privée, hors du dépôt public.

---

## Documents spécialisés

Dans le dépôt, dossier `docs/` (état au 2026-10-09 ; chacun porte sa propre date de vérification) :

- `DATABASE.md` — les piliers de la base (établissements, produits, marques, producteurs), tables, fonctions, scripts
- `BIBAPULSE.md` — fil d'activité, types de cartes, visibilité, Bix, commentaires, modération
- `STORIES.md` — contextes et audience, cycle de vie de 24 h, partage vers BibaPulse, Stories officielles
- `BIBAROOM.md` — salons, modes, BibaZERO, BibaMusic, synchronisation
- `BIBAX.md` — relations entre comptes, suggestions, blocage, tags
- `PROFILE.md` — champs du profil, partage, suppression de compte, statistiques
- `GEOLOCATION.md` — PostGIS, Geoapify, position du navigateur, cartes, horaires Google
- `MULTILINGUAL.md` — état réel de l'i18n
- `SECURITY.md` — correctifs appliqués et points ouverts (version publiable)
- `ADMIN-PLATFORM.md` — plateforme de gestion
- `DESIGN-SYSTEM.md` — palette, composants, conventions

Hors dépôt : le registre des données personnelles, le document de classification de rétention, les conditions générales et la politique de confidentialité. Ils doivent être relus à la lumière du code actuel (voir la note privée) avant toute publication.
