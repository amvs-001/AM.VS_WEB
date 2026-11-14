import { createContext, FormEvent, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { defaultSiteVisibility, events, galleryAlbums, historyText, members, news, repertoire, siteSettings, socialLinks, sponsors, timeline } from './data/siteData';
import { fetchPublicData, isSupabaseConfigured, supabase, type PublicData } from './lib/supabase';
import AdminContactRequests from './components/AdminContactRequests';
import AdminContentEditor from './components/AdminContentEditor';
import AdminPageManager from './components/AdminPageManager';
import { CookiePolicyPage, LegalNoticePage, PrivacyPolicyPage } from './components/LegalPages';
import MediaEmbed from './components/MediaEmbed';
import { useCookiePreferences } from './components/CookiePreferences';
import type { SiteVisibility } from './types';

const initialPublicData: PublicData = {
  source: 'local',
  siteSettings,
  visibility: defaultSiteVisibility,
  customPages: [],
  socialLinks,
  events,
  news,
  repertoire,
  galleryAlbums,
  members,
  sponsors,
  timeline,
};

const PublicDataContext = createContext<PublicData>(initialPublicData);

function usePublicData() {
  return useContext(PublicDataContext);
}

function repertoireSlug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function repertoirePath(item: { title: string }): string {
  return `/repertorio/${repertoireSlug(item.title)}`;
}

type Theme = 'light' | 'dark';

function readTheme(): Theme {
  try {
    return window.localStorage.getItem('amvs:theme') === 'dark' ? 'dark' : 'light';
  } catch (error) {
    console.error('No se pudo leer el tema visual guardado:', error);
    return 'light';
  }
}

function RouteMetadata() {
  const { pathname } = useLocation();
  const { repertoire: repertoireItems, customPages, siteSettings } = usePublicData();

  useEffect(() => {
    const repertoireItem = repertoireItems.find((item) => repertoirePath(item) === pathname);
    const customPage = customPages.find((item) => `/pagina/${item.slug}` === pathname);
    const pages: Record<string, { title: string; description: string }> = {
      '/': {
        title: 'AM Virgen de la Soledad de Doña Mencía | Web oficial',
        description: 'Web oficial de la AM Virgen de la Soledad de Doña Mencía: marchas cofrades, vídeos, repertorio, historia y actuaciones.',
      },
      '/historia': {
        title: 'Historia | AM Virgen de la Soledad de Doña Mencía',
        description: 'Conoce la historia y trayectoria de la Agrupación Musical Virgen de la Soledad de Doña Mencía desde sus inicios.',
      },
      '/repertorio': {
        title: 'Repertorio y marchas cofrades | AM Virgen de la Soledad',
        description: 'Escucha y descubre las marchas cofrades de la Agrupación Musical Virgen de la Soledad de Doña Mencía.',
      },
      '/actuaciones': {
        title: 'Actuaciones | AM Virgen de la Soledad de Doña Mencía',
        description: 'Próximas actuaciones y eventos de la Agrupación Musical Virgen de la Soledad de Doña Mencía.',
      },
      '/galeria': {
        title: 'Galería | AM Virgen de la Soledad de Doña Mencía',
        description: 'Fotografías, vídeos y recuerdos de la Agrupación Musical Virgen de la Soledad de Doña Mencía.',
      },
      '/componentes': {
        title: 'Componentes | AM Virgen de la Soledad de Doña Mencía',
        description: 'Conoce a los componentes de la Agrupación Musical Virgen de la Soledad de Doña Mencía.',
      },
      '/patrocinadores': {
        title: 'Patrocinadores | AM Virgen de la Soledad',
        description: 'Colaboradores y patrocinadores de la Agrupación Musical Virgen de la Soledad de Doña Mencía.',
      },
      '/contacto': {
        title: 'Contacto y contratación | AM Virgen de la Soledad',
        description: 'Contacta con la Agrupación Musical Virgen de la Soledad de Doña Mencía para solicitar información o contratación.',
      },
      '/aviso-legal': {
        title: 'Aviso legal | AM Virgen de la Soledad',
        description: 'Información legal sobre la web de la Agrupación Musical Virgen de la Soledad de Doña Mencía.',
      },
      '/privacidad': {
        title: 'Política de privacidad | AM Virgen de la Soledad',
        description: 'Información sobre los datos personales tratados en la web de la Agrupación Musical Virgen de la Soledad.',
      },
      '/cookies': {
        title: 'Cookies y almacenamiento | AM Virgen de la Soledad',
        description: 'Información y controles de privacidad para el almacenamiento local y los reproductores externos de esta web.',
      },
    };
    const page = repertoireItem
      ? {
          title: `${repertoireItem.title} | Marcha cofrade | AM Virgen de la Soledad`,
          description: repertoireItem.description
            || `Escucha ${repertoireItem.title}, marcha del repertorio de la Agrupación Musical Virgen de la Soledad de Doña Mencía.`,
        }
      : customPage
        ? {
            title: `${customPage.title} | ${siteSettings.siglas}`,
            description: customPage.subtitle || customPage.content.slice(0, 160),
          }
      : pages[pathname] ?? {
          title: `${siteSettings.siglas} | ${siteSettings.name}`,
          description: `Web oficial de ${siteSettings.name}, agrupación musical de Doña Mencía.`,
        };
    const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '');
    const canonicalUrl = `${siteUrl}${pathname}`;
    document.title = page.title;

    const updateMeta = (attribute: string, key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };

    updateMeta('name', 'description', page.description);
    updateMeta('property', 'og:title', page.title);
    updateMeta('property', 'og:description', page.description);
    updateMeta('property', 'og:url', canonicalUrl);
    updateMeta('name', 'twitter:title', page.title);
    updateMeta('name', 'twitter:description', page.description);
    updateMeta('name', 'robots', pathname === '/admin' || pathname === '/registro' ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname, repertoireItems, customPages, siteSettings.name, siteSettings.siglas]);

  return null;
}

function SocialIcon({ label }: { label: string }) {
  const name = label.toLowerCase();
  if (name.includes('instagram')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="18" cy="6" r="1" className="icon-fill" /></svg>;
  }
  if (name.includes('youtube')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path className="icon-fill" d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.5 12a31 31 0 0 0-.5-4.8ZM9.7 15.3V8.7l5.8 3.3-5.8 3.3Z" /></svg>;
  }
  if (name.includes('facebook')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path className="icon-fill" d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V10H7.5v3h2.8v8h3.2Z" /></svg>;
  }
  if (name.includes('tiktok')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path className="icon-fill" d="M19.6 7.1a5.8 5.8 0 0 1-3.5-1.2v8.2a5.7 5.7 0 1 1-5.7-5.7c.4 0 .8 0 1.2.1v3.2a2.6 2.6 0 1 0 1.5 2.4V2.5h3.1c.3 2.2 1.8 3.9 4 4.3v3.1a8.8 8.8 0 0 1-.6 0Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>;
}

function TabPositionRestoration() {
  const { pathname, search, hash } = useLocation();
  const { source } = usePublicData();

  useEffect(() => {
    const storageKey = `amvs:scroll-position:${pathname}`;
    const activeTabKey = 'amvs:active-tab-state';
    const route = `${pathname}${search}${hash}`;
    const previousScrollRestoration = window.history.scrollRestoration;
    let saveTimer = 0;
    let restorationTimers: number[] = [];

    type ActiveTabState = {
      route: string;
      scrollY: number;
      hiddenAt: number | null;
    };

    const readActiveTabState = (): ActiveTabState | null => {
      try {
        const stored = window.sessionStorage.getItem(activeTabKey);
        if (!stored) return null;
        const parsed: unknown = JSON.parse(stored);
        if (
          typeof parsed === 'object'
          && parsed !== null
          && 'route' in parsed
          && typeof parsed.route === 'string'
          && 'scrollY' in parsed
          && typeof parsed.scrollY === 'number'
          && Number.isFinite(parsed.scrollY)
          && 'hiddenAt' in parsed
          && (typeof parsed.hiddenAt === 'number' || parsed.hiddenAt === null)
        ) {
          return {
            route: parsed.route,
            scrollY: parsed.scrollY,
            hiddenAt: parsed.hiddenAt,
          };
        }
        return null;
      } catch (error) {
        console.error('No se pudo leer el estado de navegación de la pestaña:', error);
        return null;
      }
    };

    const saveState = (scrollY: number, hiddenAt: number | null) => {
      const state: ActiveTabState = { route, scrollY, hiddenAt };
      try {
        window.sessionStorage.setItem(storageKey, String(scrollY));
        window.sessionStorage.setItem(activeTabKey, JSON.stringify(state));
      } catch (error) {
        console.error('No se pudo guardar el estado de navegación de la pestaña:', error);
      }
    };

    const savePosition = () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        const previousState = readActiveTabState();
        saveState(window.scrollY, previousState?.hiddenAt ?? null);
      }, 120);
    };

    const saveImmediately = (hiddenAt: number | null = null) => {
      window.clearTimeout(saveTimer);
      saveState(window.scrollY, hiddenAt);
    };

    const restorePosition = (targetPosition?: number) => {
      const activeState = readActiveTabState();
      const savedPosition = targetPosition ?? (() => {
        try {
          return Number(window.sessionStorage.getItem(storageKey));
        } catch (error) {
          console.error('No se pudo leer la posición de la página:', error);
          return Number.NaN;
        }
      })();
      if (!Number.isFinite(savedPosition) || savedPosition <= 0) return;

      restorationTimers.forEach((timer) => window.clearTimeout(timer));
      restorationTimers = [];
      const retryDelays = [0, 120, 400, 900];
      retryDelays.forEach((delay) => {
        const timer = window.setTimeout(() => {
          window.requestAnimationFrame(() => {
            window.scrollTo({ top: savedPosition, behavior: 'auto' });
          });
        }, delay);
        restorationTimers.push(timer);
      });

      if (activeState?.hiddenAt !== null && activeState?.hiddenAt !== undefined) {
        saveState(savedPosition, null);
      }
    };

    const restoreActiveRoute = () => {
      const activeState = readActiveTabState();
      const savedForCurrentRoute = activeState
        && activeState.route === route
        && activeState.hiddenAt !== null
        && Date.now() - activeState.hiddenAt < 10 * 60 * 1000;
      restorePosition(savedForCurrentRoute ? activeState.scrollY : undefined);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveImmediately(Date.now());
      } else {
        restoreActiveRoute();
      }
    };

    const handlePageShow = () => {
      restoreActiveRoute();
    };

    const handleBlur = () => saveImmediately();
    const handlePageHide = () => saveImmediately(Date.now());

    window.history.scrollRestoration = 'manual';

    const initialActiveState = readActiveTabState();
    const savedForCurrentRoute = initialActiveState
      && initialActiveState.route === route
      && initialActiveState.hiddenAt !== null
      && Date.now() - initialActiveState.hiddenAt < 10 * 60 * 1000;
    restorePosition(savedForCurrentRoute ? initialActiveState.scrollY : undefined);
    if (savedForCurrentRoute) saveState(initialActiveState.scrollY, null);
    else saveImmediately();

    window.addEventListener('scroll', savePosition, { passive: true });
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', restoreActiveRoute);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
      window.clearTimeout(saveTimer);
      restorationTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('scroll', savePosition);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', restoreActiveRoute);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hash, pathname, search, source]);

  return null;
}

