# DATABASE — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-08 (consommation, BibaSolo et jetons, checks de produit).

---

## Principe général

La base de données Bibamus repose sur **quatre piliers**, reliés entre eux :

| Pilier | Table | Nom interne à noter |
|---|---|---|
| Établissements | `public_venues` | jamais "establishments"/"lieux" dans le code |
| Produits | `drinks_directory` | table lue par toute l'app (`loadDrinksByIds`, recherche, vue de consommation) |
| Marques | brands | |
| Producteurs | breweries | nommé "brewery" en base malgré le terme générique "producteur" affiché |

## Architecture i18n

Pensée dès le départ pour être prête à l'international, même si l'app est développée en français pour l'instant :

- **Taxonomies** (types de produits, styles bière/cidre, tags) : codes techniques stables + libellés français dans des fichiers JS (`constants.js`, `beerCiderStyles.js`) **mirroré** dans Supabase (`taxonomy_terms` + `taxonomy_terms_translations`) — 53 groupes de taxonomie au total
- **Noms d'entités** (produits, marques, producteurs, établissements) : tables de traduction dédiées — `product_translations`, `brand_translations`, `producer_translations`, `establishment_translations`
- Cible : EN/NL/DE pour l'app grand public ; la plateforme de gestion peut rester français-only pour l'instant (bilingue FR/EN envisageable plus tard, non urgent)

## Fiches produits

- Seule la catégorie **"Bières & Cidres"** est construite à ce jour — les autres catégories (vins, spiritueux, softs, etc.) restent à faire
- Organisées en onglets progressifs : **Ajout rapide** / **Niveau 1 (essentiel)** / **Niveau 2 (expert)** / **Niveau 3 (expert, technique brassicole)** — le Niveau 3 est prévu pour être verrouillé aux comptes "Business" des producteurs une fois le système de rôles en place
- **Codes-barres** : table `drink_barcodes`, plusieurs variantes d'emballage peuvent pointer vers la même fiche produit

## Établissements

- Adresse structurée : `street_name`, `street_number`, `postal_code`, `city`, `village`, `country` (code interne Bibamus, pas ISO — table de correspondance `COUNTRY_ISO_CODES` côté client dans `bibamus-admin`)
- **Horaires d'ouverture** : Google Places est la seule source, jamais d'encodage manuel — deux edge functions (`google-place-search`, `google-place-hours`) appellent l'API côté serveur pour ne jamais exposer la clé
- **Géolocalisation** : colonne `location geography(Point,4326)` (PostGIS), synchronisée automatiquement depuis lat/lng via le déclencheur `sync_venue_location` ; RPC `get_nearby_venues(lat, lng, radius_meters, limit)` pour la recherche de proximité ; traçabilité du géocodage (`geocode_source`, `geocode_confidence`, `geocode_status`, `geocoded_at`)
- Autocomplétion d'adresse/ville : Geoapify (gère les doublons linguistiques comme Waimes/Weismes via un paramètre de langue)

## Consommation et statistiques

**Une consommation = une ligne dans la vue `consumption_events`.** Cette vue est la source de « Mes Statistiques » et de `get_my_drink_counts`. Elle est l'union de quatre sources :

| Source | Table | Ce que représente une ligne | Prix / monnaie |
|---|---|---|---|
| Commandes de salon | `round_orders` (lignes avec `user_id`) | un verre commandé dans une tournée | `unit_price` / `currency` ; `paid` vient de `round_payments` |
| BibaSolo | `solo_checkins` | un verre enregistré dans le journal BibaSolo | `price` / `currency` (`'euro'` ou `'jeton'`) |
| Checks de produit | `drink_checkins` | un check de produit fait depuis une fiche ou depuis l'accueil | aucun (NULL) |
| Visites de lieu | `venue_checkins` | une visite (pas de produit : `drink_id` NULL) | aucun (NULL) |

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

## Contribution et modération

- N'importe quel utilisateur peut contribuer une fiche (établissement, produit, marque, producteur) — génère un événement `database_contribution` sur BibaPulse
- **Certification** : un statut distinct de la simple existence de la fiche (`can_certify` / `certify` / `decertify`)
- **Fusion de doublons** : `merge_entities(entity_type, loser_id, keeper_id)` — réservé aux administrateurs, exécution publique explicitement révoquée
- Journalisation des modifications : déclencheurs `audit_content_changes` / `audit_profile_changes`, consultable via `log_audit_event` / `my_audit_activity`

## Plateforme de gestion (admin.bibamus.app)

Dépôt séparé (`Bibamus-Management`), pensée pour encoder/vérifier plus rapidement que sur mobile. Même backend Supabase que l'app principale. Ajouts prévus non encore construits : gestion des utilisateurs, suivi des paiements/abonnements (une fois un modèle de monétisation en place).

## Connu comme incomplet / non construit

- Catégories de produits autres que "Bières & Cidres"
- Système de rôles complet pour verrouiller le Niveau 3 aux comptes Business
- Monétisation / comptes Business eux-mêmes
