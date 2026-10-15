# PR — Herramienta A: editor de ortografía → IPA

Rama: `feat/lingualab-hexagonal-monorepo` · Commits: `9731476`, `ee50d3c`, `09dd4c9`, `3155220`,
`6643d83`, `90cc8fa`

---

## Qué cambia

El segmento 4 del prompt, completo y de punta a punta: la pieza que el usuario describió como **la más
valiosa para lenguas indígenas**, porque la persona escribe y comparte sus propias reglas en lugar de
depender de un modelo entrenado que no existe para su lengua.

| Commit | Qué trae |
|---|---|
| `9731476` | El composition root: el único archivo de `src/**` que importa un adaptador |
| `ee50d3c` | 103 claves de texto en cada idioma, y el mecanismo para las frases que solo existen en ejecución |
| `09dd4c9` | El estado, el deshacer, las operaciones sobre reglas, el CSV y el formato de compartir |
| `3155220` | El renderizado y el cableado de eventos |
| `6643d83` | La página `/ortografia` (es y en), su navegación y sus ocho pruebas e2e |
| `90cc8fa` | La documentación de los formatos JSON y CSV |

## Cómo se probó

- [x] `npm run verify:all` — exit 0 (lint, tipos de paquetes, reglas hexagonales, tipos del sitio, pruebas, build y verificación del build)
- [x] Pruebas — **727 en 38 archivos** (eran 690 en 34: +37)
- [x] `npx playwright test` — **12 passed**: 4 de accesibilidad (inicio es/en y editor es/en) y 8 de los flujos del editor
- [x] `npm run deps:check` — exit 0, 155 módulos y 353 dependencias
- [x] `npm run check` — 108 archivos, 0 errores
- [x] `npm audit --omit=dev` — 0 vulnerabilidades en producción

**La invariante arquitectónica, verificada a mano y no supuesta:**

```
$ grep -rn 'from "@lingualab/adapters"' src/
src/composition-root.ts:38:} from "@lingualab/adapters";
```

Una sola línea. Las otras dos menciones son comentarios que explican por qué una vista no puede
alcanzar un adaptador.

**Las pruebas e2e cubren el criterio de aceptación del prompt**: un estudiante carga la demo, escribe
una palabra, ve el AFI, enciende «explicar» y ve **qué regla ganó**, añade una regla y ve el efecto,
exporta, recarga y comprueba que persistió, e importa el JSON en una tabla nueva. Más tres pruebas de
borde: la advertencia cuando el almacenamiento se degrada a memoria, el aviso cuando el enlace es tan
largo que un cliente de mensajería lo trunca, y que compartir por URL pone la tabla en el hash y el
enlace la vuelve a cargar.

**La evidencia de RED se tomó con las rutas ausentes**: 6 pruebas fallaron por no encontrar el selector
de plantilla, y al restaurarlas pasaron.

## Peso de la página

| Página | Comprimido | Composición |
|---|---|---|
| `/ortografia` | **24.0 KB** | HTML 5.8 + su script 11.6 + script base 0.9 + CSS base 5.7 |
| `/en/ortografia` | **23.7 KB** | igual |
| Presupuesto | 60 KB | `scripts/verify-build.mjs`, sin tocar |

Es **más liviana que ArborLab (28.5 KB) y que FonoLab (24.4 KB)**. El script de 11.6 KB es todo el
payload del cliente: los casos de uso del núcleo, el motor, los datos, los adaptadores y el editor.
El presupuesto se midió en la primera puerta, antes de terminar la función, como se pidió — si hubiera
excedido, habría cambiado el diseño, no el presupuesto.

## Decisiones que un revisor tiene derecho a discutir

1. **La conversión en vivo exige una tabla guardada**, porque el caso de uso recibe un `tableId`. De ahí
   el autoguardado con 400 ms de retardo, un contador de revisión y un `flushSave()` antes de cada
   conversión. Sin ese volcado el AFI en vivo leería una tabla con una pulsación de retraso.
2. **«Nueva tabla» se guarda todavía vacía** —y por lo tanto válida—, así que el caso de uso acuña el
   identificador y la primera regla escrita es una modificación, nunca un alta que el validador rechace
   por estar a medias.
3. **Deshacer va por ráfaga de edición, no por pulsación.** El borrador previo se registra en `change`
   y las operaciones estructurales de inmediato, así que deshacer devuelve un estado con sentido en vez
   de un carácter.
4. **Alt+flecha mueve, Alt+Suprimir borra, Ctrl+Z y Ctrl+Mayús+Z deshacen.** Las flechas solas se
   descartaron porque tienen que seguir siendo movimiento del cursor dentro de los campos de texto. La
   combinación se documenta **en la página**, no solo en un comentario.
5. **`strings.ts` no envía el diccionario al cliente.** Declara las claves que solo existen en ejecución
   con `satisfies readonly MessageKey[]` y el componente las serializa ya traducidas. No hay búsqueda de
   claves que pueda fallar en el navegador, y una clave mal escrita falla `npm run check`. Registrado en
   el ADR 0004.
6. **El CSV es deliberadamente incompleto** (una capa por archivo, seis columnas, sin clases ni notas) y
   el JSON es el formato completo. La interfaz y `docs/orthography-tables.md` lo dicen al lado de los
   botones, porque quien no lea esa distinción va a perder las clases al exportar sin saber por qué.
7. **Compartir usa `<dígito>.<base64url>`** con `1` = deflate-raw y `0` = UTF-8 plano, de modo que al
   decodificar nunca haya que tantear el navegador. Por encima de 2000 caracteres avisa y remite al
   JSON.
8. **Los tipos del composition root se derivan** de las fábricas con `ReturnType<typeof ...>` en vez de
   escribirse a mano: una firma a mano compilaría mientras discrepara en silencio del caso de uso.

## Riesgos y límites, declarados

| Qué | Estado |
|---|---|
| `render.ts` (411 líneas) sin prueba unitaria | Vitest corre en entorno `node` y `vitest.config.ts` está fuera de las superficies de esta tarea. Lo cubren las 8 pruebas e2e, que es verificación real pero más lenta |
| Las frases de validación del núcleo son solo en español | **Defecto de capas real**: `OrthographyIssue` lleva la prosa pero **no el dato** (nombre de clase, símbolo), así que la interfaz no puede traducirla sin tocar el núcleo. En `/en/ortografia` la insignia está localizada y la oración no. Está registrado como tarea T16 en vez de parcheado a medias: lo correcto es que el núcleo devuelva **códigos y datos**, y que la frase viva en la capa de presentación |
| 5 avisos de complejidad cognitiva en el código nuevo | El peor es el manejador de clic delegado de `index.ts` (complejidad 40). Dividirlo es la limpieza de mayor valor y deliberadamente **no** se hizo al final de un cambio ya verificado: merece su propio commit, no una última edición sin presupuesto para estabilizarla |
| `{V}` (clases de símbolos) se puede escribir en el JSON pero no editar en la interfaz | No hay editor de clases todavía. La sintaxis está documentada y el editor preserva las clases importadas sin tocarlas |
| La advertencia de persistencia con motivo `open-failed` o `quota-exceeded` | No probada por ejecución: el navegador de las pruebas siempre tiene IndexedDB y la rama de cuota necesita un fallo real. Ya estaba declarada en el adaptador (registro L9) |

## Pendiente

- El editor de clases para `{V}`.
- Dividir el manejador de clic delegado.
- T16, la prosa del núcleo.
