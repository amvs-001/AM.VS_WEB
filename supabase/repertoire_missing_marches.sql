-- Adds only the requested marches that are not already in public.repertoire.
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

with candidates (titulo, autor, categoria, anio, descripcion) as (
  values
    ('Cautivo ante Pilatos', 'Mario Infante Jurado', 'Marcha', 2014, null::text),
    ('A la Gloria', null::text, 'Marcha', null::integer, null::text),
    ('Ave María', null::text, 'Marcha', null::integer, null::text),
    ('Consuelo Gitano', 'Antonio Velasco Rodríguez', 'Marcha', null::integer, null::text),
    ('Costalero', null::text, 'Marcha', null::integer, null::text),
    ('Caridad del Guadalquivir', 'Francisco Joaquín Pérez Garrido (Paco Lola)', 'Marcha', null::integer, 'Instrumentada para banda por Juan José Puntas Fernández.'),
    ('Cerca de Ti', null::text, 'Marcha', null::integer, null::text),
    ('Callejuela de la O', 'Francisco Joaquín Pérez Garrido (Paco Lola)', 'Marcha', null::integer, 'Arreglos musicales de Martín Salas Martínez.'),
    ('Beso y Traición', null::text, 'Marcha', null::integer, null::text),
    ('Christus Vincit', null::text, 'Marcha', null::integer, null::text),
    ('Esperanos en el Cielo', null::text, 'Marcha', null::integer, null::text),
    ('A los Pies de Sor Angela', null::text, 'Marcha', null::integer, null::text),
    ('Costaleros del Amor', null::text, 'Marcha', null::integer, null::text),
    ('Morenita y Pequeñita', null::text, 'Marcha', null::integer, null::text),
    ('La Saeta', 'Joan Manuel Serrat (canción original)', 'Marcha', null::integer, 'Autor y año del arreglo procesional pendientes de confirmar.'),
    ('Estrella Menciana', null::text, 'Marcha', null::integer, null::text),
    ('La Oración en el Huerto', null::text, 'Marcha', null::integer, null::text),
    ('Himno Virgen del Rosario', null::text, 'Marcha', null::integer, null::text),
    ('Madre de los Creyentes', null::text, 'Marcha', null::integer, null::text),
    ('Anima Christi', null::text, 'Marcha', null::integer, null::text),
    ('Mi Amargura', null::text, 'Marcha', null::integer, 'Hay obras distintas con este título; autoría y año pendientes de identificar para esta versión.'),
    ('Estrella, Reina del Cielo', null::text, 'Marcha', null::integer, null::text),
    ('Nuestro Padre Jesús de la Victoria', null::text, 'Marcha', null::integer, null::text),
    ('Oración', null::text, 'Marcha', null::integer, null::text),
    ('Judería Sevillana', null::text, 'Marcha', null::integer, null::text),
    ('Al Señor del Rescate', null::text, 'Marcha', null::integer, null::text),
    ('Oración Redentora', null::text, 'Marcha', null::integer, null::text),
    ('Pasan los Campanilleros', 'Manuel López Farfán', 'Marcha', 1924, null::text),
    ('Señor de San Román', null::text, 'Marcha', null::integer, null::text),
    ('Presentado a Sevilla', 'Antonio José López Escalante', 'Marcha', null::integer, null::text),
    ('Soledad Menciana', null::text, 'Marcha', null::integer, null::text),
    ('Soledad y Esperanza', null::text, 'Marcha', null::integer, null::text),
    ('Virgen de la Hiniesta', null::text, 'Marcha', null::integer, null::text),
    ('Reo de Muerte', 'Nicolás Miguel Barbero Rivas', 'Marcha', null::integer, null::text),
    ('Virgen de la Paz', null::text, 'Marcha', null::integer, 'El título se usa en varias marchas; falta confirmar cuál interpreta la agrupación.'),
    ('Por Mí, Cautivo', null::text, 'Marcha', null::integer, null::text),
    ('Sueños de Luna Gitana', null::text, 'Marcha', null::integer, null::text),
    ('Jesús del Prendimiento', null::text, 'Marcha', null::integer, null::text),
    ('Tras de Ti, mi Cautivo', null::text, 'Marcha', null::integer, null::text),
    ('... Y Contigo hasta el Cielo', null::text, 'Marcha', null::integer, null::text),
    ('Y al Tercer Día', null::text, 'Marcha', null::integer, null::text),
    ('Virgen de las Angustias', null::text, 'Marcha', null::integer, 'El título corresponde a obras distintas; falta confirmar cuál interpreta la agrupación.'),
    ('Penitentes de Sevillana', null::text, 'Marcha', null::integer, null::text),
    ('Redención, Pasión y Amargura', null::text, 'Marcha', null::integer, null::text),
    ('Tú Eres Victoria', null::text, 'Marcha', 2026, 'Estreno 2026.'),
    ('Alma Mater', null::text, 'Marcha', 2026, 'Estreno 2026.')
),
inserted as (
  insert into public.repertoire (titulo, autor, categoria, anio, descripcion)
  select candidate.titulo, candidate.autor, candidate.categoria, candidate.anio, candidate.descripcion
    from candidates as candidate
   where not exists (
     select 1
       from public.repertoire as existing
      where regexp_replace(
              translate(lower(btrim(existing.titulo)), 'áéíóúüñ', 'aeiouun'),
              '[^a-z0-9]',
              '',
              'g'
            ) = regexp_replace(
              translate(lower(btrim(candidate.titulo)), 'áéíóúüñ', 'aeiouun'),
              '[^a-z0-9]',
              '',
              'g'
            )
   )
  returning titulo
)
select titulo as marcha_insertada
  from inserted
 order by titulo;

commit;
