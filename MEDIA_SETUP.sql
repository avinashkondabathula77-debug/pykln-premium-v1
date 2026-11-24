-- Run STAFF_SETUP.sql first. Public gallery; only active admins may publish or remove photos.
create table if not exists public.pykln_media(id uuid primary key default gen_random_uuid(), event text not null, category text not null, caption text not null default '', path text not null unique, created_at timestamptz default now());
alter table public.pykln_media enable row level security;
grant select on public.pykln_media to anon,authenticated;
grant insert,delete on public.pykln_media to authenticated;
drop policy if exists media_read on public.pykln_media;
create policy media_read on public.pykln_media for select using(true);
drop policy if exists media_admin on public.pykln_media;
create policy media_admin on public.pykln_media for all to authenticated using(public.pykln_admin()) with check(public.pykln_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('pykln-gallery','pykln-gallery',true,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
drop policy if exists gallery_insert on storage.objects;
create policy gallery_insert on storage.objects for insert to authenticated with check(bucket_id='pykln-gallery' and public.pykln_admin());
drop policy if exists gallery_delete on storage.objects;
create policy gallery_delete on storage.objects for delete to authenticated using(bucket_id='pykln-gallery' and public.pykln_admin());
drop policy if exists gallery_select on storage.objects;
create policy gallery_select on storage.objects for select to authenticated using(bucket_id='pykln-gallery' and public.pykln_admin());
notify pgrst,'reload schema';
