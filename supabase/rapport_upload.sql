-- Permettre de marquer un document comme étant le rapport d'expertise du dossier
-- À coller dans Supabase SQL Editor (projet wxugogsgrlxrrktcewtz)

-- 1. Colonne is_report sur la table documents
alter table public.documents
  add column if not exists is_report boolean not null default false;

-- 2. Au plus un seul rapport par dossier (index partiel)
create unique index if not exists documents_one_report_per_dossier
  on public.documents (dossier_id)
  where is_report = true;
