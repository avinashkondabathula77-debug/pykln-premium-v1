-- Run once in Supabase SQL Editor. Review before executing.
-- Auth providers (Google and phone SMS) must be enabled in Supabase Auth settings separately.
create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  dupr_id text not null default '',
  phone text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.player_profiles enable row level security;
revoke all on public.player_profiles from anon;
grant select, insert, update on public.player_profiles to authenticated;
drop policy if exists "player can read own profile" on public.player_profiles;
create policy "player can read own profile" on public.player_profiles for select to authenticated using ((select auth.uid())=id);
drop policy if exists "player can create own profile" on public.player_profiles;
create policy "player can create own profile" on public.player_profiles for insert to authenticated with check ((select auth.uid())=id);
drop policy if exists "player can update own profile" on public.player_profiles;
create policy "player can update own profile" on public.player_profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
-- Create a profile when an Auth user registers, including email signup metadata.
create or replace function public.create_player_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.player_profiles(id,first_name,last_name,dupr_id,phone)
  values(new.id,coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),coalesce(new.raw_user_meta_data->>'dupr_id',''),coalesce(new.raw_user_meta_data->>'phone',coalesce(new.phone,'')))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists create_player_profile_on_signup on auth.users;
create trigger create_player_profile_on_signup after insert on auth.users for each row execute function public.create_player_profile();
-- Avatars are public-read but only their owner may upload to their own folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('player-avatars','player-avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "player uploads own avatar" on storage.objects;
create policy "player uploads own avatar" on storage.objects for insert to authenticated
with check (bucket_id='player-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "player replaces own avatar" on storage.objects;
create policy "player replaces own avatar" on storage.objects for update to authenticated
using (bucket_id='player-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='player-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "player reads own avatar object" on storage.objects;
create policy "player reads own avatar object" on storage.objects for select to authenticated
using (bucket_id='player-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- NOTE: Auth user roles are not granted here. Never trust a browser-set role for organiser/scorer access.
