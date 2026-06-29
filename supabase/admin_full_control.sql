-- ============================================================
-- ALT'IN — Admin : CONTRÔLE TOTAL (lecture + modification)
-- Permet à l'admin de corriger n'importe quel dossier (étapes,
-- statut, champs, messages, documents) des partenaires/experts,
-- pour protéger la marque en cas d'erreur.
-- À exécuter dans Supabase > SQL Editor. Idempotent (relançable).
-- Effet immédiat, aucun redéploiement nécessaire.
-- ============================================================

-- Rappel : public.is_admin() existe déjà (créé par partenaire_admin.sql).
-- Les dossiers sont déjà gérés par l'admin ("Admin gère tous les dossiers").
-- Ici on étend l'écriture admin aux tables liées + au stockage.

-- ── Étapes : valider / dévalider n'importe quelle étape ──────
drop policy if exists "Admin lit toutes les étapes" on public.dossier_steps;
drop policy if exists "Admin gère toutes les étapes" on public.dossier_steps;
create policy "Admin gère toutes les étapes" on public.dossier_steps
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Messages : corriger / supprimer un message ──────────────
drop policy if exists "Admin lit tous les messages" on public.messages;
drop policy if exists "Admin gère tous les messages" on public.messages;
create policy "Admin gère tous les messages" on public.messages
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Documents (table) : ajouter / supprimer / marquer rapport ─
drop policy if exists "Admin lit tous les documents" on public.documents;
drop policy if exists "Admin gère tous les documents" on public.documents;
create policy "Admin gère tous les documents" on public.documents
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Profils : corriger un nom, changer un rôle… ─────────────
drop policy if exists "Admin gère tous les profils" on public.profiles;
create policy "Admin gère tous les profils" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Stockage des fichiers (bucket 'Document') ───────────────
-- Permet à l'admin d'ouvrir / téléverser / supprimer les fichiers
-- (rapports, photos…) de tous les dossiers.
drop policy if exists "Admin gère tout le stockage Document" on storage.objects;
create policy "Admin gère tout le stockage Document" on storage.objects
  for all to authenticated
  using (bucket_id = 'Document' and public.is_admin())
  with check (bucket_id = 'Document' and public.is_admin());

-- ============================================================
-- FIN. L'admin peut désormais tout consulter ET tout corriger.
-- ============================================================