const navItems = [
  { to: '/', label: 'Inicio' },
  { to: '/historia', label: 'Historia', visibilityKey: 'history' as const },
  { to: '/repertorio', label: 'Repertorio', visibilityKey: 'repertoire' as const },
  { to: '/actuaciones', label: 'Actuaciones', visibilityKey: 'events' as const },
  { to: '/galeria', label: 'Galería', visibilityKey: 'gallery' as const },
  { to: '/componentes', label: 'Componentes', visibilityKey: 'members' as const },
  { to: '/patrocinadores', label: 'Patrocinadores', visibilityKey: 'sponsors' as const },
  { to: '/contacto', label: 'Contacto', visibilityKey: 'contact' as const },
  { to: '/admin', label: 'Acceso' },
];

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [publicData, setPublicData] = useState(initialPublicData);
  const [connectionError, setConnectionError] = useState('');
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const { openCookieSettings } = useCookiePreferences();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem('amvs:theme', theme);
    } catch (error) {
      console.error('No se pudo guardar el tema visual:', error);
    }
  }, [theme]);

  useEffect(() => {
    let isMounted = true;

    fetchPublicData()
      .then((data) => {
        if (isMounted) setPublicData(data);
      })
      .catch((error: unknown) => {
        console.error('No se pudieron cargar los datos públicos:', error);
        if (isMounted) {
          setConnectionError(error instanceof Error ? error.message : 'Error desconocido al conectar con Supabase.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshPublicData = () => {
    void fetchPublicData()
      .then((data) => {
        setPublicData(data);
        setConnectionError('');
      })
      .catch((error: unknown) => {
        console.error('No se pudieron actualizar los datos públicos:', error);
        setConnectionError(error instanceof Error ? error.message : 'Error desconocido al actualizar los datos.');
      });
  };

  return (
    <PublicDataContext.Provider value={publicData}>
    <TabPositionRestoration />
    <RouteMetadata />
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="Inicio de la Agrupación Musical Virgen de la Soledad">
            <img src={publicData.siteSettings.logoUrl || `${import.meta.env.BASE_URL}escudoAM.png`} alt="Escudo de la Agrupación Musical Virgen de la Soledad" className="brand-logo" />
            <div>
              <span className="brand-name">AM VS</span>
              <small>{publicData.siteSettings.name}</small>
            </div>
          </Link>

          <button
            type="button"
            className="menu-toggle"
            aria-label="Abrir menú de navegación"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((current) => !current)}
          >
            ☰
          </button>

          <nav className={`site-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Menú principal">
            {navItems.map((item) => (
              item.visibilityKey && !publicData.visibility[item.visibilityKey] ? null :
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            {publicData.customPages.map((page) => (
              <NavLink
                key={page.id}
                to={`/pagina/${page.slug}`}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setMobileOpen(false)}
              >
                {page.title}
              </NavLink>
            ))}
            <button
              type="button"
              className="theme-toggle"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? '☀ Modo claro' : '☾ Modo oscuro'}
            </button>
          </nav>
        </div>
      </header>

      <main className="page-shell">
        {isLoading ? <p className="connection-banner" role="status">Conectando con Supabase…</p> : null}
        {connectionError ? <p className="connection-banner error-text" role="alert">{connectionError} Se mantienen los datos locales de respaldo.</p> : null}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/historia" element={<VisiblePage page="history"><HistoryPage /></VisiblePage>} />
          <Route path="/repertorio" element={<VisiblePage page="repertoire"><RepertoirePage /></VisiblePage>} />
          <Route path="/repertorio/:slug" element={<VisiblePage page="repertoire"><RepertoireDetailPage /></VisiblePage>} />
          <Route path="/actuaciones" element={<VisiblePage page="events"><EventsPage /></VisiblePage>} />
          <Route path="/galeria" element={<VisiblePage page="gallery"><GalleryPage /></VisiblePage>} />
          <Route path="/componentes" element={<VisiblePage page="members"><MembersPage /></VisiblePage>} />
          <Route path="/patrocinadores" element={<VisiblePage page="sponsors"><SponsorsPage /></VisiblePage>} />
          <Route path="/contacto" element={<VisiblePage page="contact"><ContactPage /></VisiblePage>} />
          <Route path="/aviso-legal" element={<LegalNoticePage settings={publicData.siteSettings} />} />
          <Route path="/privacidad" element={<PrivacyPolicyPage settings={publicData.siteSettings} />} />
          <Route path="/cookies" element={<CookiePolicyPage onOpenPreferences={openCookieSettings} />} />
          <Route path="/pagina/:slug" element={<CustomPageRoute />} />
          <Route path="/admin" element={<AdminPage onPublished={refreshPublicData} />} />
          <Route path="/registro" element={<SignupPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <h3>{publicData.siteSettings.siglas}</h3>
            <p>{publicData.siteSettings.name}</p>
            <p>{publicData.siteSettings.locality}</p>
          </div>
          <div>
            <h4>Contacto</h4>
            <p>{publicData.siteSettings.publicPhone}</p>
            <p>{publicData.siteSettings.rehearsalAddress}</p>
          </div>
          <div>
            <h4>Redes</h4>
            <ul className="footer-links">
              {publicData.socialLinks.map((social) => (
                <li key={social.label}>
                  <a className="social-icon-link" href={social.url} target="_blank" rel="noreferrer" aria-label={social.label} title={social.label}>
                    <SocialIcon label={social.label} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Información</h4>
            <ul className="legal-links">
              <li><Link to="/aviso-legal">Aviso legal</Link></li>
              <li><Link to="/privacidad">Privacidad</Link></li>
              <li><Link to="/cookies">Cookies</Link></li>
              <li><button type="button" onClick={openCookieSettings}>Configurar privacidad</button></li>
            </ul>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>© 2026 AM Virgen de la Soledad · Desarrollado por Francis Cobo</p>
        </div>
      </footer>
    </div>
    </PublicDataContext.Provider>
  );
}

function HomePage() {
  const { siteSettings: settings, news: publishedNews, events: publishedEvents, visibility } = usePublicData();
  const featuredEvent = publishedEvents[0];
  const facts = [
    { label: 'Año de fundación', value: String(settings.foundationYear) },
    { label: 'Director actual', value: settings.currentDirector },
    { label: 'Localidad', value: settings.locality },
    { label: 'Valores', value: settings.values.join(', ') },
  ];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Agrupación Musical</span>
            <h1>{settings.name}</h1>
            <p>
              {settings.homeIntro}
            </p>
            {visibility.history || visibility.contact ? (
              <div className="hero-actions">
                {visibility.history ? <Link to="/historia" className="button primary">Nuestra historia</Link> : null}
                {visibility.contact ? <Link to="/contacto" className="button secondary">Solicitar contratación</Link> : null}
              </div>
            ) : null}
          </div>
          <div className="hero-panel">
            <img src={settings.logoUrl || `${import.meta.env.BASE_URL}escudoAM.png`} alt="Escudo de la Agrupación Musical Virgen de la Soledad" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Identidad</span>
            <h2>Valores de la agrupación</h2>
          </div>
          <div className="card-grid three-col">
            {settings.values.map((value) => (
              <article key={value} className="feature-card">
                <div className="feature-icon">✦</div>
                <h3>{value}</h3>
                <p>Base espiritual, musical y cultural que guía la identidad de la AM VS.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Datos</span>
            <h2>Información oficial</h2>
          </div>
          <div className="stats-grid">
            {facts.map((fact) => (
              <div key={fact.label} className="stat-card">
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {visibility.events ? <section className="section">
        <div className="container">
          <div className="section-heading split">
            <div>
              <span className="eyebrow">Actuación habitual</span>
              <h2>{featuredEvent?.title ?? 'Próximas actuaciones'}</h2>
            </div>
            <Link to="/actuaciones" className="button secondary text-button">
              Ver todas las actuaciones
            </Link>
          </div>
          {featuredEvent ? (
            <div className="feature-banner">
              <div>
                <h3>{featuredEvent.title}</h3>
                <p>{featuredEvent.description}</p>
              </div>
              <span className={`badge ${featuredEvent.status}`}>{featuredEvent.status}</span>
            </div>
          ) : <div className="empty-state"><p>No hay actuaciones publicadas por el momento.</p></div>}
        </div>
      </section> : null}

      <section className="section alt">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Actualidad</span>
            <h2>Últimas noticias</h2>
          </div>
          {publishedNews.length === 0 ? (
            <div className="empty-state">
              <p>En este momento no hay noticias publicadas. El contenido informativo se incorporará desde el panel privado cuando sea necesario.</p>
            </div>
          ) : (
            <div className="card-grid three-col">
              {publishedNews.slice(0, 3).map((item) => (
                <article key={item.id} className="feature-card">
                  <span className="card-tag">{item.category}</span>
                  {item.image
                    ? /\.(mp4|webm)(?:\?|$)/i.test(item.image)
                      ? <video className="news-card-image" controls src={item.image}>Tu navegador no puede reproducir este vídeo.</video>
                      : <img className="news-card-image" src={item.image} alt="" />
                    : null}
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function HistoryPage() {
  const { timeline: historyTimeline, siteSettings: settings } = usePublicData();

  return (
    <div className="container section-page">
      <PageHeader title="Historia" subtitle="Trayectoria y evolución de la Agrupación Musical Virgen de la Soledad" />
      <div className="story-block">
        <p>{settings.history || historyText}</p>
      </div>
      <div className="timeline">
        {historyTimeline.map((item) => (
          <article key={item.id} className="timeline-item">
            <span className="timeline-year">{item.year}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function VisiblePage({ page, children }: { page: keyof SiteVisibility; children: ReactNode }) {
  const { visibility } = usePublicData();
  return visibility[page] ? children : <NotFoundPage />;
}

function CustomPageRoute() {
  const { slug } = useParams();
  const { customPages } = usePublicData();
  const page = customPages.find((item) => item.slug === slug);

  if (!page) return <NotFoundPage />;

  return (
    <div className="container section-page">
      <PageHeader title={page.title} subtitle={page.subtitle || 'AM Virgen de la Soledad'} />
      <article className="custom-page-content">{page.content}</article>
    </div>
  );
}

function RepertoirePage() {
  const { repertoire: allRepertoireItems, visibility } = usePublicData();
  const repertoireItems = allRepertoireItems.filter((item) =>
    visibility.repertoireMarches || item.category.toLowerCase() !== 'marcha',
  );

  return (
    <div className="container section-page">
      <PageHeader title="Repertorio" subtitle="Composiciones y marchas de la agrupación" />
      {repertoireItems.length === 0 ? (
        <div className="empty-state large">
          <p>El repertorio se actualizará próximamente.</p>
        </div>
      ) : (
        <div className="card-grid four-col">
          {repertoireItems.map((item) => (
            <article key={item.id} className="repertoire-card">
              <span className="card-tag">{item.category}</span>
              <h3><Link to={repertoirePath(item)}>{item.title}</Link></h3>
              <p>{item.author}</p>
              {item.description ? <small>{item.description}</small> : null}
              {item.videoUrl ? <MediaEmbed url={item.videoUrl} title={`Vídeo de ${item.title}`} /> : null}
              {!item.videoUrl && item.audioUrl ? <MediaEmbed url={item.audioUrl} title={`Audio de ${item.title}`} /> : null}
              {!item.videoUrl && !item.audioUrl && item.imageUrl ? <img className="repertoire-media" src={item.imageUrl} alt={item.title} loading="lazy" /> : null}
              <Link className="button secondary repertoire-detail-link" to={repertoirePath(item)}>Ver ficha y multimedia</Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function RepertoireDetailPage() {
  const { slug } = useParams();
  const { repertoire: repertoireItems, visibility } = usePublicData();
  const item = repertoireItems.find((entry) => repertoireSlug(entry.title) === slug);

  if (!item) return <NotFoundPage />;
  if (!visibility.repertoireMarches && item.category.toLowerCase() === 'marcha') return <NotFoundPage />;
  const media = [
    { url: item.videoUrl, label: 'Vídeo' },
    { url: item.audioUrl, label: 'Audio' },
    { url: item.imageUrl, label: 'Imagen' },
  ].filter((entry): entry is { url: string; label: string } => Boolean(entry.url));

  return (
    <div className="container section-page">
      <PageHeader title={item.title} subtitle={[item.category, item.author].filter(Boolean).join(' · ')} />
      <article className="repertoire-detail">
        {item.description ? <p>{item.description}</p> : null}
        {media.length ? (
          <div className="repertoire-detail-media">
            {media.map((entry) => (
              <section key={entry.label}>
                <h2>{entry.label}</h2>
                <MediaEmbed url={entry.url} title={`${entry.label} de ${item.title}`} />
              </section>
            ))}
          </div>
        ) : <p className="empty-state">Todavía no hay archivos multimedia para esta marcha.</p>}
        <Link to="/repertorio" className="button secondary">Volver al repertorio</Link>
      </article>
    </div>
  );
}

function EventsPage() {
  const { events: eventItems } = usePublicData();
  const orderedEvents = useMemo(
    () => [...eventItems].sort((a, b) => a.title.localeCompare(b.title)),
    [eventItems],
  );

  return (
    <div className="container section-page">
      <PageHeader title="Actuaciones" subtitle="Listado gestionable por el administrador" />
      {orderedEvents.length === 0 ? (
        <div className="empty-state large">
          <p>Próximamente se anunciarán nuevas actuaciones.</p>
        </div>
      ) : (
        <div className="card-grid two-col">
          {orderedEvents.map((event) => (
            <article key={event.id} className="event-card">
              <div className="event-card-header">
                <h3>{event.title}</h3>
                <span className={`badge ${event.status}`}>{event.status}</span>
              </div>
              <p>{event.description}</p>
              <ul className="event-meta">
                <li>Tipo: {event.type}</li>
                <li>Localidad: {event.location}</li>
                <li>Fecha: {event.dateLabel}</li>
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryPage() {
  const { galleryAlbums: albums } = usePublicData();
  const hasGallery = albums.length > 0;

  return (
    <div className="container section-page">
      <PageHeader title="Galería" subtitle="Álbumes, fotografías, vídeos y publicaciones" />
      {!hasGallery ? (
        <div className="empty-state large">
          <p>Estamos preparando nuevas imágenes, álbumes y publicaciones para la galería. El contenido se gestionará desde el panel privado.</p>
        </div>
      ) : (
        <div className="card-grid three-col">
          {albums.map((album) => (
            <article key={album.id} className="gallery-card">
              {album.coverImage
                ? <img className="gallery-cover" src={album.coverImage} alt={`Portada de ${album.title}`} />
                : <div className="gallery-cover" aria-label={`Imagen de ${album.title}`} />}
              <div className="gallery-body">
                <span className="card-tag">{album.category}</span>
                <h3>{album.title}</h3>
                <p>{album.description}</p>
                {album.items?.length ? (
                  <div className="gallery-items">
                    {album.items.map((item) => (
                      <figure key={item.id}>
                        {item.type === 'video'
                          ? <video className="gallery-item-media" controls src={item.url}>Tu navegador no puede reproducir este vídeo.</video>
                          : <img className="gallery-item-media" src={item.url} alt={item.title || album.title} />}
                        {item.title ? <figcaption>{item.title}</figcaption> : null}
                      </figure>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function MembersPage() {
  const { members: visibleMembers } = usePublicData();
  const hasMembers = visibleMembers.length > 0;

  return (
    <div className="container section-page">
      <PageHeader title="Componentes" subtitle="Listado de la formación musical" />
      {!hasMembers ? (
        <div className="empty-state large">
          <p>La relación de componentes se completará en el futuro. Por el momento, la web presenta una vista general y deja el listado preparado para su gestión.</p>
        </div>
      ) : (
        <div className="card-grid three-col">
          {visibleMembers.map((member) => (
            <article key={member.id} className="member-card">
              <div className="member-avatar" aria-label={member.name} />
              <h3>{member.name}</h3>
              <p>{member.instrument}</p>
              <small>{member.section}</small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SponsorsPage() {
  const { sponsors: activeSponsors } = usePublicData();
  const hasSponsors = activeSponsors.length > 0;

  return (
    <div className="container section-page">
      <PageHeader title="Patrocinadores" subtitle="Colaboradores y apoyos de la agrupación" />
      {!hasSponsors ? (
        <div className="empty-state large">
          <p>Se irán incorporando colaboradores y patrocinadores en el panel de administración. No se muestran datos inventados.</p>
        </div>
      ) : (
        <div className="card-grid two-col">
          {activeSponsors.map((sponsor) => (
            <article key={sponsor.name} className="sponsor-card">
              <h3>{sponsor.name}</h3>
              <p>{sponsor.description}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactPage() {
  const { siteSettings: settings } = usePublicData();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    entity: '',
    email: '',
    phone: '',
    locality: '',
    eventDate: '',
    eventType: '',
    message: '',
  });

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setIsSubmitted(false);
    setErrors((current) => {
      const remaining = { ...current };
      delete remaining[field];
      return remaining;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) nextErrors.name = 'El nombre es obligatorio.';
    if (!formData.entity.trim()) nextErrors.entity = 'La entidad o cofradía es obligatoria.';
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) nextErrors.email = 'Introduce un correo válido.';
    if (!formData.phone.trim()) nextErrors.phone = 'El teléfono es obligatorio.';
    if (!formData.locality.trim()) nextErrors.locality = 'La localidad es obligatoria.';
    if (!formData.eventDate) nextErrors.eventDate = 'La fecha aproximada es obligatoria.';
    if (!formData.eventType.trim()) nextErrors.eventType = 'Selecciona el tipo de evento.';
    if (formData.message.trim().length < 10) nextErrors.message = 'El mensaje debe tener al menos 10 caracteres.';
    if (!privacyAccepted) nextErrors.privacy = 'Debes aceptar la información de privacidad para enviar la solicitud.';

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmissionError('');
    setIsSubmitted(false);
    if (Object.keys(nextErrors).length > 0) return;
    if (honeypot.trim()) return;
    if (!supabase) {
      setSubmissionError('No se puede enviar la solicitud porque Supabase no está configurado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('contact_requests').insert({
        nombre: formData.name.trim(),
        entidad: formData.entity.trim(),
        email: formData.email.trim(),
        telefono: formData.phone.trim(),
        localidad: formData.locality.trim(),
        fecha_evento: formData.eventDate,
        tipo_evento: formData.eventType.trim(),
        mensaje: formData.message.trim(),
      });
      if (insertError) {
        setSubmissionError(`No se pudo enviar la solicitud: ${insertError.message}`);
        return;
      }

      setIsSubmitted(true);
      setFormData({
        name: '',
        entity: '',
        email: '',
        phone: '',
        locality: '',
        eventDate: '',
        eventType: '',
        message: '',
      });
      setPrivacyAccepted(false);
    } catch (error) {
      console.error('Error al enviar la solicitud de contratación:', error);
      setSubmissionError('No se pudo conectar para enviar la solicitud. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container section-page contact-layout">
      <div>
        <PageHeader title="Contratación y contacto" subtitle="Solicitudes profesionales para actuaciones y eventos" />
        <div className="info-box">
          <p><strong>Teléfono público:</strong> {settings.publicPhone}</p>
          <p><strong>Local de ensayo:</strong> {settings.rehearsalAddress}</p>
          <p><strong>Ubicación:</strong> {settings.locality}</p>
        </div>
      </div>

      <form className="contact-form" onSubmit={handleSubmit} noValidate>
        <p>La solicitud se enviará de forma privada a la agrupación y podrá consultarla su equipo de Administración en esta web.</p>
        <div className="contact-honeypot" aria-hidden="true">
          <label>
            Deja este campo vacío
            <input
              name="company_website"
              autoComplete="off"
              tabIndex={-1}
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </label>
        </div>
        <div className="field-grid">
          <label>
            Nombre
            <input required maxLength={120} value={formData.name} onChange={(event) => updateField('name', event.target.value)} />
            {errors.name ? <small>{errors.name}</small> : null}
          </label>
          <label>
            Entidad o cofradía
            <input required maxLength={160} value={formData.entity} onChange={(event) => updateField('entity', event.target.value)} />
            {errors.entity ? <small>{errors.entity}</small> : null}
          </label>
          <label>
            Correo electrónico
            <input type="email" required maxLength={254} autoComplete="email" value={formData.email} onChange={(event) => updateField('email', event.target.value)} />
            {errors.email ? <small>{errors.email}</small> : null}
          </label>
          <label>
            Teléfono
            <input type="tel" required maxLength={40} autoComplete="tel" value={formData.phone} onChange={(event) => updateField('phone', event.target.value)} />
            {errors.phone ? <small>{errors.phone}</small> : null}
          </label>
          <label>
            Localidad
            <input required maxLength={120} value={formData.locality} onChange={(event) => updateField('locality', event.target.value)} />
            {errors.locality ? <small>{errors.locality}</small> : null}
          </label>
          <label>
            Fecha aproximada
            <input type="date" required value={formData.eventDate} onChange={(event) => updateField('eventDate', event.target.value)} />
            {errors.eventDate ? <small>{errors.eventDate}</small> : null}
          </label>
          <label className="full-width">
            Tipo de evento
            <input required maxLength={120} value={formData.eventType} onChange={(event) => updateField('eventType', event.target.value)} />
            {errors.eventType ? <small>{errors.eventType}</small> : null}
          </label>
          <label className="full-width">
            Mensaje
            <textarea required maxLength={5000} value={formData.message} onChange={(event) => updateField('message', event.target.value)} rows={5} />
            {errors.message ? <small>{errors.message}</small> : null}
          </label>
          <label className="privacy-toggle full-width">
            <input
              type="checkbox"
              required
              checked={privacyAccepted}
              onChange={(event) => {
                setPrivacyAccepted(event.target.checked);
                setErrors((current) => {
                  const remaining = { ...current };
                  delete remaining.privacy;
                  return remaining;
                });
              }}
            />
            <span>He leído la <Link to="/privacidad">Política de privacidad</Link> y autorizo el tratamiento de estos datos para responder a esta solicitud.</span>
          </label>
          {errors.privacy ? <p className="error-text full-width" role="alert">{errors.privacy}</p> : null}
        </div>

        {isSubmitted ? (
          <p className="success-message" role="status">
            Solicitud enviada y guardada. La agrupación podrá revisarla desde el panel de Administración; no se envía un correo automático.
          </p>
        ) : null}
        {submissionError ? <p className="error-text" role="alert">{submissionError} También puedes llamar al <a href={`tel:${settings.publicPhone.replace(/[^\d+]/g, '')}`}>{settings.publicPhone}</a>.</p> : null}

        <button type="submit" className="button primary submit-button" disabled={isSubmitting || !isSupabaseConfigured}>
          {isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
        </button>
        {!isSupabaseConfigured ? <p className="error-text">El envío no está disponible porque falta la configuración de Supabase.</p> : null}
      </form>
    </div>
  );
}

function AdminPage({ onPublished }: { onPublished: () => void }) {
  const navigate = useNavigate();
  const publicData = usePublicData();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>(null);
  const [profile, setProfile] = useState<{ rol: string; activo: boolean } | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError('');
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!isMounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    let isMounted = true;
    const authClient = supabase;
    setIsProfileLoading(true);
    authClient.from('profiles').select('rol, activo').eq('id', session.user.id).maybeSingle()
      .then(async ({ data, error: profileError }) => {
        if (!isMounted) return;
        if (profileError) {
          setError(`No se pudo verificar el perfil: ${profileError.message}`);
          setProfile(null);
          setIsProfileLoading(false);
          return;
        } else {
          setProfile(data);
        }
        setIsProfileLoading(false);
        const hasAdminRole = data?.activo === true
          && ['Superadministrador', 'Administrador', 'Editor'].includes(data.rol);
        if (!hasAdminRole) {
          const { error: signOutError } = await authClient.auth.signOut();
          if (signOutError && isMounted) {
            setError(`No se pudo cerrar la sesión sin permisos: ${signOutError.message}`);
            return;
          }
          if (isMounted) navigate('/', { replace: true });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session, navigate]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setIsSubmitting(true);
    setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword(credentials);
    if (loginError) {
      setError(loginError.message);
    }
    setIsSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    setIsSubmitting(true);
    setError('');
    const { error: loginError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}admin` },
    });
    if (loginError) {
      setError(loginError.message);
      setIsSubmitting(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="container section-page admin-login">
        <div className="login-card">
          <h2>Acceso privado</h2>
          <p>Configura las variables públicas de Supabase para iniciar sesión. No hay acceso de demostración local.</p>
        </div>
      </div>
    );
  }

  if (isLoading || (session && isProfileLoading)) {
    return <div className="container section-page"><p role="status">Verificando sesión y permisos…</p></div>;
  }

  if (!session) {
    return (
      <div className="container section-page admin-login">
        <div className="login-card">
          <h2>Acceso privado</h2>
          <p>Inicia sesión con una cuenta autorizada para acceder al panel.</p>
          <form onSubmit={handleLogin}>
            <label>
              Correo electrónico
              <input type="email" autoComplete="email" required value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label>
              Contraseña
              <input type="password" autoComplete="current-password" required value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} />
            </label>
            {error ? <small className="error-text">{error}</small> : null}
            <button type="submit" className="button primary" disabled={isSubmitting}>{isSubmitting ? 'Entrando…' : 'Entrar al panel'}</button>
          </form>
          <button type="button" className="button secondary auth-provider-button" onClick={handleGoogleLogin} disabled={isSubmitting}>Continuar con Google</button>
          <p className="helper-text">¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link></p>
        </div>
      </div>
    );
  }

  const hasAdminAccess = profile?.activo === true
    && ['Superadministrador', 'Administrador', 'Editor'].includes(profile.rol);

  if (!hasAdminAccess && error) {
    return (
      <div className="container section-page admin-login">
        <div className="login-card">
          <h2>No se pudieron comprobar los permisos</h2>
          <p className="error-text" role="alert">{error}</p>
          <button type="button" className="button secondary" onClick={() => { void supabase?.auth.signOut(); navigate('/', { replace: true }); }}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) return <div className="container section-page"><p role="status">Volviendo al inicio…</p></div>;

  return (
    <div className="container section-page admin-panel">
      <PageHeader title="Panel de administración" subtitle={`Sesión de ${session.user.email} · ${profile.rol}`} />
      <div className="admin-summary">
        <div className="summary-card">
          <span>Noticias</span>
          <strong>{publicData.news.length}</strong>
        </div>
        <div className="summary-card">
          <span>Actuaciones</span>
          <strong>{publicData.events.length}</strong>
        </div>
        <div className="summary-card">
          <span>Repertorio</span>
          <strong>{publicData.repertoire.length}</strong>
        </div>
        <div className="summary-card">
          <span>Tu rol interno</span>
          <strong>{profile.rol}</strong>
        </div>
      </div>

      {['Administrador', 'Superadministrador'].includes(profile.rol) ? <AdminContactRequests /> : null}
      {['Administrador', 'Superadministrador'].includes(profile.rol) ? (
        <AdminPageManager visibility={publicData.visibility} onPublished={onPublished} />
      ) : (
        <p className="admin-permission-notice">
          La gestión de visibilidad y páginas está disponible para Administradores y Superadministradores. Tu rol actual es «{profile.rol}».
        </p>
      )}
      <AdminContentEditor
        userId={session.user.id}
        role={profile.rol}
        onPublished={onPublished}
      />

      <div className="admin-actions">
        <button type="button" className="button secondary" onClick={() => { void supabase?.auth.signOut(); }}>Cerrar sesión</button>
      </div>
    </div>
  );
}

function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    phone: '',
    nickname: '',
    bandRole: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!supabase) {
      setError('Supabase no está configurado.');
      return;
    }
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (formData.password !== formData.passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}admin`,
        data: {
          first_name: formData.firstName.trim(),
          surname: formData.surname.trim(),
          phone: formData.phone.trim(),
          nickname: formData.nickname.trim(),
          band_role: formData.bandRole.trim(),
        },
      },
    });
    if (signupError) {
      setError(signupError.message);
    } else if (data.session) {
      setMessage('Cuenta creada. Tu acceso al panel requiere que un administrador asigne un rol interno.');
    } else {
      setMessage('Cuenta creada. Revisa tu correo y confirma la dirección para completar el registro.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="container section-page admin-login signup-page">
      <div className="login-card">
        <h2>Crear cuenta</h2>
        <p>El registro crea una cuenta estándar. Los permisos de administración se asignan por separado.</p>
        {!isSupabaseConfigured ? <p className="error-text">Supabase no está configurado. No se puede crear la cuenta.</p> : null}
        <form onSubmit={handleSignup}>
          <div className="field-grid">
            <label>
              Nombre
              <input autoComplete="given-name" required value={formData.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
            </label>
            <label>
              Apellidos
              <input autoComplete="family-name" required value={formData.surname} onChange={(event) => updateField('surname', event.target.value)} />
            </label>
            <label>
              Teléfono
              <input type="tel" autoComplete="tel" required value={formData.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </label>
            <label>
              Apodo
              <input required value={formData.nickname} onChange={(event) => updateField('nickname', event.target.value)} />
            </label>
            <label className="full-width">
              Cargo o papel en la banda
              <input required value={formData.bandRole} onChange={(event) => updateField('bandRole', event.target.value)} />
            </label>
            <label className="full-width">
              Correo electrónico
              <input type="email" autoComplete="email" required value={formData.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>
            <label>
              Contraseña
              <input type="password" autoComplete="new-password" minLength={8} required value={formData.password} onChange={(event) => updateField('password', event.target.value)} />
            </label>
            <label>
              Confirmar contraseña
              <input type="password" autoComplete="new-password" minLength={8} required value={formData.passwordConfirmation} onChange={(event) => updateField('passwordConfirmation', event.target.value)} />
            </label>
            <label className="privacy-toggle full-width">
              <input type="checkbox" required checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} />
              <span>He leído la <Link to="/privacidad">Política de privacidad</Link> y solicito la creación de una cuenta.</span>
            </label>
          </div>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          {message ? <p className="success-message" role="status">{message}</p> : null}
          <button type="submit" className="button primary" disabled={isSubmitting || !isSupabaseConfigured}>{isSubmitting ? 'Creando cuenta…' : 'Registrarme'}</button>
        </form>
        <p className="helper-text">¿Ya tienes cuenta? <Link to="/admin">Inicia sesión</Link></p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="container section-page not-found">
      <h1>404</h1>
      <p>No se ha encontrado la ruta <strong>{location.pathname}</strong>.</p>
      <Link to="/" className="button primary">Volver al inicio</Link>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-header">
      <span className="eyebrow">AM VS</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

export default App;
