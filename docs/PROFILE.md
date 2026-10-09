# PROFIL — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-09. Vérifié contre le code de l'app (`src/`) et les scripts SQL livrés. La mention **(base)** signale ce qui ne se lit que dans Supabase : aucun script livré ne le contient, donc non revérifié.

---

## Principe général

Le profil regroupe l'identité de l'utilisateur, ses préférences de confidentialité et l'accès aux réglages, à la déconnexion et à la suppression de compte. Il n'y a pas de nom d'utilisateur distinct (voir `BIBAMUS_CONTEXT.md`).

**Où est le profil réel.** `MyProfileScreen` (écran « Mes infos ») existe toujours dans le code mais **plus aucun bouton n'y mène** : `ProfileHubScreen` reçoit bien le paramètre `goToMyInfo`, sans jamais l'appeler. Le profil qu'on utilise passe par :

`Profil` (`ProfileHubScreen`) → icône **Paramètres** → `SettingsScreen` → ligne **Compte** → `AccountScreen` → sous-écrans (`FieldEditScreen`, `GenderEditScreen`, `LocationEditScreen`, `EmailViewScreen`, `PhoneEditScreen`, `SocialLinkEditScreen`, `PhotoEditScreen`) ; la visibilité est dans `PublicProfileScreen` (Sécurité).

`ProfileHubScreen` est une grille de raccourcis : Mes BibaClub, Mes Statistiques, Mes Produits, Mes Favoris, Mon Historique, Mes Photos, BibaCare (grisé, « Bientôt »), puis l'icône Paramètres.

## Champs du profil (table `profiles`)

Colonnes lues et écrites par l'app (`loadMyProfile` / `updateMyProfile`) :

