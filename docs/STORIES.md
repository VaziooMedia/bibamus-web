# STORIES — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-09. Vérifié contre le code de l'app (`src/`) et les scripts SQL livrés. La mention **(base)** signale ce qui ne se lit que dans Supabase : aucun script livré ne le contient (c'est le cas de la table `stories`, de `story_bix` et de la plupart des fonctions de lecture), donc non revérifié.

---

## Principe structurant

Séparer strictement deux notions :

- **Contexte** — où la Story a été créée. Contextes produits par le code : `global` (depuis l'accueil), `room` (depuis un salon) et `official` (Stories officielles Bibamus). `arena` n'existe que dans des réglages de préférences : **aucun code ne crée de Story `arena`**.
- **Audience** — qui peut la voir, indépendamment du contexte.

Une Story créée dans un BibaRoom n'est ni automatiquement privée ni publique : à la publication, l'auteur choisit « Ce salon uniquement » ou « Ce salon + BibaPulse ». Une Story de salon partagée dans BibaPulse n'est pas dupliquée.

## Architecture technique

### Table `stories` **(base)**

Colonnes écrites par l'app : `author_id`, `context_type`, `context_id` (code du salon pour `room`, `null` pour `global`), `media_type` (toujours `image`), `media_url`, `caption`, `shared_to_pulse` (toujours faux pour `global`), `pulse_visibility` (l'app envoie **toujours** `relations`), `location_name`, plus les colonnes de tags ci-dessous. Lues : `id`, `created_at`, `expires_at` (24 h, valeur par défaut côté base).

- `location_name` : nom du lieu lié au salon, **jamais saisi à la main**, renseigné seulement pour une Story de salon partagée dans BibaPulse avec la case « Indiquer le lieu » cochée (cochée par défaut) ; toujours `null` pour une Story globale.
- La colonne `status` n'est pas utilisée : **la suppression par l'auteur est un `DELETE` physique**.
- Colonnes de tags (scripts `bibamus-schema-stories-tags.sql`, `bibamus-schema-bibax-tags-privacy.sql`) : `tag_positions` (jsonb), `tagged_venue_id`, `tagged_drink_id`, `tagged_brand_id`, `tagged_producer_id`, `tagged_bibax_code`.

### Accès aux données

