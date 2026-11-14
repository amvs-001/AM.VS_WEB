-- Editorial panel setup. Run after schema.sql. Assign internal roles separately
-- after the users have authenticated.

alter table public.news
  add column if not exists programada_para timestamptz;

do $$
declare
  march record;
  updated_rows integer;
begin
  for march in
    select *
    from (values
      ('En vos confío', 'https://youtu.be/HN7ailnbUMI'),
      ('En la cena del Señor', 'https://youtu.be/s2li8EfG2PU'),
      ('Entrando en Jerusalén', 'https://youtu.be/DfwFEgYk6EI'),
      ('Oh Pecador', 'https://youtu.be/PiGNcdbxjqA'),
      ('Junto a ti', 'https://youtu.be/xwhyvBM9W5E'),
      ('La Esperanza de María', 'https://youtu.be/ah85o5j4JIg'),
      ('Nuestro Señor', 'https://youtu.be/pBz0M-Ky_ys'),
      ('Reina de Reyes', 'https://youtu.be/PW0Rdla9i98'),
      ('Tu Dulce Rostro Cautivo', 'https://youtu.be/T7rKytDQdVU')
    ) as videos(titulo, video_url)
  loop
    update public.repertoire
       set video_url = march.video_url,
           updated_at = now()
       where translate(lower(btrim(titulo)), 'áéíóúüñ', 'aeiouun')
           = translate(lower(btrim(march.titulo)), 'áéíóúüñ', 'aeiouun');
    get diagnostics updated_rows = row_count;

    if updated_rows = 0 then
      insert into public.repertoire (titulo, categoria, video_url)
      values (march.titulo, 'Marcha', march.video_url);
    end if;
  end loop;
end;
$$;

alter table public.profiles
  add column if not exists apellidos text not null default '',
  add column if not exists telefono text not null default '',
  add column if not exists apodo text not null default '',
  add column if not exists rol_banda text not null default '';

alter table public.profiles
  alter column rol set default 'Usuario',
  drop constraint if exists profiles_rol_check;

alter table public.profiles
  add constraint profiles_rol_check
  check (rol in ('Usuario', 'Superadministrador', 'Administrador', 'Editor'));

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  seccion text not null check (
    seccion in (
      'site_settings',
      'events',
      'repertoire',
      'timeline',
      'gallery_albums',
      'members',
      'sponsors',
      'news'
    )
  ),
  titulo text not null,
  payload jsonb not null,
  actualizado_por uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_pages (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  slug text not null unique,
  subtitulo text not null default '',
  contenido text not null,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_drafts_owner_updated
  on public.content_drafts (actualizado_por, updated_at desc);

create or replace function public.has_content_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = (select auth.uid())
       and p.activo = true
       and p.rol in ('Superadministrador', 'Administrador', 'Editor')
  );
$$;

create or replace function public.has_admin_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = (select auth.uid())
       and p.activo = true
       and p.rol in ('Superadministrador', 'Administrador')
  );
$$;

create or replace function public.has_superadmin_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = (select auth.uid())
       and p.activo = true
       and p.rol = 'Superadministrador'
  );
$$;

revoke all on function public.has_content_role() from public;
revoke all on function public.has_admin_role() from public;
revoke all on function public.has_superadmin_role() from public;
grant execute on function public.has_content_role() to authenticated;
grant execute on function public.has_admin_role() to authenticated;
grant execute on function public.has_superadmin_role() to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.content_drafts to authenticated;
grant select on public.news, public.events, public.repertoire, public.gallery_albums,
  public.gallery_items, public.members, public.sponsors, public.timeline, public.site_settings,
  public.custom_pages
  to anon, authenticated;

alter table public.content_drafts enable row level security;

drop policy if exists "Editors manage own content drafts" on public.content_drafts;
create policy "Editors manage own content drafts"
  on public.content_drafts
  for all
  to authenticated
  using (
    actualizado_por = (select auth.uid())
    and (select public.has_content_role())
  )
  with check (
    actualizado_por = (select auth.uid())
    and (select public.has_content_role())
  );

drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Role management for superadmins" on public.profiles;
create policy "Users read own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    nombre,
    apellidos,
    telefono,
    apodo,
    rol_banda,
    correo,
    rol,
    activo
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'first_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      'Usuario'
    ),
    coalesce(new.raw_user_meta_data ->> 'surname', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'nickname', ''),
    coalesce(new.raw_user_meta_data ->> 'band_role', ''),
    new.email,
    'Usuario',
    true
  )
  on conflict (correo) do update
    set id = excluded.id,
        nombre = excluded.nombre,
        apellidos = excluded.apellidos,
        telefono = excluded.telefono,
        apodo = excluded.apodo,
        rol_banda = excluded.rol_banda,
        rol = 'Usuario',
        activo = true;
  return new;
