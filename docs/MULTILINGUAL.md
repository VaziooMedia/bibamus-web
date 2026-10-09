# MULTILINGUE / I18N — Documentation as-built

> Documente l'état réel du code tel qu'implémenté, pas un historique de conversation. À mettre à jour quand l'implémentation change.
> Dernière mise à jour : 2026-10-09. Vérifié contre le code de l'app (`src/`) et les scripts SQL livrés. La mention **(base)** signale ce qui ne se lit que dans Supabase : aucun script livré ne le contient, donc non revérifié.
>
> **Correction importante par rapport à la version du 7 octobre.** L'ancienne version décrivait un miroir `taxonomy_terms` / `taxonomy_terms_translations` et quatre tables `*_translations` (`product_`, `brand_`, `producer_`, `establishment_`). **Ces six tables n'existent nulle part dans le code ni dans les scripts livrés** (zéro occurrence dans `src/`, dans les `.sql` et dans les fonctions Edge). Le mécanisme réellement utilisé est décrit ci-dessous. Si ces tables existent bien dans Supabase, elles ne sont lues par aucune partie du code livré.

---

## Principe général

L'app est écrite **en français uniquement** : `lang="fr"` dans `index.html`, une seule langue dans `LANGUAGES` (`constants.js`), des dates formatées en `fr-BE` en dur, aucune bibliothèque d'internationalisation dans `package.json`, aucun fichier de dictionnaire. Tous les textes d'interface sont écrits directement dans les composants ; le code le dit lui-même (`utils.js` : « tout le texte de l'interface reste en dur en français »).

