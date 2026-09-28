# LinguaLab 🔬

Plataforma práctica de análisis lingüístico que corre **enteramente en tu navegador**:
fonética y fonología con visualizador AFI, árboles sintácticos y de estructuras de datos,
análisis textual de corpus, glosario y bibliografía descargable.

Interfaz **en español (por defecto) con conmutador a inglés**, y tema **auto / claro / oscuro**.

## Arrancar

No hay paso de compilación. Abre `index.html` directamente, o sirve la carpeta:

```bash
cd LinguaLab
python3 -m http.server 8080
# → http://localhost:8080
```

## Páginas

| Página | Qué hace |
|---|---|
| `index.html` | Portada: estación lingüística animada, fonema del día, visor de tokens, guardrails |
| `tools.html` | **Estación textual**: frecuencia, concordancia KWIC, estadísticas, n-gramas, legibilidad, export JSON |
| `ipa-chart.html` | **FonoLab**: alfabeto AFI responsive con audio, fichas articulatorias y transcriptor ES/EN |
| `trees.html` | **ArborLab**: 26 tipos de árbol, 4 formatos de entrada, export SVG/PNG/JSON/Newick/CoNLL-U/Brat + guía de campo |
| `glossary.html` | Glosario bilingüe filtrable |
| `resources.html` | Bibliografía con filtros y descargas |
| `security.html` | Verificación en vivo de salvaguardas + políticas OWASP |
| `about.html` | Acerca de, FAQ y contacto |

## ArborLab — tipos de árbol

**Análisis de dependencias:** dependencia (UD/CoNLL-U).
**Análisis de constituyentes:** constitución, Penn, jerarquía general.
**Teoría sintáctica:** X-bar, movimiento (GB), minimalista, cartográfica, CCG, LFG, HPSG,
gramática relacional.
**Otros formalismos:** semántica (LF), TAG, Reed–Kellogg, estructura de palabra.
**Estructuras de datos:** BST, AVL, rojo-negro, heap (min/max), trie (+ radix), árbol de
expresión, Huffman, tabla comparativa.

### Formatos de entrada

- Corchetes etiquetados: `[S [SN [Det el] [N gato]]]`
- Penn: `(S (DT el) (NN gato))`
- Dependencia: `id palabra cabeza relación POS` (o CoNLL-U completo de 10 columnas)
- Esquema indentado (con ` | ` para notas)
- Números para BST/AVL/rojo-negro/heap · palabras para trie/Huffman · expresión aritmética

### Marcas de notación

`_i` índice · `^{max}` superíndice · `[uφ,EPP]` rasgos · `{t_i}` caja · `<copia>` copia tachada ·
`^` triángulo · `!` resaltado · `@ARCO` etiqueta de arco · `::"nota"` · `#id` ·
`move: a -> b "etiqueta"` flecha de movimiento.

Los errores se reportan con **línea y columna**.

### Exportación

- Imagen: SVG y PNG (2×)
- Código: copiar SVG al portapapeles
- **Script:** JSON editable (reimportable), Newick (`.nwk`), CoNLL-U (`.conllu`), texto Brat (`.txt`)

## Estructura

```
LinguaLab/
├── index.html, trees.html, ipa-chart.html, tools.html,
│   glossary.html, resources.html, security.html, about.html
├── css/      styles · motion · components · trees
├── js/
│   ├── core/     app · i18n · theme · security · guardrails
│   ├── home/     station · term-day · token-viewer
│   ├── tools/    text-tools · bibliography · glossary
│   ├── fono/     ipa-chart · phonetics · audio-player · transcriber
│   └── trees/    parse · layout · render · checks · solvers · export · canvas · app
├── data/     i18n/es · i18n/en · ipa-chart · ipa-audio · glossary · bibliography · trees/examples
├── audio/    ipa/ + README.md (atribución y licencias)
└── docs/     SECURITY.md · references/
```

Los datos van como `.js` (no `.json`) para que todo funcione abriendo `index.html` con
`file://`, sin servidor.

## Seguridad y privacidad

- Sin cookies, sin analítica, sin telemetría.
- CSP por meta en cada página, referrer estricto, escape anti-XSS en todo texto de usuario.
- Límite de 100 KB por texto y lista blanca de extensiones.
- `localStorage` solo con `lingualab-lang` y `lingualab-theme`; botón de borrado total.
- Detalle y verificación en vivo: `security.html` · política completa: `docs/SECURITY.md`.

## Audio IPA

Las muestras libres se sirven desde `audio/ipa/`. La atribución y la licencia de **cada** archivo
son obligatorias y se registran en [`audio/README.md`](audio/README.md). Si falta un archivo, el
reproductor degrada automáticamente a la voz del sistema (Web Speech API), así que nunca se
reproduce audio sin licencia verificada.

## Licencia

Código bajo licencia libre — ver [`LICENSE`](LICENSE). Los datos bibliográficos y de audio
conservan la licencia de su fuente original, indicada en cada ficha.