end;
$$;

drop trigger if exists create_profile_after_auth_signup on auth.users;
create trigger create_profile_after_auth_signup
  after insert on auth.users
  for each row
  execute function public.create_profile_for_new_auth_user();
revoke all on function public.create_profile_for_new_auth_user() from public, anon, authenticated;

drop policy if exists "Public read access to published content" on public.news;
create policy "Public read access to published content"
  on public.news
  for select
  to anon, authenticated
  using (
    estado = 'publicada'
    and (programada_para is null or programada_para <= now())
  );

drop policy if exists "Public read access to events" on public.events;
create policy "Public read access to events"
  on public.events for select to anon, authenticated using (true);

drop policy if exists "Public read access to repertoire" on public.repertoire;
create policy "Public read access to repertoire"
  on public.repertoire for select to anon, authenticated using (true);

drop policy if exists "Public read access to timeline" on public.timeline;
create policy "Public read access to timeline"
  on public.timeline for select to anon, authenticated using (true);

drop policy if exists "Public read access to site settings" on public.site_settings;
create policy "Public read access to site settings"
  on public.site_settings for select to anon, authenticated using (true);

drop policy if exists "Public read access to gallery albums" on public.gallery_albums;
create policy "Public read access to gallery albums"
  on public.gallery_albums for select to anon, authenticated using (true);

drop policy if exists "Public read access to gallery items" on public.gallery_items;
create policy "Public read access to gallery items"
  on public.gallery_items for select to anon, authenticated using (true);

drop policy if exists "Public read access to visible members" on public.members;
create policy "Public read access to visible members"
  on public.members for select to anon, authenticated using (visible = true);

drop policy if exists "Public read access to active sponsors" on public.sponsors;
create policy "Public read access to active sponsors"
  on public.sponsors for select to anon, authenticated using (activo = true);

drop policy if exists "Public read access to visible custom pages" on public.custom_pages;
create policy "Public read access to visible custom pages"
  on public.custom_pages for select to anon, authenticated using (visible = true);

drop policy if exists "Admins manage all content" on public.news;
drop policy if exists "Admins manage events" on public.events;
drop policy if exists "Editors manage allowed content" on public.repertoire;
drop policy if exists "Admins manage gallery" on public.gallery_albums;
drop policy if exists "Admins manage members" on public.members;
drop policy if exists "Admins manage sponsors" on public.sponsors;
drop policy if exists "Admins manage site settings" on public.site_settings;

do $$
declare
  table_name text;
  role_function text;
begin
  foreach table_name in array array[
    'news',
    'events',
    'repertoire',
    'gallery_albums',
    'gallery_items',
    'members',
    'sponsors',
    'timeline',
    'site_settings',
    'custom_pages'
  ]
  loop
    role_function := case
      when table_name = 'repertoire' then 'has_content_role'
      when table_name = 'site_settings' then 'has_superadmin_role'
      else 'has_admin_role'
    end;
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', 'Content editors manage ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select public.%I())) with check ((select public.%I()))',
      'Content editors manage ' || table_name,
      table_name,
      role_function,
      role_function
    );
  end loop;
end;
$$;

drop policy if exists "Admins manage page visibility" on public.site_settings;
create policy "Admins manage page visibility"
  on public.site_settings
  for all
  to authenticated
  using (
    (select public.has_admin_role())
    and left(clave, 11) = 'visibility_'
  )
  with check (
    (select public.has_admin_role())
    and left(clave, 11) = 'visibility_'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read site media" on storage.objects;
create policy "Public read site media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'site-media');

drop policy if exists "Content editors upload site media" on storage.objects;
create policy "Content editors upload site media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'site-media'
    and (select public.has_content_role())
  );

drop policy if exists "Content editors update site media" on storage.objects;
create policy "Content editors update site media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'site-media'
    and (select public.has_content_role())
  )
  with check (
    bucket_id = 'site-media'
    and (select public.has_content_role())
  );

drop policy if exists "Content editors delete site media" on storage.objects;
create policy "Content editors delete site media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'site-media'
    and (select public.has_content_role())
  );
