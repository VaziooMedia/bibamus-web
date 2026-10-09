# DATABASE — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-09 (2026-10-08 pour l'essentiel ; les sections i18n, BibaPulse et plateforme de gestion ont été alignées sur les autres documents). Noms de tables, fonctions et fonctions Edge vérifiés dans le code de l'app et dans les scripts SQL livrés.

**À quoi sert ce fichier** : c'est la carte de la base — ce que représente chaque table, vue ou fonction, ce qui compte comme quoi, qui peut lire ou écrire. La base elle-même (Supabase) reste la source de vérité pour les colonnes exactes ; ce fichier donne le *sens*, celui qu'on ne retrouve pas en lisant une colonne (par exemple : « un check de produit est un verre consommé »). À lire avant de toucher à une table, une vue ou une fonction. Les sujets propres à un autre document (BibaPulse, Bibax, BibaRoom, Stories, sécurité) sont seulement nommés ici : voir `BIBAPULSE.md`, `BIBAX.md`, `BIBAROOM.md`, `STORIES.md`, `SECURITY.md`.

---

## Principe général

La base de données Bibamus repose sur **quatre piliers**, reliés entre eux :

| Pilier | Table | Nom interne à noter |
|---|---|---|
| Établissements | `public_venues` | jamais "establishments"/"lieux" dans le code |
| Produits | `drinks_directory` | table lue par toute l'app (`loadDrinksByIds`, recherche, vue de consommation) |
| Marques | `brands_directory` | |
| Producteurs | `breweries_directory` | nommé "brewery" en base malgré le terme générique "producteur" affiché |

## Architecture i18n

L'app est développée en français uniquement ; le détail de l'état réel est dans `MULTILINGUAL.md`. Côté base, ce qui existe vraiment :

- **Taxonomies** (styles bière/cidre/vin, tags) : codes techniques stables + libellés français dans des fichiers JS (`beerCiderStyles.js`, `styleTagLabels.js`), plus la table `custom_beer_cider_styles` pour les styles ajoutés à la main (une seule colonne de libellé, `fr`). Aucune table miroir `taxonomy_terms` ni `taxonomy_terms_translations` n'est présente dans le code ni dans les scripts livrés.
- **Noms d'entités** (produits, marques, producteurs, établissements) : colonnes de la fiche elle-même — `alternate_name`, `translations` (jsonb, tableau `{ lang, value }`) et `aliases`, toutes agrégées dans `search_text` pour la recherche. Aucune table `*_translations` n'est présente dans le code ni dans les scripts livrés.
- Cible : EN/NL/DE pour l'app grand public ; la plateforme de gestion peut rester français-only pour l'instant (bilingue FR/EN envisageable plus tard, non urgent). Rien n'est encore traduit.

## Fiches produits

