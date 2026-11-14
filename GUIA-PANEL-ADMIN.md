# Panel de administración

## 1. Activar el inicio con Google

Antes de desplegar, para probar Google en local, en **Supabase → Authentication → URL Configuration**:

1. Define **Site URL** como el origen que usas para la web. En local: `http://localhost:5173`.
2. En **Redirect URLs**, añade al menos `http://localhost:5173/admin` y `http://127.0.0.1:5173/admin`. Añade también el dominio final HTTPS cuando despliegues.
3. En **Authentication → Providers → Google**, confirma que Google está habilitado y que están guardados el Client ID y el Client Secret OAuth de Google.
4. En la consola del proveedor Google, la URI de redirección autorizada debe ser exactamente la que muestra Supabase para el proyecto, normalmente `https://<project-ref>.supabase.co/auth/v1/callback`.

No pegues el Client Secret de Google ni la clave `service_role` en el código, en el navegador o en el chat. La aplicación inicia OAuth y Supabase gestiona el callback.

## 2. Elegir hosting gratis y dominio

Aquí “dominio gratis” significa una dirección bajo el dominio del proveedor, por ejemplo `amvs.pages.dev`; no un dominio propio `.com`/`.es`. Ningún servicio promete capacidad gratuita e ilimitada para siempre: planes, cuotas y condiciones pueden cambiar. Para esta web estática React/Vite conectada a Supabase, Cloudflare Pages es la opción gratuita recomendada: tiene integración con Git, previews y redirección SPA automática. Su cuota publicada es **500 builds al mes** (uno simultáneo); no es un número ilimitado, pero suele sobrar para actualizaciones normales.

| Servicio | URL gratis | Despliegue automático desde Git | Límites/condiciones publicados | Valoración |
|---|---|---|---|---|
| Cloudflare Pages Free | `*.pages.dev` | Sí, cada push | 500 builds/mes, 1 simultáneo; previews ilimitadas | Recomendado para esta web; el fallback SPA de React funciona sin reglas especiales. |
| Vercel Hobby | `*.vercel.app` | Sí | Hobby sólo para uso personal/no comercial y cuotas mensuales. El límite publicado incluye hasta 100 despliegues al día. | Fácil, pero revisa su política: la web ofrece contacto para contratar actuaciones, así que no asumiría que cumple Hobby. |
| Netlify Free | `*.netlify.app` | Sí | Cuota mensual de créditos; cada despliegue de producción consume créditos, por lo que las publicaciones no son literalmente ilimitadas. | Alternativa sencilla, pero menos adecuada si quieres publicar muchas veces sin vigilar créditos. |
| GitHub Pages | `*.github.io` | Sí, vía GitHub Actions | Límite blando de 100 GB/mes y hasta 10 builds/hora; sus condiciones excluyen usarlo como hosting gratis de una web dirigida a transacciones/negocio. | No recomendado para la web pública de la agrupación. |

Las cuotas citadas son las documentadas a fecha de consulta; verifica las condiciones actuales antes de activar el sitio:

