# PLATEFORME DE GESTION (admin.bibamus.app) — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-24 (nom d'utilisateur ; 2026-10-09 pour le reste). **Limite importante** : la plateforme de gestion est un dépôt distinct (`Bibamus-Management`) qui n'a pas été relu en entier. Ce document s'appuie sur (1) les scripts SQL et les fonctions Edge livrés, qui sont communs aux deux projets, (2) les copies de composants d'administration qui traînent dans `bibamus-web`, et (3) le zip `DEPOT-bibamus-admin_styles-etiquettes-selectionnees.zip` (deux fichiers du 2026-10-05). Ce qui ne peut se lire que dans le dépôt de gestion lui-même est marqué **(dépôt admin)** : non revérifié.

---

## Principe général

Plateforme orientée ordinateur, séparée de l'app principale, pour encoder et vérifier les fiches (établissements, produits, marques, producteurs) plus vite que sur mobile, et pour piloter l'app (modération, drapeaux de fonctionnalités, discussion d'équipe). Dépôt GitHub distinct (`VaziooMedia/Bibamus-Management`), annoncée sur `admin.bibamus.app` **(dépôt admin)**.

Les indices d'un **même backend Supabase** que `bibamus-web` sont concordants — scripts « plateforme de gestion » placés dans les migrations communes (`ai-proposals-rls`, `styles-personnalises`, `schema-admin-chat*`), mêmes noms de fonctions dans la couche de données copiée — mais la preuve définitive (l'URL du projet) n'est pas lisible dans ce dépôt.

## Ce que `bibamus-web` contient de la plateforme (copies orphelines)

`bibamus-web` embarque des copies de composants d'administration **jamais importées depuis `App.jsx`** : `UserDetailPanel`, `VenuesScreen`, `DrinksScreen`, `VenueDetailPanel`, `DrinkDetailPanel`, `BreweryDetailPanel`, `BrandDetailPanel`, `SimpleEntityPanel`, `DataTable`, `ServerDataTable`, `DataBaseOverviewScreen`, `OpeningHoursEditor`, `GooglePlaceLinker`. Elles importent des fonctions **absentes** de `sharedDirectories.js` (`createAppUser`, `updateAppUserProfile`, `deleteAppUser`, `mergeEntities`, `searchGooglePlaceMatches`, `linkGooglePlace`, `unlinkGooglePlace`, `setNoGooglePresence`). Conséquence : une preuve trouvée dans ces copies **ne prouve pas** l'état du dépôt de gestion, dont elles sont des versions plus anciennes ou partielles.

Seuls `ImportDataScreen`, `BreweriesAdminScreen`, `BrandsAdminScreen` et une ligne « admin » dans `MinorScreens` sont réellement atteignables dans l'app, pour les comptes administrateurs.

## Gestion des utilisateurs

La gestion des utilisateurs **existe** (la version précédente de ce document, comme `DATABASE.md`, la disait pour l'un « construite », pour l'autre « non encore construite »). Ce que montre la copie de `UserDetailPanel` :

