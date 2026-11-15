-- Adds only requested marches that are not already in public.repertoire.
-- Existing rows are never updated or deleted. Title comparison ignores case,
-- accents, spaces, and punctuation so the script can be safely rerun.
--
-- Credits and years are populated only when they could be identified with
-- reasonable confidence. NULL means the detail needs confirmation.
--
-- Sources for the credited works:
-- https://www.youtube.com/results?search_query=Cautivo+ante+Pilatos+Mario+Infante+Jurado+2014
-- https://www.marchasdeprocesion.com/2020/01/antonio-velasco-rodriguez.html
-- https://www.marchasdeprocesion.com/2020/01/francisco-joaquin-perez-garrido.html
-- https://www.marchasdeprocesion.com/2020/01/manuel-lopez-farfan.html
-- https://www.marchasdeprocesion.com/2020/01/antonio-jose-lopez-escalante.html
-- https://www.marchasdeprocesion.com/2020/01/nicolas-miguel-barbero-rivas.html

begin;

lock table public.repertoire in share row exclusive mode;

with candidates (titulo, autor, categoria, anio, descripcion, video_url) as (
  values
    ('Himno Nacional de España', 'Tradicional', 'Himno', null::integer, null::text, null::text),
    ('En la Cena del Señor', null::text, 'Marcha', null::integer, null::text, 'https://youtu.be/s2li8EfG2PU'),
    ('Cautivo ante Pilatos', 'Mario Infante Jurado', 'Marcha', 2014, null::text, null::text),
    ('A la Gloria', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Ave María', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Entrando en Jerusalem', null::text, 'Marcha', null::integer, null::text, 'https://youtu.be/DfwFEgYk6EI'),
    ('Consuelo Gitano', 'Antonio Velasco Rodríguez', 'Marcha', null::integer, null::text, null::text),
    ('Candela', 'Director', 'Composición', null::integer, 'Composición realizada por el director para su hija.', null::text),
    ('Costalero', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Caridad del Guadalquivir', 'Francisco Joaquín Pérez Garrido (Paco Lola)', 'Marcha', null::integer, 'Instrumentada para banda por Juan José Puntas Fernández.', null::text),
    ('Cerca de Ti', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Callejuela de la O', 'Francisco Joaquín Pérez Garrido (Paco Lola)', 'Marcha', null::integer, 'Arreglos musicales de Martín Salas Martínez.', null::text),
    ('Beso y Traición', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Christus Vincit', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Esperanos en el Cielo', null::text, 'Marcha', null::integer, null::text, null::text),
    ('A los Pies de Sor Angela', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Costaleros del Amor', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Reina de Reyes', null::text, 'Marcha', null::integer, null::text, 'https://youtu.be/PW0Rdla9i98'),
    ('Morenita y Pequeñita', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Nuestro Señor', null::text, 'Marcha', null::integer, null::text, 'https://youtu.be/pBz0M-Ky_ys'),
    ('La Esperanza de María', null::text, 'Marcha', null::integer, null::text, 'https://youtu.be/ah85o5j4JIg'),
    ('La Saeta', 'Joan Manuel Serrat (canción original)', 'Marcha', null::integer, 'Autor y año del arreglo procesional pendientes de confirmar.', null::text),
    ('Estrella Menciana', null::text, 'Marcha', null::integer, null::text, null::text),
    ('La Oración en el Huerto', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Himno Virgen del Rosario', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Madre de los Creyentes', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Anima Christi', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Mi Amargura', null::text, 'Marcha', null::integer, 'Hay obras distintas con este título; autoría y año pendientes de identificar para esta versión.', null::text),
    ('Estrella, Reina del Cielo', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Nuestro Padre Jesús de la Victoria', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Oración', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Judería Sevillana', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Al Señor del Rescate', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Oración Redentora', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Pasan los Campanilleros', 'Manuel López Farfán', 'Marcha', 1924, null::text, null::text),
    ('Señor de San Román', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Presentado a Sevilla', 'Antonio José López Escalante', 'Marcha', null::integer, null::text, null::text),
    ('Soledad Menciana', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Suena la Soledad', 'Director', 'Marcha', null::integer, 'Marcha de paso ordinario compuesta por el director.', null::text),
    ('Soledad y Esperanza', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Virgen de la Hiniesta', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Reo de Muerte', 'Nicolás Miguel Barbero Rivas', 'Marcha', null::integer, null::text, null::text),
    ('Virgen de la Paz', null::text, 'Marcha', null::integer, 'El título se usa en varias marchas; falta confirmar cuál interpreta la agrupación.', null::text),
    ('Por Mí, Cautivo', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Sueños de Luna Gitana', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Jesús del Prendimiento', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Tras de Ti, mi Cautivo', null::text, 'Marcha', null::integer, null::text, null::text),
    ('... Y Contigo hasta el Cielo', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Y al Tercer Día', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Virgen de las Angustias', null::text, 'Marcha', null::integer, 'El título corresponde a obras distintas; falta confirmar cuál interpreta la agrupación.', null::text),
    ('Penitentes de Sevillana', null::text, 'Marcha', null::integer, null::text, null::text),
    ('Redención, Pasión y Amargura', null::text, 'Marcha', null::integer, null::text, null::text),
    ('En Vos Confío', null::text, 'Marcha', null::integer, null::text, 'https://youtu.be/HN7ailnbUMI'),
    ('Oh Pecador', null::text, 'Marcha', null::integer, null::text, 'https://youtu.be/PiGNcdbxjqA'),
    ('Tu Dulce Rostro Cautivo', null::text, 'Marcha', null::integer, null::text, 'https://youtu.be/T7rKytDQdVU'),
    ('Junto a Ti', null::text, 'Marcha', null::integer, null::text, 'https://youtu.be/xwhyvBM9W5E'),
    ('Tú Eres Victoria', null::text, 'Marcha', 2026, 'Estreno 2026.', null::text),
    ('Alma Mater', null::text, 'Marcha', 2026, 'Estreno 2026.', null::text)
),
normalized_candidates as (
  select candidate.*,
         case
           when normalized_title in ('entrandoenjerusalem', 'entrandoenjerusalen') then 'entrandoenjerusalem'
           else normalized_title
         end as match_title
    from (
      select candidates.*,
             regexp_replace(
               translate(lower(btrim(titulo)), 'áéíóúüñ', 'aeiouun'),
               '[^a-z0-9]',
               '',
               'g'
             ) as normalized_title
        from candidates
    ) as candidate
),
normalized_existing as (
  select existing.id,
         case
           when normalized_title in ('entrandoenjerusalem', 'entrandoenjerusalen') then 'entrandoenjerusalem'
           else normalized_title
         end as match_title
    from (
      select id,
             regexp_replace(
               translate(lower(btrim(titulo)), 'áéíóúüñ', 'aeiouun'),
               '[^a-z0-9]',
               '',
               'g'
             ) as normalized_title
        from public.repertoire
    ) as existing
),
inserted as (
  insert into public.repertoire (titulo, autor, categoria, anio, descripcion, video_url)
  select candidate.titulo, candidate.autor, candidate.categoria, candidate.anio, candidate.descripcion, candidate.video_url
    from normalized_candidates as candidate
   where candidate.match_title <> ''
     and not exists (
       select 1
         from normalized_existing as existing
        where existing.match_title = candidate.match_title
     )
  returning titulo
)
select titulo as marcha_insertada
  from inserted
 order by titulo;

commit;
