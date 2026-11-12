import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const editableSections = [
  { table: 'site_settings', label: 'Textos y datos del sitio', page: 'Inicio y contacto' },
  { table: 'timeline', label: 'Historia', page: 'Historia' },
  { table: 'events', label: 'Actuaciones', page: 'Actuaciones' },
  { table: 'repertoire', label: 'Repertorio', page: 'Repertorio' },
  { table: 'gallery_albums', label: 'Galería', page: 'Galería' },
  { table: 'gallery_items', label: 'Fotos y vídeos de galería', page: 'Galería' },
  { table: 'members', label: 'Componentes', page: 'Componentes' },
  { table: 'sponsors', label: 'Patrocinadores', page: 'Patrocinadores' },
] as const;

type EditableSection = (typeof editableSections)[number]['table'];
type JsonRecord = Record<string, unknown>;

type DraftRecord = {
  id: string;
  seccion: string;
  titulo: string;
  payload: JsonRecord;
  updated_at: string;
};

type NewsForm = {
  id: string;
  titulo: string;
  slug: string;
  resumen: string;
  contenido: string;
  categoria: string;
  imagen: string;
  programada_para: string;
};

type ActivePanel = 'content' | 'news';

function canManageAllContent(role: string): boolean {
  return role === 'Superadministrador' || role === 'Administrador';
}

function canManageSiteSettings(role: string): boolean {
  return role === 'Superadministrador';
}

const emptyNews: NewsForm = {
  id: '',
  titulo: '',
  slug: '',
  resumen: '',
  contenido: '',
  categoria: 'General',
  imagen: '',
  programada_para: '',
};

function defaultRecord(section: EditableSection): JsonRecord {
  switch (section) {
    case 'site_settings':
      return { clave: 'site_home_intro', valor: '' };
    case 'timeline':
      return { anio: new Date().getFullYear().toString(), titulo: '', descripcion: '', imagen: '', orden: 0 };
    case 'events':
      return { titulo: '', descripcion: '', localidad: '', tipo: 'Procesión', estado: 'proxima', fecha: null, imagen: '' };
    case 'repertoire':
      return { titulo: '', autor: '', categoria: 'Marcha', descripcion: '', imagen_url: '', audio_url: '', video_url: '' };
    case 'gallery_albums':
      return { titulo: '', descripcion: '', categoria: 'Semana Santa', fecha: new Date().toISOString().slice(0, 10), portada: '' };
    case 'gallery_items':
      return { album_id: '', titulo: '', descripcion: '', archivo_url: '', tipo: 'image', orden: 0 };
    case 'members':
      return { nombre: '', instrumento: '', seccion: '', cargo: '', fotografia: '', visible: true, orden: 0 };
    case 'sponsors':
      return { nombre: '', descripcion: '', logotipo: '', enlace: '', activo: true, orden: 0 };
  }
}

function recordTitle(section: string, value: JsonRecord): string {
  const title = value.titulo ?? value.clave ?? value.nombre ?? value.id;
  return typeof title === 'string' && title.trim() ? title : `Nuevo registro (${section})`;
}

function fieldLabel(value: string): string {
  const labels: Record<string, string> = {
    clave: 'Clave del contenido',
    valor: 'Texto',
    titulo: 'Título',
    descripcion: 'Descripción',
    anio: 'Año',
    orden: 'Orden',
    localidad: 'Localidad',
    imagen: 'Imagen (URL)',
    imagen_url: 'Imagen (URL)',
    audio_url: 'Audio (URL)',
    video_url: 'Vídeo (URL)',
    tipo: 'Tipo',
    estado: 'Estado',
    fecha: 'Fecha',
    autor: 'Autor',
    categoria: 'Categoría',
    portada: 'Portada (URL)',
    album_id: 'Álbum',
    archivo_url: 'Archivo multimedia (URL)',
    nombre: 'Nombre',
    instrumento: 'Instrumento',
    seccion: 'Sección',
    cargo: 'Cargo',
    fotografia: 'Fotografía (URL)',
    visible: 'Visible públicamente',
    logotipo: 'Logotipo (URL)',
    enlace: 'Enlace web',
    activo: 'Activo públicamente',
  };
  return labels[value] ?? value.replace(/_/g, ' ');
}