- Écriture directe depuis le client : **insert** et **delete** uniquement. Il n'y a aucun `update` : le partage / retrait de BibaPulse passe par une fonction.
- **Aucune lecture directe** de la table : tout passe par des fonctions (la règle d'accès de la table bloque la lecture directe). Règles d'accès de la table : **(base)**.

### Fonctions (appels réels)

| Fonction | Rôle | Script livré |
|---|---|---|
| `get_room_stories(p_salon_code)` | Stories actives d'un salon | non |
| `get_pulse_stories()` | Stories de l'accueil : les `global` des Bibax confirmés + les `room` partagées dans BibaPulse | non |
| `set_story_pulse_sharing(p_story_id, p_shared)` | Partager / retirer de BibaPulse | non |
| `get_my_stories()` | Stories de l'utilisateur (avec expiration) | non |
| `get_story_by_id(p_id)` | Ouvrir une Story précise depuis une notification de tag, y compris expirée | oui |
| `get_story_tags(p_ids)` | Tags d'une liste de Stories | oui |
| `get_story_tagged_bibax(p_codes)` | Noms et accès profil des Bibax tagués | oui (`bibamus-sql-tags-3-…`) |

`get_story_by_id` ne renvoie pas le compteur de Bix : une Story ouverte depuis une notification affiche 0.

### Réactions

Table `story_bix`, une ligne par réaction (`story_id`, `user_id`) en écriture directe ; le compteur et l'état « j'ai Bixé » viennent des fonctions de lecture. **L'interface n'affiche qu'un compteur**, pas la liste de qui a Bixé. Le cœur est rose `#FF2C8F`.

## Stockage média

L'app n'écrit pas directement dans le bucket : l'image part en base64 vers la fonction Edge `moderate-and-upload-photo` (bucket `stories`, vérification de contenu), nommée `<id auteur>-<horodatage>.jpg`. Images JPEG uniquement ; l'éditeur d'image mobile (`MobileImageEditor`) sort du **720 × 1280, JPEG qualité 0,9**, après recadrage, couleur de fond, appareil photo ou galerie. Les photos de Stories restent consultables, même expirées, dans « Mes photos ». Configuration du bucket et source de la fonction Edge : **(base)**.

## Création (`StoryCreateScreen`)

| Contexte | Comportement |
|---|---|
| **Home / global** | Aucun choix d'audience : la Story est visible par les Bibax confirmés via `get_pulse_stories`. Bouton « + » sur l'avatar de l'utilisateur, en bas à gauche. |
| **BibaRoom** | Choix « Ce salon uniquement » (par défaut) ou « Ce salon + BibaPulse » ; case « Indiquer le lieu » (visible sur BibaPulse en 📍). Bouton « + » en bas à droite du rond du salon. |

Le drapeau `stories_enabled` masque les boutons « + » de l'accueil **et** du salon.

### Tags

Une Story peut porter une légende et des **tags** de cinq types : Bibax (`@`), lieu (`@`), produit (`#`), marque (`#`), producteur (`#`). Chaque tag est une pastille (`MobileTagPill`) **positionnée librement** dans le cadre 9:16 (position, échelle, rotation, couleur, inversion — `tag_positions`), la légende étant elle-même un tag déplaçable.

- Taguer un Bibax envoie une notification `story_tag` ; elle ouvre directement la Story, même après les 24 h.
- Confidentialité : `profiles.allow_story_tags` (qui peut être tagué) et `profiles.allow_profile_via_tag` (le tag mène-t-il à son profil), vrai par défaut ; un Bibax qui refuse les tags apparaît grisé dans le sélecteur.

## Visionneuse (`StoryViewer`)

- Plein écran ; image en `object-fit: cover`, bascule en `contain` quand la proportion de la photo diffère de plus de 0,35 de celle de l'écran.
- En-tête (auteur, mention « via BibaRoom » pour une Story de salon, 📍 lieu) et barre de Bix en superposition semi-transparente.
- Défilement automatique de **5 secondes** par Story, codé en dur : la préférence « Durée des Stories » existe mais n'est lue nulle part. Navigation tactile : moitié gauche = précédent, moitié droite = suivant.
- Menu « ••• » (auteur uniquement) : « Supprimer », et — **pour les Stories de salon seulement** — « Partager dans BibaPulse » / « Retirer de BibaPulse ».
- Toucher un tag (fiche lieu, produit, profil) mémorise la Story et l'index, et y revient au retour.

## Affichage

- **Barre de Stories** (`StoriesBar`, **accueil seulement**) : un cercle rose `#FF2C8F` par auteur, groupé par auteur. Le rond des **Stories officielles** « Bibamus » (cercle **cyan** `#00C8FF`) passe en premier quand il y en a ; vient ensuite le rond de l'utilisateur. L'ordre des autres cercles suit la première Story de chaque auteur. Les Stories d'un auteur sont des plus anciennes aux plus récentes (garanti pour les officielles ; pour les autres, l'ordre reçu des fonctions n'est pas vérifiable).
- **Story commune de salon** : il n'y a pas un cercle par contributeur — toutes les Stories du salon alimentent **une Story collective unique**, accessible via le rond-profil de l'événement (l'avatar du lieu lié), rechargée toutes les 15 secondes. Chaque Story affiche son propre auteur en défilant.
- **Anneau de Story** autour de la photo de profil (profil, compte, fiche d'un Bibax) quand l'utilisateur a une Story active.
- Les Stories d'un Bibax sont aussi visibles depuis sa fiche.

## Stories officielles (`official_stories`)

Outil publicitaire d'administrateur : auteur fixe « Bibamus », moins de 24 h, pas de réaction. Colonnes : `location_text` (lieu en texte libre), mêmes colonnes de tags que `stories`, `tag_positions`. Écriture et suppression réservées aux rôles `admin` et `super_admin` (scripts `bibamus-schema-official-stories-*`) ; le formulaire de création est dans la plateforme de gestion (autre dépôt). Règle de lecture : **(base)**.

## Connu comme incomplet / non construit

- Vidéo : `media_type` toujours `image`.
- Archives personnelles : `get_my_stories` ne sert qu'à savoir si une Story est active ; aucun écran n'en liste les anciennes (les *photos* expirées se retrouvent dans Mes photos).
- Contexte `arena` : aucun code de création.
- Préférences Stories non branchées : durée d'affichage et les réglages par défaut (lieu, public) pour salon et arène ; les cases de création s'initialisent en dur.
- Compteur de Bix absent à l'ouverture depuis une notification.
- Contrôle de visibilité de `get_story_by_id` : une revue de sécurité est en cours (voir `SECURITY.md`).
- Souvenirs / récapitulatifs automatiques de soirée : non construits.
- Non vérifiable faute de scripts **(base)** : création et règles d'accès de `stories` et `story_bix`, corps de `get_room_stories`, `get_pulse_stories`, `get_my_stories`, `set_story_pulse_sharing`, configuration du bucket `stories`, fonction Edge `moderate-and-upload-photo`, table `media_assets`.
