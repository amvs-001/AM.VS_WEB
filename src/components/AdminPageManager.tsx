import { type FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CustomPageItem, SiteVisibility } from '../types';

const visibilityOptions: { key: keyof SiteVisibility; label: string; setting: string }[] = [
  { key: 'history', label: 'Historia', setting: 'visibility_history' },
  { key: 'repertoire', label: 'Repertorio (página completa)', setting: 'visibility_repertoire' },
  { key: 'repertoireMarches', label: 'Marchas procesionales (apartado)', setting: 'visibility_repertoire_marches' },
  { key: 'events', label: 'Actuaciones', setting: 'visibility_events' },
  { key: 'gallery', label: 'Galería', setting: 'visibility_gallery' },
  { key: 'members', label: 'Componentes', setting: 'visibility_members' },
  { key: 'sponsors', label: 'Patrocinadores', setting: 'visibility_sponsors' },
  { key: 'contact', label: 'Contacto', setting: 'visibility_contact' },
];

type PageForm = {
  id: string;
  titulo: string;
  slug: string;
  subtitulo: string;
  contenido: string;
  visible: boolean;
};

function emptyPageForm(): PageForm {
  return { id: '', titulo: '', slug: '', subtitulo: '', contenido: '', visible: true };
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapPage(row: {
  id: string;
  titulo: string;
  slug: string;
  subtitulo: string;
  contenido: string;
  visible: boolean;
}): CustomPageItem {
  return {
    id: row.id,
    title: row.titulo,
    slug: row.slug,
    subtitle: row.subtitulo,
    content: row.contenido,
    visible: row.visible,
  };
}

export default function AdminPageManager({
  visibility,
  onPublished,
}: {
  visibility: SiteVisibility;
  onPublished: () => void;
}) {
  const [visiblePages, setVisiblePages] = useState(visibility);
  const [pages, setPages] = useState<CustomPageItem[]>([]);
  const [pageForm, setPageForm] = useState<PageForm>(emptyPageForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [busyVisibility, setBusyVisibility] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => setVisiblePages(visibility), [visibility]);

  useEffect(() => {
    let isMounted = true;

    async function loadPages() {
      if (!supabase) {
        setError('Supabase no está configurado; no se pueden cargar las páginas.');
        setIsLoadingPages(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from('custom_pages')
        .select('id, titulo, slug, subtitulo, contenido, visible')
        .order('titulo', { ascending: true });

      if (!isMounted) return;
      if (loadError) {
        setError(`No se pudieron cargar las páginas: ${loadError.message}. Ejecuta supabase/admin_panel_setup.sql en Supabase.`);
      } else {
        setPages((data ?? []).map(mapPage));
      }
      setIsLoadingPages(false);
    }

    void loadPages();
    return () => {
      isMounted = false;
    };
  }, []);

  async function loadPages() {
    if (!supabase) return;
    setIsLoadingPages(true);
    const { data, error: loadError } = await supabase
      .from('custom_pages')
      .select('id, titulo, slug, subtitulo, contenido, visible')
      .order('titulo', { ascending: true });
    if (loadError) {
      setError(`No se pudieron actualizar las páginas: ${loadError.message}`);
    } else {
      setPages((data ?? []).map(mapPage));
    }
    setIsLoadingPages(false);
  }

  async function setVisibility(key: keyof SiteVisibility, nextVisible: boolean) {
    if (!supabase) {
      setError('Supabase no está configurado; no se puede guardar la visibilidad.');
      return;
    }

    const option = visibilityOptions.find((item) => item.key === key);
    if (!option) return;

    setBusyVisibility(key);
    setError('');
    setMessage('');
    const { error: saveError } = await supabase.from('site_settings').upsert(
      { clave: option.setting, valor: String(nextVisible) },
      { onConflict: 'clave' },
    );
    if (saveError) {
      setError(`No se pudo cambiar la visibilidad de «${option.label}»: ${saveError.message}`);
      setBusyVisibility('');
      return;
    }

    setVisiblePages((current) => ({ ...current, [key]: nextVisible }));
    setMessage(`«${option.label}» ahora está ${nextVisible ? 'visible' : 'oculta'}.`);
    onPublished();
    setBusyVisibility('');
  }

  async function setCustomPageVisibility(page: CustomPageItem, nextVisible: boolean) {
    if (!supabase) {
      setError('Supabase no está configurado; no se puede guardar la visibilidad.');
      return;
    }

    setBusyVisibility(page.id);
    setError('');
    setMessage('');
    const { error: saveError } = await supabase
      .from('custom_pages')
      .update({ visible: nextVisible, updated_at: new Date().toISOString() })
      .eq('id', page.id);
    if (saveError) {
      setError(`No se pudo cambiar la visibilidad de «${page.title}»: ${saveError.message}`);
      setBusyVisibility('');
      return;
    }

    setPages((current) => current.map((item) => (
      item.id === page.id ? { ...item, visible: nextVisible } : item
    )));
    setMessage(`«${page.title}» ahora está ${nextVisible ? 'visible' : 'oculta'}.`);
    onPublished();
    setBusyVisibility('');
  }

  function startCreatePage() {
    setPageForm(emptyPageForm());
    setIsFormOpen(true);
    setError('');
    setMessage('');
  }

  function editPage(page: CustomPageItem) {
    setPageForm({
      id: page.id,
      titulo: page.title,
      slug: page.slug,
      subtitulo: page.subtitle,
      contenido: page.content,
      visible: page.visible,
    });
    setIsFormOpen(true);
    setError('');
    setMessage('');
  }

  async function savePage(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError('Supabase no está configurado; no se puede guardar la página.');
      return;
    }

    const titulo = pageForm.titulo.trim();
    const slug = slugify(pageForm.slug || titulo);
    const contenido = pageForm.contenido.trim();
    if (!titulo || !slug || !contenido) {
      setError('Indica un título, una URL válida y el contenido de la página.');
      return;
    }

    setIsSavingPage(true);
    setError('');
    setMessage('');
    const values = {
      titulo,
      slug,
      subtitulo: pageForm.subtitulo.trim(),
      contenido,
      visible: pageForm.visible,
      updated_at: new Date().toISOString(),
    };
    const result = pageForm.id
      ? await supabase.from('custom_pages').update(values).eq('id', pageForm.id)
      : await supabase.from('custom_pages').insert(values);
    if (result.error) {
      setError(`No se pudo guardar la página: ${result.error.message}`);
      setIsSavingPage(false);
      return;
    }

    setMessage(pageForm.id ? 'Página actualizada.' : 'Página creada.');
    setIsFormOpen(false);
    setPageForm(emptyPageForm());
    await loadPages();
    onPublished();
    setIsSavingPage(false);
  }

  return (
    <section className="admin-page-manager">
      <div className="admin-page-manager-header">
        <div>
          <h2>Gestionar páginas</h2>
          <p>Oculta o muestra páginas y apartados, o crea páginas nuevas para el menú.</p>
        </div>
        <button type="button" className="button primary" onClick={startCreatePage}>Crear página</button>
      </div>

      <h3>Páginas y apartados del sitio</h3>
      <div className="managed-pages-list">
        {visibilityOptions.map(({ key, label }) => (
          <article key={key} className="managed-page-row">
            <div className="managed-page-info">
              <strong>{label}</strong>
              <span className={visiblePages[key] ? 'visibility-state is-visible' : 'visibility-state'}>
                {visiblePages[key] ? 'Visible' : 'Oculta'}
              </span>
            </div>
            <div className="managed-page-actions">
              <button
                type="button"
                className="button secondary"
                disabled={visiblePages[key] || busyVisibility === key}
                onClick={() => { void setVisibility(key, true); }}
              >
                Mostrar
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={!visiblePages[key] || busyVisibility === key}
                onClick={() => { void setVisibility(key, false); }}
              >
                Ocultar
              </button>
            </div>
          </article>
        ))}
      </div>

      <h3 className="custom-pages-heading">Páginas creadas</h3>
      {isLoadingPages ? <p role="status">Cargando páginas…</p> : null}
      {!isLoadingPages && pages.length === 0 ? <p>Aún no has creado páginas.</p> : null}
      <div className="managed-pages-list">
        {pages.map((page) => (
          <article key={page.id} className="managed-page-row">
            <div className="managed-page-info">
              <strong>{page.title}</strong>
              <span>/pagina/{page.slug}</span>
              <span className={page.visible ? 'visibility-state is-visible' : 'visibility-state'}>
                {page.visible ? 'Visible' : 'Oculta'}
              </span>
            </div>
            <div className="managed-page-actions">
              <button type="button" className="button secondary" onClick={() => editPage(page)}>Editar</button>
              <button
                type="button"
                className="button secondary"
                disabled={busyVisibility === page.id || page.visible}
                onClick={() => { void setCustomPageVisibility(page, true); }}
              >
                Mostrar
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busyVisibility === page.id || !page.visible}
                onClick={() => { void setCustomPageVisibility(page, false); }}
              >
                Ocultar
              </button>
            </div>
          </article>
        ))}
      </div>

      {isFormOpen ? (
        <form className="custom-page-form" onSubmit={(event) => { void savePage(event); }}>
          <h3>{pageForm.id ? 'Editar página' : 'Crear página'}</h3>
          <div className="field-grid">
            <label>
              Título
              <input
                required
                value={pageForm.titulo}
                onChange={(event) => {
                  const titulo = event.target.value;
                  setPageForm((current) => ({
                    ...current,
                    titulo,
                    slug: current.slug === slugify(current.titulo) ? slugify(titulo) : current.slug,
                  }));
                }}
              />
            </label>
            <label>
              URL
              <input required value={pageForm.slug} onChange={(event) => setPageForm((current) => ({ ...current, slug: slugify(event.target.value) }))} />
              <span className="helper-text">Se publicará como /pagina/{pageForm.slug || 'url-de-la-pagina'}.</span>
            </label>
            <label className="full-width">
              Subtítulo
              <input value={pageForm.subtitulo} onChange={(event) => setPageForm((current) => ({ ...current, subtitulo: event.target.value }))} />
            </label>
            <label className="full-width">
              Contenido
              <textarea required rows={8} value={pageForm.contenido} onChange={(event) => setPageForm((current) => ({ ...current, contenido: event.target.value }))} />
            </label>
            <label className="visibility-option">
              <input type="checkbox" checked={pageForm.visible} onChange={(event) => setPageForm((current) => ({ ...current, visible: event.target.checked }))} />
              <span>Mostrar esta página en el menú al guardar</span>
            </label>
          </div>
          <div className="managed-page-actions">
            <button type="submit" className="button primary" disabled={isSavingPage}>{isSavingPage ? 'Guardando…' : pageForm.id ? 'Guardar cambios' : 'Crear página'}</button>
            <button type="button" className="button secondary" disabled={isSavingPage} onClick={() => setIsFormOpen(false)}>Cancelar</button>
          </div>
        </form>
      ) : null}

      {error ? <p className="error-text" role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
