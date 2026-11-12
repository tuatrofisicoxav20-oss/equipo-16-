/**
 * Presupuesto de clics: ninguna tarea debe tomar más de 5 clics desde la
 * pantalla de inicio de su vista (escribir no cuenta). Cada tarea empieza en
 * una página nueva y cuenta solo los clics que hace la persona.
 *
 * Uso: node tests/e2e/clics.mjs   (sale con código 1 si alguna tarea pasa de 5)
 */
import { levantarServidor, abrirNavegador, contadorDeClics, esperarTitulo } from './utilidades.mjs';

const LIMITE = 5;

/** Tareas de la vista del estudiante. Cada una recibe (pagina, c) y regresa una nota. */
const TAREAS_ESTUDIANTE = [
  {
    nombre: 'Empezar o continuar la lección',
    async hacer(p, c) {
      await c.clic(p.getByRole('button', { name: /empezar|continuar/i }).first());
      await esperarTitulo(p, /ejercicio|diagn|ruta|resultado/i);
    },
  },
  {
    nombre: 'Escribir un renglón y revisarlo',
    async hacer(p, c) {
      await c.clic(p.getByRole('button', { name: /empezar|continuar/i }).first());
      const entrada = p.getByRole('textbox').first();
      await entrada.fill('3x = 15');
      await entrada.press('Enter');
      await entrada.fill('x = 5');
      await entrada.press('Enter');
      await c.clic(p.getByRole('button', { name: /^revisar/i }).first());
      await p.locator('.diagnostico').first().waitFor();
    },
  },
  {
    nombre: 'Preguntarle algo a Tecu',
    async hacer(p, c) {
      await c.clic(p.locator('.nav-inferior').getByRole('button', { name: /tecu/i }));
      const entrada = p.getByRole('textbox').first();
      await entrada.fill('¿Por qué el 5 pasa restando?');
      await c.clic(p.getByRole('button', { name: /enviar/i }).first());
      await p.locator('.burbuja--tecu').last().waitFor();
    },
  },
  {
    nombre: 'Ver cuánto pesa el paquete descargado',
    async hacer(p, c) {
      await c.clic(p.locator('.nav-inferior').getByRole('button', { name: /descargas/i }));
      await p.getByText(/\d+(\.\d+)?\s*KB/).first().waitFor();
    },
  },
  {
    nombre: 'Agrandar el texto',
    async hacer(p, c) {
      await c.clic(p.locator('.nav-inferior').getByRole('button', { name: /ajustes/i }));
      await c.clic(p.getByRole('button', { name: /^grande$/i }).or(p.getByRole('radio', { name: /^grande$/i })).first());
      const valor = await p.evaluate(() => document.documentElement.getAttribute('data-texto'));
      if (valor !== 'grande') throw new Error(`data-texto quedó en ${valor}`);
    },
  },
  {
    nombre: 'Activar alto contraste',
    async hacer(p, c) {
      await c.clic(p.locator('.nav-inferior').getByRole('button', { name: /ajustes/i }));
      await c.clic(p.getByRole('switch', { name: /contraste/i }).first());
      const activo = await p.evaluate(() => document.documentElement.classList.contains('alto-contraste'));
      if (!activo) throw new Error('no se activó html.alto-contraste');
    },
  },
  {
    nombre: 'Simular "sin internet" para proyectar',
    async hacer(p, c) {
      await c.clic(p.locator('.barra-superior').getByRole('button', { name: /sin internet|con internet/i }).first());
      await p.getByText(/sin señal|sin internet/i).first().waitFor();
    },
  },
  {
    nombre: 'Ver cuántas actividades faltan por sincronizar',
    async hacer(p) {
      // Siempre visible en la barra superior: 0 clics.
      await p.locator('.barra-superior').getByText(/pendiente/i).first().waitFor();
    },
  },
];

async function correr() {
  const servidor = await levantarServidor();
  const navegador = await abrirNavegador();
  const filas = [];
  let fallas = 0;
  try {
    for (const tarea of TAREAS_ESTUDIANTE) {
      const contexto = await navegador.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
      const pagina = await contexto.newPage();
      await pagina.goto(`${servidor.url}/?alumno=clics&reiniciar=1`);
      await esperarTitulo(pagina, /hola/i);
      const c = contadorDeClics();
      let estado = 'ok';
      try {
        await tarea.hacer(pagina, c);
        if (c.total > LIMITE) estado = `PASA DE ${LIMITE}`;
      } catch (error) {
        estado = `NO SE PUDO: ${error.message.split('\n')[0]}`;
      }
      if (estado !== 'ok') fallas++;
      filas.push({ vista: 'Estudiante', tarea: tarea.nombre, clics: c.total, estado });
      await contexto.close();
    }
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
  console.log('\nPresupuesto de clics (máximo 5 por tarea)\n');
  console.log('| Vista | Tarea | Clics | Estado |\n|---|---|---|---|');
  for (const f of filas) console.log(`| ${f.vista} | ${f.tarea} | ${f.clics} | ${f.estado} |`);
  process.exitCode = fallas ? 1 : 0;
}

correr();
