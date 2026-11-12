/**
 * Sirve la app dentro de una subcarpeta, igual que GitHub Pages publica un
 * repositorio de proyecto: https://<usuario>.github.io/equipo-16-/
 *
 *   node scripts/servir-subruta.mjs                → http://localhost:8081/equipo-16-/
 *   PORT=9000 node scripts/servir-subruta.mjs      → otro puerto
 *   BASE=/otra-carpeta/ node scripts/servir-subruta.mjs
 *   REDIRIGIR_INDEX=1 node scripts/servir-subruta.mjs   → además imita a Cloudflare Pages
 *
 * Sirve para comprobar ANTES de publicar que nada usa rutas absolutas
 * (/js/…, /packs/…): en localhost:8080 funcionan porque la app está en la
 * raíz, pero en GitHub Pages apuntan fuera de la subcarpeta y fallan. Aquí,
 * todo lo que se pida fuera de la subcarpeta responde 404 y se anota en la
 * consola con la página que lo pidió.
 *
 * Imita a GitHub Pages en lo que le importa a la PWA:
 *   - /equipo-16- (sin diagonal final) redirige con 301 a /equipo-16-/
 *   - fuera de la subcarpeta: 404
 *   - Cache-Control: max-age=600 en todo, también en sw.js
 *   - solo GET y HEAD: no hay /api/* (la IA opcional no existe en un hosting estático)
 * Con REDIRIGIR_INDEX=1 (o { redirigirIndex: true }) también redirige
 * …/index.html → …/ con 308, como las "URL bonitas" de Cloudflare Pages.
 *
 * Los archivos los entrega servirEstatico() de server.js (tipos MIME
 * correctos, sin salir de la carpeta del proyecto, sin .env ni .git).
 */
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { servirEstatico } from '../server.js';

/** Subcarpeta de GitHub Pages para el repositorio equipo-16-. */
export const BASE_POR_DEFECTO = '/equipo-16-/';

/** Encabezado de caché que pone GitHub Pages a todos los archivos. */
const CACHE_GITHUB_PAGES = 'max-age=600';

/**
 * Deja la base como "/carpeta/" (con diagonal al inicio y al final).
 * @param {string} base
 * @returns {string}
 */
export function normalizarBase(base = BASE_POR_DEFECTO) {
  const limpia = String(base).trim().replace(/^\/+|\/+$/g, '');
  return limpia ? `/${limpia}/` : '/';
}

/**
 * Cambia el Cache-Control que pone servirEstatico() por el de GitHub Pages y
 * avisa el código de estado con que se respondió.
 */
function comoGitHubPages(res, alResponder) {
  const writeHead = res.writeHead.bind(res);
  res.writeHead = (estado, ...resto) => {
    const encabezados = resto.find((r) => r && typeof r === 'object');
    if (encabezados) {
      for (const nombre of Object.keys(encabezados)) {
        if (nombre.toLowerCase() === 'cache-control') delete encabezados[nombre];
      }
      encabezados['Cache-Control'] = CACHE_GITHUB_PAGES;
    }
    alResponder(estado);
    return writeHead(estado, ...resto);
  };
}

/**
 * Crea el servidor (sin escuchar todavía).
 *
 * @typedef {{ metodo: string, ruta: string, desde: string, estado: number }} Solicitud
 * @param {{ base?: string, redirigirIndex?: boolean,
 *   alSalirse?: (s: Solicitud) => void, alFallar?: (s: Solicitud) => void }} [opciones]
 *   redirigirIndex: …/index.html → …/ con 308 (como Cloudflare Pages)
 *   alSalirse: cada solicitud que cae FUERA de la subcarpeta (se responde 404: es una ruta absoluta)
 *   alFallar: cada solicitud DENTRO de la subcarpeta que no se pudo servir (404, 403…)
 * @returns {import('node:http').Server & { base: string, fuera: Solicitud[], fallidas: Solicitud[], total: number }}
 *   total: cuántas solicitudes han llegado (sirve para comprobar que en modo avión no llega ninguna)
 */