- **Catégories de carte** (`MENU_CATEGORIES`) : Bières & Cidres, Vins & Bulles, Spiritueux, Shots, Cocktails / Mocktails, Softs & Eaux, Boissons chaudes, Snacks.
- **Fiches détaillées construites** : **Bières & Cidres** et **Vins & Bulles**. **Spiritueux** : en cours (démarré le 2026-09-29), 13 sous-catégories prévues — Whisky/Whiskey, Rhum, Gin & Genièvre, Vodka, Agave, Brandy & Eaux-de-vie de vin, Eaux-de-vie de fruits, Eaux-de-vie de marc, Liqueurs & Crèmes, Anisés, Amers/Bitters/Amaros, Spiritueux de canne spécifiques, Autres spiritueux. Les autres catégories restent à faire.
- Organisées en onglets progressifs : **Ajout rapide** / **Niveau 1 (essentiel)** / **Niveau 2 (expert)** / **Niveau 3 (expert, technique brassicole)** — le Niveau 3 est prévu pour être verrouillé aux comptes "Business" des producteurs une fois le système de rôles en place.
- **Codes-barres** : table `drink_barcodes` (contenant, volume en ml, code, marché), plusieurs conditionnements peuvent pointer vers la même fiche, mais **un code ne désigne qu'un produit**. Décision du 2026-10-05 : ils se saisissent **uniquement dans l'onglet « Ajout rapide »** ; c'est la seule source (l'ancien champ « Codes-barres » de la fiche est abandonné, repris par `bibamus-sql-reprise-codes-barres-fiches.sql`, et la section « Conditionnements & variantes » du Niveau 2 est supprimée). Lecture publique, écriture pour les utilisateurs connectés.
- **Millésimes (Vins & Bulles)** : table `drink_vintages` — `id`, `product_id` (→ `drinks_directory`, suppression en cascade), `year` (vide = « Non millésimé »), `abv` propre au millésime, `container`, `volume_ml`, `barcode` (unique), `created_at`. Même sécurité que `drink_barcodes` : lecture publique, écriture pour les utilisateurs connectés.
- **Styles de bières & cidres ajoutés à la main** : table `custom_beer_cider_styles` ; ils rejoignent la liste figée du code (`beerCiderStyles.js`) pour tous les produits. Code préfixé `perso_`, nom unique (majuscules et espaces ignorés) ; lecture publique, écriture réservée aux rôles de la plateforme de gestion.
- **Recherche** : `search_drinks` (par nom), `get_drinks_page` (liste paginée), `get_drink_category_counts` / `get_drink_letter_counts` (compteurs par catégorie et par lettre).
- **Lecture d'étiquette par IA** (BibAtlas) : la fonction Edge `read-label` réserve d'abord une lecture avec `claim_label_scan` (plafond par utilisateur sur 24 h glissantes ; 30 prévu), l'IA lit le texte, puis `search_drinks_by_label(p_query, p_abv, p_limit)` classe les produits (mots entiers pondérés par leur rareté, puis tolérance aux fautes ; le degré d'alcool n'est qu'un départage facultatif). Le journal est la table `label_scans` : texte lu, texte confirmé, produits proposés, produit choisi, issue (`chosen` / `none` / `abandoned`), durée. **La photo n'est jamais conservée.** Chacun ne lit que ses propres lectures ; seules `claim_label_scan`, `finish_label_scan`, `report_label_search` et `report_label_outcome` y écrivent.

## Établissements

- Adresse structurée : `street_name`, `street_number`, `postal_code`, `city`, `village`, `country` (code interne Bibamus, pas ISO — table de correspondance `COUNTRY_ISO_CODES` côté client dans `bibamus-admin`)
- **Horaires d'ouverture** : Google Places est la seule source, jamais d'encodage manuel — deux edge functions (`google-place-search`, `google-place-hours`) appellent l'API côté serveur pour ne jamais exposer la clé
- **Géolocalisation** : colonne `location geography(Point,4326)` (PostGIS), synchronisée automatiquement depuis lat/lng via le déclencheur `sync_venue_location` ; RPC `get_nearby_venues(lat, lng, radius_meters, limit)` pour la recherche de proximité ; traçabilité du géocodage (`geocode_source`, `geocode_confidence`, `geocode_status`, `geocoded_at`)
- **Lecture** : `get_venues_by_ids(p_ids)` (ciblée), `get_venues_page` / `search_venues` (annuaire et recherche), `get_venues_map_pins` (carte), `get_venue_top_drinks`, `get_venue_rating_summary` (appréciation en 5 paliers, `submit_venue_rating` / `remove_venue_rating`).
- Autocomplétion d'adresse/ville : Geoapify (fonction Edge `geoapify-geocode` pour le géocodage côté serveur) (gère les doublons linguistiques comme Waimes/Weismes via un paramètre de langue)

## Consommation et statistiques

**Une consommation = une ligne dans la vue `consumption_events`.** Cette vue est la source de « Mes Statistiques » et de `get_my_drink_counts`. Elle est l'union de quatre sources :

| Source | Table | Ce que représente une ligne | Prix / monnaie |
|---|---|---|---|
| Commandes de salon | `round_orders` (lignes avec `user_id`) | un verre commandé dans une tournée, pris hors tournée (« Ajouter une boisson hors tournée », une ligne par verre, sans prix), ou pris par la personne elle-même dans un salon @Home (« Next Drink », une ligne par verre) | `unit_price` / `currency` ; `paid` vient de `round_payments` |
| BibaSolo | `solo_checkins` | un verre enregistré dans le journal BibaSolo | `price` / `currency` (`'euro'` ou `'jeton'`) |
| Checks de produit | `drink_checkins` | un check de produit fait depuis une fiche ou depuis l'accueil | aucun (NULL) |
| Visites de lieu | `venue_checkins` | une visite (pas de produit : `drink_id` NULL) | aucun (NULL) |

