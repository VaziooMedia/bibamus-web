# SÉCURITÉ — Documentation as-built

> Documente l'état réel des correctifs de sécurité appliqués, pas un historique de conversation. À mettre à jour à chaque nouveau correctif.
> Dernière mise à jour : 2026-10-09. Chaque ligne indique son niveau de preuve : **vérifié** (lu dans le code de l'app ou dans un script SQL / une fonction Edge livré) ou **déclaré** (appliqué dans Supabase d'après l'ancienne version de ce document ; aucun script livré ne permet de le rejouer ni de le vérifier).

> **Règle de publication.** Le dépôt `bibamus-web` est **public**. Ce fichier décrit ce qui est corrigé et les décisions en attente, mais **jamais** de détail exploitable (ni clé, ni faille décrite pas à pas). Le détail des points à examiner est tenu dans une note privée, hors du dépôt.

---

## Contexte

Fin août / début septembre 2026, l'audit automatique de sécurité de Supabase (Security Advisors) a révélé plusieurs failles réelles, en plus de nombreux avertissements mineurs. Ce document trace ce qui a été corrigé, ce qui reste ouvert, et une leçon technique importante apprise en cours de route.

## Leçon technique — scripts SQL et transactions

Plusieurs correctifs ont échoué silencieusement parce qu'une instruction en fin de script référençait une table qui n'existait pas encore (ou plus) : l'échec de cette seule ligne a annulé **tout le script**. Ça explique pourquoi certaines fonctionnalités (`pulse_incoming`, `pulse_sante`) sont restées absentes malgré plusieurs tentatives de correction.

**Conséquence retenue** : toujours vérifier les colonnes et tables réellement existantes (`information_schema.columns`) avant d'écrire une fonction qui les référence, plutôt que de se fier à la mémoire de ce qui « devrait » exister. Les scripts récents suivent cette règle (par exemple `bibamus-sql-solo-jetons.sql` : « Un seul bloc : tout réussit ou rien ne change »).

## Correctifs appliqués

### Vérifiés dans les scripts livrés

- **Visibilité « relations »** (BibaPulse et Stories). Elle reposait sur une table `follows` (suivi à sens unique) jamais utilisée en pratique : deux comptes Bibax mutuels ne se voyaient jamais. Elle repose désormais sur le système Bibax mutuel confirmé (`bibax_relationships`, statut `accepted`, dans les deux sens). C'est le cas de toutes les fonctions de lecture Pulse et de tags livrées, et de la fonction Edge `create-pulse-event`. Aucune référence à la table `follows` dans les scripts ni dans l'app (le suivi de *lieux* par `venue_follows`, lui, est actif). *Pour les Stories*, les fonctions `get_pulse_stories` et `get_room_stories` ne sont pas livrées : déclaré seulement.
- **Fonctions `SECURITY DEFINER` avec `search_path` fixé.** Dans les scripts livrés, presque toutes les définitions posent `search_path`, soit `public`, soit `public, extensions` (nécessaire quand `unaccent()` vit dans le schéma `extensions` : recherche d'étiquette, recherche tolérante).
- **Lecture limitée au connecté** : le fil BibaPulse (`get_pulse_feed`), le fil d'une fiche (`get_entity_pulse`) et les fonctions de tags exigent un utilisateur connecté, excluent les utilisateurs bloqués (dans les deux sens) et les cartes masquées.
- **Modération BibaPulse** : le signalant est toujours le compte connecté ; masquage automatique à 3 signalants distincts ; masquer / rétablir réservés à `can_moderate()` ; rien n'est supprimé. Voir `BIBAPULSE.md`.
- **Tags** : réglages de confidentialité par surface (`allow_pulse_tags`, `allow_story_tags`, `allow_profile_via_pulse_tag`, `allow_profile_via_tag`), blocage pris en compte, exécution retirée à `public` / `anon` sur les fonctions de tags récentes.
- **Rôles** : les règles d'accès admettent `editor`, `super_editor`, `moderator`, `admin`, `super_admin` (propositions IA, styles personnalisés, suppression de brouillons) ; les Stories officielles sont réservées à `admin` et `super_admin`. Dans l'app, `isAdmin` = rôle `admin` ou `super_admin`. Les suggestions Bibax et la recherche par nom excluent les comptes qui ne sont pas `role = 'user'`.
- **Lecture de ses propres données seulement** : journal de lecture d'étiquettes (`label_scans`), propositions de l'IA (`ai_proposals`) avec des rôles précis.
- **Écriture ouverte aux comptes connectés, par décision** : `drink_barcodes` et `drink_vintages` (lecture publique, écriture pour tout compte connecté, script `bibamus-sql-drink-barcodes-ecriture.sql` du durcissement du 2026-09-02). La version précédente de ce document les disait en écriture réservée au serveur : c'est inexact.
- **Bucket `pulse-photos`** : public, 5 Mo, JPEG / PNG / WebP, aucune écriture directe (tout passe par la fonction Edge `upload-pulse-photo`, authentifiée, avec contrôle Google Cloud Vision).
- **Vue `consumption_events`** : recréée en conservant ses options de sécurité (`bibamus-sql-solo-jetons.sql`).

### Déclarés (appliqués dans Supabase, scripts non livrés)

- **RLS activée sur 8 tables publiques**, lecture publique conservée, écriture retirée du client. Tables citées par l'ancienne version : `taxonomy_terms`, `taxonomy_terms_translations`, `product_translations`, `brand_translations`, `producer_translations`, `establishment_translations`, `drink_barcodes` et `spatial_ref_sys`. Pour cette dernière (table système PostGIS), la RLS est impossible à activer : laissée telle quelle. **Attention** : les six premières tables n'apparaissent ni dans l'app ni dans les scripts livrés (voir `MULTILINGUAL.md`) ; et `drink_barcodes` a depuis une écriture ouverte aux connectés (voir plus haut).
- **17 fonctions sans `search_path` fixé** corrigées par `alter function ... set search_path = public`, appliquées par introspection (`pg_proc`) plutôt qu'en devinant chaque signature.
- **7 buckets publics** : règle de lecture autorisant le *listage* complet des fichiers retirée (inutile pour l'accès par URL directe). L'app ne liste jamais un bucket ; elle n'a qu'un appel direct de stockage (URL signée des pièces jointes de messagerie).
- **Fonctions internes** retirées de l'exécution publique : `anonymize_before_user_delete`, `audit_content_changes`, `audit_profile_changes`, `fill_submitted_by`, `sync_open_reports_count`, `handle_new_user`, `merge_entities`.

> **À faire** : livrer dans le dépôt les scripts réellement exécutés pour ces quatre lots, pour qu'ils soient rejouables et vérifiables.

## Scripts de sécurité livrés

Classés par nature, pour s'y retrouver :

- **Règles d'accès (RLS)** : `ai-proposals-rls`, `styles-personnalises`, `drink-barcodes-ecriture`, `drink-vintages`, `schema-admin-chat` (+ `-reactions`, `-archive`, `-read-markers`), `schema-official-stories-insert-policy` et `-delete-policy`, `schema-drink-delete-own-draft`, `schema-venue-delete-own-draft` (suppression d'un brouillon par son auteur), `journal-lectures-etiquettes`.
- **Retrait / octroi d'exécution** : `journal-lectures-etiquettes`, `journal-resultats-etiquettes`, `drink-total-checks`, `tags-1`, `tags-3`, `styles-personnalises`.
- **Fonctions avec garde de connexion et `search_path`** : `pulse-2`, `-3`, `-4`, `-5`, `-11`, `tags-2`, `-3`, `-4`, `fix-bibax-roles*`.
- **Garde par rôle** : `pulse-8-details-signalement`, `pulse-9-action-moderation` (`can_moderate()`).
- **Anti-usurpation et masquage automatique** : `pulse-7-regles-moderation` ; contrainte de types : `pulse-6-preparation-moderation`.
- **Bucket** : `pulse-10-dossier-photos`.

## Connu comme non résolu

- **Table `salons`** : l'app y accède désormais uniquement par des fonctions serveur ; la fermeture de l'accès direct à la table (réservé aux participants et aux administrateurs) est en cours de déploiement dans Supabase, hors dépôt, et sera confirmée ici une fois vérifiée. Rejoindre par code exige un compte connecté. Voir `BIBAROOM.md`.
- **Extensions dans le schéma `public`** (PostGIS ; `unaccent` et `pg_trgm` aussi) : signalé par l'auditeur, mais déplacement jugé trop risqué (toute la logique de proximité et de recherche en dépend) — laissé tel quel volontairement.
- **Protection contre les mots de passe compromis** désactivée dans les réglages Supabase Auth (Authentication → Password Security) — à activer manuellement, ce n'est pas du SQL.
- **Clé d'autocomplétion d'adresse** : la clé Geoapify est lue par le navigateur (variable d'environnement `VITE_`, donc visible dans l'app). Elle doit être restreinte par domaine chez le fournisseur ; cette restriction n'est pas vérifiable depuis le code.
- **Revue de sécurité du code en cours** : plusieurs points (fonctions de lecture sans contrôle de visibilité, règles d'accès trop larges sur certaines tables internes, authentification d'une fonction Edge, résidus de code d'accès administrateur) ont été relevés lors de la vérification de la documentation du 2026-10-09. Le détail est dans une note privée et sera traité avant d'être décrit ici.
- La majorité des avertissements restants de l'auditeur concernent des fonctions `SECURITY DEFINER` **volontairement publiques** : les RPC appelées par l'app. Pour les fonctions de données personnelles, une garde de connexion est bien présente (`auth.uid() is not null`) ; ce n'est pas le cas des lectures d'annuaire public, qui sont voulues ouvertes. Ce ne sont donc pas toutes de fausses alertes : chacune doit avoir sa justification.