function fieldOptions(section: EditableSection, key: string): string[] | null {
  if (section === 'events' && key === 'estado') return ['proxima', 'celebrada', 'cancelada'];
  if (section === 'events' && key === 'tipo') return ['Procesión', 'Semana Santa', 'Certámenes', 'Concierto', 'Especial'];
  if (section === 'gallery_albums' && key === 'categoria') {
    return ['Semana Santa', 'Sábado de Gloria', 'Certámenes', 'Conciertos', 'Ensayos', 'Eventos especiales'];
  }
  if (section === 'repertoire' && key === 'categoria') return ['Marcha', 'Composición', 'Himno'];
  return null;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toLocalDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function AdminContentEditor({
  userId,
  role,
  onPublished,
}: {
  userId: string;
  role: string;
  onPublished: () => void;
}) {
  const [section, setSection] = useState<EditableSection>(() => canManageSiteSettings(role) ? 'site_settings' : 'repertoire');
  const [activePanel, setActivePanel] = useState<ActivePanel>('content');
  const [rows, setRows] = useState<JsonRecord[]>([]);
  const [galleryAlbums, setGalleryAlbums] = useState<JsonRecord[]>([]);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [recordJson, setRecordJson] = useState(JSON.stringify(defaultRecord('site_settings'), null, 2));
  const [newsRows, setNewsRows] = useState<JsonRecord[]>([]);
  const [newsForm, setNewsForm] = useState<NewsForm>(emptyNews);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const sectionLabel = useMemo(
    () => editableSections.find((item) => item.table === section)?.label ?? section,
    [section],
  );
  const availableSections = canManageSiteSettings(role)
    ? editableSections
    : canManageAllContent(role)
      ? editableSections.filter((item) => item.table !== 'site_settings')
      : editableSections.filter((item) => item.table === 'repertoire');
  const availableDrafts = drafts.filter((draft) =>
    availableSections.some((item) => item.table === draft.seccion)
      || (canManageAllContent(role) && draft.seccion === 'news'),
  );
  const recordValue = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(recordJson);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonRecord : null;
    } catch {
      return null;
    }
  }, [recordJson]);

  useEffect(() => {
    void loadDrafts();
  }, [userId]);

  useEffect(() => {
    void loadSection(section);
  }, [section]);

  async function loadDrafts() {
    if (!supabase) return;
    const { data, error: loadError } = await supabase
      .from('content_drafts')
      .select('id, seccion, titulo, payload, updated_at')
      .eq('actualizado_por', userId)
      .order('updated_at', { ascending: false });
    if (loadError) {
      setError(`No se pudieron cargar los borradores: ${loadError.message}`);
      return;
    }
    setDrafts((data ?? []) as DraftRecord[]);
  }

  async function loadSection(target: EditableSection) {
    if (!supabase) return;
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const { data, error: queryError } = await supabase.from(target).select('*');
      if (queryError) throw queryError;
      setRows((data ?? []) as JsonRecord[]);
      if (target === 'gallery_items') {
        const { data: albums, error: albumsError } = await supabase
          .from('gallery_albums')
          .select('id, titulo')
          .order('titulo');
        if (albumsError) throw albumsError;
        setGalleryAlbums((albums ?? []) as JsonRecord[]);
      }
    } catch (loadError) {
      setError(`No se pudo cargar ${target}: ${loadError instanceof Error ? loadError.message : 'error desconocido'}`);
      setRows([]);
    } finally {
      setIsLoading(false);
    }

  }

  async function loadNews() {
    if (!supabase) return;
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const { data, error: queryError } = await supabase.from('news').select('*').order('created_at', { ascending: false });
      if (queryError) throw queryError;
      setNewsRows((data ?? []) as JsonRecord[]);
    } catch (loadError) {
      setError(`No se pudieron cargar las noticias: ${loadError instanceof Error ? loadError.message : 'error desconocido'}`);
      setNewsRows([]);
    } finally {
      setIsLoading(false);
    }
  }

  function startNewRecord() {
    setSelectedRecordId('');
    setSelectedDraftId('');
    setRecordJson(JSON.stringify(defaultRecord(section), null, 2));
    setMessage('');
    setError('');
  }

  function updateRecordField(field: string, value: unknown) {
    updateRecordFields({ [field]: value });
  }

  function updateRecordFields(values: JsonRecord) {
    if (!recordValue) return;
    setRecordJson(JSON.stringify({ ...recordValue, ...values }, null, 2));
  }

  function openSection(target: EditableSection) {
    setActivePanel('content');
    setSection(target);
    setSelectedDraftId('');
    setSelectedRecordId('');
    setRecordJson(JSON.stringify(defaultRecord(target), null, 2));
    setPreviewOpen(false);
    setMessage('');
    setError('');
  }

  function chooseRecord(row: JsonRecord) {
    setSelectedRecordId(typeof row.id === 'string' ? row.id : String(row.clave ?? ''));
    setSelectedDraftId('');
    setRecordJson(JSON.stringify(row, null, 2));
    setMessage('');
    setError('');
  }

  function chooseDraft(draft: DraftRecord) {
    setSelectedDraftId(draft.id);
    setMessage('');
    setError('');
    if (draft.seccion === 'news') {
      setActivePanel('news');
      setNewsForm({
        ...emptyNews,
        ...(draft.payload as Partial<NewsForm>),
        id: String(draft.payload.id ?? ''),
        programada_para: toLocalDateTime(typeof draft.payload.programada_para === 'string' ? draft.payload.programada_para : ''),
      });
      setRecordJson('');
      setPreviewOpen(true);
      return;
    }
    if (editableSections.some((item) => item.table === draft.seccion)) {
      setActivePanel('content');
      setSection(draft.seccion as EditableSection);
      setRecordJson(JSON.stringify(draft.payload, null, 2));
      setSelectedRecordId(typeof draft.payload.id === 'string' ? draft.payload.id : String(draft.payload.clave ?? ''));
      return;
    }
    setError('El borrador tiene una sección no compatible con este panel.');
  }

  async function saveDraft(target: string, title: string, payload: JsonRecord, existingId = '') {
    if (!supabase) return;
    setIsSaving(true);
    setError('');
    setMessage('');
    const draftId = existingId || crypto.randomUUID();
    const { error: saveError } = await supabase.from('content_drafts').upsert({
      id: draftId,
      seccion: target,
      titulo: title,
      payload,
      actualizado_por: userId,
      updated_at: new Date().toISOString(),
    });
    if (saveError) {
      setError(`No se pudo guardar el borrador: ${saveError.message}`);
    } else {
      setSelectedDraftId(draftId);
      setMessage('Borrador guardado. Aún no se ha publicado.');
      await loadDrafts();
    }
    setIsSaving(false);
  }

  async function deleteSelectedNews() {
    if (!supabase || !newsForm.id) return;
    if (!window.confirm(`¿Seguro que quieres eliminar la noticia «${newsForm.titulo}»? Esta acción no se puede deshacer.`)) return;

    setIsSaving(true);
    setError('');
    setMessage('');
    const { error: deleteError } = await supabase.from('news').delete().eq('id', newsForm.id);
    if (deleteError) {
      setError(`No se pudo eliminar la noticia: ${deleteError.message}`);
      setIsSaving(false);
      return;
    }
    startNews();
    setMessage('Noticia eliminada correctamente.');
    await loadNews();
    onPublished();
    setIsSaving(false);
  }

  async function saveRecordDraft(event: FormEvent) {
    event.preventDefault();
    setError('');
    let payload: JsonRecord;
    try {
      const parsed: unknown = JSON.parse(recordJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('El contenido debe ser un objeto JSON.');
      }
      payload = parsed as JsonRecord;
      if (section === 'site_settings' && (typeof payload.clave !== 'string' || typeof payload.valor !== 'string')) {
        throw new Error('En datos del sitio hacen falta los campos de texto "clave" y "valor".');
      }
      if (section !== 'site_settings' && typeof payload.titulo !== 'string' && typeof payload.nombre !== 'string') {
        throw new Error('El registro necesita un campo "titulo" o "nombre".');
      }
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'JSON no válido.');
      return;
    }
    await saveDraft(section, recordTitle(section, payload), payload, selectedDraftId);
  }

  async function publishRecordDraft() {
    if (!supabase) return;
    let payload: JsonRecord;
    try {
      const parsed: unknown = JSON.parse(recordJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('El contenido debe ser un objeto JSON.');
      payload = parsed as JsonRecord;
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'JSON no válido.');
      return;
    }
    if (section === 'site_settings' && (typeof payload.clave !== 'string' || typeof payload.valor !== 'string')) {
      setError('En datos del sitio hacen falta los campos de texto "clave" y "valor".');
      return;
    }
    if (section === 'gallery_items' && (!payload.album_id || !payload.archivo_url)) {
      setError('Selecciona un álbum y sube una imagen o un vídeo antes de publicar.');
      return;
    }
    setIsSaving(true);
    setError('');
    setMessage('');
    const options = section === 'site_settings' ? { onConflict: 'clave' } : undefined;
    const { error: publishError } = await supabase.from(section).upsert(payload, options);
    if (publishError) {
      setError(`No se pudieron publicar los cambios: ${publishError.message}`);
      setIsSaving(false);
      return;
    }
    if (selectedDraftId) {
      const { error: deleteError } = await supabase.from('content_drafts').delete().eq('id', selectedDraftId).eq('actualizado_por', userId);
      if (deleteError) {
        setError(`El contenido se publicó, pero no se pudo borrar el borrador: ${deleteError.message}`);
        setIsSaving(false);
        await loadSection(section);
        onPublished();
        return;
      }
    }
    setMessage('Cambios publicados correctamente.');
    setSelectedDraftId('');
    await loadSection(section);
    await loadDrafts();
    onPublished();
    setIsSaving(false);
  }

  async function deleteSelectedRecord() {
    if (!supabase || !recordValue) return;
    const identityColumn = section === 'site_settings' ? 'clave' : 'id';
    const identity = recordValue[identityColumn];
    if (typeof identity !== 'string' && typeof identity !== 'number') {
      setError('No se puede borrar el registro porque no tiene un identificador válido.');
      return;
    }
    if (!window.confirm(`¿Seguro que quieres eliminar «${recordTitle(section, recordValue)}»? Esta acción no se puede deshacer.`)) return;

    setIsSaving(true);
    setError('');
    setMessage('');
    const { error: deleteError } = await supabase.from(section).delete().eq(identityColumn, identity);
    if (deleteError) {
      setError(`No se pudo eliminar el registro: ${deleteError.message}`);
      setIsSaving(false);
      return;
    }
    setSelectedRecordId('');
    setSelectedDraftId('');
    setRecordJson(JSON.stringify(defaultRecord(section), null, 2));
    setMessage('Registro eliminado correctamente.');
    await loadSection(section);
    onPublished();
    setIsSaving(false);
  }

  function startNews() {
    setNewsForm(emptyNews);
    setSelectedDraftId('');
    setMessage('');
    setError('');
  }

  function chooseNews(row: JsonRecord) {
    setSelectedDraftId('');
    setNewsForm({
      id: String(row.id ?? ''),
      titulo: String(row.titulo ?? ''),
      slug: String(row.slug ?? ''),
      resumen: String(row.resumen ?? ''),
      contenido: String(row.contenido ?? ''),
      categoria: String(row.categoria ?? 'General'),
      imagen: String(row.imagen ?? ''),
      programada_para: toLocalDateTime(typeof row.programada_para === 'string' ? row.programada_para : ''),
    });
    setMessage('');
    setError('');
  }

  async function uploadMedia(file: File, onUploaded: (url: string) => void) {
    if (!supabase) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      setError('El archivo debe ser una imagen o un vídeo.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('El archivo supera el límite de 20 MB.');
      return;
    }
    setIsUploading(true);
    setError('');
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('site-media').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      setError(`No se pudo subir el archivo: ${uploadError.message}. Comprueba que se haya aplicado admin_panel_setup.sql.`);
      setIsUploading(false);
      return;
    }
    const { data } = supabase.storage.from('site-media').getPublicUrl(path);
    onUploaded(data.publicUrl);
    setMessage('Archivo subido. Guarda un borrador y publícalo para mostrarlo en la web.');
    setIsUploading(false);
  }

  async function saveNewsDraft(event: FormEvent) {
    event.preventDefault();
    if (!newsForm.titulo.trim() || !newsForm.resumen.trim()) {
      setError('Escribe al menos un titular y una descripción breve.');
      return;
    }
    const payload: JsonRecord = {
      ...newsForm,
      titulo: newsForm.titulo.trim(),
      slug: newsForm.slug.trim() || slugify(newsForm.titulo),
      estado: 'borrador',
      programada_para: newsForm.programada_para ? new Date(newsForm.programada_para).toISOString() : null,
    };
    await saveDraft('news', newsForm.titulo, payload, selectedDraftId);
  }

  async function publishNews(scheduled: boolean) {
    if (!supabase) return;
    if (!newsForm.titulo.trim() || !newsForm.resumen.trim()) {
      setError('Escribe al menos un titular y una descripción breve.');
      return;
    }
    if (scheduled && !newsForm.programada_para) {
      setError('Elige la fecha y hora para programar la noticia.');
      return;
    }
    if (scheduled && new Date(newsForm.programada_para).getTime() <= Date.now()) {
      setError('La fecha programada debe ser posterior a la hora actual.');
      return;
    }
    setIsSaving(true);
    setError('');
    setMessage('');
    const payload = {
      ...(newsForm.id ? { id: newsForm.id } : {}),
      titulo: newsForm.titulo.trim(),
      slug: newsForm.slug.trim() || slugify(newsForm.titulo),
      resumen: newsForm.resumen.trim(),
      contenido: newsForm.contenido.trim(),
      categoria: newsForm.categoria.trim() || 'General',
      imagen: newsForm.imagen || null,
      estado: 'publicada',
      fecha_publicacion: scheduled
        ? newsForm.programada_para.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      programada_para: scheduled ? new Date(newsForm.programada_para).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error: publishError } = await supabase.from('news').upsert(payload);
    if (publishError) {
      setError(`No se pudo publicar la noticia: ${publishError.message}`);
      setIsSaving(false);
      return;
    }
    if (selectedDraftId) {
      const { error: deleteError } = await supabase.from('content_drafts').delete().eq('id', selectedDraftId).eq('actualizado_por', userId);
      if (deleteError) {
        setError(`La noticia se publicó, pero no se pudo borrar el borrador: ${deleteError.message}`);
      }
    }
    setMessage(scheduled ? 'Noticia programada. Aparecerá automáticamente a la hora indicada.' : 'Noticia publicada ahora.');
    setSelectedDraftId('');
    await Promise.all([loadNews(), loadDrafts()]);
    onPublished();
    setIsSaving(false);
  }

  async function handleNewsFile(file: File | undefined) {
    if (!file) return;
    await uploadMedia(file, (url) => setNewsForm((current) => ({ ...current, imagen: url })));
  }

  return (
    <section className="editorial-panel" aria-label="Gestión editorial">
      <div className="editorial-toolbar">
        <div>
          <strong>Editor de contenidos</strong>
          <span>Rol: {role}. Los cambios públicos se aplican al pulsar «Publicar cambios».</span>
        </div>
        <label className="draft-picker">
          Borradores guardados
          <select value={selectedDraftId} onChange={(event) => {
            const draft = drafts.find((item) => item.id === event.target.value);
            if (draft) chooseDraft(draft);
          }}>
            <option value="">Seleccionar borrador…</option>
            {availableDrafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.titulo} · {draft.seccion}</option>)}
          </select>
        </label>
      </div>

      <div className="editorial-tabs" role="tablist" aria-label="Secciones públicas">
        {availableSections.map((item) => (
          <button
            type="button"
            key={item.table}
            className={activePanel === 'content' && section === item.table ? 'is-active' : ''}
            onClick={() => openSection(item.table)}
          >
            {item.label}
          </button>
        ))}
        {canManageAllContent(role) ? (
          <button type="button" className={activePanel === 'news' ? 'is-active' : ''} onClick={() => {
            setActivePanel('news');
            setSelectedDraftId('');
            setPreviewOpen(false);
            void loadNews();
          }}>Noticias</button>
        ) : null}
      </div>

      {message ? <p className="success-message" role="status">{message}</p> : null}
      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <div className="editorial-columns">
        <aside className="editorial-records">
          <div className="editorial-records-heading">
            <h3>{activePanel === 'news' ? 'Noticias' : sectionLabel}</h3>
            {activePanel === 'news'
              ? <button type="button" className="button secondary" onClick={startNews}>Nueva</button>
              : <button type="button" className="button secondary" onClick={startNewRecord}>Nuevo</button>}
          </div>
          {isLoading ? <p role="status">Cargando…</p> : null}
          {activePanel === 'news' ? newsRows.map((row) => (
            <button type="button" key={String(row.id)} className="editorial-record" onClick={() => chooseNews(row)}>
              {String(row.titulo)} · {String(row.estado)}
            </button>
          )) : rows.map((row, index) => {
            const rowId = String(row.id ?? row.clave ?? index);
            return (
              <button
                type="button"
                key={rowId}
                className={`editorial-record ${selectedRecordId === rowId ? 'is-selected' : ''}`}
                onClick={() => chooseRecord(row)}
              >
                {recordTitle(section, row)}
              </button>
            );
          })}
          {activePanel === 'news' && newsRows.length === 0 && !isLoading
            ? <p className="helper-text">Todavía no hay noticias guardadas.</p>
            : activePanel === 'content' && rows.length === 0 && !isLoading
              ? <p className="helper-text">Todavía no hay registros en esta sección.</p>
              : null}
        </aside>

        <div className="editorial-workspace">
          {activePanel === 'news' ? (
            <div className="news-manager">
              <div className="news-manager-heading">
                <div>
                  <h3>Noticias</h3>
                  <p>Guarda borradores, publica al momento o programa una fecha.</p>
                </div>
                <button type="button" className="button secondary" onClick={startNews}>Nueva noticia</button>
              </div>
              <form className="admin-content-form" onSubmit={saveNewsDraft}>
                <div className="field-grid">
                  <label>
                    Titular
                    <input required value={newsForm.titulo} onChange={(event) => {
                      const titulo = event.target.value;
                      setNewsForm((current) => ({ ...current, titulo, slug: current.id ? current.slug : slugify(titulo) }));
                    }} />
                  </label>
                  <label>
                    Categoría
                    <input value={newsForm.categoria} onChange={(event) => setNewsForm((current) => ({ ...current, categoria: event.target.value }))} />
                  </label>
                  <label className="full-width">
                    Descripción breve
                    <textarea required rows={3} value={newsForm.resumen} onChange={(event) => setNewsForm((current) => ({ ...current, resumen: event.target.value }))} />
                  </label>
                  <label className="full-width">
                    Texto completo
                    <textarea rows={7} value={newsForm.contenido} onChange={(event) => setNewsForm((current) => ({ ...current, contenido: event.target.value }))} />
                  </label>
                  <label className="full-width">
                    Imagen o vídeo
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" disabled={isUploading} onChange={(event) => { void handleNewsFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                    <span className="helper-text">Imágenes o vídeos de hasta 20 MB.</span>
                  </label>
                  {newsForm.imagen ? <MediaPreview src={newsForm.imagen} /> : null}
                  <label className="full-width">
                    Programar para
                    <input type="datetime-local" value={newsForm.programada_para} onChange={(event) => setNewsForm((current) => ({ ...current, programada_para: event.target.value }))} />
                  </label>
                </div>
                <div className="editorial-actions">
                  <button type="submit" className="button secondary" disabled={isSaving}>Guardar borrador</button>
                  <button type="button" className="button secondary" onClick={() => setPreviewOpen((current) => !current)}>Vista previa</button>
                  <button type="button" className="button primary" disabled={isSaving || isUploading} onClick={() => { void publishNews(false); }}>Publicar ahora</button>
                  <button type="button" className="button primary" disabled={isSaving || isUploading || !newsForm.programada_para} onClick={() => { void publishNews(true); }}>Programar publicación</button>
                  {newsForm.id ? <button type="button" className="button secondary" disabled={isSaving} onClick={() => { void deleteSelectedNews(); }}>Eliminar noticia</button> : null}
                </div>
              </form>
              {previewOpen ? (
                <article className="news-preview">
                  <span className="card-tag">{newsForm.categoria || 'General'}</span>
                  <h3>{newsForm.titulo || 'Titular de la noticia'}</h3>
                  {newsForm.imagen ? <MediaPreview src={newsForm.imagen} /> : null}
                  <p>{newsForm.resumen || 'La descripción breve aparecerá aquí.'}</p>
                  {newsForm.contenido ? <p>{newsForm.contenido}</p> : null}
                </article>
              ) : null}
            </div>
          ) : (
            <form className="admin-content-form" onSubmit={saveRecordDraft}>
              <div className="editorial-records-heading">
                <div>
                  <h3>{sectionLabel}</h3>
                  <p>Edita o crea el registro que se muestra en «{editableSections.find((item) => item.table === section)?.page}».</p>
                </div>
              </div>
              {['site_settings', 'events', 'timeline', 'repertoire', 'gallery_albums', 'gallery_items', 'members', 'sponsors'].includes(section) && (
                <label className="full-width">
                  {section === 'site_settings' ? 'Subir logo o imagen del sitio' : section === 'gallery_items' ? 'Subir imagen o vídeo' : 'Subir imagen'}
                  <input type="file" accept={section === 'gallery_items'
                    ? 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'
                    : 'image/jpeg,image/png,image/webp,image/gif'} disabled={isUploading} onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadMedia(file, (url) => {
                      if (section === 'site_settings') {
                        setRecordJson(JSON.stringify({ clave: 'site_logo_url', valor: url }, null, 2));
                        setSelectedRecordId('site_logo_url');
                        setSelectedDraftId('');
                      } else {
                        if (section === 'gallery_items') {
                          updateRecordFields({
                            archivo_url: url,
                            tipo: file.type.startsWith('video/') ? 'video' : 'image',
                          });
                        } else {
                          const field = section === 'gallery_albums'
                            ? 'portada'
                            : section === 'repertoire'
                              ? 'imagen_url'
                            : section === 'members'
                              ? 'fotografia'
                              : section === 'sponsors'
                                ? 'logotipo'
                                : 'imagen';
                          updateRecordField(field, url);
                        }
                      }
                    });
                    event.currentTarget.value = '';
                  }} />
                  <span className="helper-text">
                    {section === 'site_settings'
                      ? 'Al publicarlo sustituye el escudo actual. Máximo 20 MB.'
                      : 'El archivo se asocia a este registro al publicar. Máximo 20 MB.'}
                  </span>
                </label>
              )}
              {renderMediaPreview(recordJson)}
              {!recordValue ? <p className="error-text">El borrador no contiene un objeto válido.</p> : (
                <div className="field-grid">
                  {Object.entries(recordValue)
                    .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
                    .map(([key, value]) => (
                      <label key={key} className={['descripcion', 'valor', 'resumen'].includes(key) ? 'full-width' : ''}>
                        {fieldLabel(key)}
                        {typeof value === 'boolean' ? (
                          <input type="checkbox" checked={value} onChange={(event) => updateRecordField(key, event.target.checked)} />
                        ) : typeof value === 'number' ? (
                          <input type="number" value={value} onChange={(event) => updateRecordField(key, Number(event.target.value))} />
                        ) : key === 'fecha' ? (
                          <input type="date" value={typeof value === 'string' ? value : ''} onChange={(event) => updateRecordField(key, event.target.value || null)} />
                        ) : fieldOptions(section, key) ? (
                          <select value={typeof value === 'string' ? value : ''} onChange={(event) => updateRecordField(key, event.target.value)}>
                            {fieldOptions(section, key)?.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : section === 'gallery_items' && key === 'album_id' ? (
                          <select value={typeof value === 'string' ? value : ''} onChange={(event) => updateRecordField(key, event.target.value)}>
                            <option value="">Selecciona un álbum…</option>
                            {galleryAlbums.map((album) => (
                              <option key={String(album.id)} value={String(album.id)}>{String(album.titulo)}</option>
                            ))}
                          </select>
                        ) : section === 'gallery_items' && key === 'tipo' ? (
                          <select value={typeof value === 'string' ? value : 'image'} onChange={(event) => updateRecordField(key, event.target.value)}>
                            <option value="image">Imagen</option>
                            <option value="video">Vídeo</option>
                          </select>
                        ) : typeof value === 'string' && ['descripcion', 'valor', 'resumen'].includes(key) ? (
                          <textarea rows={key === 'valor' ? 5 : 4} value={value} onChange={(event) => updateRecordField(key, event.target.value)} />
                        ) : (
                          <input
                            value={typeof value === 'string' ? value : value === null ? '' : JSON.stringify(value)}
                            onChange={(event) => updateRecordField(key, event.target.value)}
                          />
                        )}
                      </label>
                    ))}
                </div>
              )}
              <div className="editorial-actions">
                <button type="submit" className="button secondary" disabled={isSaving || isUploading}>Guardar borrador</button>
                <button type="button" className="button secondary" onClick={() => setPreviewOpen((current) => !current)}>Vista previa</button>
                <button type="button" className="button primary" disabled={isSaving || isUploading} onClick={() => { void publishRecordDraft(); }}>Publicar cambios</button>
                {selectedRecordId ? <button type="button" className="button secondary" disabled={isSaving} onClick={() => { void deleteSelectedRecord(); }}>Eliminar registro</button> : null}
              </div>
              {previewOpen ? <RecordPreview json={recordJson} /> : null}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function renderMediaPreview(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as JsonRecord;
    const url = record.clave === 'site_logo_url' && typeof record.valor === 'string'
      ? record.valor
      : Object.entries(record).find(([key, candidate]) =>
      /(imagen|logo|portada|fotografia|archivo_url)/i.test(key) && typeof candidate === 'string' && candidate.startsWith('http'),
    )?.[1];
    return typeof url === 'string' ? <MediaPreview src={url} /> : null;
  } catch {
    return null;
  }
}

function RecordPreview({ json }: { json: string }) {
  let value: JsonRecord;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return <p className="error-text">No se puede mostrar la vista previa: revisa el JSON.</p>;
    value = parsed as JsonRecord;
  } catch {
    return <p className="error-text">No se puede mostrar la vista previa: revisa el JSON.</p>;
  }
  const title = recordTitle('', value);
  const description = String(value.descripcion ?? value.valor ?? '');
  const image = value.clave === 'site_logo_url' && typeof value.valor === 'string'
    ? value.valor
    : Object.entries(value).find(([key, candidate]) =>
    /(imagen|logo|portada|fotografia|archivo_url)/i.test(key) && typeof candidate === 'string' && candidate.startsWith('http'),
  )?.[1];
  return (
    <article className="news-preview">
      {typeof image === 'string' ? <MediaPreview src={image} /> : null}
      <h3>{title}</h3>
      <p>{description || 'Vista previa del contenido público.'}</p>
    </article>
  );
}

function MediaPreview({ src }: { src: string }) {
  const isVideo = /\.(mp4|webm)(?:\?|$)/i.test(src);
  return isVideo
    ? <video className="media-preview" controls src={src}>Tu navegador no puede reproducir este vídeo.</video>
    : <img className="media-preview" src={src} alt="Vista previa del archivo multimedia" />;
}
