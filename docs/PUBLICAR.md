# Publicar Tecu Aprende y compartirla con un código QR

Tecu Aprende es una app **estática**: no necesita servidor propio, base de datos ni paso de compilación. Cualquier
hosting de archivos con **HTTPS** sirve. El HTTPS no es opcional: sin él no hay *service worker*, y sin *service
worker* la app no abre en modo avión.

Lo más probable es publicarla en **GitHub Pages**, que la sirve dentro de una **subcarpeta** con el nombre del
repositorio:

```
https://<usuario-u-organización>.github.io/equipo-16-/
```

Todo en la app usa rutas relativas (`js/main.js`, `packs/…`), así que funciona igual en la raíz de un dominio que
en esa subcarpeta. Esta guía cubre GitHub Pages, Netlify Drop y Cloudflare Pages, cómo actualizar la versión, cómo
generar el QR y qué revisar en el celular antes del pitch.

---

## 0. Antes de publicar (en tu computadora, 3 minutos)

```bash
npm install                              # dependencias de desarrollo para las pruebas
npm test                                 # pruebas unitarias (incluye la del QR)
npm run e2e                              # modo avión, panel en vivo, 5 clics, accesibilidad
node tests/e2e/subruta.mjs               # la app dentro de /equipo-16-/, como en GitHub Pages
```

`tests/e2e/subruta.mjs` levanta la app en `/equipo-16-/` y revisa que carguen las tres vistas, que el service worker
se registre con el alcance de la subcarpeta, que Chrome la considere **instalable**, que recargue en modo avión y que
**ninguna** solicitud se salga de la subcarpeta. Si vas a usar Cloudflare Pages, córrela también con `--cloudflare`.

Para verla tú mismo como la verá GitHub Pages:

```bash
node scripts/servir-subruta.mjs
# abre http://localhost:8081/equipo-16-/?alumno=ana
```

Si en la terminal aparece `⚠ 404 fuera de /equipo-16-/: GET /js/…`, algún archivo usa una **ruta absoluta**
(empieza con `/`). Cámbiala por una relativa: `js/…` en HTML y CSS, o `new URL('…', import.meta.url)` en un módulo.

> **No cambies `id` ni `start_url` del manifiesto después de publicar.** El navegador los usa para reconocer la app
> instalada: si cambian, el celular la trata como otra app distinta.

---

## 1. GitHub Pages (recomendado: ya tienen el repositorio)

1. **Agrega un archivo vacío `.nojekyll`** en la raíz del repositorio (una sola vez):

   ```bash
   touch .nojekyll
   git add .nojekyll && git commit -m "Publicar sin Jekyll" && git push
   ```

   Sin él, GitHub pasa los archivos por Jekyll: convierte los `.md` en páginas, interpreta lo que esté entre llaves
   dobles como plantilla (`docs/ARQUITECTURA.md` las usa en un `@typedef`) y la publicación puede fallar o
   tardar más. Con `.nojekyll` los archivos se publican tal cual.
2. En GitHub abre el repositorio → **Settings** → **Pages**.
3. En **Build and deployment** → **Source** elige **Deploy from a branch**. En **Branch** elige la rama con la
   versión final (por ejemplo `main`) y la carpeta **/ (root)**. Guarda con **Save**.
4. Espera 1 o 2 minutos. En la pestaña **Actions** verás "pages build and deployment"; cuando tenga palomita verde,
   arriba de **Settings → Pages** aparece *"Your site is live at …"*.
5. Abre `https://<usuario>.github.io/equipo-16-/?alumno=invitado`. Debe decir **¡Hola, Invitado!**

Ten en cuenta:

- **Repositorio privado:** con una cuenta u organización gratuita, GitHub Pages solo publica repositorios
  **públicos**. Si el suyo es privado, hazlo público o usa Netlify o Cloudflare.
- **La diagonal final importa.** GitHub redirige `…/equipo-16-` a `…/equipo-16-/`, pero esa redirección necesita
  internet. El QR y los enlaces deben llevar la diagonal: `…/equipo-16-/?alumno=invitado`.
- **Caché de 10 minutos.** GitHub Pages manda todos los archivos con `Cache-Control: max-age=600`: después de
  publicar, un cambio puede tardar hasta 10 minutos en verse.
- **HTTPS:** en *Settings → Pages* deja marcada la casilla **Enforce HTTPS** (en `github.io` viene marcada).

---

## 2. Netlify Drop (sin Git, 2 minutos)

