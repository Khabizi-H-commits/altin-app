-- ============================================================
-- ALT'IN — Espace partenaire + Cockpit admin
-- Phase 1 : rôle 'partenaire' + vue globale admin (RLS)
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Idempotent : peut être relancé sans danger.
-- ============================================================

-- ── 1. NOUVEAU RÔLE 'partenaire' ────────────────────────────
-- On élargit la contrainte de rôle pour accepter 'partenaire'.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('expert', 'client', 'admin', 'partenaire'));

-- ── 2. ISOLATION DES PARTENAIRES ────────────────────────────
-- Un partenaire est propriétaire de ses dossiers via expert_id
-- (= "professionnel responsable"). Les règles SELECT/UPDATE/DELETE
-- existantes filtrent déjà par `expert_id = auth.uid()` SANS contrôle
-- de rôle : elles couvrent donc déjà les partenaires.
-- Il ne manque que le droit de CRÉER un dossier pour un partenaire.
drop policy if exists "Partenaire crée des dossiers" on public.dossiers;
create policy "Partenaire crée des dossiers" on public.dossiers
  for insert to authenticated
  with check (
    expert_id = auth.uid()
    and exists (select 1 from public.profiles
                where id = auth.uid() and role = 'partenaire')
  );

-- ── 3. HELPER : l'utilisateur courant est-il admin ? ─────────
-- SECURITY DEFINER => contourne la RLS de profiles (évite la récursion).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── 4. VUE GLOBALE ADMIN (le "moi seul je vois tout") ───────
-- Aucune règle admin n'existait : on les ajoute. Les politiques
-- étant cumulatives (OR), ceci n'enlève aucun droit existant.

-- Profils : l'admin voit tous les profils (pour afficher les noms
-- des partenaires/experts dans le cockpit).
drop policy if exists "Admin voit tous les profils" on public.profiles;
create policy "Admin voit tous les profils" on public.profiles
  for select to authenticated using (public.is_admin());

-- Dossiers : l'admin voit ET gère tous les dossiers.
drop policy if exists "Admin gère tous les dossiers" on public.dossiers;
create policy "Admin gère tous les dossiers" on public.dossiers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Étapes, messages, documents, activité : l'admin lit tout.
drop policy if exists "Admin lit toutes les étapes" on public.dossier_steps;
create policy "Admin lit toutes les étapes" on public.dossier_steps
  for select to authenticated using (public.is_admin());

drop policy if exists "Admin lit tous les messages" on public.messages;
create policy "Admin lit tous les messages" on public.messages
  for select to authenticated using (public.is_admin());

drop policy if exists "Admin lit tous les documents" on public.documents;
create policy "Admin lit tous les documents" on public.documents
  for select to authenticated using (public.is_admin());

drop policy if exists "Admin lit toute l'activité" on public.activity;
create policy "Admin lit toute l'activité" on public.activity
  for select to authenticated using (public.is_admin());

-- ============================================================
-- FIN Phase 1.
-- Pour créer un partenaire : crée le compte (Auth) puis
--   update public.profiles set role = 'partenaire' where id = '<uuid>';
-- Pour te déclarer admin :
--   update public.profiles set role = 'admin' where id = '<ton-uuid>';
-- ============================================================
