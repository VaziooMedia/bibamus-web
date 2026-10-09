# BIBAX — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-09. Vérifié contre le code de l'app (`src/`) et les scripts SQL livrés. La mention **(base)** signale ce qui ne se lit que dans Supabase : aucun script livré ne le contient (c'est le cas de toutes les fonctions de relation Bibax), donc non revérifié.

---

## Principe général

« Bibax » désigne à la fois **le compte utilisateur** et **la relation mutuelle** entre deux comptes — façon Facebook (demande + confirmation), **pas** un système de suivi à sens unique. Chaque utilisateur possède un **code Bibax** personnel (colonne `profiles.bibro_code`), utilisé pour s'ajouter mutuellement. Dans le code, le mot historique « Bibro » est resté (`myBibroCode`, `BibrosScreens.jsx`, `AddBibroScreen`) : l'interface, elle, dit « Bibax ».

Il n'y a pas de nom d'utilisateur distinct (décision de `BIBAMUS_CONTEXT.md`).

**Trois façons d'ajouter un Bibax** (écran `AddBibroScreen`) :
1. saisir son **code** (6 caractères, lettres majuscules et chiffres) ;
2. **scanner son QR code** ;
3. le **rechercher par prénom, nom ou surnom** (`search_bibax_by_name`, 2 caractères minimum, 20 résultats au plus, comptes `role = 'user'` seulement, blocages exclus dans les deux sens, et chaque champ n'est cherchable que s'il est partagé : `share_prenom`, `share_nom`, `share_surnom`). La barre de recherche de l'accueil utilise aussi `search_bibax`.

Longueur et alphabet *générés* pour `bibro_code` : **(base)** — seule la validation de saisie du client (6 caractères) est visible.

## Architecture technique

### Table `bibax_relationships`

Colonnes visibles dans les scripts : `requester_id`, `requestee_id`, `status` (`accepted` confirmé ; l'état en attente est géré côté fonctions), `requester_notify_pulse`, `requestee_notify_pulse` (la cloche « Suivre sur Pulse » de chaque côté). Création de la table et valeurs exactes de `status` : **(base)**.

### Fonctions RPC (appels réels du client, paramètres préfixés `p_`)

| Fonction | Rôle | Remarques |
|---|---|---|
| `send_bibax_request(p_target_code)` | Envoyer une demande | Renvoie `pending`, `accepted` ou `already_bibax`. **Détection croisée** : si l'autre avait déjà envoyé sa demande, la relation est acceptée directement. |
| `respond_bibax_request(p_relationship_id, p_accept)` | Accepter / refuser | |
| `cancel_bibax_request(p_relationship_id)` | Annuler une demande envoyée | Signale `alreadyAccepted` si l'autre vient d'accepter ; l'écran d'aperçu de profil ne lit pas ce signal |
| `remove_bibax_by_code(p_target_code)` | Supprimer la relation **côté serveur** | Appelée sans attendre son résultat ; le retrait local se fait d'abord |
| `remove_bibax(...)` | Supprimer par identifiant de relation | Importée, jamais appelée |
| `get_my_bibax()` | Liste des Bibax confirmés | Identité, ville, localité, pays, date de naissance et `share_age`, bio, date d'inscription, 8 liens sociaux (Pinterest et Twitch ne sont pas remontés) |
| `get_pending_bibax_requests()` | Demandes reçues | Avec le code de l'expéditeur |
| `get_sent_bibax_requests()` | Demandes envoyées | Code et commune ; **aucune distance** n'est lue par le client |
| `get_bibax_suggestions(p_limit)` | Suggestions | Voir plus bas |
| `get_bibax_relation_status(p_other_user_id)` | `none` / `sent` / `received` / `accepted` | Utilisée par l'aperçu de profil |
| `lookup_bibro_code(p_code)` | Profil public depuis un code | `null` si introuvable ou bloqué |
| `search_bibax_by_name(p_query)`, `search_bibax(p_query)` | Recherche | Voir plus haut |
| `block_user`, `unblock_user`, `get_my_blocked_users` | Blocage | Voir plus bas |
| `toggle_notify_pulse(p_target_code)` | Cloche « Suivre sur Pulse » | |
| `toggle_follow(p_target_code)` | Suivi à sens unique | Aucun appelant dans l'app |
| `get_bibax_stats_overview / records / drinks / venues / social` | Statistiques partagées d'un Bibax | Soumises aux réglages `share_stats_*` (voir `PROFILE.md`) |
| `get_taggable_bibax(p_ids, p_surface)` | Bibax qu'on peut taguer | Voir « Tags » |

Aucune de ces fonctions n'a de script livré : leur corps **(base)** n'est pas vérifié. La seule exception est `get_bibax_suggestions` et `search_bibax_by_name` (scripts `bibamus-sql-fix-bibax-roles-*`).

### Migration automatique

Au premier chargement, chaque ancien Bibax purement local reçoit un `send_bibax_request`. Ce sont donc de **vraies demandes en attente** envoyées à l'autre personne (sauf détection croisée ou relation déjà existante), pas des relations confirmées. Un marqueur local à l'appareil évite la répétition ; un autre appareil ou un cache vidé la relance une fois, sans effet puisque la fonction est idempotente.

### Synchronisation périodique

- **Toutes les 15 secondes** dans `BibaxRequestsAndSuggestions` : détecte notamment qu'une demande envoyée a disparu (= acceptée par l'autre).
- **Toutes les 30 secondes** dans `App.jsx` (`syncBibax`, via `get_my_bibax`) : ajoute ou met à jour les Bibax dans la liste locale, sans **jamais** en retirer. Si l'autre personne retire la relation, l'entrée locale reste.