- [Cloudflare Pages: límites del plan Free](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages: integración Git](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare Pages: configuración de build](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare Pages: rutas SPA](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [Vercel Hobby y sus límites](https://vercel.com/docs/plans/hobby)
- [Netlify: precios y créditos](https://www.netlify.com/pricing/)
- [GitHub Pages: límites y condiciones](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

### Opción recomendada: Cloudflare Pages

1. Inicia sesión o crea una cuenta gratuita en Cloudflare.
2. Ve a **Workers & Pages → Create application → Pages → Connect to Git**. Autoriza GitHub y selecciona `Capaa-475/AM.VS_WEB`.
3. Configura **Production branch** `main`, preset **Vite** (si aparece), **Build command** `npm run build` y **Build output directory** `dist`. Deja la raíz del proyecto vacía.
4. En variables de entorno de **Production**, crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores del proyecto. No añadas `service_role`.
5. Antes del primer deploy, decide el nombre definitivo del proyecto, por ejemplo `amvs-web`; la URL estable será `https://amvs-web.pages.dev`. El subdominio proporcionado por Pages es gratuito; un `.com`/`.es` propio normalmente hay que comprarlo.
6. Pulsa **Save and Deploy**. Espera al estado **Success** y abre la URL `*.pages.dev`.
7. En Supabase → **Authentication → URL Configuration**, configura **Site URL** con el origen estable exacto, por ejemplo `https://amvs-web.pages.dev` (sin `/admin`). En **Redirect URLs**, añade `https://amvs-web.pages.dev/admin`, `http://localhost:5173/admin` y `http://127.0.0.1:5173/admin`.
8. Prueba Inicio y también abre directamente `/admin`, `/registro`, `/historia` y `/repertorio`. Pages sirve la aplicación React para rutas SPA que no coinciden con un fichero, por eso esos enlaces profundos deben funcionar.
9. Cada push a `main` reconstruye y despliega producción. Usa la URL estable `*.pages.dev` para iniciar sesión Google; las URLs Preview de ramas distintas no están autorizadas por defecto.

Tras elegir `*.pages.dev` y guardarlo en Supabase, no hay que modificar las redirecciones de Google en cada commit. La callback configurada en Google Cloud debe seguir siendo la de Supabase, por ejemplo `https://<project-ref>.supabase.co/auth/v1/callback`; Google devuelve a Supabase y Supabase redirige al sitio permitido.

### Preparación alternativa: GitHub Pages

`https://pages.github.com/` es la página informativa del servicio, no la URL pública del proyecto. Para este repositorio, GitHub Pages usa `https://capaa-475.github.io/AM.VS_WEB/`. La configuración de compilación y publicación está en `.github/workflows/deploy-github-pages.yml`.

Para activar la alternativa:

1. En GitHub, abre `Capaa-475/AM.VS_WEB` → **Settings → Pages** y elige **GitHub Actions** como origen.
2. En **Settings → Secrets and variables → Actions**, crea los secretos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` usando los valores públicos de configuración del proyecto Supabase. Nunca uses `service_role`.
3. En **Supabase → Authentication → URL Configuration**, configura `https://capaa-475.github.io/AM.VS_WEB/` como **Site URL** y `https://capaa-475.github.io/AM.VS_WEB/admin` como **Redirect URL**.
4. Comprueba en la pestaña **Actions** que termina correctamente el flujo **Deploy to GitHub Pages** y abre `https://capaa-475.github.io/AM.VS_WEB/`. La ruta del proyecto contiene `/AM.VS_WEB/`; no es solo un subdominio.
5. En Search Console, crea una propiedad de tipo **Prefijo de URL** con `https://capaa-475.github.io/AM.VS_WEB/`, verifica con la etiqueta HTML publicada, y envía `sitemap.xml` desde **Sitemaps**.

GitHub Pages tiene condiciones de uso para el hosting gratuito; esta web incluye contacto para contratar actuaciones. Revisa las condiciones actuales antes de usarlo como alojamiento definitivo. Cambiar de proveedor no garantiza por sí solo que Google rastree o indexe el sitemap.

### Alternativa: Vercel

Si prefieres Vercel, importa `Capaa-475/AM.VS_WEB` y selecciona `main`; usa **Build Command** `npm run build`, **Output Directory** `dist` e **Install Command** `npm install`. En **Settings → Environment Variables** añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para Production. Conserva el nombre del proyecto para mantener la URL `*.vercel.app` y añade `https://<nombre>.vercel.app/admin` como Redirect URL en Supabase. El archivo `vercel.json` de este repositorio reescribe las rutas React a `index.html`. Antes de elegir Hobby, ten presente su requisito de uso personal/no comercial.

## 3. Preparar permisos y almacenamiento

El panel necesita una tabla privada de borradores, la columna para programar noticias y el bucket de imágenes/vídeos. En el proyecto Supabase que usa la web:

1. Abre **SQL Editor → New query**.
2. Copia y ejecuta el contenido de `supabase/admin_panel_setup.sql`.
3. Inicia sesión una vez en `/admin` con el botón **Continuar con Google** y la cuenta que será administradora. Esto crea la identidad en **Authentication → Users**; no la autoriza todavía para administrar.
4. Asigna el rol interno siguiendo la sección siguiente. No se asigna privilegio administrativo por registrarse o usar Google.
5. No publiques una clave `service_role` en la web ni en `.env`; el panel usa la clave pública y Supabase RLS para autorizar cambios.

La migración activa RLS, añade políticas de lectura pública para el contenido visible, protege los borradores por usuario y configura el bucket público `site-media`. Los roles `Administrador` y `Superadministrador` pueden gestionar contenido editorial, incluidas noticias, historia, actuaciones y álbumes/fotos/vídeos de galería; `Editor` sólo puede gestionar repertorio. Sólo `Superadministrador` puede cambiar o borrar los ajustes generales del sitio y el logo. Estas reglas se aplican también en Supabase, aunque alguien intente saltarse la interfaz. La lectura pública de noticias oculta borradores y noticias cuya fecha programada todavía no ha llegado. La migración crea perfiles nuevos como `Usuario`, nunca administrador; si ya existía un perfil con ese correo, lo vincula al UUID autenticado y quita el rol interno, que debe volver a asignarse explícitamente. También registra las nueve marchas de vídeo indicadas en este proyecto; se puede ejecutar otra vez para actualizar las políticas y volver a asegurar esas URLs sin duplicar esas marchas.

## 4. Asignar el primer administrador de Google

Después de iniciar sesión una vez con Google, abre **SQL Editor → New query**, sustituye el correo por el mismo correo verificado de Google y ejecuta:

```sql
do $$
declare
  google_user record;
begin
  select id, email
    into google_user
    from auth.users
   where lower(email) = lower('cobourbanofrancisco@gmail.com')
   limit 1;

  if google_user.id is null then
    raise exception 'No se encontró la cuenta. Inicia sesión una vez con Google y vuelve a ejecutar este bloque.';
  end if;

  delete from public.profiles
   where lower(correo) = lower(google_user.email)
     and id <> google_user.id;

  insert into public.profiles (id, nombre, correo, rol, activo)
  values (
    google_user.id,
    'Francisco',
    google_user.email,
    'Superadministrador',
    true
  )
  on conflict (id) do update
    set nombre = excluded.nombre,
        correo = excluded.correo,
        rol = 'Superadministrador',
        activo = true;
end;
$$;
```

El bloque sólo vincula el perfil al UUID que Supabase Auth creó para el acceso Google. Si eliminaste el usuario anterior, inicia sesión con Google primero y luego ejecuta el bloque para asociar el UUID nuevo. Comprueba el resultado:

```sql
select id, correo, rol, activo
from public.profiles
where lower(correo) = lower('cobourbanofrancisco@gmail.com');
```

Debe salir una fila con `activo = true` y `rol = Superadministrador`. Conserva este rol sólo para la persona que gestionará otros permisos; usa `Administrador` para gestión habitual y `Editor` para edición de repertorio. Las cuentas creadas mediante registro público se quedan en rol `Usuario` y no pueden editar contenido.

Para dar el rol de administrador habitual a otra cuenta, primero esa persona debe iniciar sesión una vez; después ejecuta en SQL Editor, cambiando el correo:

```sql
update public.profiles
set rol = 'Administrador', activo = true
where lower(correo) = lower('correo-de-la-persona@gmail.com');
```

No uses `Superadministrador` para el equipo editorial: ese rol permite cambiar todos los ajustes generales y el logo.

## 5. Uso del panel

1. Arranca la web con `npm run dev` y entra en `/admin`.
2. Inicia sesión con una cuenta cuyo perfil tenga uno de los roles permitidos. Una cuenta registrada sin perfil administrativo no obtiene acceso automáticamente.
3. Con rol **Administrador**, gestiona noticias, historia, actuaciones, repertorio, galería, componentes y patrocinadores. En cada sección elige un registro o pulsa **Nuevo**; edita, previsualiza y publica. En repertorio, los campos `video_url`, `audio_url` e `imagen_url` aceptan enlaces directos o enlaces de YouTube, TikTok, Vimeo y SoundCloud; la ficha de cada marcha se genera automáticamente y se abre desde **Ver ficha y multimedia**. Antes de borrar un registro o una noticia, el panel pide confirmación.
4. Con rol **Superadministrador** aparecen además **Textos y datos del sitio**, donde se editan los textos de portada, relato histórico, contacto, enlaces sociales (`site_social_links`, como un array JSON de `label` y `url`) y el logo. Para cambiar el escudo, sube una imagen, revisa la vista previa y pulsa **Publicar cambios**.
5. En **Noticias**, crea el titular y la descripción, añade texto completo y opcionalmente una imagen o vídeo. Puedes guardar un borrador, publicar ahora o indicar fecha y hora y pulsar **Programar publicación**.
6. El selector **Borradores guardados** permite recuperar borradores. Publicar un borrador de contenido lo elimina de la lista; la noticia se guarda en la tabla `news`.

Las noticias programadas quedan guardadas con estado publicado, pero las políticas y la consulta pública no las muestran antes de su fecha. Tras llegar la hora, aparecerán al volver a cargar la web o consultar la API.

## 6. Pruebas que debes hacer

1. Cierra sesión, entra en `/admin` y pulsa **Continuar con Google** con el correo administrador.
2. Confirma que vuelve a `/admin` y aparece el panel. Una cuenta sin rol interno se desconecta y vuelve a Inicio; si una consulta de Supabase falla, se muestra un error en vez de conceder acceso.
3. Abre otra sesión con una cuenta `Administrador`: debe ver las herramientas editoriales, incluida noticias y galería, pero no **Textos y datos del sitio**. Una cuenta `Usuario` no tendrá acceso al panel.
4. Guarda una noticia como borrador; comprueba que no aparece en Inicio ni en los resultados públicos de `news`.
5. Abre el borrador, usa Vista previa, publícalo y confirma que aparece en Inicio tras recargar.
6. Programa una noticia para dentro de unos minutos. Confirma que no aparece antes, espera a la hora indicada y recarga.
7. Con la cuenta `Administrador`, crea y borra una noticia de prueba, una entrada de historia y un álbum; sube una imagen a un álbum. Revisa la web pública después de publicar.
8. En Repertorio abre cada marcha con vídeo: el enlace debe reproducirse en la tarjeta y en su ficha individual. Prueba también una URL MP4, una imagen y un enlace de audio en sus campos correspondientes.
9. Comprueba que la cuenta `Administrador` no puede editar `site_settings` ni publicar/cambiar el logo. Repite la prueba con `Superadministrador` y confirma que sí puede.
10. Comprueba en Supabase **Storage → site-media** que el archivo subió y en el Table Editor que el registro actualizado coincide.
11. En la consola del navegador y Network, verifica que no haya errores. Nunca captures ni compartas tokens o claves.

## 7. Límites conocidos

- Los cambios se publican por registro; no hay una operación global que publique varios registros de forma atómica.
- Al borrar un álbum se borran también sus elementos relacionados. Borrar un registro no elimina automáticamente el archivo multimedia de Storage, para evitar quitar archivos que pudieran estar compartidos o aún referenciados.
- La vista previa muestra el contenido del registro o la tarjeta de noticia; no es una copia interactiva completa de toda la página.
- Las imágenes y vídeos admitidos son JPEG, PNG, WebP, GIF, MP4 y WebM, con un máximo de 20 MB.
- Antes de publicar contenido personal (por ejemplo, nombres o fotografías de componentes), confirma que se dispone de autorización.
- El horario de una publicación programada se interpreta en la zona horaria local del navegador desde el que se crea.
- Cambiar la imagen del escudo actualiza la URL en Supabase; el archivo viejo no se elimina automáticamente del bucket.

## 8. Aparecer en Google y Bing

El sitio incluye metadatos de búsqueda, datos estructurados de la agrupación, `robots.txt` y un sitemap. Para solicitar que los buscadores lo rastreen:

1. Comprueba que GitHub Pages haya publicado la última versión y que `https://capaa-475.github.io/AM.VS_WEB/robots.txt` y `https://capaa-475.github.io/AM.VS_WEB/sitemap.xml` abran correctamente.
2. Entra en [Google Search Console](https://search.google.com/search-console/) con una cuenta Google y crea una propiedad de tipo **Prefijo de URL** con `https://capaa-475.github.io/AM.VS_WEB/`.
3. Verifica la propiedad con el método **Etiqueta HTML**: copia el token que Google proporciona y añádelo como `<meta name="google-site-verification" content="TOKEN" />` dentro de `<head>` en `index.html`. Sube ese cambio y pulsa **Verificar** en Search Console.
4. En Search Console, abre **Sitemaps**, escribe `sitemap.xml` y envíalo. Usa **Inspección de URL** para `https://capaa-475.github.io/AM.VS_WEB/` y pulsa **Solicitar indexación** si Search Console lo permite.
5. En [Bing Webmaster Tools](https://www.bing.com/webmasters/), importa la propiedad de Search Console o añade la misma URL y envía `https://capaa-475.github.io/AM.VS_WEB/sitemap.xml`.
6. Para ayudar a asociar la web con búsquedas como “AM Virgen de la Soledad Doña Mencía”, usa el mismo nombre en los perfiles oficiales, enlaza la web desde redes sociales y publica contenido propio con nombres claros para marchas, actuaciones e historia.

La indexación no es instantánea ni garantiza una posición concreta. Puede tardar días o semanas; Search Console muestra errores de rastreo e indexación. Si en el futuro se compra un dominio propio, hay que actualizar la URL base en el sitemap, metadatos/canonical y las propiedades de buscadores.
