-- Datos iniciales mínimos. Reemplaza o amplía con contenido real cuando se disponga de la información oficial.
insert into site_settings (clave, valor) values
  ('site_name', 'Agrupación Musical Virgen de la Soledad de Doña Mencía'),
  ('site_siglas', 'AM VS'),
  ('site_director', 'Pedro López'),
  ('site_locality', 'Doña Mencía, Córdoba, Andalucía, España'),
  ('site_phone', '+34 699 14 26 01'),
  ('site_rehearsal_address', 'Cerca de C. el Jardinito, 13, 14860 Doña Mencía, Córdoba'),
  ('site_history', 'A finales de la Semana Santa de 2008 surgió la idea de crear una agrupación musical a partir de la antigua banda de la Cofradía de Nuestra Señora de la Soledad y Esperanza de Doña Mencía.'),
  ('site_values', 'Tradición;Juventud;Devoción')
on conflict (clave) do nothing;

insert into timeline (anio, titulo, descripcion, orden)
select seed.anio, seed.titulo, seed.descripcion, seed.orden
from (values
  ('2008', 'Nacimiento de la agrupación', 'Se crea la idea de formar una nueva agrupación musical a partir de la antigua banda de la Cofradía de Nuestra Señora de la Soledad y Esperanza.', 1),
  ('2008', 'Primeros ensayos', 'Comienzan clases de solfeo y primeros ensayos con la dirección de Manolo Luque.', 2),
  ('2008', 'Primera salida procesional', 'La agrupación acompaña a la cruz guía de la Cofradía en el Sábado de Gloria.', 3),
  ('2010', 'Padrinazgo', 'Se produce el padrinazgo por parte de la A.M. Nuestro Padre Jesús de los Afligidos, de Puente Genil.', 4)
) as seed(anio, titulo, descripcion, orden)
where not exists (
  select 1
  from timeline existing
  where btrim(existing.anio) = btrim(seed.anio)
    and lower(btrim(existing.titulo)) = lower(btrim(seed.titulo))
);

insert into events (titulo, descripcion, localidad, tipo, estado, fecha)
select seed.titulo, seed.descripcion, seed.localidad, seed.tipo, seed.estado, seed.fecha
from (values
  ('Sábado de Gloria', 'Actuación habitual de la agrupación en Doña Mencía.', 'Doña Mencía', 'Procesión', 'celebrada', null::date),
  ('Certámenes de Cuaresma', 'Participación en certámenes y actos de Cuaresma.', 'Doña Mencía', 'Certámenes', 'proxima', null::date)
) as seed(titulo, descripcion, localidad, tipo, estado, fecha)
where not exists (
  select 1
  from events existing
  where lower(btrim(existing.titulo)) = lower(btrim(seed.titulo))
    and lower(btrim(coalesce(existing.localidad, ''))) = lower(btrim(seed.localidad))
);

insert into repertoire (titulo, autor, categoria, descripcion)
select seed.titulo, seed.autor, seed.categoria, seed.descripcion
from (values
  ('Suena la Soledad', 'Director', 'Marcha', 'Marcha de paso ordinario compuesta por el director.'),
  ('Candela', 'Director', 'Composición', 'Composición realizada por el director para su hija.'),
  ('Himno Nacional de España', 'Tradicional', 'Himno', 'Obra incluida en el repertorio de la agrupación.')
) as seed(titulo, autor, categoria, descripcion)
where not exists (
  select 1
  from repertoire existing
  where regexp_replace(
          translate(lower(btrim(existing.titulo)), 'áéíóúüñ', 'aeiouun'),
          '[^a-z0-9]',
          '',
          'g'
        ) = regexp_replace(
          translate(lower(btrim(seed.titulo)), 'áéíóúüñ', 'aeiouun'),
          '[^a-z0-9]',
          '',
          'g'
        )
);
