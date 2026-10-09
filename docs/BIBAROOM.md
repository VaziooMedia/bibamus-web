# BIBAROOM — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-09. Vérifié contre le code de l'app (`src/`) et les scripts SQL / fonctions Edge livrés. La mention **(base)** signale ce qui ne se lit que dans Supabase : aucun script livré ne le contient (c'est le cas de la table `salons`, de ses règles d'accès et de la plupart des fonctions de salon), donc non revérifié.

---

## Principe général

Un BibaRoom est un salon partagé qui représente une sortie ou une soirée. Il se crée depuis **BibaGo** (`SessionHubScreen`, qui propose aussi BibaSolo et, grisé « Soon », BibArena) et se rejoint avec un code. Le code du salon fait office de clé d'accès : le client charge un salon avec son seul code, sans vérification d'appartenance. Les Stories de salon suivent le même principe.

Écran d'un salon (`SalonTabsScreen`) : **trois onglets** — Biba|Room (le tableau de bord, `EventDashboardScreen`), Biba|Pulse (fil du salon, construit à partir de l'état du salon, pas de `pulse_events`) et Biba|Ping (chat du salon).

## Modes

Un salon est dans **un** des quatre modes ; les noms « ORBIS », « ARCA », « PARTES » et « LIBER » sont les noms **affichés** à l'utilisateur. Les identifiants internes sont ceux de `event.mode` :

| Nom affiché | Identifiant interne | Rôle |
|---|---|---|
| ORBIS | `tournees` | Chacun paie un tour à tour de rôle |
| ARCA | `cagnotte` | Pot commun |
| PARTES | `addition` | Répartition de la note |
| LIBER | `openbar` | Consommation libre, sans calcul de tournée (prix à 0) |

### BibaZERO

**BibaZERO n'est pas un mode** : c'est un **statut par participant**, qui se combine avec n'importe lequel des quatre modes (champ `event.bibaBob[code]` de l'état du salon : nom, tolérance `zero` ou `joker`, code PIN à 4 chiffres, joker utilisé, date d'activation). Il s'adresse à toute personne qui ne boit pas, quelle qu'en soit la raison. Dans le code, l'ancien nom « BibaBob » subsiste (`activateBibaBob`, `BibaBobModal`, champ `bibaBob`). Deux tolérances : « zéro » ou « avec 1 joker » (usage unique). Les boissons alcoolisées (> 0,5 % vol.) sont filtrées de la composition d'une tournée pour ce participant. Un rappel d'eau (**WaterAlert**) peut être réglé par salon. BibaZERO existe aussi **hors salon**, dans BibaSolo, enregistré sur le profil (voir `PROFILE.md`).

## Identifiants