export function crearServidorSubruta({ base = BASE_POR_DEFECTO, redirigirIndex = false, alSalirse, alFallar } = {}) {
  const prefijo = normalizarBase(base);
  /** Solicitudes que cayeron fuera de la subcarpeta (las pruebas las revisan). */
  const fuera = [];
  /** Solicitudes dentro de la subcarpeta que respondieron con error. */
  const fallidas = [];
  let total = 0;

  const servidor = createServer(async (req, res) => {
    total++;
    const url = req.url || '/';
    const [ruta, consulta = ''] = url.split(/\?(.*)/s);
    const conConsulta = (destino) => `${destino}${consulta ? `?${consulta}` : ''}`;

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }).end('Método no permitido');
      return;
    }
    // GitHub Pages: la carpeta sin diagonal final redirige a la carpeta con diagonal.
    if (prefijo !== '/' && ruta === prefijo.slice(0, -1)) {
      res.writeHead(301, { Location: conConsulta(prefijo), 'Cache-Control': CACHE_GITHUB_PAGES }).end();
      return;
    }
    const solicitud = { metodo: req.method, ruta: url, desde: req.headers.referer || '', estado: 0 };
    if (!ruta.startsWith(prefijo)) {
      solicitud.estado = 404;
      fuera.push(solicitud);
      alSalirse?.(solicitud);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': CACHE_GITHUB_PAGES }).end('No encontrado (fuera de la subcarpeta)');
      return;
    }
    // Cloudflare Pages: /carpeta/index.html → /carpeta/ (308).
    if (redirigirIndex && ruta.endsWith('/index.html')) {
      res.writeHead(308, { Location: conConsulta(ruta.slice(0, -'index.html'.length)) }).end();
      return;
    }
    comoGitHubPages(res, (estado) => {
      solicitud.estado = estado;
      if (estado >= 400) {
        fallidas.push(solicitud);
        alFallar?.(solicitud);
      }
    });
    req.url = `/${url.slice(prefijo.length)}`;
    return servirEstatico(req, res);
  });
  Object.defineProperty(servidor, 'total', { get: () => total });
  return Object.assign(servidor, { base: prefijo, fuera, fallidas });
}

/**
 * Levanta el servidor en un puerto (0 = cualquiera libre). Lo usan las pruebas.
 * @param {{ base?: string, redirigirIndex?: boolean, puerto?: number, host?: string,
 *   alSalirse?: Function, alFallar?: Function }} [opciones]
 * @returns {Promise<{ origen: string, base: string, url: string, fuera: object[], fallidas: object[], total: number,
 *   cerrar: () => Promise<void> }>}
 *   url: dirección completa de la app (origen + subcarpeta), p. ej. http://127.0.0.1:40123/equipo-16-/
 */
export async function levantarSubruta({ puerto = 0, host = '127.0.0.1', ...opciones } = {}) {
  const servidor = crearServidorSubruta(opciones);
  await new Promise((listo, fallo) => {
    servidor.once('error', fallo);
    servidor.listen(puerto, host, listo);
  });
  const { port } = servidor.address();
  const origen = `http://${host}:${port}`;
  return {
    origen,
    base: servidor.base,
    url: `${origen}${servidor.base}`,
    fuera: servidor.fuera,
    fallidas: servidor.fallidas,
    get total() {
      return servidor.total;
    },
    cerrar: () =>
      new Promise((listo) => {
        servidor.closeAllConnections?.();
        servidor.close(() => listo());
      }),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const puerto = Number(process.env.PORT) || 8081;
  const host = process.env.HOST || '0.0.0.0';
  const base = normalizarBase(process.env.BASE || BASE_POR_DEFECTO);
  const redirigirIndex = ['1', 'true', 'si', 'sí'].includes(String(process.env.REDIRIGIR_INDEX || '').toLowerCase());
  const servidor = crearServidorSubruta({
    base,
    redirigirIndex,
    alSalirse: ({ metodo, ruta, desde }) =>
      console.warn(`⚠ 404 fuera de ${base}: ${metodo} ${ruta}${desde ? `  (lo pidió ${desde})` : ''} → ¿ruta absoluta?`),
    alFallar: ({ metodo, ruta, estado }) => console.warn(`· ${estado} dentro de ${base}: ${metodo} ${ruta}`),
  });
  servidor.listen(puerto, host, () => {
    const app = `http://localhost:${puerto}${base}`;
    const como = redirigirIndex ? 'como Cloudflare Pages: index.html → ./' : 'como GitHub Pages';
    console.log(`Tecu Aprende dentro de la subcarpeta ${base} (${como}): ${app}`);
    console.log(`  Estudiante: ${app}?alumno=ana`);
    console.log(`  Invitado:   ${app}?alumno=invitado`);
    console.log(`  Docente:    ${app}?vista=docente`);
    console.log(`  Pitch:      ${app}?vista=pitch`);
    console.log('Si aparece un aviso "⚠ 404 fuera de…", algún archivo usa una ruta absoluta (/…): cámbiala por una relativa.');
  });
}
