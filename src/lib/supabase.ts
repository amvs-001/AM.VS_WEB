import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  events as fallbackEvents,
  galleryAlbums as fallbackGalleryAlbums,
  members as fallbackMembers,
  news as fallbackNews,
  repertoire as fallbackRepertoire,
  siteSettings as fallbackSettings,
  defaultSiteVisibility,
  socialLinks,
  sponsors as fallbackSponsors,
  timeline as fallbackTimeline,
} from '../data/siteData';
import type {
  EventItem,
  GalleryAlbum,
  GalleryMediaItem,
  CustomPageItem,
  MemberItem,
  NewsItem,
  RepertoireItem,
  SiteSettings,
  SiteVisibility,
  SocialLink,
  SponsorItem,
  TimelineItem,
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = Boolean(supabase);

function text(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function boolean(row: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    if (typeof row[key] === 'boolean') return row[key];
  }
  return false;
}

function isSocialLink(value: unknown): value is SocialLink {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.label === 'string'
    && typeof row.url === 'string'
    && /^https?:\/\//i.test(row.url);
}

function eventType(value: string): EventItem['type'] {
  if (value === 'Semana Santa' || value === 'Certámenes' || value === 'Concierto' || value === 'Procesión' || value === 'Especial') {
    return value;
  }
  return 'Especial';
}

function mapEvent(row: Record<string, unknown>): EventItem {
  const rawStatus = text(row, 'estado', 'status');
  const status: EventItem['status'] =
    rawStatus === 'celebrada' || rawStatus === 'cancelada' ? rawStatus : 'proxima';
  const date = text(row, 'fecha', 'date');

  return {
    id: text(row, 'id'),
    title: text(row, 'titulo', 'title'),
    description: text(row, 'descripcion', 'description'),
    location: text(row, 'localidad', 'location'),
    type: eventType(text(row, 'tipo', 'type')),
    status,
    dateLabel: date || 'Por anunciar',
  };
}

function mapNews(row: Record<string, unknown>): NewsItem {
  return {
    id: text(row, 'id'),
    title: text(row, 'titulo', 'title'),
    category: text(row, 'categoria', 'category'),
    summary: text(row, 'resumen', 'summary'),
    date: text(row, 'fecha_publicacion', 'fecha_publicación', 'date'),
    status: 'publicada',
    image: text(row, 'imagen', 'image') || undefined,
  };
}

function mapRepertoire(row: Record<string, unknown>): RepertoireItem {
  const year = row.anio ?? row.año ?? row.year;
  return {
    id: text(row, 'id'),
    title: text(row, 'titulo', 'title'),
    author: text(row, 'autor', 'author'),
    category: text(row, 'categoria', 'category'),
    ...(typeof year === 'number' ? { year } : {}),
    description: text(row, 'descripcion', 'description'),
    audioUrl: text(row, 'audio_url') || undefined,
    videoUrl: text(row, 'video_url') || undefined,
    imageUrl: text(row, 'imagen_url') || undefined,
  };
}

function mapCustomPage(row: Record<string, unknown>): CustomPageItem {
  return {
    id: text(row, 'id'),
    title: text(row, 'titulo'),
    slug: text(row, 'slug'),
    subtitle: text(row, 'subtitulo'),
    content: text(row, 'contenido'),
    visible: boolean(row, 'visible'),
  };
}

function mapAlbum(row: Record<string, unknown>): GalleryAlbum {
  const category = text(row, 'categoria', 'category');
  const allowedCategories: GalleryAlbum['category'][] = [
    'Semana Santa',
    'Sábado de Gloria',
    'Certámenes',
    'Conciertos',
    'Ensayos',
    'Eventos especiales',
  ];

  return {
    id: text(row, 'id'),
    title: text(row, 'titulo', 'title'),
    description: text(row, 'descripcion', 'description'),
    category: allowedCategories.includes(category as GalleryAlbum['category'])
      ? (category as GalleryAlbum['category'])
      : 'Semana Santa',
    date: text(row, 'fecha', 'date'),
    coverImage: text(row, 'portada', 'coverImage') || undefined,
  };
}

function mapGalleryMediaItem(row: Record<string, unknown>): GalleryMediaItem {
  return {
    id: text(row, 'id'),
    title: text(row, 'titulo'),
    description: text(row, 'descripcion'),
    url: text(row, 'archivo_url'),
    type: text(row, 'tipo') === 'video' ? 'video' : 'image',
  };
}

function mapMember(row: Record<string, unknown>): MemberItem {
  return {
    id: text(row, 'id'),
    name: text(row, 'nombre', 'name'),
    instrument: text(row, 'instrumento', 'instrument'),
    section: text(row, 'seccion', 'section'),
    role: text(row, 'cargo', 'role') || undefined,
    photo: text(row, 'fotografia', 'photo') || undefined,
    visible: boolean(row, 'visible'),
  };
}

function mapSponsor(row: Record<string, unknown>): SponsorItem {
  return {
    id: text(row, 'id'),
    name: text(row, 'nombre', 'name'),
    description: text(row, 'descripcion', 'description') || undefined,
    logo: text(row, 'logotipo', 'logo') || undefined,
    website: text(row, 'enlace', 'website') || undefined,
    active: boolean(row, 'activo', 'active'),
  };
}

function mapTimeline(row: Record<string, unknown>): TimelineItem {
  return {
    id: text(row, 'id'),
    year: text(row, 'anio', 'año', 'year'),
    title: text(row, 'titulo', 'title'),
    description: text(row, 'descripcion', 'description'),
    date: text(row, 'fecha', 'date') || undefined,
  };
}

async function fetchNews(client: SupabaseClient) {
  const response = await client.from('news')
    .select('*')
    .eq('estado', 'publicada')
    .or(`programada_para.is.null,programada_para.lte.${new Date().toISOString()}`)
    .order('fecha_publicacion', { ascending: false });

  if (response.error?.code !== '42703' || !response.error.message.includes('programada_para')) {
    return response;
  }

  console.error(
    'Falta news.programada_para en Supabase. Se cargarán las noticias publicadas sin filtro de programación. ' +
      'Ejecuta supabase/schema.sql y supabase/admin_panel_setup.sql para restaurar la programación.'
  );
  return client.from('news')
    .select('*')
    .eq('estado', 'publicada')
    .order('fecha_publicacion', { ascending: false });
}

export async function fetchPublicData() {
  if (!supabase) {
    return {
      source: 'local' as const,
      siteSettings: fallbackSettings,
      visibility: defaultSiteVisibility,
      customPages: [],
      socialLinks,
      events: fallbackEvents,
      news: fallbackNews,
      repertoire: fallbackRepertoire,
      galleryAlbums: fallbackGalleryAlbums,
      members: fallbackMembers,
      sponsors: fallbackSponsors,
      timeline: fallbackTimeline,
    };
  }

  const [
    eventsResponse,
    newsResponse,
    repertoireResponse,
    galleryResponse,
    galleryItemsResponse,
    membersResponse,
    sponsorsResponse,
    timelineResponse,
    customPagesResponse,
    settingsResponse,
  ] = await Promise.all([
    supabase.from('events').select('*').order('fecha', { ascending: true }),
    fetchNews(supabase),
    supabase.from('repertoire').select('*').order('titulo', { ascending: true }),
    supabase.from('gallery_albums').select('*').order('fecha', { ascending: false }),
    supabase.from('gallery_items').select('*').order('orden', { ascending: true }),
    supabase.from('members').select('*').eq('visible', true).order('orden', { ascending: true }),
    supabase.from('sponsors').select('*').eq('activo', true).order('orden', { ascending: true }),
    supabase.from('timeline').select('*').order('orden', { ascending: true }),
    supabase.from('custom_pages').select('*').eq('visible', true).order('titulo', { ascending: true }),
    supabase.from('site_settings').select('clave, valor'),
  ]);

  const responses = [
    eventsResponse,
    newsResponse,
    repertoireResponse,
    galleryResponse,
    galleryItemsResponse,
    membersResponse,
    sponsorsResponse,
    timelineResponse,
    customPagesResponse,
    settingsResponse,
  ];
  const failedResponse = responses.find((response) => response.error);
  if (failedResponse?.error) {
    throw new Error(`No se pudieron leer los datos públicos de Supabase: ${failedResponse.error.message}`);
  }

  const settingRows = (settingsResponse.data ?? []) as Array<Record<string, unknown>>;
  const galleryItemsByAlbum = new Map<string, GalleryMediaItem[]>();
  for (const row of (galleryItemsResponse.data ?? []) as Array<Record<string, unknown>>) {
    const item = mapGalleryMediaItem(row);
    const albumId = text(row, 'album_id');
    const albumItems = galleryItemsByAlbum.get(albumId) ?? [];
    albumItems.push(item);
    galleryItemsByAlbum.set(albumId, albumItems);
  }
  const settings = new Map(settingRows.map((row) => [text(row, 'clave'), text(row, 'valor')]));
  const foundationYear = Number(settings.get('site_foundation_year'));
  let publicSocialLinks = socialLinks;
  const rawSocialLinks = settings.get('site_social_links');
  if (rawSocialLinks) {
    try {
      const parsed: unknown = JSON.parse(rawSocialLinks);
      if (Array.isArray(parsed) && parsed.every(isSocialLink)) {
        publicSocialLinks = parsed;
      }
    } catch {
      publicSocialLinks = socialLinks;
    }
  }
  const siteSettings: SiteSettings = {
    ...fallbackSettings,
    foundationYear: Number.isInteger(foundationYear) && foundationYear > 0
      ? foundationYear
      : fallbackSettings.foundationYear,
    name: settings.get('site_name') || fallbackSettings.name,
    siglas: settings.get('site_siglas') || fallbackSettings.siglas,
    currentDirector: settings.get('site_director') || fallbackSettings.currentDirector,
    locality: settings.get('site_locality') || fallbackSettings.locality,
    publicPhone: settings.get('site_phone') || fallbackSettings.publicPhone,
    rehearsalAddress: settings.get('site_rehearsal_address') || fallbackSettings.rehearsalAddress,
    values: settings.get('site_values')?.split(';').filter(Boolean) || fallbackSettings.values,
    homeIntro: settings.get('site_home_intro') || fallbackSettings.homeIntro,
    history: settings.get('site_history') || fallbackSettings.history,
    logoUrl: settings.get('site_logo_url') || fallbackSettings.logoUrl,
  };
  const isVisible = (key: string, defaultValue: boolean) => {
    const value = settings.get(key);
    return value === undefined ? defaultValue : value !== 'false';
  };
  const visibility: SiteVisibility = {
    history: isVisible('visibility_history', defaultSiteVisibility.history),
    repertoire: isVisible('visibility_repertoire', defaultSiteVisibility.repertoire),
    repertoireMarches: isVisible('visibility_repertoire_marches', defaultSiteVisibility.repertoireMarches),
    events: isVisible('visibility_events', defaultSiteVisibility.events),
    gallery: isVisible('visibility_gallery', defaultSiteVisibility.gallery),
    members: isVisible('visibility_members', defaultSiteVisibility.members),
    sponsors: isVisible('visibility_sponsors', defaultSiteVisibility.sponsors),
    contact: isVisible('visibility_contact', defaultSiteVisibility.contact),
  };

  return {
    source: 'supabase' as const,
    siteSettings,
    visibility,
    customPages: ((customPagesResponse.data ?? []) as Array<Record<string, unknown>>).map(mapCustomPage),
    socialLinks: publicSocialLinks,
    events: ((eventsResponse.data ?? []) as Array<Record<string, unknown>>).map(mapEvent),
    news: ((newsResponse.data ?? []) as Array<Record<string, unknown>>).map(mapNews),
    repertoire: ((repertoireResponse.data ?? []) as Array<Record<string, unknown>>).map(mapRepertoire),
    galleryAlbums: ((galleryResponse.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      ...mapAlbum(row),
      items: galleryItemsByAlbum.get(text(row, 'id')) ?? [],
    })),
    members: ((membersResponse.data ?? []) as Array<Record<string, unknown>>).map(mapMember),
    sponsors: ((sponsorsResponse.data ?? []) as Array<Record<string, unknown>>).map(mapSponsor),
    timeline: ((timelineResponse.data ?? []) as Array<Record<string, unknown>>).map(mapTimeline),
  };
}

export type PublicData = Awaited<ReturnType<typeof fetchPublicData>>;
