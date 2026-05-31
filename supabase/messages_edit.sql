-- Permettre l'édition et la suppression des messages par leur auteur
-- À coller dans Supabase SQL Editor (projet wxugogsgrlxrrktcewtz)

-- 1. Colonne edited_at pour tracer les modifications
alter table public.messages
  add column if not exists edited_at timestamptz;

-- 2. Policy UPDATE : seul l'auteur peut modifier son message
drop policy if exists "Modifier ses messages" on public.messages;
create policy "Modifier ses messages" on public.messages
  for update
  using (auth.uid() = from_id)
  with check (auth.uid() = from_id);

-- 3. Policy DELETE : seul l'auteur peut supprimer son message
drop policy if exists "Supprimer ses messages" on public.messages;
create policy "Supprimer ses messages" on public.messages
  for delete
  using (auth.uid() = from_id);