1. Prepara una carpeta **limpia**, solo con lo que está en Git (sin `node_modules` ni `.env`):

   ```bash
   mkdir -p ../tecu-publicar && git archive HEAD | tar -x -C ../tecu-publicar
   ```

   `git archive` toma lo **confirmado** (*commit*): confirma tus cambios antes.
2. Entra a <https://app.netlify.com/drop> e **inicia sesión** (es gratis). Sin cuenta, Netlify borra el sitio al poco
   tiempo si no lo reclamas.
3. Arrastra la carpeta `tecu-publicar` a la página. En segundos te da una dirección HTTPS como
   `https://nombre-al-azar.netlify.app/`. Aquí la app queda en la **raíz** (sin subcarpeta).
4. Opcional: **Site configuration → Change site name** para tener, por ejemplo, `https://tecu-aprende.netlify.app/`.
5. Para actualizar: en **Deploys**, arrastra otra vez la carpeta (regenerada con el paso 1).

---

## 3. Cloudflare Pages

Cloudflare ahora agrupa Pages dentro de **Workers & Pages**; los nombres de los botones pueden variar un poco.

**Con Git (se actualiza solo con cada `git push`):**

1. **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git** → elige el repositorio.
2. **Framework preset:** *None*. **Build command:** vacío. **Build output directory:** `/` (la raíz).
3. **Save and Deploy**. Te da `https://<proyecto>.pages.dev/` (la app queda en la raíz).

**Sin Git (subir archivos):** **Workers & Pages** → **Create** → **Pages** → **Upload assets**, ponle nombre y arrastra
la carpeta limpia del paso 1 de Netlify.

> Cloudflare Pages redirige `…/index.html` a `…/` (sus "URL bonitas"). El service worker guarda una copia limpia de
> esa respuesta; la prueba `node tests/e2e/subruta.mjs --cloudflare` imita esa redirección y debe pasar antes de
> publicar ahí.

---

## 4. Cómo actualizar la versión

1. Haz y prueba tus cambios (sección 0).
2. Sigue las instrucciones al inicio de `sw.js` (*"CÓMO PUBLICAR UNA VERSIÓN NUEVA"*). En resumen:
   - si agregaste un archivo a la app, agrégalo a `PRECACHE` (la prueba `tests/sw.test.js` te avisa si falta);
   - cambia `VERSION`. **Es lo único** que hace que los celulares que ya tienen Tecu descarguen los cambios.
     `node --test tests/sw.test.js` te dice el valor correcto si se te olvida.
3. Publica todo junto (en GitHub Pages: `git push` a la rama publicada; en Netlify: arrastra la carpeta de nuevo).
4. Espera a que termine la publicación (y hasta 10 minutos de caché en GitHub Pages).
5. En cada celular: abre Tecu **con internet**. La versión nueva se descarga en segundo plano y aparece el aviso
   **"Hay una versión nueva de Tecu"**: toca **Actualizar**. Si nadie lo toca, se aplica sola la próxima vez que
   se abra Tecu con todas sus ventanas cerradas. Nunca interrumpe un ejercicio.

---

## 5. Cómo generar el código QR

El QR debe abrir la vista de invitado **de la dirección publicada**, con `https://` y con la diagonal antes del `?`:

```
https://<usuario>.github.io/equipo-16-/?alumno=invitado
```

### Opción A: desde el modo presentación (sin internet ni servicios externos)

Abre el modo presentación **desde la dirección publicada** (`https://…/equipo-16-/?vista=pitch`), no desde
`localhost`. Su "Escanea y pruébalo" usa `js/ui/qr.js`, que arma el QR en el propio navegador a partir de la
dirección de la página. Si lo abres desde `localhost` o una IP de tu red, el QR apuntaría a tu computadora:
`esDireccionPublica()` lo detecta para avisar al presentador.

### Opción B: un archivo SVG con `js/ui/qr.js` (Node, sin internet)

```bash
node -e "import('./js/ui/qr.js').then((m) => process.stdout.write(m.qrSVG(process.argv[1], { etiqueta: 'Escanea y prueba Tecu' })))" "https://USUARIO.github.io/equipo-16-/?alumno=invitado" > qr-tecu.svg
```

Cambia `USUARIO` por el tuyo. El SVG se ve nítido a cualquier tamaño (imprímelo o ponlo en la diapositiva). Si tu
programa de diapositivas no acepta SVG, ábrelo en el navegador y toma una captura.

`js/ui/qr.js` sigue la norma (modo byte, corrección de errores M, la versión más chica en la que quepa: una
dirección como la de arriba usa la versión 4 y una de hasta 122 caracteres cabe en la versión 7). `npm test` lo
comprueba decodificándolo con un lector independiente (`jsqr`).