La liste locale (`bibamus-bibros`, dans le navigateur) garde aussi des champs purement locaux (alias, favori, date d'ajout) fusionnés avec les données du serveur.

## Suggestions et proximité

`get_bibax_suggestions(p_limit)` retient un candidat si **au moins un Bibax en commun** (sans limite de distance), **ou** s'il habite à **30 km ou moins** (distance arrondie à l'entier, mesurée entre les coordonnées enregistrées des profils avec PostGIS), **ou** si ses coordonnées manquent et qu'il est dans le **même pays**. Tri : le plus de Bibax en commun d'abord, puis le plus proche. Elle exclut les comptes qui ne sont pas `role = 'user'` (administrateurs et contacts Business), les Bibax déjà confirmés et toute relation en cours. Elle **ne filtre pas** les utilisateurs bloqués.

Affichage : « N Bibax en commun », sinon « à X km » (unité fixe en km).

- **Accueil** : un lot de 20 est chargé une seule fois à l'ouverture ; 3 sont affichées ; quand on en ajoute une, la suivante prend sa place sans nouvel appel au serveur. Section repliable.
- **Page Bibax** : 3 suggestions. **« Voir tout »** : jusqu'à 50, avec mémorisation de l'écran d'origine (accueil ou page Bibax) pour un retour correct.

### Géocodage du profil

Quand la ville et le pays changent, `geocodeCityForProfile` appelle la fonction Edge `geoapify-geocode` et met les coordonnées dans l'état de l'app. **Le client web n'envoie jamais ces coordonnées à la base** (`updateMyProfile` sait les écrire, mais personne ne les lui passe) : si `profiles.latitude` / `longitude` sont renseignées, c'est par un autre mécanisme **(base)**. Le commentaire du code « ne regéocode pas si des coordonnées existent » est inexact : l'effet se relance à chaque changement de ville ou de pays. Voir aussi `GEOLOCATION.md` pour le risque de non-correspondance entre le pays enregistré et la table des codes ISO.

## Affichage — `BibaxName` (composant partagé)

