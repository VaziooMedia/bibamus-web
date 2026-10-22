# BIBAPULSE — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-22 (suppression de sa propre publication libre, fonction Edge `delete-pulse-post` ; avant : publication libre avec Bibax tagués et partage en Story, fonction Edge version 7 ; avant : publication libre, version 6 ; avant : carte « a rejoint le BibaClub », étape E4, 2026-10-18 ; accès aux tables en lecture et en écriture, 2026-10-14). Vérifié contre le code de l'app (`src/`), les scripts SQL `bibamus-sql-pulse-*` / `bibamus-sql-tags-*` et la fonction Edge `create-pulse-event` (version 7) livrés. La mention **(base)** signale ce qui ne se lit que dans Supabase : aucun script livré ne le contient, donc non revérifié.

---

## Principe général

BibaPulse est le fil d'activité social de Bibamus. Une carte naît soit d'une action réelle faite ailleurs dans l'app — checker un produit, checker un lieu, ajouter une fiche à la base, rejoindre un BibaClub public —, soit d'une **publication libre** rédigée depuis le bouton « + » de BibaPulse : un texte et/ou une photo, avec jusqu'à 5 tags de fiche (produits, marques, producteurs, lieux). Voir « Publication libre ».

Ce n'est plus tout à fait « automatique » : la fenêtre de check propose une case **« Publier dans BibaPulse »** (décochable) et des champs facultatifs — visibilité, commentaire, photo, note, Bibax tagués. Le même formulaire (`PulseContentForm`) sert au Drink Check et au Place Check.

Les Stories ne créent **aucune** carte dans le fil : elles ont leur propre circuit (voir `STORIES.md`).

## Architecture technique

### Table `pulse_events`