```js
import { qrSVG, urlParaInvitado, esDireccionPublica } from './js/ui/qr.js';
const url = urlParaInvitado();   // misma carpeta que la página actual + ?alumno=invitado
contenedor.innerHTML = qrSVG(url, { etiqueta: 'Código QR para abrir Tecu en tu celular' });
```

### Opción C: con el navegador

- **Chrome en la computadora:** abre la dirección pública de invitado → en la barra de direcciones, botón
  **Compartir** (o el menú ⋮ → **Transmitir, guardar y compartir**) → **Crear código QR** → **Descargar**.
- **Chrome en Android:** menú ⋮ → **Compartir** → **Código QR**.

Antes de imprimirlo, **escanéalo** y revisa que la dirección que abre sea exactamente la de arriba.

### Para el pitch

- QR grande (al menos 6 × 6 cm impreso, o un cuarto de la diapositiva), negro sobre blanco, con su margen blanco.
- Escribe la dirección corta debajo del QR para quien no pueda escanear.

---

## 6. Qué revisar en el celular antes del pitch

Hazlo el mismo día, con un celular Android (Chrome) y un iPhone (Safari), y de preferencia con uno que nunca haya
abierto la app (como lo verá el jurado).

1. **Primera visita, con datos o Wi-Fi.** Escanea el QR. Si se abre dentro de otra app (por ejemplo, el lector de
   QR de una red social), elige **Abrir en Chrome / Abrir en Safari**: dentro de otras apps el modo sin internet
   puede no funcionar. Debe decir **¡Hola, Invitado!** y la dirección debe empezar con `https://`.
2. **Espera unos 10 segundos** en el inicio: el celular está guardando la app (alrededor de 1 MB). En **Descargas**
   se ve lo que quedó guardado.
3. **Modo avión.** Actívalo y **apaga también el Wi-Fi** (en muchos celulares el modo avión lo deja encendido).
4. **Recarga** la página. Debe abrir igual: nada de "Sin conexión" ni el dinosaurio.
5. **Úsala sin red:** resuelve un ejercicio del diagnóstico con un error a propósito. Debe salir el diagnóstico y,
   arriba, las actividades pendientes de sincronizar.
6. **Quita el modo avión.** Los pendientes se sincronizan solos y desaparecen de la barra.
7. **Instálala** (opcional, se ve muy bien en el pitch):
   - **Android, Chrome:** menú ⋮ → **Instalar app** (o **Agregar a la pantalla principal**). Al dejar presionado
     el ícono aparecen los atajos **Continuar mi lección** y **Panel docente**.
   - **iPhone, Safari:** botón **Compartir** → **Agregar a la pantalla de inicio**.
   - Ábrela desde el ícono de Tecu: se ve sin la barra del navegador. Repite los pasos 3 y 4 desde el ícono.
8. **En la computadora del presentador:** abre `…/?vista=pitch` y `…/?vista=docente` desde la dirección publicada y
   revisa que el QR del modo presentación sea el de la dirección pública.

Recuerda: sin servidor, el panel docente solo ve lo que se sincroniza **en el mismo navegador** (por eso el modo
presentación muestra los teléfonos y el panel juntos). Lo que haga el jurado en su celular se queda en su celular.

---

## 7. Si algo falla

| Lo que ves | Qué pasa y qué hacer |
|---|---|
| Página en blanco o sin estilos en GitHub Pages | Alguna ruta absoluta (`/js/…`). Corre `node tests/e2e/subruta.mjs`: dice cuál. |
| 404 de GitHub en la dirección | Pages aún no termina (revisa **Actions**), la rama o la carpeta están mal, o falta la diagonal final. |
| Sin internet aparece "Sin conexión" o el dinosaurio | La primera visita no terminó de guardar (espera más con datos), la dirección no es `https://`, o es otra dirección (sin la diagonal final, con `http://` o con otra subcarpeta). |
| En iPhone no abre sin internet | Ábrela en Safari, no dentro de otra app. Safari borra lo guardado de sitios que no se usan en varios días: haz la primera visita el mismo día. |
| Los cambios no aparecen | ¿Cambiaste `VERSION` en `sw.js`? Espera hasta 10 minutos (caché de GitHub Pages), abre Tecu con internet y toca **Actualizar**. |
| No sale la opción de instalar | Necesita `https://` y una primera carga completa. Si ya está instalada, Chrome ofrece abrirla en la app en lugar de instalarla. En iPhone se instala desde Safari. |
| El panel no muestra al celular del jurado | Es lo esperado sin servidor: el panel ve lo que se sincroniza en el mismo navegador. |
