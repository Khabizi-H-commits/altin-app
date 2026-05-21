-- Schéma complet altin-expertises.fr
-- À coller dans Supabase SQL Editor (Settings > SQL Editor > New query)

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text check (role in ('expert', 'client', 'admin')) not null,
  full_name text,
  phone text,
  initials text,
  notif_email boolean default true,
  notif_sms boolean default false,
  notif_push boolean default true,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Self can read own profile" on profiles for select using (auth.uid() = id);
create policy "Self can update own profile" on profiles for update using (auth.uid() = id);

-- Dossiers
create table public.dossiers (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  type text not null,
  type_icon text,
  client_id uuid references public.profiles(id),
  expert_id uuid references public.profiles(id),
  address text,
  current_step int default 1 check (current_step between 1 and 4),
  progress real default 0,
  status text default 'active' check (status in ('active', 'closed', 'pending')),
  estimate_low int,
  estimate_high int,
  opened_at timestamptz default now(),
  closed_at timestamptz
);
alter table public.dossiers enable row level security;
create policy "Client voit ses dossiers" on dossiers for select using (auth.uid() = client_id);
create policy "Expert voit ses dossiers" on dossiers for select using (auth.uid() = expert_id);
create policy "Expert modifie ses dossiers" on dossiers for update using (auth.uid() = expert_id);
create policy "Expert crée des dossiers" on dossiers for insert with check (
  exists(select 1 from profiles where id = auth.uid() and role = 'expert')
);

-- Étapes
create table public.dossier_steps (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers(id) on delete cascade,
  step_num int check (step_num between 1 and 4) not null,
  status text check (status in ('pending', 'in_progress', 'done')) default 'pending',
  validated_at timestamptz,
  notes text,
  unique(dossier_id, step_num)
);
alter table public.dossier_steps enable row level security;
create policy "Lire étapes dossier" on dossier_steps for select using (
  exists(select 1 from dossiers d where d.id = dossier_steps.dossier_id
    and (d.client_id = auth.uid() or d.expert_id = auth.uid()))
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers(id) on delete cascade,
  from_id uuid references public.profiles(id),
  txt text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create policy "Lire messages dossier" on messages for select using (
  exists(select 1 from dossiers d where d.id = messages.dossier_id
    and (d.client_id = auth.uid() or d.expert_id = auth.uid()))
);
create policy "Écrire messages dossier" on messages for insert with check (
  auth.uid() = from_id
  and exists(select 1 from dossiers d where d.id = messages.dossier_id
    and (d.client_id = auth.uid() or d.expert_id = auth.uid()))
);

-- Documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers(id) on delete cascade,
  name text not null,
  storage_path text not null,
  type text,
  size_bytes int,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.documents enable row level security;
create policy "Lire documents dossier" on documents for select using (
  exists(select 1 from dossiers d where d.id = documents.dossier_id
    and (d.client_id = auth.uid() or d.expert_id = auth.uid()))
);
create policy "Uploader documents dossier" on documents for insert with check (
  auth.uid() = uploaded_by
  and exists(select 1 from dossiers d where d.id = documents.dossier_id
    and (d.client_id = auth.uid() or d.expert_id = auth.uid()))
);

-- Activity feed
create table public.activity (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.dossiers(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  type text,
  payload jsonb,
  created_at timestamptz default now()
);
alter table public.activity enable row level security;
create policy "Lire activité dossier" on activity for select using (
  exists(select 1 from dossiers d where d.id = activity.dossier_id
    and (d.client_id = auth.uid() or d.expert_id = auth.uid()))
);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  dossier_id uuid references public.dossiers(id),
  title text,
  body text,
  icon text,
  read_at timestamptz,
  link text,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "Self can read own notifs" on notifications for select using (auth.uid() = user_id);
create policy "Self can mark read" on notifications for update using (auth.uid() = user_id);

-- Trigger : créer les 4 étapes à l'ouverture d'un dossier
create or replace function public.create_dossier_steps() returns trigger as $$
begin
  insert into dossier_steps (dossier_id, step_num, status) values
    (new.id, 1, 'in_progress'),
    (new.id, 2, 'pending'),
    (new.id, 3, 'pending'),
    (new.id, 4, 'pending');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_dossier_created
  after insert on dossiers
  for each row execute function create_dossier_steps();

-- Trigger : validation étape → mise à jour dossier + notif client
create or replace function public.on_step_validated() returns trigger as $$
declare v_client uuid; v_ref text;
begin
  if new.status = 'done' and old.status != 'done' then
    select client_id, ref into v_client, v_ref from dossiers where id = new.dossier_id;
    update dossiers
      set current_step = least(new.step_num + 1, 4),
          progress = new.step_num / 4.0
      where id = new.dossier_id;
    insert into activity (dossier_id, actor_id, type, payload)
      values (new.dossier_id, auth.uid(), 'step_validated',
        jsonb_build_object('step', new.step_num));
    insert into notifications (user_id, dossier_id, title, body, icon, link)
      values (v_client, new.dossier_id,
        'Étape ' || new.step_num || ' validée',
        'Votre dossier avance.',
        'check',
        '/client/dossier/' || v_ref);
    update dossier_steps
      set status = 'in_progress'
      where dossier_id = new.dossier_id and step_num = new.step_num + 1;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_dossier_step_update
  after update on dossier_steps
  for each row execute function on_step_validated();