- Création et édition d'un compte : prénom, nom, surnom, date de naissance, pays, commune. **Nom d'utilisateur (@nom)** : voir le point suivant (la base refuse l'écriture directe de ce champ, y compris depuis cette plateforme : voir `DATABASE.md`). La commune est obligatoire (validation bloquante), comme pour l'enregistrement du profil dans l'app ; à l'inscription dans l'app, seul le pays est demandé.
- **Nom d'utilisateur (@nom) : comptes, lieux, marques et producteurs** (livré le 2026-10-24 ; lu dans le dépôt de gestion à la livraison, **(dépôt admin)** : non revérifié depuis) : une section repliable « Nom d'utilisateur » (repliée au départ, même en-tête que les autres sections de chaque fiche), visible seulement pour `admin` et `super_admin` (le rôle est transmis aux fiches par `MyRoleContext`) et seulement sur une fiche **déjà créée** ; dans la fiche d'un compte, avant « Informations » ; dans celles d'un lieu, d'une marque et d'un producteur, juste après « Dénomination » (composant `UsernameAdminField`). Elle relit le nom actuel dans la base à chaque ouverture, vérifie le nouveau nom pendant la frappe (`admin_check_username`, différée de 0,4 s), demande une confirmation (« Remplacer @ancien par @nouveau »), puis l'applique par `admin_set_username`. Sans limite de changements ; un nom réservé est permis, et changer seulement la casse aussi ; la forme, un nom déjà pris et le nom identique au nom actuel sont refusés, avec la phrase renvoyée par le serveur (la plateforme n'en invente aucune). Un changement marque le nom comme « changé » : un compte dont le nom a été changé par l'équipe ne peut plus le changer lui-même (la confirmation le dit pour un compte jamais changé). Les écritures habituelles de ces fiches (enregistrer, créer) n'envoient jamais `username`. Le changement par les gérants de fiches, depuis la plateforme Business, n'est pas construit. Voir `DATABASE.md`.
- `CityAutocomplete` pour la commune. La copie de `bibamus-web` lit `CITIES_BY_COUNTRY[country]` **sans conversion** ; la conversion code pays interne ↔ libellé que décrivait l'ancienne version n'existe que, si elle existe, dans la version du dépôt de gestion **(dépôt admin)**. Le panneau passe un code interne (`COUNTRIES` y est un tableau `{ code, fr }`, alors que dans `bibamus-web` c'est un tableau de chaînes) : les deux `constants.js` diffèrent.
- Attribution d'une `app_language` (`fr`, `nl`, `en`, `de`) — voir `MULTILINGUAL.md`.
- La création appelle `createAppUser(...)` ; la fonction Edge `admin-create-user` citée par l'ancienne version n'est **dans aucun fichier lu** **(dépôt admin)**.
- Statut administrateur dans l'app : automatique, déduit du rôle (voir `PROFILE.md`).

## Rôles

Les règles d'accès des scripts livrés et la fonction Edge d'IA admettent `editor`, `super_editor`, `moderator`, `admin`, `super_admin` ; les Stories officielles sont réservées à `admin` et `super_admin` ; dans l'app, `isAdmin` = `admin` ou `super_admin`. Les fonctions d'aide `is_admin_or_above()`, `can_certify()` et `can_moderate()` sont appelées mais leur source n'est pas livrée **(base)**. Le rôle `user` est le seul que retiennent les suggestions Bibax et la recherche par nom. Voir `SECURITY.md`.

## Fiches : produits, IA, styles (zip du 2026-10-05)

Le zip montre la version **admin** de `DrinkDetailPanel.jsx` (≈ 99 Ko, contre ≈ 65 Ko pour la copie de `bibamus-web`) et `SelectedStyleChips.jsx`. Les imports visibles décrivent ce que fait le panneau produit :

- **Propositions de l'IA** (`requestAICompletion`, `loadPendingAIProposals`, `resolveAIProposal`) ;
- **fusion de doublons** (`mergeEntities`, qui appelle `merge_entities`, réservé aux administrateurs) ;
- cépages (`loadGrapeVarieties` / `createGrapeVariety`), variantes et codes-barres, millésimes (`VintageManager`), niveau de certification (`CertificationLevelSelector`), contributions en attente (`PendingContributionsSection`) ;
- styles : `BeerCiderStylePicker` (accordéon, `StyleAdder`, mode « Modifier la liste » avec `StyleManagePanel`), `SelectedStyleChips`, styles de vin et de spiritueux, **styles personnalisés** (`loadCustomBeerCiderStyles`, `createCustomBeerCiderStyle`, `saveCustomBeerCiderStyle`, `countDrinksWithBeerCiderStyle`, `deleteCustomBeerCiderStyle`) ;
- arômes & saveurs (Niveau 2) : `FlavorNotesPicker` → `GroupedListPicker` (accordéon, `ListItemAdder`, mode « Modifier la liste » avec `ListItemManagePanel`), **listes modifiables** (`loadCustomListItems`, `createCustomListItem`, `saveCustomListItem`, `countDrinksWithListItem`, `deleteCustomListItem`) ;
- noms alternatifs et traductions (`AlternateNamesFields`, voir `MULTILINGUAL.md`).

À l'exception de `SelectedStyleChips`, aucun de ces composants importés n'est dans le zip.

### Propositions de l'IA (`ai_proposals`)

- Table `ai_proposals` (scripts `ai-proposals`, `ai-proposals-rls`, `fix-entity-id-type` : `entity_id` en texte). **Rien n'est jamais écrit automatiquement dans une fiche** : l'IA propose, un administrateur valide.
- Fonction Edge `ai-complete-entity` : réservée aux cinq rôles du personnel (contrôle du jeton et du rôle), appelle OpenAI avec recherche web, n'accepte que `entityType = "drink"`. Champs complétables : styles, année de lancement, région d'origine, nom alternatif, IBU, couleur EBC.
- Le service OpenAI reçoit donc des noms de produits ; le service de lecture d'étiquettes (`read-label`, côté app) lui envoie en plus des photos d'étiquettes.

### Styles personnalisés

Table `custom_beer_cider_styles` : une ligne est soit un style **ajouté à la main** (code préfixé `perso_`), soit une **modification d'un style de la liste figée** du code (même code que lui : nouveau nom, nouveau groupe, ou masqué = supprimé, colonne `hidden`). Nom unique parmi les styles visibles (casse et espaces ignorés), une seule colonne de libellé `fr`. Lecture publique, écriture réservée aux cinq rôles du personnel.

Dans la fiche produit bière / cidre (Niveau 1 → Style(s)), « Modifier la liste » permet de renommer, de changer de groupe ou de supprimer n'importe quel style, y compris ceux de la liste figée. La suppression annonce d'abord le nombre de produits concernés, puis retire le style de ces produits et de la liste en une seule opération (fonctions `count_drinks_with_beer_cider_style` et `delete_beer_cider_style`, réservées au personnel). Un style de la liste figée supprimé est **masqué**, pas effacé (il vit dans le code) ; un nom supprimé peut être ajouté de nouveau (nouveau code `perso_…`). Un style rangé dans un groupe qui n'existe plus apparaît dans « Autres styles ».

Scripts : `styles-personnalises` (la table), `styles-modifier-supprimer` (colonne `hidden` et deux fonctions), puis `styles-regle-des-codes` (retire la règle « code préfixé `perso_` », incompatible avec la modification d'un style de la liste figée). L'app publique lit la table une fois par session et affiche le nom enregistré en base avant le nom figé (`registerCustomStyleLabels`).

### Listes modifiables de la fiche produit (arômes & saveurs)

Table `custom_list_items`, **commune à plusieurs listes** : la colonne `list_key` dit de quelle liste il s'agit, la clé primaire est `(list_key, code)` (« dessert » peut donc exister comme accord et comme moment sans conflit). Même modèle que les styles : une ligne est soit un élément **ajouté à la main** (code préfixé `perso_`), soit une **modification d'un élément de la liste figée** du code (même code : nouveau nom, nouveau groupe, ou masqué = supprimé, colonne `hidden`). Nom unique parmi les éléments visibles **d'une même liste** (casse et espaces ignorés), une seule colonne de libellé `fr`, colonne `group_title` vide pour une liste sans groupes. Lecture publique, écriture réservée aux cinq rôles du personnel.

Dans la fiche produit bière / cidre (Niveau 2 → Arômes & saveurs), « Modifier la liste » permet de renommer, de changer de groupe ou de supprimer n'importe quel arôme, y compris ceux de la liste figée ; « + Ajouter un arôme » en crée un nouveau. La suppression annonce d'abord le nombre de produits concernés, puis retire l'arôme de ces produits et de la liste en une seule opération. Deux fonctions génériques, réservées au personnel : `count_drinks_with_list_item(p_list, p_code)` et `delete_list_item(p_list, p_code, p_fr, p_group_title)`. Elles connaissent quatre listes : `flavor_note` (arômes & saveurs, colonne `flavor_notes`, plusieurs choix par produit), `food_pairing` (accords alimentaires, `food_pairings`, plusieurs choix), `occasion` (moment / occasion, colonne `occasion`, un seul choix) et `recommended_glass` (verre recommandé, colonne `recommended_glass`, un seul choix). Pour une liste à plusieurs choix, l'élément supprimé est retiré du tableau du produit ; pour une liste à un seul choix, le champ est vidé. **Seul l'écran des arômes est branché pour l'instant** : les trois autres listes restent celles du code dans la fiche.

Dans la liste figée des arômes, trois codes figuraient dans deux groupes à la fois (`banane`, `epice`, `poivre`). Comme un code ne peut avoir qu'une place une fois la liste modifiable, la gestion ne garde que la première (Banane dans « Fruits & agrumes », Épicé et Poivré dans « Houblon, végétal & floral ») : 84 arômes affichés au lieu de 87 entrées. Un élément rangé dans un groupe qui n'existe plus apparaît dans « Autres arômes ». Un arôme de la liste figée supprimé est **masqué**, pas effacé ; un nom supprimé peut être ajouté de nouveau (nouveau code `perso_…`).

Script : `listes-modifiables` (la table, ses deux règles d'accès et les deux fonctions). **L'app publique ne lit pas cette table** : elle n'affiche ni les arômes, ni les accords, ni le moment, ni le verre d'un produit.

## Tables et réglages de pilotage (scripts livrés)

| Domaine | Éléments |
|---|---|
| Discussion d'équipe | `admin_chat_messages` (destinataire par rôle **ou** par identifiants, jamais les deux ; `scope` = `team`, `users` ou `business`), `admin_chat_reactions`, `admin_chat_archived_conversations`, `admin_read_markers` (clés `chat_team:<clé>`, `chat_clients`, `chat_business`). Suppressions en cascade avec le profil. Accès aux messages et aux réactions réservé aux rôles de l'équipe (vérifié le 2026-10-09, voir `SECURITY.md`) ; pas de règle de suppression. |
| Drapeaux de fonctionnalités | `feature_flags` (script `nouveaux-feature-flags` : `nav_bibaping_visible`, `nav_atlas_visible`, `stories_enabled`, `claims_enabled`, `maintenance_mode` faux par défaut ; descriptions dans `descriptions-flags`) ; l'app lit aussi `signups_enabled`, `nav_bibameet_visible`, `nav_bibapulse_visible`, `nav_games_visible`. Surcharges par pays : `feature_flag_overrides`. |
| Configuration de marché | `market_config` (unique sur `(country_code, config_key)`), dont `minimum_age` par pays — voir le risque de clé dans `GEOLOCATION.md`. |
| Signalements | `entity_reports` (temps réel, script `schema-realtime-entity-reports`) ; écran « Signalements », masquer / rétablir, masquage automatique à 3 signalants (voir `BIBAPULSE.md`). |
| Revendications | `entity_claims` (+ `claimant_country`). **L'approbation n'est pas construite.** |
| Stories officielles | `official_stories` (voir `STORIES.md`) ; le formulaire de création est dans la plateforme de gestion **(dépôt admin)**. |
| Cloche de l'administrateur | `profiles.notification_prefs` (`{"reports": true, "claims": true}`). |
| Origine d'une fiche | `created_via` (`admin` par défaut, `app` si créée depuis l'app) sur les quatre tables de fiches, pour ne notifier « nouveaux ajouts » que ceux de l'app. |
| Collecte d'usage | `analytics_events`, `crash_reports` : écrits par l'app, « consultables côté plateforme de gestion » ; le tableau de bord correspondant n'est **pas** dans le code lu **(dépôt admin)**. |

## Langue

Français seulement, y compris pour la plateforme (bilingue FR/EN envisageable plus tard, non urgent).

## Connu comme incomplet / non construit

- Gestion des paiements et abonnements : aucune table, aucun code (une fois un modèle de monétisation en place).
- Approbation des `entity_claims`.
- Statistiques d'usage pour les administrateurs : la collecte existe, le tableau de bord n'est pas lisible ici. Des chiffres d'affaires par produit et par lieu sont visibles des seuls administrateurs dans l'app, « en attendant la future plateforme Business » ; le script `bibamus-schema-owner-stats.sql` qui les alimente **n'est pas livré**.
- Copies orphelines de composants d'administration dans `bibamus-web` : à retirer ou à isoler (elles référencent des fonctions inexistantes). L'ancien écran de connexion par phrase d'accès et sa constante ont été supprimés du code (2026-10-14) ; ils ne servaient plus à rien.
- Non vérifiable depuis ce dépôt **(dépôt admin)** : composants réels `UserDetailPanel`, `CityAutocomplete` et `constants.js` de la plateforme, fonction Edge `admin-create-user`, déploiement sur `admin.bibamus.app`, écran de création des Stories officielles, tableau de bord d'usage.
