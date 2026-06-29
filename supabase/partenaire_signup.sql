-- ============================================================
-- ALT'IN — Auto-inscription des partenaires + validation admin
-- À exécuter dans Supabase > SQL Editor. Idempotent.
-- ============================================================

-- ── 1. Nouveau statut 'pending' (en attente de validation) ──
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('expert', 'client', 'admin', 'partenaire', 'pending'));

-- ── 2. À l'inscription d'un partenaire, créer un profil 'pending' ──
-- Ne se déclenche QUE si l'inscription précise role_request='partenaire'
-- (les clients passent par un lien magique et ne sont donc pas affectés).
create or replace function public.handle_partner_signup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.raw_user_meta_data->>'role_request') = 'partenaire' then
    insert into public.profiles (id, role, full_name)
    values (new.id, 'pending', coalesce(new.raw_user_meta_data->>'full_name', ''))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_partner_signup on auth.users;
create trigger on_partner_signup
  after insert on auth.users
  for each row execute function public.handle_partner_signup();

-- ── 3. Rappel sécurité ──────────────────────────────────────
-- Un profil 'pending' n'a AUCUN accès aux dossiers (aucune policy ne
-- l'autorise). Il faut que l'admin le passe en 'partenaire' :
--   update public.profiles set role = 'partenaire' where id = '<uuid>';
-- (fait en 1 clic depuis la page "Partenaires" de l'espace admin).
-- ============================================================
