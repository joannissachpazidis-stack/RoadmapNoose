-- =====================================================================
-- Band Roadmap – Supabase Schema
-- Einmal komplett im Supabase SQL-Editor ausführen (Project → SQL Editor → New query).
-- Kann gefahrlos mehrfach ausgeführt werden.
-- =====================================================================

create extension if not exists pgcrypto;

-- Bands --------------------------------------------------------------
create table if not exists public.bands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Mitgliedschaften ----------------------------------------------------
create table if not exists public.band_members (
  band_id      uuid not null references public.bands(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  joined_at    timestamptz not null default now(),
  primary key (band_id, user_id)
);

-- Alle App-Daten (Songs, Ziele, Gigs, ...) als JSON-Dokumente -----------
create table if not exists public.records (
  band_id    uuid not null references public.bands(id) on delete cascade,
  id         text not null,
  collection text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at bigint not null,            -- Client-Zeitstempel (ms) für "last write wins"
  updated_by text,
  deleted    boolean not null default false,
  primary key (band_id, id)
);
create index if not exists records_band_updated on public.records (band_id, updated_at);

-- Hilfsfunktion: ist der eingeloggte User Mitglied der Band? -------------
create or replace function public.is_band_member(p_band uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.band_members where band_id = p_band and user_id = auth.uid());
$$;

-- Row Level Security ----------------------------------------------------
alter table public.bands        enable row level security;
alter table public.band_members enable row level security;
alter table public.records      enable row level security;

drop policy if exists "bands: members read"   on public.bands;
drop policy if exists "bands: members update" on public.bands;
create policy "bands: members read"   on public.bands for select using (public.is_band_member(id));
create policy "bands: members update" on public.bands for update using (public.is_band_member(id));

drop policy if exists "members: band reads"   on public.band_members;
drop policy if exists "members: self update"  on public.band_members;
drop policy if exists "members: self leave"   on public.band_members;
create policy "members: band reads"  on public.band_members for select using (public.is_band_member(band_id));
create policy "members: self update" on public.band_members for update using (user_id = auth.uid());
create policy "members: self leave"  on public.band_members for delete using (user_id = auth.uid());

drop policy if exists "records: members all" on public.records;
create policy "records: members all" on public.records for all
  using (public.is_band_member(band_id))
  with check (public.is_band_member(band_id));

-- Band anlegen (Ersteller wird automatisch Mitglied) ---------------------
create or replace function public.create_band(p_name text, p_display_name text)
returns public.bands
language plpgsql security definer set search_path = public
as $$
declare b public.bands;
begin
  if auth.uid() is null then raise exception 'Nicht eingeloggt'; end if;
  insert into public.bands (name, created_by) values (p_name, auth.uid()) returning * into b;
  insert into public.band_members (band_id, user_id, display_name) values (b.id, auth.uid(), p_display_name);
  return b;
end $$;

-- Band per Einladungscode beitreten -------------------------------------
create or replace function public.join_band(p_code text, p_display_name text)
returns public.bands
language plpgsql security definer set search_path = public
as $$
declare b public.bands;
begin
  if auth.uid() is null then raise exception 'Nicht eingeloggt'; end if;
  select * into b from public.bands where invite_code = upper(trim(p_code));
  if b.id is null then raise exception 'Einladungscode unbekannt'; end if;
  insert into public.band_members (band_id, user_id, display_name)
    values (b.id, auth.uid(), p_display_name)
    on conflict (band_id, user_id) do update set display_name = excluded.display_name;
  return b;
end $$;

grant execute on function public.create_band(text, text) to authenticated;
grant execute on function public.join_band(text, text)   to authenticated;

-- Realtime für Live-Updates ----------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'records'
  ) then
    alter publication supabase_realtime add table public.records;
  end if;
end $$;