Trois lignes : Prénom + Nom (gras) ; surnom (vert fluo italique, sur sa ligne, s'il existe) ; commune, suivie de la localité entre parenthèses si elle existe, puis du drapeau du pays (grisé).

## Localisation du profil

- **Pays** : exigé à l'inscription.
- **Commune de résidence** : saisie avec **suggestions** (6 au plus, issues d'une liste statique par pays) mais en **texte libre** ; ni obligatoire à l'inscription, ni validée dans l'écran de modification réel. Changer de pays vide la commune.
- **Ville / Village** (`locality`) : lue, enregistrée si elle existe et affichée, mais **plus aucun écran de l'app ne permet de la saisir** (seul le panneau d'administration le fait).
- « Région » : abandonnée.

## Blocage

`block_user` n'est proposé que depuis la **fiche d'un Bibax confirmé**, après confirmation (« Ton lien Bibax sera supprimé et vous ne pourrez plus vous ajouter mutuellement »). La liste des personnes bloquées et le déblocage sont dans Sécurité. Table `blocked_users(blocker_id, blocked_id)`. Effets visibles dans les scripts livrés : exclusion de la recherche par nom, de la liste des personnes taguables, des tags affichés, du fil BibaPulse et des commentaires ; `lookup_bibro_code` renvoie « introuvable ou bloqué ». Effet exact de `block_user` sur `bibax_relationships` : **(base)**.

## Tags

Un Bibax peut être tagué dans une carte BibaPulse et dans une Story, sous réserve de ses réglages de confidentialité (`allow_pulse_tags`, `allow_story_tags`, `allow_profile_via_pulse_tag`, `allow_profile_via_tag`, vrai par défaut — écran Sécurité > Tags). Seuls des Bibax confirmés sont proposés, grisés s'ils refusent les tags ; le blocage est pris en compte dans les deux sens. Détails : `BIBAPULSE.md` et `STORIES.md`.

## Écrans

- **`BibaxRequestsAndSuggestions`** : demandes reçues, demandes envoyées (annulables), suggestions.
- **`BibroDetailScreen`** : fiche d'un Bibax — cloche « Suivre sur Pulse », menu d'actions, blocage, retrait.
- **`BibroStatsScreen`** : statistiques partagées d'un Bibax.
- **`BibaxProfilePreviewScreen`** : aperçu public depuis un code (tag, QR) avec une seule action selon la relation (« Ajouter en Bibax » / « Demande envoyée » / « Confirmer la demande » / « Bibax »).
- **`BibaxAllSuggestionsScreen`**, **`AddBibroScreen`**, **`MyPhotosScreen`** (photos d'un Bibax, en lecture seule).
- **Notifications** : types `bibax_request` et `bibax_accepted`, avec réponse directe depuis la notification.

## Connu comme incomplet / non construit

- `toggle_follow` (suivi à sens unique d'un Bibax) : fonction présente, aucune interface. La cloche « Suivre sur Pulse » (`toggle_notify_pulse`) est son remplaçant, mais son état n'est **jamais chargé** : elle s'affiche toujours éteinte à l'ouverture de la fiche.
- `remove_bibax` (par identifiant) importée, jamais appelée ; le retrait par code n'attend pas son résultat — en cas d'échec, la synchronisation de 30 s ré-ajoute l'entrée.
- Pinterest et Twitch des Bibax confirmés ne sont pas synchronisés.
- Le blocage n'est possible que depuis la fiche d'un Bibax confirmé (pas depuis un profil public, une demande reçue ou une suggestion), et les suggestions ne filtrent pas les bloqués.
- Aucun contrôle côté serveur du réglage `allow_story_tags` n'a été retrouvé à l'insertion d'une Story qui tague un Bibax (le tri ne se fait que dans le sélecteur). Pour BibaPulse, le contrôle existe dans la fonction Edge.
- Éditeur de `locality` absent de l'interface réelle.
- Non vérifiable faute de scripts **(base)** : corps de toutes les fonctions de relation, valeurs de `status`, colonne d'horodatage, génération du code Bibax, déclencheur de création de compte (valeur enregistrée dans `profiles.country`), effet exact de `block_user`.
