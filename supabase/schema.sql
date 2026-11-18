-- Folio — schéma Supabase. À exécuter une fois dans Supabase > SQL Editor.

-- 1. Tables -----------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 32),
  template text not null default 'minimal',
  theme jsonb not null default '{}',
  content jsonb not null default '{}' check (octet_length(content::text) < 100000),
  paid boolean not null default false,
  url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.portfolios (user_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete set null,
  portfolio_id uuid references public.portfolios on delete set null,
  transaction_id text not null unique,
  amount integer not null,
  created_at timestamptz not null default now()
);

create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles on delete cascade,
  type text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.events (created_at desc);

-- 2. Triggers ---------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  insert into public.events (user_id, type) values (new.id, 'signup');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Comptes créés avant l'exécution de ce script.
insert into public.profiles (id, email, full_name, created_at)
select id, coalesce(email, ''), coalesce(raw_user_meta_data ->> 'full_name', ''), created_at
from auth.users
on conflict (id) do nothing;

create function public.handle_portfolio_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.events (user_id, type, meta)
    values (new.user_id, 'portfolio_created', jsonb_build_object('slug', new.slug));
  else
    new.updated_at = now();
  end if;
  return new;
end $$;

create trigger on_portfolio_insert after insert on public.portfolios
  for each row execute function public.handle_portfolio_change();
create trigger on_portfolio_update before update on public.portfolios
  for each row execute function public.handle_portfolio_change();

-- 3. Sécurité (RLS) ---------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;
alter table public.payments enable row level security;
alter table public.events enable row level security;

create policy "lecture profil" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "modif profil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "lecture portfolio" on public.portfolios for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "création portfolio" on public.portfolios for insert to authenticated
  with check (user_id = auth.uid());
create policy "modif portfolio" on public.portfolios for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "suppression brouillon" on public.portfolios for delete to authenticated
  using (user_id = auth.uid() and not paid);

create policy "lecture paiements" on public.payments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "lecture activité" on public.events for select to authenticated
  using (public.is_admin());

-- Les utilisateurs ne modifient que leurs contenus : le rôle, le statut de
-- paiement et l'URL sont écrits uniquement par le serveur (clé service_role).
revoke all on public.profiles, public.portfolios, public.payments, public.events from anon, authenticated;
grant select on public.profiles, public.portfolios, public.payments, public.events to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant insert (slug, template, theme, content) on public.portfolios to authenticated;
grant update (template, theme, content) on public.portfolios to authenticated;
grant delete on public.portfolios to authenticated;

-- 4. Stockage des fichiers (photos de profil, visuels de projets, CV en PDF)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update set allowed_mime_types = excluded.allowed_mime_types;

create policy "envoi images" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "suppression images" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Ensuite, exécutez admin.sql (trafic et statistiques du tableau de bord administrateur).