- **Code de salon : 6 caractères**, alphabet restreint de 31 symboles (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`, sans 0, 1, I, L, O). La saisie (`JoinSalonScreen`) filtre l'alphabet et limite à 6. Des commentaires périmés dans le code parlent encore de 4 caractères.
- **Code participant = code Bibax** (`myBibroCode`) : 6 caractères, lettres et chiffres, validés côté client ; la génération est dans la base **(base)**.
- Unicité du code de salon : testée (8 essais) par la création depuis le tableau de bord de salon ; **non testée** par `createEvent`, la création principale depuis BibaGo.

## Stockage et synchronisation

- Une ligne par salon dans la table `salons` : `code`, `data` (un seul bloc JSON), `updated_at`. **Tout** l'état du salon — participants, tournées, playlist, BibaZERO, notices, invitations — vit dans ce JSON ; il n'y a pas de table relationnelle par participant.
- Chaque modification réécrit **tout** le JSON : en cas de modifications simultanées depuis deux appareils, la dernière arrivée l'emporte. La synchronisation temps réel écoute les `UPDATE` de la ligne.
- La liste locale des salons (`bibamus-events`) est aussi gardée dans le navigateur.
- **Multi-appareil** : `get_my_active_salons(p_bibro_code)` (appelée au chargement puis toutes les 30 secondes) retrouve les salons où l'utilisateur figure dans le JSON des participants ; elle **ajoute** les salons absents de la liste locale, sans jamais mettre à jour un salon déjà connu.
- **Accès** : l'app ne lit ni n'écrit la table `salons` directement (`src/data/salons.js`). Elle passe par des fonctions serveur **(base)** : `get_salon(code)` (lecture, y compris pour rejoindre : le code reste le « mot de passe » du salon), `save_salon(code, data)` (création et mise à jour : réservée aux participants, à une personne qui se rajoute sans retirer personne, ou au créateur d'un nouveau salon), `decline_salon_invite(code)` (retire sa propre invitation en attente) et `get_club_round_buyers(club)` (statistiques de club, membres actifs seulement). Modèle visé pour la table elle-même : lisible par ses participants et les administrateurs seulement **(base)** — voir `SECURITY.md`.

## Fonctionnement

- **Entrer dans un salon** : trois chemins — l'écran `JoinSalonScreen` (code ou **scan de QR code**), le champ de code du tableau de bord, et l'acceptation d'une **invitation** (notification envoyée à un Bibax). Deux chemins de création : `createEvent` (depuis BibaGo) et la transformation d'un événement local en salon.
- **QR code** : affiché dans le salon (`QRCodeSVG`) et scanné par la caméra (`SalonQrScannerModal`).
- **Pause** : au niveau de l'événement entier (`paused`) et individuellement par participant.
- **Quitter, Safe** : « Quitter », puis un bouton « Safe » pour dire qu'on est bien arrivé ; notices système (`joined`, `left`, `safe`, les 10 dernières) et notification push « est bien arrivé(e) » aux autres participants.
- **Tournées** : composition d'un tour (`RoundComposeScreen`), ticket récapitulatif (`RoundTicketScreen` : « offert par » un lieu ou un tiers, règlement direct ou sur la note, total comptoir, propositions de pourboire), paiements partiels, cagnotte (`PotCard`), addition partagée (`SplitBillCard`), rotation du payeur.
- **Salon @Home** (`event.isHome`, créé en mode LIBER sans lieu) : chez soi, pas de carte à télécharger ni de tournée. Le bouton « + Nouvelle tournée » devient **« Je me sers »** (`HomeServeSheet`) : on cherche un produit dans **BibAtlas**, on choisit son volume (facultatif, pré-rempli avec le volume habituel du produit) et le verre est ajouté **pour soi seulement** ; « + » reprend le même verre, « − » retire le dernier. Les produits rejoignent la carte **du salon** (jamais celle d'un lieu), sans doublon par produit et volume. Chaque verre est une entrée de `event.homeDrinks` — `{ id, code, name, drinkId, timestamp }` — rangée **par code de participant**, ce qui évite que les verres des uns écrasent ceux des autres dans le bloc JSON partagé. Le salon affiche **« Qui a bu quoi »** (par participant, du plus servi au moins servi) à la place de la liste des tournées, qui reste visible seulement dans un ancien salon @Home qui en contient déjà. « Ajouter une boisson hors tournée » est masqué, ainsi que tout ce qui n'a plus de sens sans carte ni tournée : le bouton **« Produits »** (tout passe par BibAtlas), le bloc **« Suggestion pour la prochaine tournée »**, et l'argent — la colonne « Dépensé(s) » et le détail « Sur la note / Déjà payé / Total » de « Mes statistiques » et de « Statistiques générales » (dans un salon @Home qui contenait déjà des tournées, la ligne « Tournées offertes · Bibax » reste). Les « VERRES » de « Statistiques générales » comptent aussi les verres pris en se servant. Un participant en BibaZERO ne se voit proposer que des boissons sans alcool (le joker n'est pas géré ici). **WaterAlert** : le libellé « Toutes les X tournées » est conservé — à la maison il se lit « tous les X verres personnels » : la fenêtre de rappel s'affiche quand **moi** je me suis servi X verres depuis le dernier rappel (chacun compte les siens, rien n'est partagé) ; le mode « temps » est inchangé. La **notification** envoyée par le serveur (app fermée) reste liée aux vraies tournées : elle ne se déclenche donc pas à la maison. Chaque verre est aussi enregistré en statistiques (voir « Commandes enregistrées en base »).
- **Devises** : `euro` ou `jeton` (avec `jetonUnitValue`).
- **Suivi calorique** : calculé sur le volume ; un bouton œil masque l'affichage mais n'est **pas mémorisé**. Il n'y a pas de réglage à la création du salon. L'unité (kcal / Cal) est un réglage de profil.
- **Messagerie** : une conversation par salon (`ensure_salon_conversation`), créée dès l'ouverture du salon. Dans la liste BibaPing, un salon n'apparaît qu'une fois qu'un message (texte ou photo) y a été envoyé : le filtre porte sur le contenu du dernier message (`lastMessageBody` / `lastMessageHasMedia`) et non sur sa date, que la base renseigne déjà à la création **(base)**. Les groupes et les tête-à-tête restent listés même vides.
- **Tok** : action rapide entre participants, activable par salon (`salon_tok_settings`).
- **Clubs** : un salon peut être rattaché à un BibaClub (`biba_club_salons`) ; les membres du club sont ajoutés aux amis connus.
- **Drink Check** : l'écran `DrinkCheckScreen` (partagé avec BibaSolo) liste les produits du répertoire que l'utilisateur a consommés dans le salon — ses verres dans les tournées (ceux qui portent **son** code : dans une tournée lancée par quelqu'un d'autre, « self » désigne cette autre personne) et ses verres hors tournée ; un produit est retrouvé par `findMenuEntryById`, car un identifiant de commande est le plus souvent composé « entrée::volume » ; le lieu est pré-réglé (@Home, @Event ou le lieu lié). Il enregistre la note et publie une carte `drink_checked` **sans** créer de `drink_checkins` (le verre est déjà compté dans `round_orders`) — voir `DATABASE.md`.
- **Historique** : `EventHistoryScreen` et `EventHistoryDetailScreen` (réouverture, suppression d'une tournée ou du salon). Les totaux affichés dans ces écrans sont aujourd'hui codés à 0.

### Commandes enregistrées en base

Chaque tournée terminée est aussi enregistrée en lignes interrogeables, qui alimentent les statistiques via la vue `consumption_events` : `record_round_orders`, `mark_round_paid`, `record_partial_payment`, `record_round_tip`, `delete_round_orders`, `delete_round_tip`, `delete_round_orders_by_event`. Les scripts livrés ne prouvent que les tables `round_orders` et `round_payments` (par la vue) ; les fonctions et la table des pourboires sont **(base)**. La suppression des pourboires par événement (`deleteRoundTipsByEvent`) n'est appelée nulle part.

Un verre « Je me sers » d'un salon @Home est enregistré de la même façon : un `record_round_orders` d'**une seule ligne** (lieu `@home`, sans prix, mon code, le vrai identifiant du produit du catalogue), avec un identifiant de tournée `home-…` **propre à chaque verre** — la fonction refuse deux fois le même identifiant, et c'est ce qui permet de retirer un verre seul avec `delete_round_orders`.

Les lignes d'une **tournée** sont construites par `roundOrderRows` (`utils.js`) : un identifiant de commande est le plus souvent **composé** « entrée::volume » (`flattenMenu`), il faut donc le résoudre avec `findMenuEntryById` — jamais avec un simple `menu.find(d => d.id === …)`, qui ne trouve rien. (Avant ce correctif, les lignes de `round_orders` partaient avec `drink_id`, prix, volume et kcal à NULL, et les verres hors tournée n'étaient pas enregistrés ; les tournées déjà enregistrées ne sont pas corrigées rétroactivement.) `drink_id` est toujours le vrai identifiant du catalogue, jamais l'id local de la carte du salon ; une entrée qui ne vient pas du répertoire n'a pas de produit à compter (NULL).

Un verre pris **hors tournée** (« Ajouter une boisson hors tournée », salons classiques) est enregistré comme un verre de tournée : un `record_round_orders` d'une seule ligne (mon code, sans prix, le vrai produit, le volume choisi, les kcal), avec un identifiant `perso-<id du verre>` **propre à chaque tap** (`personalDrinkRecord`). Le « − » retire la statistique avec `delete_round_orders` (qui ne supprime que **mes** lignes) ; retirer un verre venu d'une tournée (`roundId`) ne touche pas à la statistique de la tournée. Aucune carte BibaPulse n'est publiée : c'est le rôle du Drink Check. Sans compte Bibax ou pour une boisson qui ne vient pas du répertoire, rien n'est enregistré.

## BibaMusic — playlist collaborative du salon

C'est un **écran séparé** (`BibaMusicScreen`, ouvert depuis le tableau de bord du salon), pas une section intégrée (`BibaMusicSection` est du code mort).

- **Mode MC** (identifiants internes « DJ » : `djCode`, `isDJ`) : un seul MC à la fois ; « Devenir MC » n'est proposé que s'il n'y en a pas, « Céder le rôle » pour le MC actuel.
- **Seul le MC peut supprimer** une proposition. Un non-MC ne peut **rien** supprimer, pas même sa propre proposition (le commentaire du code décrit un comportement qui n'est pas implémenté).
- **Réorganisation par glisser-déposer**, réservée au MC (appui long de 350 ms), pour les morceaux à venir ; `manualRank` prime sur le tri par Bix.
- **Bix** par morceau (cœur + compteur) ; recherche et ajout de morceaux Spotify, ou ajout manuel titre + lien.
- **Synchronisation avec Spotify** : toutes les 4 secondes, seul le morceau **en tête** de la liste à venir est replacé juste après le morceau en cours dans la playlist Spotify (ce n'est pas une synchronisation de tout le classement). Elle utilise le jeton Spotify de la personne qui a l'écran ouvert.
- **Lecture** pilotée par le MC via la fonction Edge `spotify-playback-control` ; détection du morceau joué toutes les 3 secondes. Connexion Spotify en PKCE (`ConnectScreen`).
- La carte « en cours de lecture » a le même visuel que le reste de la liste.

## Affichage — carte de salon (Home / BibaLive)

- Le bouton a `width: 100%` explicite ; le titre revient à la ligne.
- Badge « EN COURS » / « EN PAUSE » : à cheval sur le coin supérieur droit, positionnement absolu.
- Sous le titre : si le titre est personnalisé (différent du nom du lieu lié), le nom du lieu en vert fluo avec une icône de repère ; sinon la **ville**, grisée, sans code postal.
- Flèche d'accès : positionnement absolu en bas à droite.
- Le bouton « rejoindre un salon » rapide de l'accueil (`onQuickJoinSalon`) n'est pas câblé.

## Stories de salon

Voir `STORIES.md` — **une seule Story collective par salon**, accessible via le rond-profil de l'événement (l'avatar du **lieu** lié). Le bouton « + » est en **bas à droite** du rond (sur la page Home, c'est le « + » de la Story globale qui est en bas à gauche du rond de l'utilisateur).

## Intégration BibaPulse

**Aucune carte BibaPulse n'est créée en créant, rejoignant ou en utilisant un BibaRoom** : le `venue_visit` ne vient que du check-in depuis la **fiche d'un lieu**. Depuis un salon, seul le Drink Check publie une carte `drink_checked` (avec le lieu du salon comme `venue_id`). `room_salon_code` n'est jamais renseigné. Voir `BIBAPULSE.md`.

## Connu comme incomplet / non construit

- **Modèle d'accès à la table `salons`** : appliqué dans Supabase, hors dépôt (aucun script livré dans `src/` ou `docs/`). Rejoindre par code exige un compte connecté. Les participants sont lus dans le JSON (`participants[].code`), pas dans les membres de la conversation du salon. Voir `SECURITY.md`.
- BibArena : carte « Soon », aucun écran. BibaFree : abandonné (le besoin solo est servi par BibaSolo).
- Rejoindre rapidement depuis l'accueil : non câblé. Totaux des écrans d'historique : codés à 0. Rangée « Bibax en salon » de l'accueil : toujours vide.
- Lien salon ↔ carte Pulse (`room_salon_code`) jamais renseigné.
- BibaMusic : un non-MC ne peut pas retirer ses propres morceaux.
- Code mort et commentaires périmés : `BibaMusicSection.jsx`, `DashboardParts.jsx` (« QR en texte brut »), `BibaMusicScreen.jsx` (« centralisé dans App.jsx »).
- Non vérifiable faute de scripts **(base)** : définition de `salons` et de ses règles d'accès, `get_salon`, `save_salon`, `get_my_active_salons`, `ensure_salon_conversation`, `record_round_orders` et les fonctions voisines, tables `round_tips` et `biba_club_salons`.
