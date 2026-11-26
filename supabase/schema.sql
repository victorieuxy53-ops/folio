-- Folio — base Supabase complète : tables, sécurité (RLS), déclencheurs,
-- statistiques administrateur et stockage des fichiers.
-- À coller tel quel dans Supabase > SQL Editor, puis Run. Peut être réexécuté sans risque.

-- 1. Tables -----------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.portfolios (
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
create index if not exists portfolios_user_id_idx on public.portfolios (user_id);

-- Tailles maximales (aussi ajoutées à une base déjà créée) : un thème fait moins de 100 octets.
alter table public.profiles drop constraint if exists profiles_full_name_length;
alter table public.profiles add constraint profiles_full_name_length check (char_length(full_name) <= 100);
alter table public.portfolios drop constraint if exists portfolios_theme_size;
alter table public.portfolios add constraint portfolios_theme_size check (octet_length(theme::text) < 2000);

-- Un paiement SasPay (transaction_id SasPay, amount = net reçu), ou un portfolio offert par le code promo
-- (transaction_id = 'promo:<id du compte>', amount = 0 : un seul par compte).
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete set null,
  portfolio_id uuid references public.portfolios on delete set null,
  transaction_id text not null unique,
  amount integer not null,
  created_at timestamptz not null default now()
);

-- Journal d'activité du tableau de bord administrateur. Les événements « checkout » (session de paiement
-- SasPay ouverte) servent aussi au serveur à retrouver un paiement déjà fait.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles on delete cascade,
  type text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists events_created_at_idx on public.events (created_at desc);

-- Trafic : un compteur par jour et par site, sans cookie ni donnée personnelle.
-- site = '' pour Folio, sinon l'adresse (slug) du portfolio publié.
create table if not exists public.visits (
  day date not null default current_date,
  site text not null,
  visitors integer not null default 0,
  primary key (day, site)
);

-- 2. Déclencheurs -----------------------------------------------------------