Événement générique : jamais de duplication des données métier, seulement des références (l'objet est résolu au rendu à partir des répertoires).

Colonnes lues par les fonctions SQL : `id`, `actor_id`, `actor_type`, `event_type`, `object_type`, `object_id`, `venue_id`, `room_salon_code`, `source_type`, `source_id`, `visibility`, `metadata` (jsonb), `bix_count`, `comments_count`, `last_bixer_name`, `incoming_count`, `sante_count`, `hidden`, `hidden_by` (`null` | `'author'` | `'moderation'`), `created_at`. Le script de création de la table elle-même n'est pas livré **(base)**.

`room_salon_code` existe mais le client ne le renseigne jamais : une carte n'est pas rattachée à un salon.

### Accès aux tables

Vérifié dans la base le 2026-10-14 (voir `SECURITY.md`) : `pulse_events`, `pulse_comments`, `pulse_bix`, `pulse_incoming` et `pulse_sante` ne se **lisent** plus directement que par leur auteur (et par les administrateurs pour les activités et les commentaires) ; aucun accès de lecture pour les visiteurs. Toutes les lectures de l'app passent par des fonctions du serveur (`get_pulse_feed`, `get_entity_pulse`, `get_bibax_pulse_activity`, `get_pulse_comments`, `get_pulse_reactors`), qui appliquent la règle de visibilité et les blocages. L'app n'écrit directement que dans `pulse_comments`, `pulse_bix` et `pulse_incoming`.

**Écritures** (vérifié dans la base le 2026-10-14, voir `SECURITY.md`) : un commentaire, un Bix ou un « j'arrive » ne se dépose que sous une carte que l'auteur a le droit de voir (même règle que le fil), à son propre nom ; une écriture refusée ne crée ni ligne ni notification. Retirer sa propre réaction reste toujours possible. Cheers n'a plus d'écriture directe : l'ajout ne passe que par `toggle_pulse_sante`. Modifier ou supprimer un commentaire ou une carte par l'API est réservé aux administrateurs (aucun écran de l'app ne le fait) ; la modération et le masquage automatique passent par des fonctions du serveur.

### Pipeline de création

Le client n'écrit **jamais** directement dans `pulse_events` : tout passe par la fonction Edge `create-pulse-event` (et, pour supprimer sa propre publication libre, par `delete-pulse-post`), sauf la carte « a rejoint le BibaClub » (`club_joined`), créée par un déclencheur de la base (voir plus bas).

Trois chemins coexistent côté client :

1. **Checks (lieu, produit, Drink Check d'une liste BibaSolo / salon)** : `emitEvent(..., skipPulse: true)` n'alimente que les statistiques d'usage, puis la carte est publiée directement par `publishVenueCheckInToPulse` / `publishDrinkCheckInToPulse`, avec visibilité, lieu et contenu.
2. **Ajout d'une fiche** (`PRODUCT_ADDED`) : c'est le seul événement qui passe encore par la table de correspondance `PULSE_EVENT_MAP` (côté **client**, dans `sharedDirectories.js`) avant l'appel à la fonction Edge.
3. **Publication libre** : `publishPostToPulse` (`sharedDirectories.js`) appelle la fonction Edge avec `eventType: "post"`, sans objet ni source (voir « Publication libre »).

`PULSE_EVENT_MAP` ne contient que trois entrées (`DRINK_CHECKED`, `VENUE_CHECKED`, `PRODUCT_ADDED`) ; les deux premières sont dormantes aujourd'hui, car tous les appelants passent `skipPulse: true`. Un type absent de cette table ne produit jamais de carte. `CONTRIBUTION_APPROVED`, `PRODUCT_LIKED`, `BIBAROOM_CREATED` et `BIBAROOM_JOINED` ne vont qu'aux statistiques d'usage.

**Côté serveur** (`create-pulse-event`, v7) :

- **Déduplication** : même auteur + même `event_type` + même objet dans les 30 minutes → réponse `{ ok: true, deduplicated: true }`, que le client n'exploite pas. Elle n'est **pas** appliquée quand la publication porte du contenu.
- Le serveur n'exige que `eventType`, `sourceType` et `sourceId` (pour une publication libre, il fixe lui-même la source : `post` et un identifiant tiré au hasard) ; un champ `metadata` envoyé par le navigateur est ignoré. `content` n'est accepté que pour `drink_checked`, `venue_visit`, `product_discovered` et `post`.
- **Contenu** : commentaire ≤ 280 caractères (caractères de contrôle retirés) ; note de 0,25 à 5 par pas de 0,25, seulement pour `drink_checked` et `product_discovered` ; photo = URL du bucket public `pulse-photos` sous le dossier de l'auteur (≤ 300 caractères, sans `?`, `#`, `..`) ; Bibax tagués : 10 au plus côté serveur, **5** côté application ; on ne peut pas se taguer soi-même. Tags de fiche : publication libre seulement (voir plus bas).
- **Bibax tagués** : le serveur ne garde que les personnes qui sont Bibax acceptés de l'auteur, ont `allow_pulse_tags` ≠ faux et ne sont bloquées dans aucun sens ; les autres sont écartées sans erreur.

### Types d'événements

| `event_type` | Libellé | Déclenché par | Visibilité par défaut (serveur) | Contenu / note |
|---|---|---|---|---|
| `product_discovered` | Découverte | **Premier** check d'un produit par la personne (`get_my_drink_checkin_count` ≤ 1) | `public` | oui / oui |
| `drink_checked` | Check | Checks suivants d'un produit, et tout check depuis une liste BibaSolo / salon (jamais de « Découverte » depuis ces écrans) | `public` | oui / oui |
| `venue_visit` | Check | Check d'un lieu **sans produit** | `relations` | oui / non |
| `database_contribution` | Ajout | Ajout d'un produit, d'un lieu, d'une marque ou d'un producteur à la base | `public` | non |
| `club_joined` | A rejoint le BibaClub Y | Une personne **devient membre actif** d'un BibaClub **public** (déclencheur de la base, pas la fonction Edge) | `relations` (jamais `public`) | non / non |
| `post` | Publication | Bouton « + » de BibaPulse (publication libre) | `public` (l'app propose aussi `relations`) | oui / non (texte et/ou photo, tags de fiche, Bibax tagués ; pas de note) |

Le serveur déclare aussi `drink_logged` (relations) et `badge_unlocked` (public) : aucun émetteur dans l'app.

Nuances à connaître :

- Un check de lieu **avec** un produit ne produit **pas** de `venue_visit` : une seule carte est publiée, celle du produit, avec le lieu en `venue_id` et la visibilité choisie dans le formulaire du lieu.
- Un `venue_visit` est créé **sans** `venue_id` (le lieu est l'objet de la carte).
- Ajouter à sa liste de salon un produit du catalogue publie automatiquement une carte Découverte / Check, en public, sans ouvrir de fenêtre de check.
- Une erreur de publication n'annule jamais le check : l'utilisateur reçoit une alerte.
- La fenêtre de check de lieu s'ouvre à chaque check-in.
- Les `object_type` émis : `drink`, `venue`, `brand`, `producer`, `brewery` — ce dernier n'est pas résolu à l'affichage (la carte dit « une fiche »).

### Carte « a rejoint le BibaClub » (`club_joined`)

Créée par un déclencheur de la base (`club_member_pulse_card`, sur la table des membres de clubs), jamais par l'app ni par la fonction Edge. Script `bibamus-sql-pulse-E4-carte-arrivee-bibaclub` (voir `SECURITY.md`).

- **Quand** : une personne **devient** membre actif — elle rejoint un club ouvert, accepte une invitation, ou un administrateur ou modérateur valide sa demande. Une demande « en attente » ne crée rien.
- **Conditions** : le club est **public** (aucune carte, jamais, pour un club privé) ; la personne n'est pas la **créatrice** du club (créer n'est pas rejoindre) ; son réglage `profiles.pulse_announce_club_joins` (vrai par défaut) est vrai à ce moment-là. Pas de rattrapage : les arrivées d'avant la mise en place n'ont pas de carte.
- **Contenu** : `object_type` = `club`, `object_id` = identifiant du club, `source_type` = `club_member`, `source_id` = identifiant de la ligne de membre, `visibility` = `relations`, `metadata` = `{ "club_name": … }` (le nom du club au moment de l'arrivée). Aucun commentaire, photo, note ni Bibax tagué.
- **Qui la voit** : la règle des cartes `relations` (voir « Visibilité ») — la personne, et ses Bibax confirmés ; dans le fil principal seulement ceux qui ont activé la cloche « Suivre sur Pulse » pour elle ; sur sa fiche (activité d'un Bibax), tout Bibax confirmé. Jamais le public, jamais les fils de fiche (produit, lieu, producteur), jamais une personne bloquée dans le fil.
- **Disparition** : la carte est supprimée — avec ses Bix, commentaires et Cheers — quand la personne quitte le club, en est retirée, repasse « en attente », quand le club est supprimé ou le compte supprimé. Une notification déjà reçue (par exemple un Bix) reste dans le centre de notifications, mais la carte n'existe plus : la toucher ouvre BibaPulse sans carte surlignée.
- **Interrupteur** : « Annoncer mes arrivées dans un BibaClub public » (Sécurité > Tags et annonces). Le couper n'efface **pas** les cartes déjà publiées (elles partent quand la personne quitte le club) ; il empêche seulement les suivantes.
- **Robustesse** : une erreur côté carte n'empêche jamais de rejoindre ou de quitter un club (avertissement dans les journaux de la base). Le contrôle du script compte les cartes incohérentes (membre disparu ou plus actif, club devenu privé, carte devenue publique) ; il doit en trouver 0.
- **Mise en ligne** : le script SQL d'abord, puis l'app. Une ancienne version de l'app afficherait cette carte comme « Activité @ une fiche ».

### Publication libre (`post`)

Une personne publie un texte et/ou une photo, avec des tags de fiche, sans passer par un check. Écran `PulsePostScreen`, ouvert par le bouton rond « + » à droite du titre de BibaPulse ; il s'affiche dans `BibaPulseScreen` même (comme la fiche d'un Bibax), donc sans nouvelle route.

- **Champs** : Confidentialité (« Public » par défaut, ou « Mes Bibax »), Texte (280 caractères), Photo, Bibax, Tags, et — avec une photo — la case « Partager aussi en Story ». Ce sont les champs du formulaire des checks (`PulseContentForm`), sans la note. « Publier » reste grisé tant qu'il n'y a ni texte (des espaces seuls ne comptent pas) ni photo : des tags seuls (de fiche ou de Bibax) ne suffisent pas.
- **Photo** : réduite à 1600 px et envoyée **avant** la publication, avec le même contrôle SafeSearch que pour les checks. Photo refusée : le message s'affiche et rien n'est publié.
- **Tags de fiche** (`PulseTagsPicker`, jusqu'à **5**, tous types mélangés) : une seule recherche (2 lettres au moins) pour les produits, marques, producteurs et lieux, 4 résultats au plus par sorte, uniquement des fiches visibles dans l'app (statuts `to_process`, `to_fix`, `complete`). Une fiche déjà choisie n'est plus proposée.
- **Bibax tagués** : même champ et mêmes règles que pour les checks — jusqu'à **5** côté application (10 côté serveur), uniquement des Bibax confirmés ; un Bibax qui a refusé les tags dans BibaPulse (`allow_pulse_tags`) apparaît grisé. **Aucune notification n'est envoyée** aux Bibax tagués (comme pour les checks). Leur nom s'affiche sur la carte (« avec Alice Martin, … »).
- **Enregistrement** : `metadata` = `{ comment?, photo_url?, tags?: [{ type, id }], tagged_ids? }` (identifiants des Bibax tagués ; le fil les convertit en noms) avec `type` = `drink`, `brand`, `producer` ou `venue`. Le **nom n'est pas stocké** : il est relu à l'affichage (`usePostTagEntities`, une fois par fiche), pour suivre les renommages. Une fiche devenue invisible ou supprimée n'affiche simplement plus de pastille. `object_type`, `object_id`, `venue_id` et `room_salon_code` restent vides ; `source_type` = `post`, `source_id` = identifiant tiré au hasard par le serveur.
- **Serveur (v7)** : mêmes limites que pour les checks (commentaire, photo du dossier de l'auteur). Bibax tagués : les mêmes règles que pour un check (voir plus haut) ; se taguer soi-même est refusé (« Vous ne pouvez pas vous taguer vous-même. »), plus de 10 identifiants ou un identifiant invalide aussi (« Bibax tagués invalides. »). Tags de fiche : de 1 à 5, sans doublon, chacun doit désigner une fiche existante et visible dans l'app (sinon « Une des fiches taguées est introuvable. »). Visibilité `public` ou `relations` (jamais `private`). Pas de note. Au moins un texte ou une photo (des Bibax tagués seuls ne suffisent pas). **Au plus 20 publications par heure et par personne** (réponse 429, « Trop de publications en peu de temps — réessaie un peu plus tard. »). Pas de déduplication.
- **Affichage** : carte « Publication » (en vert fluo, pas d'objet), puis photo, texte et **pastilles de tags** (« # » pour un produit, une marque ou un producteur, « @ » pour un lieu ; cinq au plus). Une pastille mène à la fiche quand l'écran sait l'ouvrir : depuis BibaPulse, les quatre sortes ; sur une fiche, tout sauf la fiche elle-même et, selon l'écran, la sorte qu'il n'ouvre pas (texte simple dans ce cas).
- **Où elle apparaît** : le fil principal ; l'activité de son auteur sur sa fiche Bibax (« 📝 A publié : « … » », texte ramené sur une ligne et coupé à 80 caractères, ou « 📝 A publié une photo ») ; l'aperçu de l'accueil (« Publication — début du texte », sur une ligne) ; l'onglet BibaPulse des fiches **Produit**, **Lieu** et **Producteur** qu'elle tague (fonction `get_entity_pulse`, script `bibamus-sql-pulse-publication-1-fil-des-fiches`). Pas sur la fiche **Marque** (pas d'onglet BibaPulse) : un tag « marque » n'est qu'une pastille. Mêmes règles de visibilité, de blocage et de masquage que les checks.
- **Partager aussi en Story** : la case n'apparaît que si une photo est ajoutée et si les Stories sont actives (`stories_enabled`) ; elle se décoche si on retire la photo. Après « Publier » (la publication est d'abord enregistrée), BibaPulse ouvre l'éditeur de Story (`StoryCreateScreen`, contexte global) avec la photo et les tags de la publication déjà posés et modifiables : la **première** fiche de chaque sorte (produit, marque, producteur, lieu — une Story n'en accepte qu'une par sorte) et le **premier** Bibax tagué qui accepte les tags dans les Stories (`get_taggable_bibax` avec la surface `story`, réglage distinct de celui de BibaPulse ; en cas d'erreur, aucun Bibax n'est repris). La Story se publie ensuite séparément, depuis l'éditeur : fermer l'éditeur garde la publication, sans Story. Les deux ne sont pas liées après coup. Si la préparation de la Story échoue, la publication reste enregistrée et aucune Story n'est ouverte. Au retour de l'éditeur, le fil se recharge.
- **Supprimer sa publication** : sur ses propres publications libres uniquement (pas sur ses checks), une petite icône de corbeille remplace le bouton « Signaler » dans la rangée des réactions, sur le fil comme sur les fiches Produit, Lieu et Producteur. Un appui demande confirmation (« Supprimer cette publication ? Ses réactions et ses commentaires seront supprimés aussi. »), puis `deleteMyPulsePost` appelle la fonction Edge `delete-pulse-post` avec `{ eventId }`. Côté serveur : authentification obligatoire ; la carte doit être de type `post` et appartenir à l'appelant (sinon 403 / 400) ; la suppression est limitée à ces trois conditions ; les Bix, Cheers, « J'arrive » et commentaires partent avec elle (clés en cascade) ; la photo est effacée du bucket `pulse-photos`, seulement si elle est dans le dossier de l'auteur — si cet effacement échoue, la carte est quand même supprimée (réponse `photoRemoved: false`, à reprendre à la main dans le bucket). Une carte déjà supprimée n'est pas une erreur. Après un échec, le message « La publication n'a pas pu être supprimée. Réessaie dans un instant. » s'affiche et on peut réessayer ; deux appuis rapprochés n'envoient qu'une suppression. Le fil mémorise les cartes supprimées pendant la visite, pour qu'un rafraîchissement déjà parti ne les ramène pas. **Une Story déjà créée à partir de la publication n'est pas supprimée** (les deux sont indépendantes). Supprimer une publication libère une place dans la limite de 20 par heure.
- **Réactions et signalement** : Bix, commentaires et signalement comme sur les autres cartes ; ni « J'arrive ! » ni Cheers (réservés aux visites de lieu et aux découvertes). Le texte des notifications reçues pour une publication n'a pas pu être relu (déclencheurs non livrés **(base)**).
- **Barre du bas** : elle est cachée en permanence sur l'écran BibaPulse (fil et rédaction), pour laisser la place ; elle revient en le quittant.
- **Mise en ligne** : le script SQL d'abord, puis la fonction Edge `create-pulse-event` (version 7 ; une publication avec Bibax tagués envoyée à la version 6 serait refusée), puis la fonction `delete-pulse-post`, puis l'app (sans `delete-pulse-post`, le bouton de suppression afficherait l'erreur). Une ancienne version de l'app afficherait une publication comme « Activité @ une fiche ».

### Visibilité

Le serveur accepte `relations`, `public` et `private`. **L'application n'offre que « Public » et « Mes Bibax »** (`relations`) : `private` n'est jamais proposé. Valeurs proposées par défaut : `public` au Drink Check, `relations` au Place Check, `public` à la publication libre. Un auteur voit toujours ses propres cartes.

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

Écriture : `pulse_bix` et `pulse_incoming` en écriture directe depuis le client (ajout seulement sous une carte visible pour l'appelant, retrait de sa propre ligne toujours possible) ; Cheers par la fonction `toggle_pulse_sante(p_pulse_event_id)`, qui vérifie la visibilité avant d'ajouter. Le compteur affiché vient des colonnes `bix_count`, `incoming_count`, `sante_count` de `pulse_events`, tenues à jour par des déclencheurs du serveur `refresh_pulse_*_count` et `sync_pulse_*_count` **(base)**, tout comme `last_bixer_name` (deux séries qui écrivent les mêmes colonnes : à ranger plus tard). Ces fonctions s'exécutent avec les droits du serveur (vérifié dans la base le 2026-10-14) : le compteur est juste quelle que soit la personne qui réagit. Le compteur de commentaires ne compte que les commentaires affichés (ni supprimés, ni retirés) ; « Bixé par » montre le dernier Bix encore présent, en « Prénom Nom ». Le client met à jour le compteur de façon optimiste, sans traiter les erreurs.

La ligne-résumé sous les boutons (« Bixé par X et N autres Bibax », « N Bibax arrive/arrivent », « N Cheers ») ouvre la liste des réacteurs (`get_pulse_reactors`, qui ne renvoie rien si la carte n'est pas visible pour l'appelant et n'affiche pas les personnes bloquées) : feuille basse défilante avec les onglets « Bix (n) », « J'arrive ! (n) » (si `venue_visit`) et « Cheers ! (n) » (si `product_discovered`).

## Fonctions SQL et RPC

| Fonction | Rôle | Remarques |
|---|---|---|
| `get_pulse_feed(p_limit, p_before)` | Fil principal, 20 cartes par page | `security definer` ; vide pour un visiteur non connecté ; règle de visibilité ci-dessus ; remplace `metadata.tagged_ids` par `metadata.tagged` (nom + code Bibax) |
| `get_entity_pulse(...)` | Fil d'une fiche | Voir « Fil de fiche ». Remplacée par le script `bibamus-sql-pulse-publication-1-fil-des-fiches` (ajoute les publications libres qui taguent la fiche) ; ce script refuse de s'appliquer si la fonction n'est pas dans l'état attendu |
| `get_pulse_reactors(p_pulse_event_id)` | Liste des réacteurs (`kind` : `bix`, `incoming`, `sante`) | Connectés seulement ; vide si la carte n'est pas visible pour l'appelant (même règle que le fil) ; exclut les utilisateurs bloqués. Vérifié dans la base le 2026-10-14 (script non livré) |
| `toggle_pulse_sante(p_pulse_event_id)` | Bascule Cheers | Connectés seulement ; l'ajout est refusé si la carte n'est pas visible pour l'appelant, le retrait reste toujours possible. Vérifié dans la base le 2026-10-14 (script non livré) |
| `get_pulse_comments(p_pulse_event_id)` | Commentaires d'une carte | Connectés seulement ; vide si la carte n'est pas visible pour l'appelant ; exclut supprimés, retirés et utilisateurs bloqués. Vérifié dans la base le 2026-10-14 (script non livré) |
| `get_pulse_event_preview(p_pulse_event_id)` | Aperçu « Check @ lieu » d'une carte, pour le texte des notifications | Réservée au serveur (déclencheurs de notification) ; non appelable depuis l'app |
| `toggle_notify_pulse(p_target_code)` | Cloche « Suivre sur Pulse » d'un Bibax | **(base)** |
| `toggle_follow_venue` / `toggle_follow_drink` | Cloche d'un lieu / d'un produit | **(base)** |
| `get_bibax_pulse_activity(p_target_user_id, p_before)` | Activité d'un Bibax sur sa fiche | **(base)** |
| `get_pulse_moderation_details`, `moderate_pulse_content` | Modération (voir plus bas) | Réservées à `can_moderate()` |

## Commentaires

Table `pulse_comments` : `id`, `pulse_event_id`, `user_id`, `body`, `created_at`, `deleted_at`, `moderation_status`. Chargés à la demande, au premier dépliage (le fil ne renvoie que `comments_count`), triés du plus ancien au plus récent. Écriture directe depuis le client, seulement sous une carte visible pour l'auteur et à son nom ; **aucune lecture directe**, et l'auteur ne peut ni modifier ni supprimer son commentaire par l'API (voir « Accès aux tables » plus haut). Le bouton est une pastille icône « bulle » + compteur (vert fluo dès qu'il y a un commentaire) ; « Commenter ... » est le texte d'aide du champ de saisie, une fois la zone dépliée. Pas de limite de longueur côté application.

## Modération

- **Signaler** : bouton sur les cartes et commentaires des *autres* uniquement ; fenêtre `ReportModal` à 5 motifs (contenu inapproprié, spam ou publicité, harcèlement, photo ou information personnelle sans accord, autre — commentaire obligatoire pour « autre »). Enregistré dans `entity_reports` avec `entity_type` = `pulse_event` ou `pulse_comment`.
- **Masquage automatique** : à **3 signalants distincts** en statut `pending`, la carte passe à `hidden = true, hidden_by = 'moderation'`, ou le commentaire à `moderation_status = 'removed'`. Le signalant enregistré est toujours le compte connecté.
- **Modération humaine** : `moderate_pulse_content(p_entity_type, p_entity_id, p_action)` avec `'hide'` ou `'restore'` ; rien n'est supprimé ; rétablir une carte masquée par son auteur est refusé. L'écran « Signalements » est dans la plateforme de gestion (autre dépôt), non vérifiable ici.
- **Auteur** : le modèle prévoit qu'un auteur masque sa carte (`hidden_by = 'author'`) ou supprime son commentaire (`deleted_at`), mais **aucun écran de l'app ne le permet** aujourd'hui, et la modification directe est réservée aux administrateurs depuis le 2026-10-14 : un tel écran devra passer par une fonction du serveur.

## Photos

Fonction Edge `upload-pulse-photo` : authentification obligatoire ; JPEG, PNG ou WebP, base64 ≤ 7 000 000 caractères (≈ 5 Mo) ; contrôle Google Cloud Vision SafeSearch (refus si `adult`, `violence` ou `racy` valent `VERY_LIKELY`) ; refus si la clé Vision manque ; nom choisi par le serveur (`<id auteur>/<horodatage>-<aléa>.<ext>`). Bucket public `pulse-photos` (5 Mo, JPEG / PNG / WebP). Côté client : réduction à 1600 px de côté maximum, JPEG qualité 0,82. La photo est envoyée **avant** la validation du check : un refus de photo n'enregistre rien. Affichage : pleine largeur, hauteur maximale 220 px.

## Bibax tagués

Le sélecteur ne propose que des Bibax confirmés (`get_taggable_bibax(p_ids, p_surface)` avec `'pulse'`), les personnes qui refusent les tags apparaissent grisées (badge « Tags »). Réglages de confidentialité propres à BibaPulse : `profiles.allow_pulse_tags` et `profiles.allow_profile_via_pulse_tag` (vrai par défaut), distincts de ceux des Stories ; écran Sécurité > Tags et annonces (qui porte aussi l'interrupteur des arrivées en BibaClub, voir plus haut). Quand `allow_profile_via_pulse_tag` est faux, le nom reste affiché mais n'est plus un lien vers le profil. Rendu : « avec Prénom Nom, ... ».

## Rafraîchissement

Le fil principal (`BibaPulseScreen`) se rafraîchit toutes les **10 secondes** par polling : fusion des 20 cartes les plus récentes dans la liste déjà chargée, par identifiant, sans perdre les pages plus anciennes. Pas de websocket. La fusion ne retire jamais une carte devenue masquée avant le rechargement de l'écran. Ni le fil d'une fiche, ni l'aperçu de l'accueil, ni les commentaires ouverts ne se rafraîchissent seuls.

## Affichage — carte d'activité (`PulseCard`)

- **Ligne 1** : Prénom + Nom de l'auteur. C'est le **rond de profil** (avatar) qui est cliquable vers le profil, pas le nom. Le nom suit la règle `prénom + nom` de `pulse_display_name`, sans tenir compte des réglages `share_*`.
- **Ligne 2** : action (Découverte / Check / Ajout) @ nom de l'objet en vert fluo, cliquable vers sa fiche pour un produit ou un lieu ; puis « — nom du lieu » du check (libellés spéciaux @Home et @Event, cliquable pour un vrai lieu). Carte `club_joined` : « A rejoint le BibaClub » + nom du club (en vert fluo, tiré de la carte elle-même), cliquable vers la fiche du club ; Bix et commentaires comme les autres cartes, ni « J'arrive ! » ni Cheers.
- **Haut à droite** : « À l'instant » (< 5 s), puis « Il y a X sec. / min. / h / j ».
- Photo, commentaire, note et personnes taguées s'affichent sous la ligne 2. Une publication libre y ajoute ses pastilles de tags sous le texte, et sa ligne 2 se réduit à « Publication » (pas d'objet).
- **Signalement** : icône discrète, sur les cartes des autres.

## Fil de fiche (`EntityPulseSection`)

Onglet « BibaPulse » sur les fiches **Produit**, **Lieu** et **Producteur** — pas sur la fiche **Marque**. Liste déroulante « Tout le monde » / « Mes Bibax ». Mêmes `PulseCard` que le fil. Règles de `get_entity_pulse` : comptes connectés seulement ; types `drink_checked`, `venue_visit` et `product_discovered` (jamais `database_contribution` ni `club_joined`), **plus les publications libres (`post`) qui taguent la fiche** (un tag de même sorte et de même identifiant) ; produit = cartes sur ce produit ; lieu = cartes dont l'objet **ou** le `venue_id` est ce lieu ; producteur = cartes sur les produits dont `producer_ids` contient ce producteur ; 20 résultats par page (50 au maximum par appel), bouton « Voir plus » ; `scope = 'bibax'` = Bibax acceptés uniquement, hors soi ; `scope = 'all'` = soi + public + `relations` des Bibax acceptés. Les pastilles des publications libres ouvrent la fiche visée quand l'écran la connaît : fiche Produit = lieu, marque, producteur ; fiche Lieu = produit, producteur ; fiche Producteur = produit, lieu, marque.

## Accès et aperçu

- Onglet « BibaPulse » de la barre du bas (toujours présent), mais **la barre est cachée sur l'écran BibaPulse lui-même** ; après un check publié depuis l'accueil, retour sur le Pulse avec une confirmation.
- **Aperçu sur l'accueil** : les 3 dernières cartes en version réduite, sans réactions (une carte `club_joined` y garde le nom du club cliquable ; une publication libre y tient sur une ligne, « Publication — début du texte »), masqué si le drapeau `nav_bibapulse_visible` vaut faux. Ce drapeau n'agit pas sur la barre du bas.
- Onglet « Pulse » dans l'écran d'un salon : fil construit localement à partir de l'état du salon, pas à partir de `pulse_events`.
- Cloche « Suivre sur Pulse » : sur la fiche d'un Bibax, d'un lieu et d'un produit. L'état initial de la cloche d'un Bibax est toujours « éteint » à l'ouverture de sa fiche (la propriété n'est jamais chargée). Pour un produit, aucun script livré ne montre que son suivi alimente le fil principal.

## Notifications in-app

Types `pulse_bix` (« a Bixé votre publication »), `pulse_comment` (« a commenté votre publication ») et `pulse_sante` (« a dit Cheers à votre publication »). Toucher la notification ouvre la carte dans BibaPulse (jusqu'à 10 pages supplémentaires chargées pour la retrouver), la surligne et déplie les commentaires pour `pulse_comment`. Aucune notification pour « J'arrive » ni pour un Bibax tagué dans une carte. Les déclencheurs qui créent ces notifications ne sont pas dans les scripts livrés **(base)**. Aucun appel de notification push n'est lié à Pulse côté client.

## Intégration avec Stories

Une Story partagée d'un salon vers BibaPulse n'apparaît **pas** dans le fil de cartes : elle apparaît dans la **barre de Stories de l'accueil** (via `get_pulse_stories`), avec la mention « via BibaRoom » dans la visionneuse. Voir `STORIES.md`.

## Connu comme incomplet / non construit

- Aucun écran pour qu'un auteur masque ou supprime sa propre carte de check, ni son commentaire (et la modification directe lui est fermée : il faudra une fonction du serveur). Seule la publication libre peut être supprimée par son auteur. Une notification reçue pour une publication supprimée ne mène plus à rien.
- Pas de carte Pulse pour les Stories, la création ou l'arrivée dans un BibaRoom, ni les « likes » de produit. Pour les BibaClub : pas de carte à la création d'un club, ni pour un club privé ; pas de rattrapage des arrivées d'avant la mise en place de la carte ; couper l'interrupteur n'efface pas les cartes déjà publiées. Si un écran de modification de la visibilité d'un club est un jour ajouté, il devra supprimer les cartes `club_joined` du club passé en privé (le contrôle du script les signale).
- Marques, producteurs et objets `brewery` d'une carte de check : pas cliquables, `brewery` non résolu ; pas d'onglet BibaPulse sur la fiche Marque. (Les pastilles de tags d'une publication libre, elles, mènent aux fiches Marque et Producteur.)
- Pas de rafraîchissement automatique du Pulse de fiche, de l'aperçu d'accueil, des commentaires et des réacteurs ouverts.
- Pas de limite de longueur côté application sur les commentaires.
- `private` accepté par le serveur mais non proposé ; `toggleFollow` (suivi d'un Bibax à sens unique) sans appelant.
- Publication libre : pas de modification d'une publication après coup (elle peut seulement être supprimée) ; pas de notification aux Bibax tagués ; une Story partagée ne garde qu'une fiche par sorte et un Bibax ; texte des notifications d'une publication non relu.
- Non vérifiable faute de scripts **(base)** : création des tables Pulse (les règles d'accès en lecture et en écriture, `toggle_pulse_sante` et les fonctions de compteurs ont été relues dans la base le 2026-10-14, scripts non livrés), `toggle_notify_pulse`, `get_bibax_pulse_activity`, `can_moderate`, création des notifications `pulse_*`.
