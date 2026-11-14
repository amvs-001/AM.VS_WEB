import { createContext, type ReactNode, useContext, useState } from 'react';

const STORAGE_KEY = 'amvs:privacy-preferences:v1';

type StoredPreferences = {
  version: 1;
  externalMedia: boolean;
};

type CookiePreferencesContextValue = {
  externalMediaAllowed: boolean;
  openCookieSettings: () => void;
};

const CookiePreferencesContext = createContext<CookiePreferencesContextValue | null>(null);

function readPreferences(): {
  externalMediaAllowed: boolean;
  hasSaved: boolean;
  error: string;
} {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { externalMediaAllowed: false, hasSaved: false, error: '' };
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'version' in parsed
      && parsed.version === 1
      && 'externalMedia' in parsed
      && typeof parsed.externalMedia === 'boolean'
    ) {
      return { externalMediaAllowed: parsed.externalMedia, hasSaved: true, error: '' };
    }
    return { externalMediaAllowed: false, hasSaved: false, error: '' };
  } catch (error) {
    console.error('No se pudieron leer las preferencias de privacidad:', error);
    return {
      externalMediaAllowed: false,
      hasSaved: false,
      error: 'El navegador no permite guardar preferencias. La elección solo durará en esta visita.',
    };
  }
}

export function useCookiePreferences() {
  const context = useContext(CookiePreferencesContext);
  if (!context) throw new Error('useCookiePreferences debe usarse dentro de CookiePreferencesProvider.');
  return context;
}

export default function CookiePreferencesProvider({ children }: { children: ReactNode }) {
  const [initialPreferences] = useState(readPreferences);
  const [externalMediaAllowed, setExternalMediaAllowed] = useState(initialPreferences.externalMediaAllowed);
  const [draftExternalMedia, setDraftExternalMedia] = useState(initialPreferences.externalMediaAllowed);
  const [hasSaved, setHasSaved] = useState(initialPreferences.hasSaved);
  const [isOpen, setIsOpen] = useState(!initialPreferences.hasSaved);
  const [storageError, setStorageError] = useState(initialPreferences.error);

  function savePreferences(allowExternalMedia: boolean) {
    const preferences: StoredPreferences = { version: 1, externalMedia: allowExternalMedia };
    setExternalMediaAllowed(allowExternalMedia);
    setHasSaved(true);
    setIsOpen(false);
    setStorageError('');
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('No se pudieron guardar las preferencias de privacidad:', error);
      setStorageError('No se pudieron guardar las preferencias; la elección solo durará en esta visita.');
    }
  }

  function openCookieSettings() {
    setDraftExternalMedia(externalMediaAllowed);
    setIsOpen(true);
  }

  return (
    <CookiePreferencesContext.Provider value={{
      externalMediaAllowed,
      openCookieSettings,
    }}>
      {children}
      {isOpen ? (
        <section
          className="privacy-preferences"
          role="region"
          aria-label="Preferencias de privacidad"
        >
          <div className="privacy-preferences-copy">
            <h2>{hasSaved ? 'Preferencias de privacidad' : 'Tu privacidad importa'}</h2>
            <p>
              Usamos almacenamiento necesario para recordar el tema, la posición de navegación y la sesión.
              Los reproductores de YouTube, TikTok, Vimeo y SoundCloud permanecen bloqueados hasta que los permitas.
              No cargamos analítica ni publicidad.
            </p>
            <label className="privacy-toggle">
              <input type="checkbox" checked disabled />
              <span>Almacenamiento necesario (siempre activo)</span>
            </label>
            <label className="privacy-toggle">
              <input
                type="checkbox"
                checked={draftExternalMedia}
                onChange={(event) => setDraftExternalMedia(event.target.checked)}
              />
              <span>Permitir reproductores y contenido de terceros</span>
            </label>
            <p className="helper-text">
              Si lo permites, el proveedor externo puede recibir tu dirección IP y usar sus propias cookies.
              Puedes cambiarlo después desde el enlace «Cookies» del pie de página.
            </p>
            {storageError ? <p className="error-text" role="status">{storageError}</p> : null}
          </div>
          <div className="privacy-preferences-actions">
            <button type="button" className="button secondary" onClick={() => savePreferences(false)}>
              Solo necesarios
            </button>
            <button type="button" className="button primary" onClick={() => savePreferences(draftExternalMedia)}>
              Guardar preferencias
            </button>
            {!hasSaved ? (
              <button type="button" className="button secondary" onClick={() => savePreferences(true)}>
                Permitir reproductores
              </button>
            ) : null}
            {hasSaved ? (
              <button type="button" className="privacy-close" onClick={() => setIsOpen(false)}>
                Cerrar
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </CookiePreferencesContext.Provider>
  );
}