Fonctions de statistiques personnelles (préfixe `get_my_`) : `get_my_stats_overview`, `get_my_habits`, `get_my_category_ranking`, `get_my_beer_style_ranking`, `get_my_brand_ranking`, `get_my_brewery_ranking`, `get_my_drink_ranking`, `get_my_venue_ranking`, `get_my_monthly_drinks`, `get_my_monthly_spending`, `get_my_drink_price_stats`, `get_my_drink_calorie_stats`, `get_my_tips_*`… Les statistiques d'un Bibax passent par `get_bibax_stats_*` ; le chiffre d'affaires par `get_*_revenue_stats` (réservé aux administrateurs pour l'instant).

Colonnes de la vue : `user_id`, `drink_id` (remplacé par `counts_as_drink_id` du produit quand il existe), `venue_id`, `unit_price`, `currency`, `kcal` (calculé : kcal/100 ml × volume), `consumed_at`, `paid`.

Conséquence à garder en tête : **ajouter une ligne dans une de ces tables = compter un verre de plus** (nombre de verres, kcal, classements). Un verre déjà présent dans le journal BibaSolo ou dans une tournée ne doit donc pas recevoir en plus un `drink_checkins`.

## BibaSolo

- **`solo_checkins`** — le journal : colonnes utilisées par l'app : `user_id`, `drink_id`, `venue_id`, `price` (numérique — **les demi-jetons existent : 1,5 est valable**), `volume_cl`, `currency`, `created_at`, `archived_at`.
  - `currency` : `text not null default 'euro'`, contrainte `solo_checkins_currency_check` (`'euro'` ou `'jeton'`). Les verres antérieurs à la colonne sont restés en euros. Le prix d'un verre en jetons est un nombre de jetons, jamais des euros : euros et jetons ne s'additionnent jamais (deux totaux séparés dans le bloc « Dépensé »).
  - `venue_id` : l'identifiant d'un lieu de `public_venues`, ou `@home` / `@event` (lieux rapides, **pas** des lignes de `public_venues` : ils ne sont jamais demandés à `get_venues_by_ids`). Sans lieu : NULL. Un verre `@home` n'a pas de prix.
  - `archived_at` : « Archiver la liste du jour » masque la liste et ses compteurs dans BibaSolo, mais la consommation reste comptée dans les statistiques (la vue ne filtre pas). La croix de suppression d'un verre, elle, fait un vrai `DELETE`.
- Migration des jetons : `bibamus-sql-solo-jetons.sql` (colonne `currency` + vue `consumption_events` qui lit désormais `sc.currency` au lieu de `'euro'` en dur ; les options de la vue sont conservées).
- **Lieux proches** (recherche de lieu dans BibaSolo) : `get_nearby_venues(p_lat, p_lng, p_radius_meters, p_limit)`, appelée avec 500 m et **2 lieux** ; `@Home` et `@Event` sont proposés avant.
- Journal : les noms de lieux viennent de `get_venues_by_ids(p_ids)`.

## Checks de produit (fiche, accueil, BibaSolo, salon)

- **`drink_checkins`** : écrit par la fonction `check_in_drink(p_drink_id, p_venue_id, p_volume_cl)` ; `get_my_drink_checkin_count(p_drink_id)` donne le nombre de checks de la personne pour un produit. Un check de fiche ou d'accueil **est** la consommation (c'est ce qui le fait compter dans les statistiques).
- **Drink Check depuis BibaSolo ou un salon** : le verre est déjà compté (`solo_checkins` / `round_orders`). Le check ne crée donc **pas** de `drink_checkins` : il enregistre la note du produit et publie seulement la carte BibaPulse (fonction Edge `create-pulse-event`, type `drink_checked` ; la carte « Découverte » (`product_discovered`) n'est pas publiée depuis ces écrans), avec photo, commentaire, visibilité et Bibax tagués.
- **`get_my_drink_counts(p_drink_ids text[])`** → `(drink_id text, n integer)` : combien de fois la personne connectée a consommé chacun des produits demandés (50 produits au plus), lu dans `consumption_events` ; sert à départager, dans la lecture d'étiquette, des produits qui correspondent aussi bien. `security definer`, exécution retirée à `public` et `anon`, accordée à `authenticated`.

## Salons (BibaRoom) et commandes

- **`salons`** : une ligne par salon, avec son code et l'état du salon (un seul bloc JSON synchronisé en temps réel) ; les codes de salon ne sont jamais réutilisés. L'app y accède par `get_salon`, `save_salon`, `decline_salon_invite` et `get_club_round_buyers` **(base)**, jamais en direct. La table est fermée à ceux qui n'y participent pas : lecture réservée aux participants et aux administrateurs, écriture directe réservée aux administrateurs, rien pour les visiteurs (vérifié le 2026-10-09 ; voir `SECURITY.md`).
- **Commandes** : chaque commande de tournée est aussi enregistrée en lignes individuelles interrogeables — `round_orders` (une ligne par verre : produit, lieu, prix unitaire, monnaie, volume, kcal), avec les paiements (`round_payments`, `mark_round_paid`, `record_partial_payment`) et les pourboires (`record_round_tip`). Fonctions d'écriture : `record_round_orders`, `delete_round_orders`, `delete_round_orders_by_event`, `delete_round_tip(s_by_event)`.
- Détails du fonctionnement d'un salon : voir `BIBAROOM.md`.

## Autres domaines (inventaire)

| Domaine | Tables | Notes |
|---|---|---|
| Profils et relations | `profiles`, `tasted_drinks` | relations Bibax : fonctions `send_bibax_request`, `respond_bibax_request`, `get_my_bibax`, `block_user`… (voir `BIBAX.md`) |
| BibaPulse | `pulse_events`, `pulse_bix`, `pulse_incoming`, `pulse_sante`, `pulse_comments` | fil : `get_pulse_feed`, `get_entity_pulse`, `get_pulse_comments` ; publication : fonction Edge `create-pulse-event` ; photos : `upload-pulse-photo`, `moderate-and-upload-photo` (voir `BIBAPULSE.md`) |
| Stories | `stories`, `official_stories`, `story_bix` | voir `STORIES.md` |
| Messagerie | `conversations`, `conversation_members`, `messages`, `message_reactions` | `get_my_conversations`, `can_message`, `ensure_salon_conversation` |
| Notifications | `notifications_feed`, `push_subscriptions` | `send_notification` ; envoi push : fonction Edge `send-push-notification` |
| Clubs | `biba_clubs`, `biba_club_members`, `biba_club_posts`, `biba_club_salons` | |
| Jeux | `predict_games` | pronostics |
| Contribution et modération | `data_contributions`, `entity_reports`, `entity_claims`, `ai_proposals` | `ai_proposals` : propositions de l'IA de la plateforme de gestion, jamais écrites automatiquement dans les fiches (validation manuelle d'un administrateur) |
| Pilotage | `feature_flags`, `feature_flag_overrides`, `market_config`, `analytics_events`, `crash_reports`, `support_messages` | |
| Compte | — | suppression du compte : fonction Edge `delete-my-account` |

