import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analizarProcedimiento, TIPOS } from '../js/core/engine.js';
import { resumirDiagnostico } from '../js/core/ruta.js';
import { GUIONES, GUIDE } from '../js/data/guiones.js';

const pack = JSON.parse(readFileSync(new URL('../packs/ecuaciones-1.json', import.meta.url), 'utf8'));
const ejercicios = pack.diagnostico.map((d) => d.ecuacion);

function diagnosticar(guion) {
  return guion.items.map((renglones, i) => ({ analisis: analizarProcedimiento([ejercicios[i], ...renglones]) }));
}

test('el guion de Ana lleva a la ruta de signos', () => {
  const resultados = diagnosticar(GUIONES.ana);
  const resumen = resumirDiagnostico(resultados);
  assert.equal(resumen.dominante, TIPOS.SIGNO_TRANSPOSICION);
  assert.equal(resultados[0].analisis.error.renglon, 2);
});

test('el guion de Luis lleva a la ruta de operación inversa', () => {
  const resultados = diagnosticar(GUIONES.luis);
  const resumen = resumirDiagnostico(resultados);
  assert.equal(resumen.dominante, TIPOS.INVERSA_EQUIVOCADA);
  assert.equal(resultados[0].analisis.error.renglon, 3);
});

test('Ana y Luis resuelven el mismo primer ejercicio con resultados incorrectos distintos', () => {
  const ana = analizarProcedimiento([ejercicios[0], ...GUIONES.ana.items[0]]);
  const luis = analizarProcedimiento([ejercicios[0], ...GUIONES.luis.items[0]]);
  assert.equal(ana.estado, 'error');
  assert.equal(luis.estado, 'error');
  assert.notEqual(ana.error.tipo, luis.error.tipo);
});

test('el guion del pitch tiene los 6 pasos en orden', () => {
  assert.deepEqual(
    GUIDE.map((p) => p.id),
    ['problema', 'diagnostico', 'rutas', 'avion', 'sincronizacion', 'panel'],
  );
});