- **Identité** : `name` (prénom), `last_name`, `nickname` (surnom, vert fluo italique dans `BibaxName` — voir `BIBAX.md`), `gender` / `gender_custom`, `bio` (texte libre, **40 caractères au maximum**), `birth_date`, `avatar_url`, `bibro_code`, `created_at`, `role`. Prénom, nom et surnom prennent automatiquement une majuscule initiale.
- **Contact** : `phone` (indicatif libre) ; l'**e-mail est en lecture seule** (« il ne peut pas être modifié ici pour l'instant »).
- **Localisation** : `country`, `city` (commune), `locality` (ville / village) — voir `BIBAX.md` : suggestions mais texte libre, `locality` sans éditeur ; `latitude` / `longitude` ne sont **pas** écrites par le client (voir `GEOLOCATION.md`).
- **Liens sociaux** : 10 réseaux — Facebook, Instagram, TikTok, Snapchat, WhatsApp, X, Threads, LinkedIn, Pinterest, Twitch.
- **Consentements** : `consent_personalized_suggestions`, `consent_usage_data`, `consent_partner_comms`, `consent_surveys`, `consent_location` (ce dernier ne conditionne que l'avertissement d'âge en voyage).
- **Notifications** : `notif_enabled`, `notif_mentions`, `notif_comments`, `notif_new_bibax`, `notif_messages`, `notif_invitations`, `notif_bibax_activity`, `notif_news`, `notif_partners`, `notif_email_summary` (+ `_frequency`, `_address`). Seuls « Notifications push » (permission navigateur + jeton FCM) et « Messages » sont réellement branchés ; les autres lignes sont grisées « Bientôt ». La colonne `notification_prefs` (jsonb) concerne uniquement les **administrateurs** (cloche de la plateforme de gestion) : l'app ne l'utilise pas.
- **Préférences** : `pref_distance_unit`, `pref_temperature_unit`, `pref_volume_unit`, `pref_weight_unit`, `pref_energy_unit` (kcal / Cal — la seule réellement appliquée), `pref_time_format_24h`, `pref_venue_sort`, `pref_autoplay_previews`, `pref_vibrations`, `pref_confirm_checkin`, `salon_display_mode` (`firstName` ou `nickname` : affichage dans les salons, l'initiale du nom s'ajoute en cas de doublon).
- **Stories** : `story_view_duration_seconds`, `story_default_*` — lues et enregistrées mais **non appliquées** (voir `STORIES.md`).
- **Compte** : `active`, `blocked_reason`, `blocked_until` (lues, jamais utilisées par l'app utilisateur).
- **BibaZERO / WaterAlert en BibaSolo** : `biba_zero_active`, `biba_zero_tolerance`, `biba_zero_joker_used`, `biba_zero_pin`, `water_alert_solo`.
- **Réglages de tags** : `allow_story_tags`, `allow_profile_via_tag`, `allow_pulse_tags`, `allow_profile_via_pulse_tag` (vrai par défaut — voir `BIBAX.md`).
- Côté serveur seulement : `display_name_field` (règle d'affichage du nom dans les cartes : `fullName`, `firstNameInitial` ou `nickname`), ni lu ni écrit par l'app.

## Photo de profil

Envoi par la fonction Edge `moderate-and-upload-photo` (bucket `bibax-avatars`, vérification de contenu Google Cloud Vision), recadrage carré dans `PhotoEditScreen`. La même fonction sert aux photos de Stories, de clubs et de produits. Une bague rose entoure l'avatar quand l'utilisateur a une Story active. Source de la fonction et configuration du bucket : **(base)**.

## Préférences de partage (`share_*`)

Chaque information du profil a son interrupteur, qui décide si elle est visible par les Bibax. **24 colonnes**, toutes lues et écrites par l'app.

| Groupe | Colonnes | Où se règle |
|---|---|---|
| Identité | `share_prenom`, `share_nom`, `share_surnom`, `share_email`, `share_birth_date`, `share_age`, `share_bio` | `PublicProfileScreen` pour `share_surnom`, `share_birth_date`, `share_age`, `share_bio` ; **aucun interrupteur** pour `share_prenom`, `share_nom`, `share_email` dans l'interface actuelle |
| Localisation | `share_country`, `share_city` | `PublicProfileScreen` |
| Réseaux (10) | `share_facebook`, `share_instagram`, `share_tiktok`, `share_snapchat`, `share_whatsapp`, `share_x`, `share_threads`, `share_linkedin`, `share_pinterest`, `share_twitch` | `PublicProfileScreen`, un interrupteur par réseau |
| Statistiques (5) | `share_stats_overview`, `share_stats_records`, `share_stats_drinks`, `share_stats_venues`, `share_stats_social` | Sécurité > Mes statistiques (`MyStatsPrivacyScreen`) ; vrai par défaut |

Colonne liée : `birth_date_share_precision` (`full` ou `dayMonth`) — « Date complète » / « Jour et mois seulement » ; avec `dayMonth`, la date reçue est de la forme `--MM-DD`, l'âge n'est pas calculé et le masquage de l'année se fait côté serveur **(base)**. `share_age` : l'âge est calculé côté client à partir de la date, et masqué si `share_age` est faux.

**Effets côté serveur lisibles dans les scripts livrés** : `share_prenom`, `share_nom` et `share_surnom` (recherche par nom et nom affiché dans BibaPulse), `share_country` et `share_city` (recherche par nom : pays et ville mis à `null` si faux). L'effet des autres colonnes (`share_email`, `share_birth_date`, `share_bio`, les 10 réseaux, les 5 statistiques) se joue dans des fonctions dont le corps n'est pas livré **(base)**.

**Règle fixe, qui n'est pas un réglage** : les statistiques financières et sur les calories ne sont jamais visibles par les autres.

## Suppression de compte

Accessible uniquement depuis `AccountScreen` (ligne « Supprimer mon compte ») — ni `SettingsScreen` ni `MyProfileScreen` ne l'exposent. `DeleteAccountScreen` explique les conséquences (profil, e-mail et code supprimés ; établissements, produits et marques ajoutés restent visibles mais dissociés ; historique de contributions et signalements conservé de façon anonyme), demande de cocher une confirmation puis de saisir le mot de passe, appelle la fonction Edge `delete-my-account`, puis vide la session locale. Une page publique `/delete-account` existe aussi. La source de la fonction Edge : **(base)**. « Désactiver mon compte » : écran qui annonce que la fonction n'existe pas encore.

## Statut administrateur

Il est **automatique**, déduit du rôle du compte (`role` = `admin` ou `super_admin`). L'écran `AdminUnlockScreen` est purement informatif (« il n'y a plus de passphrase à saisir »). Il n'y a plus de déblocage par saisie.

## Autres écrans liés

- **Sécurité** (`SecurityScreen`) : mot de passe, statistiques partagées, tags (`StoryTagsPrivacyScreen`, par surface BibaPulse / Stories), personnes bloquées, permissions (dont la localisation), export de ses données (profil seul, en JSON ; l'historique complet est annoncé pour plus tard).
- **Préférences** (`PreferencesScreen`) : unités, tri des lieux, confirmation de check-in, réglages des Stories.
- **Apparence** : deux lignes grisées (couleur d'accent, icône de l'app), sans effet.
- **Mes photos** (`MyPhotosScreen`) : les photos de Stories, même expirées, et leur suppression.
- **Aperçu public d'un Bibax** : `BibaxProfilePreviewScreen`.

## Mes Statistiques (`MyStatsScreen`)

Reconstruites sur la consommation réelle (vue `consumption_events` : salons, BibaSolo, checks de produit, visites de lieu — voir `DATABASE.md`), avec un sélecteur de période : Toujours, Cette semaine, Ce mois, Ce trimestre, Ces 6 derniers mois, Cette année, chacune comparée à la période précédente. Six onglets :

- **Aperçu** : « Mon Profil » comportemental (Aventurier, Social, Habitué, Explorateur, Dégustateur, Curieux, Découvreur, Fêtard, Local), sorties / boissons / calories, produits et lieux différents, salons partagés, Bibax rencontrés, dépenses moyennes, évolution par rapport à la période précédente, habitudes (jour, heure, boissons par sortie, durée), suivi des jours sans alcool, accès à **Wrapped** (« Ton année Bibamus »).
- **Records** : lieu le plus visité, Bibax avec qui on a bu le plus, plus grosse dépense, plus de boissons / de produits / de lieux en une sortie, sortie la plus longue, mois le plus actif, plus longue série, boisson la plus calorique…
- **Boissons** : produits préférés, répartition par catégorie, style de bière préféré, marques et producteurs les plus consommés, boissons les plus caloriques, nouveaux produits, prix moyen, boisson la plus chère.
- **Lieux** : « Ton QG », lieux découverts, villes et pays visités, dépense moyenne par lieu, classement.
- **Dépenses** : argent dépensé (euros et jetons séparément), plus grosse dépense, dépense moyenne par boisson, pourboires, évolution sur 6 mois, produits les plus coûteux.
- **Social** : compagnon de sortie n°1, Bibax rencontrés, taille moyenne des sorties, classement par Bibax.

## Connu comme incomplet / non construit

- `MyProfileScreen` : écran orphelin, à retirer ou à rebrancher.
- Pas d'éditeur pour `locality` ; pas d'interrupteur pour `share_prenom`, `share_nom`, `share_email` ; pas de changement d'e-mail ; désactivation du compte non disponible.
- Pas d'écran d'archives des Stories : `get_my_stories` sert uniquement à savoir si une Story est active (bague de l'avatar). Les photos expirées se retrouvent dans Mes photos.
- Apparence, la plupart des notifications et « Appareils connectés » sont des écrans « Bientôt ».
- Préférences d'unités (distance, température, volume, poids, format d'heure) enregistrées mais non appliquées ; réglages de Stories non branchés.
- Code mort dans `MyStatsScreen` : `venueTypeRanking`, `longestVenue` chargés mais non affichés.
- Non vérifiable faute de scripts **(base)** : effets serveur de plusieurs `share_*`, valeurs par défaut réelles, configuration du bucket `bibax-avatars`, contenu des fonctions Edge `moderate-and-upload-photo` et `delete-my-account` (ce qu'elle supprime exactement).
