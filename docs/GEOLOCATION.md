# GÉOLOCALISATION — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. Consolide ce qui était auparavant réparti entre BIBAX.md et DATABASE.md. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-09. Vérifié contre le code de l'app (`src/`) et les scripts SQL livrés. La mention **(base)** signale ce qui ne se lit que dans Supabase : aucun script livré ne le contient (c'est le cas de PostGIS, de `get_nearby_venues` et des fonctions Edge de géocodage), donc non revérifié.

---

## Usages

| Usage | Donnée source | Technologie |
|---|---|---|
| Autocomplétion d'adresse (code postal + commune d'un lieu ou d'un producteur) | Saisie utilisateur | Geoapify, **directement depuis le navigateur** |
| Choix de la commune du profil | Saisie utilisateur | **Liste statique** par pays (aucun appel réseau) |
| Géocodage d'une adresse ou d'une ville | Adresse / ville + pays | Fonction Edge `geoapify-geocode` |
| Proximité entre établissements | `public_venues.lat` / `lng` (colonne PostGIS `location` **(base)**) | RPC `get_nearby_venues` |
| Proximité entre Bibax | `profiles.latitude` / `longitude` | PostGIS (`get_bibax_suggestions`) |
| Position de l'utilisateur | `navigator.geolocation` | Navigateur |
| Pays courant (avertissement d'âge, inscription) | Position GPS | BigDataCloud (service tiers) |
| Carte | Tuiles OpenStreetMap | Leaflet |
| Horaires d'ouverture | Google Places | Fonction Edge `google-place-hours` |

## Geoapify

- **Autocomplétion d'adresse** (`AddressAutocomplete`, bibliothèque `@geoapify/geocoder-autocomplete`) : deux champs — code postal et commune — filtrés sur le pays ISO. La clé est `VITE_GEOAPIFY_API_KEY`, lue **par le navigateur** ; sans elle, « Auto-complétion non configurée ». Langue fixée à `fr` (pas celle de l'utilisateur). Utilisée par les assistants d'ajout de lieu et de producteur.
- **Commune du profil** (`CityAutocomplete`) : **pas Geoapify** — une liste statique `CITIES_BY_COUNTRY` (une quarantaine de pays), 6 suggestions au plus, texte libre accepté. Cette liste contient les deux variantes `Waimes` et `Weismes`.
- **Géocodage serveur** : la fonction Edge `geoapify-geocode` reçoit une adresse complète (assistant d'ajout de lieu) ou seulement ville + pays (profil) et renvoie `lat`, `lng`, `status`, `source`, `confidence`. Source : **(base)**.

## PostGIS — établissements

- Colonne `location geography(Point,4326)` sur `public_venues`, synchronisée depuis lat / lng par le déclencheur `sync_venue_location` **(base)** ; l'app n'écrit ni ne lit que `lat` et `lng`.
- RPC `get_nearby_venues(p_lat, p_lng, p_radius_meters, p_limit)` → lignes `{ venue, distance_meters }` **(base)**. Rayons réellement utilisés :

| Où | Rayon | Résultats |
|---|---|---|
| Suggestions à la création d'un salon | progressif 300 m → 1 km → 3 km → 10 km, jusqu'à 3 résultats | 8 au plus |
| Annuaire des lieux, « Lieux proches de moi » | 3 km | 8 |
| BibaSolo | 500 m | 2 (après @Home et @Event) |
| Fenêtre de check d'un produit | 5 km | 8 |
| Valeur par défaut | 2 km | 10 |

- `get_nearest_venues_serving_drink(p_drink_id, p_lat, p_lng, p_limit)` : les 5 lieux les plus proches qui proposent un produit (fiche produit) **(base)**.
- `get_venues_map_pins` : pastilles de la carte **(base)**.
- **Traçabilité du géocodage** : `saveGeocodeResult` écrit `geocode_source`, `geocode_confidence`, `geocode_status`, `geocoded_at` (date du navigateur) sur `public_venues` **uniquement**, à la validation de l'assistant d'ajout de lieu et seulement si lat et lng sont renseignées. Valeurs de statut vues dans l'interface : `verified`, `exact`, `manual` ; le défaut `pending` est **(base)**. Les producteurs ont `lat` / `lng` mais pas de colonnes `geocode_*`.
- PostGIS est installé dans le schéma `public` (voir `SECURITY.md`) **(base)**.

## PostGIS — proximité Bibax

- `get_bibax_suggestions(p_limit)` retient un candidat avec au moins un Bibax en commun (sans limite de distance), **ou** à 30 km ou moins (distance arrondie à l'entier), **ou** sans coordonnées mais dans le même pays. Affichage « à X km » quand il n'y a pas de Bibax en commun (unité fixe en km). Détails : `BIBAX.md`.
- **Alimentation des coordonnées du profil** : `geocodeCityForProfile` est appelée quand la ville ou le pays changent, mais le résultat reste dans l'état de l'app — **le client ne l'envoie jamais à la base**. Si `profiles.latitude` / `longitude` sont renseignées, c'est par un autre mécanisme **(base)**.
- **Risque de non-déclenchement** : le géocodage cherche le code ISO avec `COUNTRY_ISO_CODES` indexé par code interne (`belgique`), alors que les écrans de profil enregistrent un libellé (`Belgique`). Dans ce cas la recherche ne trouve rien et le géocodage ne part pas. Deux tables `COUNTRY_ISO_CODES` coexistent (`constants.js`, par code interne ; `icons.jsx`, par libellé). La valeur réellement stockée dans `profiles.country` : **(base)**.

## Position de l'utilisateur (navigateur)

Hook `useGeolocation` (`getCurrentPosition`, précision normale, délai 8 s, cache 60 s). Son commentaire dit de ne jamais l'appeler automatiquement, mais plusieurs écrans l'appellent directement :

| Écran | Déclenchement | Pour quoi |
|---|---|---|
| `NearbyVenueSuggestions` | bouton « Suggérer des lieux près de moi » | choix du lieu d'un salon |
| `VenueDirectoryScreen` | bouton « Lieux proches de moi » | annuaire |
| `VenueMapScreen` | bouton « Ma position » | recentre la carte, rien n'est envoyé |
| Sécurité > Permissions | bascule « Localisation » | enregistre `consent_location` |
| `DrinkDetailScreen` | **automatique** à l'ouverture d'une fiche produit | 5 lieux les plus proches qui le servent |
| `BibaSoloScreen` | **automatique** à l'ouverture | 2 lieux à 500 m |
| `DrinkCheckInModal` | **automatique** à l'ouverture de la fenêtre de check | 8 lieux à 5 km |
| `TravelAgeWarning` | **automatique** à l'ouverture de l'accueil, si `consent_location` et date de naissance | pays courant |
| `AuthScreen` | **automatique** en mode inscription | pré-remplir le pays |

`consent_location` ne conditionne que `TravelAgeWarning`.

## Pays courant et âge légal en voyage

`TravelAgeWarning` (accueil) détecte le pays courant : la position GPS précise est envoyée à **`api.bigdatacloud.net`** (géocodage inverse côté navigateur, langue `fr`) qui renvoie un code ISO en minuscules. `getMinimumAge` interroge ensuite `market_config` avec ce code (valeur de repli : 18). Or les lignes de `market_config` sont indexées par **code interne** (`belgique`) : les scripts `bibamus-sql-1-verifier-doublon-belgique.sql` et `-2-supprimer-doublon-be.sql` ont supprimé la ligne `be` (valeur 16) et gardé `belgique`. Pour un code ISO, la recherche retombe donc sur 18 — l'avertissement pourrait s'afficher à tort pour un Belge de 16-17 ans en Belgique. **À vérifier** avec le contenu réel de `market_config`.

## Cartes

- `VenueMapScreen` : `react-leaflet`, tuiles raster OpenStreetMap, pastilles de `get_venues_map_pins`, accessible depuis l'annuaire des lieux.
- `VenuePositionPicker` : repère déplaçable pour corriger la position d'un lieu (assistants d'ajout, formulaire de lieu) ; Leaflet est chargé depuis cdnjs.

## Google Places — horaires d'établissements

Google est la **seule** source des horaires, jamais d'encodage manuel dans l'app (`OpeningHoursDisplay` : « Aucun formulaire »). La fonction Edge `google-place-hours` est appelée côté serveur pour ne jamais exposer la clé au navigateur (aucune clé Google dans l'app). Cache des horaires : 6 heures (`google_hours_cache`, `google_hours_last_fetch_at`). Statuts gérés : `OK`, `ERROR`, `LINK_REQUIRED`, `LINK_INVALID`, ouvert définitivement / temporairement fermé.

`google-place-search` n'est appelée nulle part dans l'app : le rattachement d'un lieu à Google se fait dans la plateforme de gestion. Les messages « Pas d'horaire fixe » et « pas de présence Google » ne peuvent pas s'afficher aujourd'hui : les champs correspondants ne sont jamais chargés dans la fiche d'un lieu.

## Connu comme incomplet / non construit

- Proximité Bibax ↔ Bibax par position en direct : non construite (seule la ville déclarée compte). La position ponctuelle du navigateur est utilisée **pour les lieux**, pas pour les personnes.
- Coordonnées du profil jamais envoyées par le client ; correspondance ISO / libellé de pays à régler (voir plus haut). Idem pour `getMinimumAge`.
- Appels automatiques de position à aligner sur la règle écrite dans `useGeolocation` ; la position part à un tiers (BigDataCloud) à l'inscription et à l'accueil.
- Langue de l'autocomplétion fixée à `fr` ; préférence d'unité de distance non appliquée.
- Non vérifiable faute de scripts **(base)** : PostGIS et `location`, `sync_venue_location`, `get_nearby_venues`, `get_nearest_venues_serving_drink`, `get_venues_map_pins`, sources de `geoapify-geocode`, `google-place-hours`, `google-place-search`.
