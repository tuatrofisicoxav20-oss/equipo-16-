# Tecu Aprende — demo funcional

**Reto 5 "Aprender a la jarocha" · Veracruz Tech Week**

Tecu Aprende es una plataforma de aprendizaje adaptativo para secundaria pensada para Veracruz, donde la
conexión falla. Tecu, un tecolote tutor, revisa **renglón por renglón** cómo resuelve cada estudiante una
ecuación, detecta **en qué se equivocó** (no solo si el resultado está mal) y le arma una ruta distinta según su
error. Todo funciona **sin internet** y el docente ve, en un panel, quién necesita ayuda y qué retomar.

Esta demo cubre Matemáticas de 1.º de secundaria: **ecuaciones lineales con una incógnita**. Las demás materias
aparecen como "Próximamente".

> **Regla de arquitectura:** todo lo esencial corre en el dispositivo, sin internet y sin ningún modelo de
> lenguaje. El diagnóstico es un motor determinista en JavaScript (`js/core/engine.js`). La IA conversacional es
> una capa opcional (fase 6) y la demo se ve completa sin ella.

---

## 1. Cómo correrla

Requisito: [Node.js](https://nodejs.org) 18 o más reciente. No hay paso de compilación ni dependencias para la app.

```bash
npm start
```

Abre <http://localhost:8080>. Vistas:

| Vista | Dirección |
|---|---|
| Estudiante (celular) | `http://localhost:8080/?alumno=ana` (o `luis`, o sin parámetro = invitado) |
| Panel docente | `http://localhost:8080/?vista=docente` |
| Modo presentación | `http://localhost:8080/?vista=pitch` |
| Reiniciar todo (emergencia) | cualquier vista con `&reiniciar=1` |

Si no tienes Node, cualquier servidor estático sirve, por ejemplo `python3 -m http.server 8080`.

### Pruebas

```bash
npm test
```

Corre las pruebas unitarias del motor, del contenido, de los datos y del service worker con `node --test`.

---

## 2. Publicarla para compartirla con un código QR

La app es estática: cualquier hosting de archivos con **HTTPS** funciona (el modo sin internet necesita HTTPS
para el service worker; `localhost` también cuenta como seguro).

### Opción A: GitHub Pages (gratis, ya tienen el repositorio)

1. En GitHub, abre el repositorio → **Settings** → **Pages**.
2. En **Build and deployment**, elige **Deploy from a branch**, la rama con la demo y la carpeta **/ (root)**.
3. Guarda. En uno o dos minutos aparece la dirección, por ejemplo
   `https://<usuario>.github.io/equipo-16-/`.

### Opción B: Netlify Drop (sin cuenta de Git)

1. Entra a <https://app.netlify.com/drop>.
2. Arrastra la carpeta del proyecto (sin `node_modules`).
3. Netlify te da una dirección HTTPS al instante.

### El código QR

Genera el QR de la dirección pública con cualquier generador (por ejemplo, el de tu navegador: en Chrome,
**Compartir → Crear código QR**). Recomendación para el pitch: un QR que abra
`https://…/?alumno=invitado` para que el jurado pruebe en su propio celular; lo que haga aparece en el panel
docente como "Invitado (QR)" cuando su celular sincroniza **en el mismo navegador**.

> Importante y honesto: sin servidor, el panel solo ve lo que se sincroniza **en el mismo navegador**
> (pestañas o iframes de la misma página, como en el modo presentación). El celular de un juez guarda y
> sincroniza en su propio navegador. Para que un celular real alimente el panel de la computadora del
> presentador hace falta el servidor opcional de la fase 6.

---

## 3. Cómo está hecha

```
index.html, js/main.js        shell accesible y enrutador por ?vista=
js/core/                      motor puro (sin DOM), probado con node --test
  engine.js                   parser, validación por paso, reglas de error, pasos, generador
  textos.js                   llena las plantillas del paquete (explicaciones, pistas, preguntas)
  ruta.js                     elige la ruta según el diagnóstico y genera sus ejercicios
packs/ecuaciones-1.json       TODO el contenido (textos de Tecu, pistas, rutas, sugerencias al docente)
packs/contexto.json           la única estadística del pitch y su fuente
js/data/                      registro de eventos, cola de sincronización, grupo simulado, analítica
js/services/                  preferencias de accesibilidad, conexión, service worker
js/ui/                        Tecu (SVG), balanza interactiva, cuaderno de renglones, iconos
js/views/                     estudiante, docente, pitch
sw.js, manifest.webmanifest   PWA: carga y funciona en modo avión después de la primera visita
docs/ARQUITECTURA.md          contrato entre módulos
```

### El motor de diagnóstico (lo que hace distinta a la demo)

1. **Parser con fracciones exactas**: acepta `3x`, `3*x`, `x/2`, decimales con punto o coma, negativos, x en
   ambos lados, paréntesis y cadenas como `3x = 20 − 5 = 15`. Si no entiende un renglón, dice qué corregir.
2. **Validación por paso**: cada renglón debe conservar la solución de la ecuación original; el primer renglón
   que la cambia es donde está el error.
3. **Clasificación con "mal-rules"**: aplica al renglón anterior cada error típico y revisa cuál reproduce lo
   que escribió el estudiante:

| Código | Qué pasó | Ejemplo |
|---|---|---|
| `SIGNO_TRANSPOSICION` | pasa un término sin cambiarle el signo | 3x + 5 = 20 → 3x = 25 |
| `INVERSA_EQUIVOCADA` | resta o multiplica el coeficiente en vez de dividir | 3x = 15 → x = 12 |
| `ARITMETICA` | el paso es correcto, la cuenta no | 20 − 5 = 14 |
| `TERMINOS_NO_SEMEJANTES` | junta x con números | 3x + 5 → 8x |
| `UN_SOLO_LADO` | opera en un lado y no en el otro | 3x + 5 = 20 → 3x = 20 |
| `SIGNO_NEGATIVO` | pierde el signo al dividir entre un negativo | −2x = 8 → x = 4 |
| `NO_CLASIFICADO` | ninguna regla lo explica: lo dice tal cual y lo marca para el docente | — |

**Nunca inventa un diagnóstico.** Si una explicación es posible pero no segura, la confianza baja a "media" y la
interfaz lo dice ("Parece que…"). Cinco revisores independientes atacaron el motor (parser, falsos
diagnósticos, pedagogía, cobertura y rendimiento); las correcciones aplicadas quedan fijadas como pruebas de
regresión en `tests/`.

---

## 4. Accesibilidad y usabilidad

- **WCAG 2.2 AA**: contraste verificado (texto ≥ 4.5:1, componentes ≥ 3:1), modo de alto contraste, tamaño de
  texto ajustable que se guarda, foco visible que nunca queda tapado por las barras fijas, objetivos táctiles de
  44 px, regiones `aria-live`, nada que dependa solo del color, nada que obligue a arrastrar (la balanza se usa
  con botones y teclado) y respeto a "reducir movimiento". Los componentes (sistema visual, balanza, cuaderno)
  pasaron axe-core sin violaciones; la auditoría de la app completa es parte de la fase de calidad.
- **Regla de los 5 clics**: ninguna tarea toma más de 5 clics desde la pantalla de inicio de su vista.
- **Heurísticas de Nielsen**: ver la tabla de la sección 6.

---

## 5. Guion de demo de 3 minutos

> Se completa con los botones definitivos del modo presentación (fase 5).

---

## 6. Heurísticas de Nielsen

> Se completa con la auditoría de usabilidad (fase de calidad).

---

## 7. Datos y honestidad

- **Estadística del pitch**: la única cifra que usa la demo es "Solo 25.4 % de las escuelas de educación básica
  de Veracruz tiene internet", tomada de la propuesta del equipo. Su fuente va en `packs/contexto.json`
  (campo `fuente`). **Mientras ese campo esté vacío, el modo presentación avisa al presentador.**
- **Grupo simulado**: el panel docente muestra 28 estudiantes ficticios generados con una semilla fija (el propio
  motor escribe y diagnostica sus procedimientos) más los estudiantes reales de la sesión (Ana, Luis y quien
  use la app). El panel lo aclara con una nota discreta.
- **Maqueta original**: el repositorio no contenía la maqueta (`index.html`, `app.js`, `styles.css`, Bootstrap)
  ni la carpeta `docs/` de la propuesta, así que la interfaz se construyó desde cero siguiendo lo descrito
  (patrón `state` + `render()` + `data-act`, arreglo `GUIDE`, interruptor "Con internet / Sin internet",
  estado `sleep` de Tecu, ajustes de accesibilidad). Colores y tipografía viven como variables en `:root` de
  `styles.css` para poder cambiarlos sin tocar la lógica.

---

## Licencias

Código del equipo. Tipografía Nunito bajo SIL Open Font License (`fonts/OFL-Nunito.txt`).
