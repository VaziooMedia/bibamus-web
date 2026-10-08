# BIBAPULSE — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-09. Vérifié contre le code de l'app (`src/`), les scripts SQL `bibamus-sql-pulse-*` / `bibamus-sql-tags-*` et la fonction Edge `create-pulse-event` (version 5) livrés. La mention **(base)** signale ce qui ne se lit que dans Supabase : aucun script livré ne le contient, donc non revérifié.

---

## Principe général

BibaPulse est le fil d'activité social de Bibamus. Le contenu n'est **jamais une publication libre** : il n'existe aucun écran de rédaction indépendant. Chaque carte naît d'une action réelle faite ailleurs dans l'app — checker un produit, checker un lieu, ajouter une fiche à la base.

Ce n'est plus tout à fait « automatique » : la fenêtre de check propose une case **« Publier dans BibaPulse »** (décochable) et des champs facultatifs — visibilité, commentaire, photo, note, Bibax tagués. Le même formulaire (`PulseContentForm`) sert au Drink Check et au Place Check.

Les Stories ne créent **aucune** carte dans le fil : elles ont leur propre circuit (voir `STORIES.md`).

## Architecture technique

### Table `pulse_events`

Événement générique : jamais de duplication des données métier, seulement des références (l'objet est résolu au rendu à partir des répertoires).

Colonnes lues par les fonctions SQL : `id`, `actor_id`, `actor_type`, `event_type`, `object_type`, `object_id`, `venue_id`, `room_salon_code`, `source_type`, `source_id`, `visibility`, `metadata` (jsonb), `bix_count`, `comments_count`, `last_bixer_name`, `incoming_count`, `sante_count`, `hidden`, `hidden_by` (`null` | `'author'` | `'moderation'`), `created_at`. Le script de création de la table elle-même n'est pas livré **(base)**.

`room_salon_code` existe mais le client ne le renseigne jamais : une carte n'est pas rattachée à un salon.

### Pipeline de création

Le client n'écrit **jamais** directement dans `pulse_events` : tout passe par la fonction Edge `create-pulse-event`.

Deux chemins coexistent côté client :

1. **Checks (lieu, produit, Drink Check d'une liste BibaSolo / salon)** : `emitEvent(..., skipPulse: true)` n'alimente que les statistiques d'usage, puis la carte est publiée directement par `publishVenueCheckInToPulse` / `publishDrinkCheckInToPulse`, avec visibilité, lieu et contenu.
2. **Ajout d'une fiche** (`PRODUCT_ADDED`) : c'est le seul événement qui passe encore par la table de correspondance `PULSE_EVENT_MAP` (côté **client**, dans `sharedDirectories.js`) avant l'appel à la fonction Edge.

`PULSE_EVENT_MAP` ne contient que trois entrées (`DRINK_CHECKED`, `VENUE_CHECKED`, `PRODUCT_ADDED`) ; les deux premières sont dormantes aujourd'hui, car tous les appelants passent `skipPulse: true`. Un type absent de cette table ne produit jamais de carte. `CONTRIBUTION_APPROVED`, `PRODUCT_LIKED`, `BIBAROOM_CREATED` et `BIBAROOM_JOINED` ne vont qu'aux statistiques d'usage.

**Côté serveur** (`create-pulse-event`, v5) :

- **Déduplication** : même auteur + même `event_type` + même objet dans les 30 minutes → réponse `{ ok: true, deduplicated: true }`, que le client n'exploite pas. Elle n'est **pas** appliquée quand la publication porte du contenu.
- Le serveur n'exige que `eventType`, `sourceType` et `sourceId` ; un champ `metadata` envoyé par le navigateur est ignoré. `content` n'est accepté que pour `drink_checked`, `venue_visit` et `product_discovered`.
- **Contenu** : commentaire ≤ 280 caractères (caractères de contrôle retirés) ; note de 0,25 à 5 par pas de 0,25, seulement pour `drink_checked` et `product_discovered` ; photo = URL du bucket public `pulse-photos` sous le dossier de l'auteur (≤ 300 caractères, sans `?`, `#`, `..`) ; Bibax tagués : 10 au plus côté serveur, **5** côté application ; on ne peut pas se taguer soi-même.
- **Bibax tagués** : le serveur ne garde que les personnes qui sont Bibax acceptés de l'auteur, ont `allow_pulse_tags` ≠ faux et ne sont bloquées dans aucun sens ; les autres sont écartées sans erreur.

### Types d'événements

| `event_type` | Libellé | Déclenché par | Visibilité par défaut (serveur) | Contenu / note |
|---|---|---|---|---|
| `product_discovered` | Découverte | **Premier** check d'un produit par la personne (`get_my_drink_checkin_count` ≤ 1) | `public` | oui / oui |
| `drink_checked` | Check | Checks suivants d'un produit, et tout check depuis une liste BibaSolo / salon (jamais de « Découverte » depuis ces écrans) | `public` | oui / oui |
| `venue_visit` | Check | Check d'un lieu **sans produit** | `relations` | oui / non |
| `database_contribution` | Ajout | Ajout d'un produit, d'un lieu, d'une marque ou d'un producteur à la base | `public` | non |

Le serveur déclare aussi `drink_logged` (relations) et `badge_unlocked` (public) : aucun émetteur dans l'app.

Nuances à connaître :

- Un check de lieu **avec** un produit ne produit **pas** de `venue_visit` : une seule carte est publiée, celle du produit, avec le lieu en `venue_id` et la visibilité choisie dans le formulaire du lieu.
- Un `venue_visit` est créé **sans** `venue_id` (le lieu est l'objet de la carte).
- Ajouter à sa liste de salon un produit du catalogue publie automatiquement une carte Découverte / Check, en public, sans ouvrir de fenêtre de check.
- Une erreur de publication n'annule jamais le check : l'utilisateur reçoit une alerte.
- La fenêtre de check de lieu s'ouvre à chaque check-in.
- Les `object_type` émis : `drink`, `venue`, `brand`, `producer`, `brewery` — ce dernier n'est pas résolu à l'affichage (la carte dit « une fiche »).

### Visibilité

Le serveur accepte `relations`, `public` et `private`. **L'application n'offre que « Public » et « Mes Bibax »** (`relations`) : `private` n'est jamais proposé. Valeurs proposées par défaut : `public` au Drink Check, `relations` au Place Check. Un auteur voit toujours ses propres cartes.

`relations` s'appuie sur le système **Bibax mutuel confirmé** (`bibax_relationships`, statut `accepted`), pas sur un suivi à sens unique. Mais les deux lectures ne l'appliquent pas de la même façon :

- **`get_pulse_feed` (fil principal)** : une carte `relations` n'apparaît que si la relation est acceptée **et** que le lecteur a activé la cloche **« Suivre sur Pulse »** sur cet auteur — ou suit le lieu de la carte (`venue_follows`). Une relation acceptée seule ne suffit pas.
- **`get_entity_pulse` (fil d'une fiche)** : relation acceptée suffisante, sans cloche.

Dans les deux cas, les cartes masquées (`hidden`) et celles d'un utilisateur bloqué (dans un sens ou dans l'autre) sont exclues.

## Réactions

Trois réactions, chacune sur sa table dédiée (jamais un simple compteur : toujours une trace de qui).

| Réaction | Table | Affichée sur | Détails |
|---|---|---|---|
| **Bix** | `pulse_bix` | Toutes les cartes | Icône cœur, vert fluo dès 1 Bix. On peut Bixer sa propre carte. |
| **J'arrive !** | `pulse_incoming` | `venue_visit` uniquement | Grisé (visible mais désactivé) pour l'auteur du check. |
| **Cheers !** | `pulse_sante` | `product_discovered` uniquement | Une carte `drink_checked` n'a pas de Cheers. |

Écriture : `pulse_bix` et `pulse_incoming` en écriture directe depuis le client ; Cheers par la fonction `toggle_pulse_sante(p_pulse_event_id)`. Le compteur affiché vient des colonnes `bix_count`, `incoming_count`, `sante_count` de `pulse_events`, tenues à jour par des déclencheurs `sync_pulse_*_count` **(base)**, tout comme `last_bixer_name`. Le client met à jour le compteur de façon optimiste, sans traiter les erreurs.

La ligne-résumé sous les boutons (« Bixé par X et N autres Bibax », « N Bibax arrive/arrivent », « N Cheers ») ouvre la liste des réacteurs (`get_pulse_reactors`, **(base)** pour son corps) : feuille basse défilante avec les onglets « Bix (n) », « J'arrive ! (n) » (si `venue_visit`) et « Cheers ! (n) » (si `product_discovered`).

## Fonctions SQL et RPC

| Fonction | Rôle | Remarques |
|---|---|---|
| `get_pulse_feed(p_limit, p_before)` | Fil principal, 20 cartes par page | `security definer` ; vide pour un visiteur non connecté ; règle de visibilité ci-dessus ; remplace `metadata.tagged_ids` par `metadata.tagged` (nom + code Bibax) |
| `get_entity_pulse(...)` | Fil d'une fiche | Voir « Fil de fiche » |
| `get_pulse_reactors(p_pulse_event_id)` | Liste des réacteurs (`kind` : `bix`, `incoming`, `sante`) | **(base)** |
| `toggle_pulse_sante(p_pulse_event_id)` | Bascule Cheers | **(base)** |
| `get_pulse_comments(p_pulse_event_id)` | Commentaires d'une carte | Exclut supprimés, retirés et utilisateurs bloqués |
| `toggle_notify_pulse(p_target_code)` | Cloche « Suivre sur Pulse » d'un Bibax | **(base)** |
| `toggle_follow_venue` / `toggle_follow_drink` | Cloche d'un lieu / d'un produit | **(base)** |
| `get_bibax_pulse_activity(p_target_user_id, p_before)` | Activité d'un Bibax sur sa fiche | **(base)** |
| `get_pulse_moderation_details`, `moderate_pulse_content` | Modération (voir plus bas) | Réservées à `can_moderate()` |

## Commentaires

Table `pulse_comments` : `id`, `pulse_event_id`, `user_id`, `body`, `created_at`, `deleted_at`, `moderation_status`. Chargés à la demande, au premier dépliage (le fil ne renvoie que `comments_count`), triés du plus ancien au plus récent. Écriture directe depuis le client. Le bouton est une pastille icône « bulle » + compteur (vert fluo dès qu'il y a un commentaire) ; « Commenter ... » est le texte d'aide du champ de saisie, une fois la zone dépliée. Pas de limite de longueur côté application.

## Modération

- **Signaler** : bouton sur les cartes et commentaires des *autres* uniquement ; fenêtre `ReportModal` à 5 motifs (contenu inapproprié, spam ou publicité, harcèlement, photo ou information personnelle sans accord, autre — commentaire obligatoire pour « autre »). Enregistré dans `entity_reports` avec `entity_type` = `pulse_event` ou `pulse_comment`.
- **Masquage automatique** : à **3 signalants distincts** en statut `pending`, la carte passe à `hidden = true, hidden_by = 'moderation'`, ou le commentaire à `moderation_status = 'removed'`. Le signalant enregistré est toujours le compte connecté.
- **Modération humaine** : `moderate_pulse_content(p_entity_type, p_entity_id, p_action)` avec `'hide'` ou `'restore'` ; rien n'est supprimé ; rétablir une carte masquée par son auteur est refusé. L'écran « Signalements » est dans la plateforme de gestion (autre dépôt), non vérifiable ici.
- **Auteur** : le modèle prévoit qu'un auteur masque sa carte (`hidden_by = 'author'`) ou supprime son commentaire (`deleted_at`), mais **aucun écran de l'app ne le permet** aujourd'hui.

## Photos

Fonction Edge `upload-pulse-photo` : authentification obligatoire ; JPEG, PNG ou WebP, base64 ≤ 7 000 000 caractères (≈ 5 Mo) ; contrôle Google Cloud Vision SafeSearch (refus si `adult`, `violence` ou `racy` valent `VERY_LIKELY`) ; refus si la clé Vision manque ; nom choisi par le serveur (`<id auteur>/<horodatage>-<aléa>.<ext>`). Bucket public `pulse-photos` (5 Mo, JPEG / PNG / WebP). Côté client : réduction à 1600 px de côté maximum, JPEG qualité 0,82. La photo est envoyée **avant** la validation du check : un refus de photo n'enregistre rien. Affichage : pleine largeur, hauteur maximale 220 px.

## Bibax tagués

Le sélecteur ne propose que des Bibax confirmés (`get_taggable_bibax(p_ids, p_surface)` avec `'pulse'`), les personnes qui refusent les tags apparaissent grisées (badge « Tags »). Réglages de confidentialité propres à BibaPulse : `profiles.allow_pulse_tags` et `profiles.allow_profile_via_pulse_tag` (vrai par défaut), distincts de ceux des Stories ; écran Sécurité > Tags. Quand `allow_profile_via_pulse_tag` est faux, le nom reste affiché mais n'est plus un lien vers le profil. Rendu : « avec Prénom Nom, ... ».

## Rafraîchissement

Le fil principal (`BibaPulseScreen`) se rafraîchit toutes les **10 secondes** par polling : fusion des 20 cartes les plus récentes dans la liste déjà chargée, par identifiant, sans perdre les pages plus anciennes. Pas de websocket. La fusion ne retire jamais une carte devenue masquée avant le rechargement de l'écran. Ni le fil d'une fiche, ni l'aperçu de l'accueil, ni les commentaires ouverts ne se rafraîchissent seuls.

## Affichage — carte d'activité (`PulseCard`)

- **Ligne 1** : Prénom + Nom de l'auteur. C'est le **rond de profil** (avatar) qui est cliquable vers le profil, pas le nom. Le nom suit la règle `prénom + nom` de `pulse_display_name`, sans tenir compte des réglages `share_*`.
- **Ligne 2** : action (Découverte / Check / Ajout) @ nom de l'objet en vert fluo, cliquable vers sa fiche pour un produit ou un lieu ; puis « — nom du lieu » du check (libellés spéciaux @Home et @Event, cliquable pour un vrai lieu).
- **Haut à droite** : « À l'instant » (< 5 s), puis « Il y a X sec. / min. / h / j ».
- Photo, commentaire, note et personnes taguées s'affichent sous la ligne 2.
- **Signalement** : icône discrète, sur les cartes des autres.

## Fil de fiche (`EntityPulseSection`)

Onglet « BibaPulse » sur les fiches **Produit**, **Lieu** et **Producteur** — pas sur la fiche **Marque**. Liste déroulante « Tout le monde » / « Mes Bibax ». Mêmes `PulseCard` que le fil. Règles de `get_entity_pulse` : comptes connectés seulement ; types `drink_checked`, `venue_visit` et `product_discovered` (jamais `database_contribution`) ; produit = cartes sur ce produit ; lieu = cartes dont l'objet **ou** le `venue_id` est ce lieu ; producteur = cartes sur les produits dont `producer_ids` contient ce producteur ; 20 résultats par page (50 au maximum par appel), bouton « Voir plus » ; `scope = 'bibax'` = Bibax acceptés uniquement, hors soi ; `scope = 'all'` = soi + public + `relations` des Bibax acceptés.

## Accès et aperçu

- Onglet « BibaPulse » de la barre du bas (toujours présent) ; après un check publié depuis l'accueil, retour sur le Pulse avec une confirmation.
- **Aperçu sur l'accueil** : les 3 dernières cartes en version réduite, sans réactions, masqué si le drapeau `nav_bibapulse_visible` vaut faux. Ce drapeau n'agit pas sur la barre du bas.
- Onglet « Pulse » dans l'écran d'un salon : fil construit localement à partir de l'état du salon, pas à partir de `pulse_events`.
- Cloche « Suivre sur Pulse » : sur la fiche d'un Bibax, d'un lieu et d'un produit. L'état initial de la cloche d'un Bibax est toujours « éteint » à l'ouverture de sa fiche (la propriété n'est jamais chargée). Pour un produit, aucun script livré ne montre que son suivi alimente le fil principal.

## Notifications in-app

Types `pulse_bix` (« a Bixé votre publication »), `pulse_comment` (« a commenté votre publication ») et `pulse_sante` (« a dit Cheers à votre publication »). Toucher la notification ouvre la carte dans BibaPulse (jusqu'à 10 pages supplémentaires chargées pour la retrouver), la surligne et déplie les commentaires pour `pulse_comment`. Aucune notification pour « J'arrive » ni pour un Bibax tagué dans une carte. Les déclencheurs qui créent ces notifications ne sont pas dans les scripts livrés **(base)**. Aucun appel de notification push n'est lié à Pulse côté client.

## Intégration avec Stories

Une Story partagée d'un salon vers BibaPulse n'apparaît **pas** dans le fil de cartes : elle apparaît dans la **barre de Stories de l'accueil** (via `get_pulse_stories`), avec la mention « via BibaRoom » dans la visionneuse. Voir `STORIES.md`.

## Connu comme incomplet / non construit

- Aucun écran pour qu'un auteur masque ou supprime sa propre carte ou son commentaire.
- Pas de carte Pulse pour les Stories, la création ou l'arrivée dans un BibaRoom, ni les « likes » de produit.
- Marques, producteurs et objets `brewery` : pas cliquables, `brewery` non résolu ; pas d'onglet BibaPulse sur la fiche Marque.
- Pas de rafraîchissement automatique du Pulse de fiche, de l'aperçu d'accueil, des commentaires et des réacteurs ouverts.
- Pas de limite de longueur côté application sur les commentaires.
- `private` accepté par le serveur mais non proposé ; `toggleFollow` (suivi d'un Bibax à sens unique) sans appelant.
- Non vérifiable faute de scripts **(base)** : création des tables Pulse et leurs règles d'accès, déclencheurs `sync_pulse_*_count`, corps de `get_pulse_reactors`, `toggle_pulse_sante`, `toggle_notify_pulse`, `get_bibax_pulse_activity`, `can_moderate`, création des notifications `pulse_*`.