## Contribution et modération

- N'importe quel utilisateur peut contribuer une fiche (établissement, produit, marque, producteur) — génère un événement `database_contribution` sur BibaPulse
- **Certification** : un statut distinct de la simple existence de la fiche (`can_certify` / `certify` / `decertify`)
- **Fusion de doublons** : `merge_entities(entity_type, loser_id, keeper_id)` — réservé aux administrateurs, exécution publique explicitement révoquée
- Journalisation des modifications : déclencheurs `audit_content_changes` / `audit_profile_changes`, consultable via `log_audit_event` / `my_audit_activity`

## Plateforme de gestion (admin.bibamus.app)

Dépôt séparé (`Bibamus-Management`), pensée pour encoder/vérifier plus rapidement que sur mobile. Même backend Supabase que l'app principale (très probable, non prouvé depuis ce dépôt). Elle gère déjà les fiches, les utilisateurs, la modération, les propositions de l'IA, les styles personnalisés, les drapeaux de fonctionnalités et la discussion d'équipe ; voir `ADMIN-PLATFORM.md`. Non encore construits : suivi des paiements/abonnements (une fois un modèle de monétisation en place) et approbation des revendications de fiche.

## Connu comme incomplet / non construit

- Fiches détaillées des catégories autres que Bières & Cidres et Vins & Bulles (Spiritueux en cours ; Shots, Cocktails / Mocktails, Softs & Eaux, Boissons chaudes, Snacks à faire)
- Système de rôles complet pour verrouiller le Niveau 3 aux comptes Business
- Monétisation / comptes Business eux-mêmes ; l'approbation des `entity_claims` n'existe pas encore
