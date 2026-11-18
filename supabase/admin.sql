-- Folio — tableau de bord administrateur : trafic et statistiques.
-- À exécuter dans Supabase > SQL Editor, après schema.sql. Peut être réexécuté sans risque.

-- 1. Trafic -------------------------------------------------------------------
-- Un compteur par jour et par site, sans cookie ni donnée personnelle :
-- chaque navigateur est compté au plus une fois par jour et par site.
-- site = '' pour Folio, sinon l'adresse (slug) du portfolio publié.
create table if not exists public.visits (
  day date not null default current_date,
  site text not null,
  visitors integer not null default 0,
  primary key (day, site)
);
alter table public.visits enable row level security;
revoke all on public.visits from anon, authenticated;

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

-- 2. Statistiques (réservées aux administrateurs) ------------------------------

create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé';
  end if;
  return json_build_object(
    'users', (select count(*) from public.profiles),
    'portfolios', (select count(*) from public.portfolios),
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

-- 3. Devenir administrateur (remplacez l'e-mail, après votre inscription) -----
-- update public.profiles set role = 'admin' where email = 'vous@exemple.com';