-- Crée le profil (et l'événement « inscription ») à chaque nouveau compte.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100));
  insert into public.events (user_id, type) values (new.id, 'signup');
  return new;
end $$;

create or replace trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Comptes créés avant l'exécution de ce script.
insert into public.profiles (id, email, full_name, created_at)
select id, coalesce(email, ''), left(coalesce(raw_user_meta_data ->> 'full_name', ''), 100), created_at
from auth.users
on conflict (id) do nothing;

create or replace function public.handle_portfolio_change() returns trigger
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

create or replace trigger on_portfolio_insert after insert on public.portfolios
  for each row execute function public.handle_portfolio_change();
create or replace trigger on_portfolio_update before update on public.portfolios
  for each row execute function public.handle_portfolio_change();

-- 3. Sécurité (RLS) ---------------------------------------------------------

-- Administrateur = rôle « admin » ET connexion confirmée par le code à 6 chiffres (aal2) :
-- un mot de passe volé ne suffit pas pour voir les données de la plateforme.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;
alter table public.payments enable row level security;
alter table public.events enable row level security;
alter table public.visits enable row level security;

drop policy if exists "lecture profil" on public.profiles;
create policy "lecture profil" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
-- Le profil n'est jamais modifié par l'appli : aucun droit d'écriture.
drop policy if exists "modif profil" on public.profiles;

drop policy if exists "lecture portfolio" on public.portfolios;
create policy "lecture portfolio" on public.portfolios for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- 10 brouillons (non payés) au plus par compte, contre le remplissage abusif de la base.
drop policy if exists "création portfolio" on public.portfolios;
create policy "création portfolio" on public.portfolios for insert to authenticated
  with check (user_id = auth.uid() and (select count(*) from public.portfolios where user_id = auth.uid() and not paid) < 10);
drop policy if exists "modif portfolio" on public.portfolios;
create policy "modif portfolio" on public.portfolios for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "suppression brouillon" on public.portfolios;
create policy "suppression brouillon" on public.portfolios for delete to authenticated
  using (user_id = auth.uid() and not paid);

drop policy if exists "lecture paiements" on public.payments;
create policy "lecture paiements" on public.payments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "lecture activité" on public.events;
create policy "lecture activité" on public.events for select to authenticated
  using (public.is_admin());

-- Les utilisateurs ne modifient que leurs contenus : le rôle, le statut de
-- paiement et l'URL sont écrits uniquement par le serveur (clé service_role).
-- Les visites ne passent que par track_visit ; personne ne lit la table directement.
grant usage on schema public to anon, authenticated, service_role;
revoke all on public.profiles, public.portfolios, public.payments, public.events, public.visits from anon, authenticated;
grant select on public.profiles, public.portfolios, public.payments, public.events to authenticated;
grant insert (slug, template, theme, content) on public.portfolios to authenticated;
grant update (template, theme, content) on public.portfolios to authenticated;
grant delete on public.portfolios to authenticated;
grant all on public.profiles, public.portfolios, public.payments, public.events, public.visits to service_role;
grant execute on function public.is_admin() to authenticated;

-- 4. Trafic et statistiques -------------------------------------------------

-- Seul accès public : ajouter une visite à Folio ou à un portfolio en ligne.
create or replace function public.track_visit(p_site text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_site = '' or exists (select 1 from public.portfolios where slug = p_site and url is not null) then
    insert into public.visits as v (day, site, visitors) values (current_date, p_site, 1)
    on conflict (day, site) do update set visitors = v.visitors + 1;
  end if;
end $$;

revoke execute on function public.track_visit(text) from public;
grant execute on function public.track_visit(text) to anon, authenticated;

-- Statistiques du tableau de bord, réservées aux administrateurs.
create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé';
  end if;
  return json_build_object(
    'users', (select count(*) from public.profiles),
    'portfolios', (select count(*) from public.portfolios),
    'creators', (select count(distinct user_id) from public.portfolios),
    'published', (select count(*) from public.portfolios where url is not null),
    -- amount = 0 : portfolio offert par le code promo, ni client payant ni paiement.
    'paying', (select count(distinct user_id) from public.payments where amount > 0),
    'revenue', (select coalesce(sum(amount), 0) from public.payments),
    'daily', (
      select json_agg(json_build_object(
        'day', d.day,
        'visitors', (select coalesce(sum(v.visitors), 0) from public.visits v where v.day = d.day and v.site = ''),
        'site_visitors', (select coalesce(sum(v.visitors), 0) from public.visits v where v.day = d.day and v.site <> ''),
        'signups', (select count(*) from public.profiles p where p.created_at::date = d.day),
        'created', (select count(*) from public.portfolios p where p.created_at::date = d.day),
        'payments', (select count(*) from public.payments y where y.created_at::date = d.day and y.amount > 0),
        'revenue', (select coalesce(sum(amount), 0) from public.payments y where y.created_at::date = d.day)
      ) order by d.day)
      from (select generate_series(current_date - 29, current_date, interval '1 day')::date as day) d
    ),
    -- Les 10 portfolios les plus visités sur 30 jours.
    'sites', (
      select coalesce(json_agg(s order by s.visitors desc), '[]')
      from (
        select p.slug, p.url, sum(v.visitors) as visitors
        from public.visits v join public.portfolios p on p.slug = v.site
        where v.day > current_date - 30
        group by p.slug, p.url
        order by visitors desc 
        limit 10
      ) s
    )
  );
end $$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- 5. Stockage des fichiers (photos de profil, visuels de projets, CV en PDF) --
-- Bucket public « media » ; chacun n'écrit que dans son dossier <id du compte>/.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "envoi images" on storage.objects;
create policy "envoi images" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "suppression images" on storage.objects;
create policy "suppression images" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- 6. Devenir administrateur : inscrivez-vous sur le site, puis exécutez
-- (en remplaçant l'e-mail) :
-- update public.profiles set role = 'admin' where email = 'vous@exemple.com';
-- À la première visite de /admin, scannez le QR code avec Google Authenticator.
-- Téléphone perdu : supprimez la vérification en 2 étapes du compte, puis rescannez un nouveau QR code :
-- delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'vous@exemple.com');
