/**
 * Servidor mínimo para correr la demo en local (sin dependencias).
 *
 *   npm start            → http://localhost:8080
 *   PORT=3000 npm start  → otro puerto
 *
 * Sirve los archivos estáticos con tipos MIME correctos (incluye
 * .webmanifest y .woff2, necesarios para la PWA) y evita salir de la carpeta
 * del proyecto. La app NO necesita este servidor: también funciona en
 * cualquier hosting estático (GitHub Pages, Netlify, etc.).
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PUERTO = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** Rutas que nunca se sirven (secretos y cosas internas). */
const PROHIBIDO = [/^\/\.env/, /^\/\.git/, /^\/node_modules\//];

function rutaSegura(urlPath) {
  let ruta;
  try {
    ruta = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  if (PROHIBIDO.some((re) => re.test(ruta))) return null;
  if (ruta.endsWith('/')) ruta += 'index.html';
  const completa = normalize(join(RAIZ, ruta));
  if (completa !== RAIZ && !completa.startsWith(RAIZ + sep)) return null;
  return completa;
}

export async function servirEstatico(req, res) {
  const archivo = rutaSegura(req.url || '/');
  if (!archivo) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Prohibido');
    return;
  }
  try {
    const info = await stat(archivo);
    if (!info.isFile()) throw new Error('no es archivo');
    const cuerpo = await readFile(archivo);
    const tipo = TIPOS[extname(archivo).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': tipo,
      'Content-Length': cuerpo.length,
      // El service worker siempre se revisa; lo demás lo cachea el propio SW.
      'Cache-Control': archivo.endsWith('sw.js') ? 'no-cache' : 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : cuerpo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
}

/** Manejadores de API (la fase de IA agrega /api/tutor aquí). */
export const rutasApi = {};

export function crearServidor() {
  return createServer(async (req, res) => {
    const ruta = (req.url || '/').split('?')[0];
    const api = rutasApi[`${req.method} ${ruta}`];
    if (api) return api(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    return servirEstatico(req, res);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  crearServidor().listen(PUERTO, HOST, () => {
    console.log(`Tecu Aprende en http://localhost:${PUERTO}`);
    console.log(`  Estudiante: http://localhost:${PUERTO}/?alumno=ana`);
    console.log(`  Docente:    http://localhost:${PUERTO}/?vista=docente`);
    console.log(`  Pitch:      http://localhost:${PUERTO}/?vista=pitch`);
  });
}
