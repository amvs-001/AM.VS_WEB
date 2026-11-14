import type { ReactNode } from 'react';
import type { SiteSettings } from '../types';

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="container section-page legal-page">
      <header className="page-header">
        <span className="eyebrow">Información legal</span>
        <h1>{title}</h1>
      </header>
      {children}
    </article>
  );
}

function ResponsibleDetails({ settings }: { settings: SiteSettings }) {
  return (
    <aside className="legal-pending-notice" role="note">
      <strong>Información que falta confirmar antes de considerar completo este aviso</strong>
      <p>
        La web no contiene el NIF/CIF ni el domicilio social del responsable. La agrupación debe añadir esos datos
        y un canal escrito de privacidad. No se inventan ni se sustituye el domicilio social por el local de ensayo.
      </p>
      <p><strong>Nombre público:</strong> {settings.name}</p>
      <p><strong>Teléfono público:</strong> <a href={`tel:${settings.publicPhone.replace(/[^\d+]/g, '')}`}>{settings.publicPhone}</a></p>
    </aside>
  );
}

export function LegalNoticePage({ settings }: { settings: SiteSettings }) {
  return (
    <LegalLayout title="Aviso legal">
      <ResponsibleDetails settings={settings} />
      <section>
        <h2>Finalidad del sitio</h2>
        <p>
          Este sitio informa sobre la actividad, el repertorio, las actuaciones y las vías de contacto de
          {` ${settings.name}`}. El acceso y uso de la web implica respetar la legislación aplicable y los derechos
          de propiedad intelectual de sus titulares y colaboradores.
        </p>
      </section>
      <section>
        <h2>Contenidos y enlaces</h2>
        <p>
          Los enlaces a redes sociales y servicios de vídeo o audio llevan a plataformas de terceros, sujetas a sus
          propias condiciones. La agrupación no controla sus políticas ni la disponibilidad de sus contenidos.
        </p>
      </section>
      <section>
        <h2>Propiedad intelectual</h2>
        <p>
          Los textos, fotografías, vídeos, escudos y demás materiales pertenecen a sus titulares. No se autoriza su
          reproducción o uso comercial sin permiso, salvo los usos permitidos por la ley.
        </p>
      </section>
    </LegalLayout>
  );
}

export function PrivacyPolicyPage({ settings }: { settings: SiteSettings }) {
  return (
    <LegalLayout title="Política de privacidad">
      <ResponsibleDetails settings={settings} />
      <section>
        <h2>Qué datos se tratan y para qué</h2>
        <ul>
          <li>
            Si creas una cuenta, se envían a Supabase Authentication el correo y la contraseña; el sitio crea además
            un perfil con nombre, apellidos, teléfono, apodo y papel en la banda. Se usan para gestionar la cuenta y,
            si corresponde, los permisos del panel. Si eliges Google, Google participa en el inicio de sesión.
          </li>
          <li>
            La navegación pública no pide datos personales. La preferencia de tema, posición de lectura y decisión
            sobre reproductores externos se guardan en el almacenamiento local del navegador.
          </li>
          <li>
            El formulario de contacto actual es una demostración local: no envía ni almacena la solicitud. No
            introduzcas datos sensibles en él; para contactar se muestra el teléfono público.
          </li>
        </ul>
      </section>
      <section>
        <h2>Base y conservación</h2>
        <p>
          Los datos de cuenta se tratan para prestar la función de registro e iniciar sesión. Se conservan mientras
          la cuenta permanezca activa y se eliminan cuando se solicita su baja, salvo los datos que deban conservarse
          por una obligación legal. Los plazos concretos de copias de seguridad dependen del proveedor Supabase y
          deben confirmarse en sus condiciones vigentes.
        </p>
      </section>
      <section>
        <h2>Proveedores y transferencias</h2>
        <p>
          La web se publica mediante GitHub Pages y usa Supabase para autenticación y almacenamiento de perfiles.
          Cuando se permite un reproductor externo, YouTube, TikTok, Vimeo o SoundCloud pueden recibir datos
          técnicos como la dirección IP y aplicar sus propias tecnologías. La política de cookies explica cómo
          bloquearlos o retirar el permiso.
        </p>
      </section>
      <section>
        <h2>Derechos</h2>
        <p>
          Puedes solicitar acceso, rectificación, supresión, limitación, oposición o portabilidad, y reclamar ante
          la <a href="https://www.aepd.es/" target="_blank" rel="noreferrer">Agencia Española de Protección de Datos</a>.
          Para ejercer derechos, utiliza el canal de contacto público e identifica la cuenta afectada. Antes de
          publicar esta política deben añadirse el domicilio y un canal escrito del responsable.
        </p>
      </section>
      <p className="legal-updated">Última revisión: 14 de noviembre de 2026.</p>
    </LegalLayout>
  );
}

export function CookiePolicyPage({ onOpenPreferences }: { onOpenPreferences: () => void }) {
  return (
    <LegalLayout title="Cookies y almacenamiento">
      <section>
        <h2>Qué utiliza esta web</h2>
        <p>
          La aplicación no incorpora analítica ni publicidad. No instala cookies propias de seguimiento. Usa
          almacenamiento local del navegador para recordar el tema visual y las preferencias de privacidad, y
          almacenamiento de sesión para restaurar la posición de lectura. El service worker guarda recursos de la
          aplicación para que pueda abrirse sin conexión. Supabase guarda la sesión de acceso del usuario para
          mantener el inicio de sesión.
        </p>
      </section>
      <section>
        <h2>Contenido de terceros</h2>
        <p>
          Los reproductores de YouTube, TikTok, Vimeo y SoundCloud están bloqueados inicialmente. Solo se cargan
          tras permitir contenido externo; al hacerlo, esos proveedores pueden recibir datos técnicos y establecer
          sus propias cookies. Los enlaces a redes sociales solo contactan con sus plataformas cuando decides
          abrirlos.
        </p>
      </section>
      <section>
        <h2>Cambiar o retirar tu elección</h2>
        <p>
          Puedes volver a bloquear reproductores o permitirlos desde este control. También puedes borrar el
          almacenamiento del sitio desde los ajustes del navegador; al hacerlo, se olvidarán el tema y las preferencias.
        </p>
        <button type="button" className="button primary" onClick={onOpenPreferences}>Configurar privacidad</button>
      </section>
      <p className="legal-updated">Última revisión: 14 de noviembre de 2026.</p>
    </LegalLayout>
  );
}
