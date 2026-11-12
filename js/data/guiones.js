/**
 * Guion de la presentación (modo pitch).
 *
 * GUIDE: los pasos de la historia que se cuenta en 3 minutos.
 * GUIONES: lo que "escriben" Ana y Luis en el diagnóstico (renglones por
 * ejercicio, sin el enunciado). Están verificados contra el motor:
 *   Ana  → 3 de 4 con SIGNO_TRANSPOSICION (uno bien)  → ruta "Lo que suma, pasa restando"
 *   Luis → 3 de 4 con INVERSA_EQUIVOCADA (uno bien)   → ruta "Lo que multiplica, pasa dividiendo"
 * El ejercicio 1 es el mismo para los dos (3x + 5 = 20) y los dos llegan a un
 * resultado incorrecto, pero por razones distintas.
 */

export const GUIDE = [
  {
    id: 'problema',
    titulo: 'El problema',
    nota: 'En Veracruz la conexión falla en la mayoría de las escuelas. Tecu Aprende funciona sin internet y le dice al docente en qué se equivocó cada quien.',
  },
  {
    id: 'diagnostico',
    titulo: 'Ana y Luis',
    nota: 'Mismo ejercicio, mismo resultado incorrecto. Tecu revisa renglón por renglón: Ana cambió de lado el 5 sin cambiarle el signo; Luis restó el 3 en lugar de dividir.',
  },
  {
    id: 'rutas',
    titulo: 'Rutas distintas',
    nota: 'Cada quien recibe una ruta distinta: Ana practica con la balanza quitando pesas de los dos lados; Luis reparte en grupos iguales.',
  },
  {
    id: 'avion',
    titulo: 'Modo avión',
    nota: 'Sin internet, la lección sigue funcionando. Lo que resuelven se guarda en el cel y se forma en la cola de pendientes.',
  },
  {
    id: 'sincronizacion',
    titulo: 'Sincronización',
    nota: 'Vuelve la señal: la cola se vacía sola y el panel docente se actualiza sin recargar.',
  },
  {
    id: 'panel',
    titulo: 'Panel docente',
    nota: 'El docente ve qué error se repite en el grupo, a quién llamar esta semana y qué retomar en 15 minutos. También puede imprimir un cuadernillo para quien no tiene celular.',
  },
];

export const GUIONES = {
  ana: {
    nombre: 'Ana',
    items: [
      ['3x = 25', 'x = 25/3'],
      ['x/4 = 3', 'x = 12'],
      ['5x + 2x = 14 − 2', '7x = 12', 'x = 12/7'],
      ['−2x = 14', 'x = −7'],
    ],
  },
  luis: {
    nombre: 'Luis',
    items: [
      ['3x = 15', 'x = 12'],
      ['x/4 = 3', 'x = 3/4'],
      ['3x = 12', 'x = 9'],
      ['−2x = 8', 'x = −4'],
    ],
  },
};