La cible annoncée (anglais, néerlandais, allemand pour l'app ; français suffisant pour la plateforme de gestion) ne laisse **aucune autre trace dans le code** que les listes de langues décrites plus bas.

## Trois mécanismes réels

### 1. Taxonomies : codes + libellés français dans le code

- **Styles de bière et de cidre** : `src/data/beerCiderStyles.js`. Chaque entrée est `{ code, fr }` : un code technique stable et un libellé français. `BEER_CIDER_STYLE_GROUPS` compte 18 groupes titrés et 291 styles ; `FLAVOR_NOTE_GROUPS` 6 groupes et 87 notes ; le reste est constitué de listes plates (20 exports au total).
- **Styles de vin** : `src/data/styleTagLabels.js` (`WINE_STYLE_GROUPS`, `WINE_EFFERVESCENT_STYLE_GROUPS`) ; ce fichier regroupe aussi une copie des libellés de bière et de cidre. Il compte au total 30 groupes titrés (aucun décompte du code ne donne « 53 », chiffre de l'ancienne version).
- **Autres étiquettes** de `constants.js` (`BEER_STYLE_TAGS`, `SOFT_DRINK_TAGS`, `SPIRIT_TAGS`, `WINE_TAGS`, `VENUE_TYPE_TAGS`) : ce sont des **libellés français utilisés directement comme valeurs**, sans code technique. Ces listes ne sont donc pas prêtes pour la traduction.
- **Styles personnalisés** : la table `custom_beer_cider_styles` (script `bibamus-sql-styles-personnalises.sql`) reçoit les styles ajoutés à la main depuis la plateforme de gestion. Elle a **une seule colonne de libellé, `fr`**, et aucune table de langues. Lecture publique, écriture réservée aux cinq rôles du personnel. L'app la charge à la demande et mémorise les libellés (`registerCustomStyleLabels`).
- `src/beerCiderStyles.js` (à la racine de `src/`) est une ancienne liste de libellés sans code, **jamais importée** : à supprimer ou à fusionner.

### 2. Noms d'entités : traductions dans la fiche elle-même

Les fiches (produits, marques, producteurs, établissements) portent leurs variantes de nom **dans leurs propres colonnes**, pas dans des tables séparées (script `bibamus-sql-autres-noms.sql`) :

| Colonne | Contenu |
|---|---|
| `alternate_name` | Autre nom courant (texte libre) |
| `translations` | `jsonb`, tableau d'objets `{ lang, value }` (vide par défaut) |
| `aliases` | Autres noms ou orthographes, pour la recherche |

Le champ `lang` contient un **libellé français** (« Néerlandais », « Anglais (UK) »…), pas un code ISO.

Lecture et recherche :
- L'app lit ces colonnes (`sharedDirectories.js`) et les utilise dans la recherche locale des annuaires de marques et de producteurs.
- En base, le déclencheur `bibamus_set_search_text` calcule une colonne `search_text` qui agrège nom, nom alternatif, alias et traductions (`bibamus-sql-recherche-tolerante.sql`) ; un index `pg_trgm` la sert. Les variantes de traduction sont donc **déjà cherchables**. `alternate_name` entre aussi dans `search_drinks` et `get_drinks_page`.
- Édition : le panneau produit de la plateforme de gestion édite `translations` (composant `AlternateNamesFields`). L'app grand public ne fait que lire.

### 3. Langue de l'utilisateur : rien de branché

- Aucune lecture de la langue du navigateur (`navigator.language` n'apparaît nulle part).
- **Trois noms de colonne coexistent** pour la langue d'un profil : `language` (lu par l'écran orphelin `MyProfileScreen`, mais jamais chargé : `loadMyProfile` ne lit aucune colonne de langue, donc la valeur retombe toujours sur `fr`), `app_language` (lu et écrit par le panneau utilisateur de la plateforme de gestion) et `main_language` (créée par `bibamus-sql-fix-main-language.sql`, parce que la liste des utilisateurs de la plateforme de gestion la réclamait). Laquelle existe réellement en base : **(base)**.
- **Deux listes de langues non alignées**, de l'aveu du code : 4 valeurs pour `app_language` (`fr`, `nl`, `en`, `de`) et 9 pour `translations[].lang`.
- La plateforme de gestion peut déjà attribuer une `app_language` à un utilisateur ; l'app n'en tient pas compte.
- Langues codées en dur : `fr` pour l'autocomplétion d'adresse Geoapify et pour le géocodage inverse BigDataCloud (voir `GEOLOCATION.md`).
- Fonction `displayName(entity, appLanguageCode)` (`utils.js`) : résout le nom traduit d'une fiche (`en` essaie « Anglais (UK) » puis « Anglais (US) ») mais **n'est appelée nulle part**.

## Sélecteurs de langue

Deux contrôles existent et sont **désactivés** : la liste « Langue préférée » de l'écran orphelin `MyProfileScreen` (une seule option, « D'autres langues arriveront plus tard ») et la ligne « Langue de l'app » de `PreferencesScreen` (valeur Français, grisée). Un écran de choix existe dans `App.jsx` (option `fr` seule) mais aucun contrôle actif n'y mène. Il n'y a **aucun sélecteur fonctionnel**.

Les préférences d'unités (distance, température, volume, poids) sont enregistrées mais non appliquées ; seule l'unité d'énergie (kcal / Cal) l'est (voir `PROFILE.md`).

## Pourquoi cette séparation (principe conservé)

Les taxonomies sont un ensemble **fermé et stable** (styles, catégories) : gérables en code. Les noms d'entités sont un ensemble **ouvert et grandissant** (chaque lieu, chaque produit) : ils doivent vivre en base. Ce principe reste valable ; ce qui change, c'est le mécanisme réel (colonnes de la fiche plutôt que tables de traduction).

## Connu comme incomplet / non construit

- Aucune traduction réelle du contenu : l'export de données livré (`bibamus-export-2026-08-22.json`) ne contient aucun champ `translations` ni `alternate_name`, donc il ne permet pas de conclure ; le contenu éventuel est **(base)**.
- Sélecteur de langue fonctionnel ; lecture de la langue du profil ; choix d'une stratégie de détection (navigateur, préférence, pays) — non tranché.
- Externalisation des textes d'interface (aujourd'hui en dur dans les composants).
- Branchement de `displayName` dans l'affichage des fiches.
- Unification des trois noms de colonne de langue et des deux listes de langues ; remplacer le libellé français de `translations[].lang` par un code.
- Libellés EN / NL / DE des styles, y compris les styles personnalisés (une seule colonne `fr`).
- Langue de l'autocomplétion et du géocodage inverse, codée en dur.
- Décider si les six tables de l'ancienne version (`taxonomy_terms`, `taxonomy_terms_translations`, `product_translations`, `brand_translations`, `producer_translations`, `establishment_translations`) doivent être créées, ou si l'on garde le mécanisme actuel ; les retirer de la documentation de la base et de `SECURITY.md` tant que rien ne prouve qu'elles existent.
- Non vérifiable faute de scripts **(base)** : colonne de langue réellement présente sur `profiles`, contenu des colonnes `translations` en production.
