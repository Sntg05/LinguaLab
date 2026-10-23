import type { G2PRule } from "../domain/g2p-rule";
import type { OrthographyTable } from "../domain/orthography-table";
import { COMMUNITY_VALIDATION_NOTICE } from "./indigenous-templates";

/**
 * Tablas de demostracion para espanol, ingles, portugues y wayuunaiki
 * (especificacion S11).
 *
 * POR QUE SON DATOS Y NO CODIGO DEL MOTOR
 *
 * El motor no sabe espanol: aplica las reglas que le da la tabla. Que el
 * espanol viva aqui, como dato, es lo que permite que el interruptor de
 * yeismo sea un cambio de tabla y no una rama en el algoritmo. Ninguna de las
 * tablas de este archivo anade una regla al motor: portugues y wayuunaiki
 * entran con la misma forma que el espanol y el ingles, y esa es la prueba de
 * que la herramienta es generica de verdad.
 *
 * DE DONDE SALE CADA PAR GRAFEMA -> AFI
 *
 * De bibliografia publicada, citada en el campo `notes` de cada tabla, como
 * las plantillas de lenguas indigenas exigen (ver docs/PENDING.md P9). El
 * material es una tabla de correspondencias, no lexico ni oraciones: una
 * fuente que describe un alfabeto sostiene una correspondencia, no un corpus.
 *
 * Las cinco tablas se rotulan "demo" en `notes` porque no son descripciones
 * normativas de la lengua: son ejemplos para probar la herramienta.
 *
 * LA TABLA DE WAYUUNAIKI NO ES LA PLANTILLA DE WAYUUNAIKI
 *
 * `WAYUU_DEMO` (id `guc-demo`) es un artefacto distinto de
 * `WAYUUNAIKI_TEMPLATE` (id `guc-template`), que sigue vacia, en `draft` y con
 * su advertencia: ninguna plantilla de `indigenous-templates.ts` se rellena
 * desde aqui. La demo solo afirma la correspondencia del alfabeto al AFI que
 * publican las fuentes citadas, y lo dice en sus propias notas.
 */

const FRONT_VOWELS = "[e\u00e9i\u00ed]"; // e, é, i, í
const SIMPLE_VOWELS = "[aeiou]";

/**
 * Reglas del espanol latinoamericano (seseo: `c`/`z` ante vocal anterior
 * suenan `s`). La unica diferencia entre la variante de yeismo y la de
 * distincion es la transcripcion de `ll`, que es justo el interruptor que la
 * interfaz expone.
 */
const spanishRules = (llIpa: string): readonly G2PRule[] => [
  // Digrafos primero: el orden no es obligatorio porque gana el grafema mas
  // largo, pero una tabla se lee antes que se ejecuta.
  { grapheme: "ch", ipa: "t\u0283", note: "africada palatal sorda" },
  { grapheme: "ll", ipa: llIpa, note: "lateral palatal; yeismo o distincion" },
  { grapheme: "rr", ipa: "r", note: "vibrante multiple" },
  {
    grapheme: "qu",
    ipa: "k",
    after: FRONT_VOWELS,
    note: "la u es muda ante vocal anterior",
  },
  {
    grapheme: "gu",
    ipa: "\u0261",
    after: FRONT_VOWELS,
    note: "la u es muda ante vocal anterior",
  },
  // c y g cambian de sonido ante vocal anterior: la regla con contexto gana
  // por especificidad sobre la regla general.
  { grapheme: "c", ipa: "s", after: FRONT_VOWELS, note: "seseo" },
  { grapheme: "c", ipa: "k" },
  { grapheme: "g", ipa: "x", after: FRONT_VOWELS, note: "velar fricativa ante vocal anterior" },
  { grapheme: "g", ipa: "\u0261" },
  { grapheme: "z", ipa: "s", note: "seseo" },
  { grapheme: "j", ipa: "x" },
  { grapheme: "h", ipa: "", note: "muda; se elimina" },
  { grapheme: "\u00f1", ipa: "\u0272" },
  { grapheme: "v", ipa: "b", note: "en espanol no hay oposicion b/v" },
  { grapheme: "y", ipa: "\u029d" },
  { grapheme: "r", ipa: "\u027e", note: "vibrante simple" },
  { grapheme: "b", ipa: "b" },
  { grapheme: "d", ipa: "d" },
  { grapheme: "f", ipa: "f" },
  { grapheme: "k", ipa: "k" },
  { grapheme: "l", ipa: "l" },
  { grapheme: "m", ipa: "m" },
  { grapheme: "n", ipa: "n" },
  { grapheme: "p", ipa: "p" },
  { grapheme: "s", ipa: "s" },
  { grapheme: "t", ipa: "t" },
  // Las vocales se transcriben igual; la tilde no se marca como acento en la
  // salida porque estas pruebas no lo piden y marcarlo cambiaria los casos
  // exactos de la especificacion S8.
  { grapheme: "a", ipa: "a" },
  { grapheme: "\u00e1", ipa: "a" },
  { grapheme: "e", ipa: "e" },
  { grapheme: "\u00e9", ipa: "e" },
  { grapheme: "i", ipa: "i" },
  { grapheme: "\u00ed", ipa: "i" },
  { grapheme: "o", ipa: "o" },
  { grapheme: "\u00f3", ipa: "o" },
  { grapheme: "u", ipa: "u" },
  { grapheme: "\u00fa", ipa: "u" },
  { grapheme: "\u00fc", ipa: "u" },
];

/**
 * Alofonos lenis de las oclusivas sonoras entre vocales (especificacion S7
 * del prompt original): `b`, `d` y `ɡ` se vuelven aproximantes cuando estan
 * flanqueadas por vocales. Exigir los dos contextos es lo que impide que la
 * regla se dispare al inicio de palabra, donde la oclusiva es plena.
 */
const spanishAllophonic: readonly G2PRule[] = [
  { grapheme: "b", ipa: "\u03b2", before: SIMPLE_VOWELS, after: SIMPLE_VOWELS },
  { grapheme: "d", ipa: "\u00f0", before: SIMPLE_VOWELS, after: SIMPLE_VOWELS },
  { grapheme: "\u0261", ipa: "\u0263", before: SIMPLE_VOWELS, after: SIMPLE_VOWELS },
];

const SPANISH_CLASSES: Readonly<Record<string, readonly string[]>> = {};

export const SPANISH_DEMO_YEISMO: OrthographyTable = {
  id: "es-demo-yeismo",
  languageId: "spa",
  name: "Espanol (demo, yeismo)",
  version: 1,
  classes: SPANISH_CLASSES,
  rules: spanishRules("\u029d"),
  allophonic: spanishAllophonic,
  notes:
    "Demo de espanol latinoamericano con seseo. Interruptor de yeismo: la unica diferencia con la tabla de distincion es el grafema ll.",
  status: "reviewed",
};

export const SPANISH_DEMO_DISTINCION: OrthographyTable = {
  id: "es-demo-distincion",
  languageId: "spa",
  name: "Espanol (demo, distincion)",
  version: 1,
  classes: SPANISH_CLASSES,
  rules: spanishRules("\u028e"),
  allophonic: spanishAllophonic,
  notes:
    "Demo de espanol latinoamericano con seseo. Interruptor de distincion: la unica diferencia con la tabla de yeismo es el grafema ll.",
  status: "reviewed",
};

/**
 * Ingles estadounidense basico, tambien de demostracion.
 *
 * No aspira a ser un fonemizador de ingles: los digrafos cubren los casos
 * frecuentes y la reduccion vocalica queda fuera a proposito, porque
 * modelarla exige acento y silaba, que esta tabla no representa.
 */
export const ENGLISH_DEMO: OrthographyTable = {
  id: "en-demo",
  languageId: "eng",
  name: "English (demo, American)",
  version: 1,
  classes: {},
  rules: [
    { grapheme: "sh", ipa: "\u0283" },
    { grapheme: "ch", ipa: "t\u0283" },
    { grapheme: "th", ipa: "\u03b8" },
    { grapheme: "ng", ipa: "\u014b" },
    { grapheme: "ck", ipa: "k" },
    { grapheme: "ph", ipa: "f" },
    { grapheme: "qu", ipa: "kw" },
    { grapheme: "oo", ipa: "u" },
    { grapheme: "ee", ipa: "i" },
    { grapheme: "ea", ipa: "i" },
    { grapheme: "b", ipa: "b" },
    { grapheme: "c", ipa: "k" },
    { grapheme: "d", ipa: "d" },
    { grapheme: "f", ipa: "f" },
    { grapheme: "g", ipa: "\u0261" },
    { grapheme: "h", ipa: "h" },
    { grapheme: "j", ipa: "d\u0292" },
    { grapheme: "k", ipa: "k" },
    { grapheme: "l", ipa: "l" },
    { grapheme: "m", ipa: "m" },
    { grapheme: "n", ipa: "n" },
    { grapheme: "p", ipa: "p" },
    { grapheme: "r", ipa: "\u0279" },
    { grapheme: "s", ipa: "s" },
    { grapheme: "t", ipa: "t" },
    { grapheme: "v", ipa: "v" },
    { grapheme: "w", ipa: "w" },
    { grapheme: "y", ipa: "j" },
    { grapheme: "z", ipa: "z" },
    { grapheme: "a", ipa: "\u00e6" },
    { grapheme: "e", ipa: "\u025b" },
    { grapheme: "i", ipa: "\u026a" },
    { grapheme: "o", ipa: "\u0251" },
    { grapheme: "u", ipa: "\u028c" },
  ],
  notes: "Demo de ingles estadounidense basico. No cubre reduccion vocalica ni alofonos.",
  status: "reviewed",
};

/**
 * Vocales anteriores del portugues escritas: `c`, `g`, `qu` y `gu` cambian de
 * sonido delante de ellas. La tilde y el acento circunflejo entran en el
 * conjunto porque la regla es ortografica y no fonetica.
 */
const PT_FRONT_VOWELS = "[e\u00e9\u00eai\u00ed]";

/**
 * Portugues brasileno de demostracion.
 *
 * DOS CAPAS, PORQUE LA LENGUA TIENE DOS CLASES DE HECHO
 *
 * La capa fonemica dice como se ESCRIBE: digrafos (`ch`, `lh`, `nh`, `rr`,
 * `ss`, `sc`, `sç`), `c` y `g` ante vocal anterior, la `h` muda. La capa
 * alofonica dice como se PRONUNCIA eso ya transcrito: la `-e` y la `-o`
 * finales se elevan, la `-l` final se vocaliza y las coronales palatalizan
 * ante [i].
 *
 * Meter las dos en una sola lista haria competir una regla de pronunciacion
 * con una de escritura por el mismo grafema, y el desempate del motor
 * (longitud, contexto, prioridad) acabaria decidiendo algo que en la lengua es
 * secuencial: en `chave` primero se lee `ch` = [\u0283] y despues se realiza la
 * `-e` final como [i], y la segunda decision depende de la primera. Por eso la
 * pasada alofonica existe y se calcula sobre la salida de la fonemica.
 *
 * LO QUE ESTA TABLA NO MODELA, Y LO DICE EN `notes`
 *
 * Acento, cualidades medias (e/ɛ, o/ɔ), la `s` intervocálica sonora y la
 * nasalidad que aporta una coda nasal escrita (n/m ante consonante).
 */
const portugueseRules: readonly G2PRule[] = [
  // Digrafos primero: gana el grafema mas largo, pero una tabla se lee antes
  // de que se ejecute.
  { grapheme: "ch", ipa: "\u0283", note: "fricativa postalveolar sorda; nunca [t\u0283]" },
  { grapheme: "lh", ipa: "\u028e", note: "lateral palatal" },
  { grapheme: "nh", ipa: "\u0272", note: "nasal palatal" },
  {
    grapheme: "rr",
    ipa: "\u0280",
    note: "vibrante uvular en la norma carioca; vibrante multiple alveolar [r] en el sur del Brasil y en Portugal",
  },
  { grapheme: "ss", ipa: "s", note: "sorda entre vocales, donde una s suelta seria [z]" },
  {
    grapheme: "s\u00e7",
    ipa: "s",
    note: "la cedilla ya es [s]; el digrafo fija que la s no se sonorice",
  },
  { grapheme: "sc", ipa: "s", note: "la c ante e/i ya es [s]; el digrafo fija la s sorda" },
  {
    grapheme: "qu",
    ipa: "k",
    after: PT_FRONT_VOWELS,
    note: "la u no se pronuncia ante vocal anterior; ante a/o si suena [w] (quando)",
  },
  {
    grapheme: "gu",
    ipa: "\u0261",
    after: PT_FRONT_VOWELS,
    note: "la u no se pronuncia ante vocal anterior; ante a/o si suena [w] (aguardar)",
  },
  // c y g cambian de sonido ante vocal anterior: la regla con contexto gana por
  // especificidad sobre la general.
  { grapheme: "c", ipa: "s", after: PT_FRONT_VOWELS, note: "ante vocal anterior" },
  { grapheme: "c", ipa: "k" },
  { grapheme: "\u00e7", ipa: "s", note: "cedilla: siempre [s]" },
  { grapheme: "g", ipa: "\u0292", after: PT_FRONT_VOWELS, note: "ante vocal anterior" },
  { grapheme: "g", ipa: "\u0261" },
  { grapheme: "j", ipa: "\u0292", note: "la j portuguesa nunca suena como la espanola" },
  {
    grapheme: "x",
    ipa: "\u0283",
    note: "APROXIMACION declarada: la x portuguesa es ambigua y puede ser [\u0283], [s], [z] o [ks] segun la palabra (xarope, proximo, exercito, taxi)",
  },
  { grapheme: "h", ipa: "", note: "muda; se elimina" },
  { grapheme: "q", ipa: "k", note: "la q siempre va seguida de u" },
  {
    grapheme: "u",
    ipa: "w",
    before: "[qg]",
    note: "la u de qu/gu ante a/o es semivocal [w]; ante vocal anterior la consume el digrafo",
  },
  {
    grapheme: "r",
    ipa: "\u027e",
    note: "vibrante simple; la r inicial de palabra y la rr se realizan como vibrante uvular [\u0280] en la norma carioca",
  },
  {
    grapheme: "s",
    ipa: "s",
    note: "sorda; la s intervocálica sonora de casa queda fuera de esta demo, que transcribe la letra y no el contexto",
  },
  { grapheme: "z", ipa: "z" },
  { grapheme: "v", ipa: "v" },
  { grapheme: "b", ipa: "b" },
  { grapheme: "d", ipa: "d" },
  { grapheme: "f", ipa: "f" },
  { grapheme: "t", ipa: "t" },
  { grapheme: "p", ipa: "p" },
  { grapheme: "k", ipa: "k" },
  { grapheme: "m", ipa: "m" },
  { grapheme: "n", ipa: "n" },
  { grapheme: "l", ipa: "l" },
  { grapheme: "w", ipa: "w" },
  { grapheme: "y", ipa: "j" },
  // El acento no se modela: la vocal acentuada se transcribe con la misma
  // calidad que la no acentuada, y la nasal escrita con tilde se conserva
  // nasal (la centralizacion de a es cosa de la capa alofonica).
  { grapheme: "a", ipa: "a" },
  { grapheme: "\u00e1", ipa: "a" },
  { grapheme: "\u00e2", ipa: "a" },
  { grapheme: "\u00e3", ipa: "a\u0303" },
  { grapheme: "e", ipa: "e" },
  { grapheme: "\u00e9", ipa: "e" },
  { grapheme: "\u00ea", ipa: "e" },
  { grapheme: "i", ipa: "i" },
  { grapheme: "\u00ed", ipa: "i" },
  { grapheme: "o", ipa: "o" },
  { grapheme: "\u00f3", ipa: "o" },
  { grapheme: "\u00f4", ipa: "o" },
  { grapheme: "\u00f5", ipa: "o\u0303" },
  { grapheme: "u", ipa: "u" },
  { grapheme: "\u00fa", ipa: "u" },
];

/**
 * Reglas de realizacion del portugues brasileno, sobre la salida fonemica.
 *
 * POR QUE HAY REGLAS DE DOS CARACTERES AQUI (`te`, `de`)
 *
 * El motor lee `before`/`after` del MISMO texto de entrada de la pasada, asi
 * que una regla `t -> t\u0283` con contexto [i] no ve la `e` final que esta
 * misma pasada eleva a [i]: `leite` saldria [lejti] en vez de [lejt\u0283i]. La
 * regla `te#` dice lo que la fuente describe (la `-e` final atona se eleva y
 * palataliza la coronal anterior) sin inventar un motor con dos pasos
 * internos. El limite queda escrito en vez de escondido.
 */
const portugueseAllophonic: readonly G2PRule[] = [
  {
    grapheme: "t",
    ipa: "t\u0283",
    after: "[i\u00ed]",
    note: "palatalizacion de la coronal sorda ante [i]; es regla de realizacion y varia por variedad y por registro",
  },
  {
    grapheme: "d",
    ipa: "d\u0292",
    after: "[i\u00ed]",
    note: "palatalizacion de la coronal sonora ante [i]; es regla de realizacion y varia por variedad y por registro",
  },
  {
    grapheme: "te",
    ipa: "t\u0283i",
    after: "#",
    note: "-te final: la -e atona se eleva a [i] y palataliza la t (leite). La grafia -te solo aparece en final atono",
  },
  {
    grapheme: "de",
    ipa: "d\u0292i",
    after: "#",
    note: "-de final: la -e atona se eleva a [i] y palataliza la d (cidade)",
  },
  { grapheme: "e", ipa: "i", after: "#", note: "la -e final atona se eleva a [i]" },
  { grapheme: "o", ipa: "u", after: "#", note: "la -o final atona se eleva a [u]" },
  {
    grapheme: "l",
    ipa: "w",
    after: "#",
    note: "APROXIMACION declarada: la -l final se vocaliza a [w] en la norma que esta tabla transcribe; el sur del Brasil y Portugal conservan [l]",
  },
  {
    grapheme: "\u00e3",
    ipa: "\u0250\u0303",
    note: "la a nasal se centraliza; es regla de realizacion del portugues brasileno",
  },
  {
    grapheme: "\u00f5",
    ipa: "o\u0303",
    note: "identidad: la nasalidad ya la da la capa fonemica. Se declara aqui para que la capa alofonica cubra la vocal y para dejar escrito que la o nasal no se centraliza",
  },
  {
    grapheme: "\u00e3o",
    ipa: "\u0250\u0303w\u0303",
    note: "diptongo nasal final (nao, cao): a centralizada mas glide nasalizado",
  },
  {
    grapheme: "\u00f5e",
    ipa: "o\u0303j\u0303",
    note: "diptongo nasal (poe, poes): o nasal mas glide palatal nasalizado",
  },
];

/**
 * Fuentes de la tabla de portugues, en texto plano porque `notes` se muestra
 * tal cual y un DOI inventado no se puede desmentir desde ahi.
 */
const PORTUGUESE_NOTES = [
  "Demo de portugués brasileño con reglas de realización: no es una descripción normativa, y la x ([\u0283] por defecto) y la vocalización de la -l final son aproximaciones declaradas.",
  "Fuentes: Mateus, M. H. y d'Andrade, E. (2000) The Phonology of Portuguese, Oxford University Press (inventario citado por PBase, https://pbase.phon.chass.ncsu.edu/language/450);",
  "PHOIBLE 2.0, inventario 2207 (Brazilian Portuguese), https://phoible.org/inventories/view/2207;",
  "The phonemes of Portuguese, Routledge 2024, https://doi.org/10.4324/9781003266648-2.",
  "No modela acento, cualidad de las vocales medias ni la nasalidad que aporta una coda nasal escrita (n/m ante consonante).",
].join(" ");

export const PORTUGUESE_DEMO: OrthographyTable = {
  id: "pt-demo",
  languageId: "por",
  name: "Portugués brasileño (demo)",
  version: 1,
  classes: {},
  rules: portugueseRules,
  allophonic: portugueseAllophonic,
  notes: PORTUGUESE_NOTES,
  status: "reviewed",
};

/**
 * Wayuunaiki (Colombia y Venezuela), demo del alfabeto.
 *
 * MAPEO UNO A UNO, SIN INVENTAR NADA MAS
 *
 * Cada regla es una correspondencia que las fuentes citadas publican: el
 * alfabeto de 20 letras del diccionario y la descripcion fonologica. No hay
 * lexico, ni morfologia, ni oraciones, y la tabla nace en `draft` porque una
 * tabla sin hablantes que la revisen no puede presentarse como revisada (ver
 * docs/PENDING.md P9). La duracion contrastiva se marca con el diacritico de
 * longitud: es la unica cosa que esta tabla agrega a la correspondencia
 * letra a letra, y la fuente la describe explicitamente.
 *
 * Esto NO es `WAYUUNAIKI_TEMPLATE`: la plantilla sigue vacia.
 */
const wayuuRules: readonly G2PRule[] = [
  // Digrafos primero.
  { grapheme: "ch", ipa: "t\u0283", note: "africada postalveolar sorda" },
  {
    grapheme: "sh",
    ipa: "\u0283",
    note: "fricativa postalveolar sorda; letra propia del alfabeto",
  },
  {
    grapheme: "\uA78C",
    ipa: "\u0294",
    note: "saltillo: oclusion glotal, letra propia del alfabeto",
  },
  { grapheme: "j", ipa: "h", note: "fricativa glotal sorda, no la fricativa velar del espanol" },
  { grapheme: "\u00fc", ipa: "\u0268", note: "vocal central alta no redondeada" },
  { grapheme: "r", ipa: "\u027e", note: "vibrante simple" },
  { grapheme: "a", ipa: "a" },
  { grapheme: "e", ipa: "e" },
  { grapheme: "i", ipa: "i" },
  { grapheme: "k", ipa: "k" },
  { grapheme: "l", ipa: "l" },
  { grapheme: "m", ipa: "m" },
  { grapheme: "n", ipa: "n" },
  { grapheme: "o", ipa: "o" },
  { grapheme: "p", ipa: "p" },
  { grapheme: "s", ipa: "s" },
  { grapheme: "t", ipa: "t" },
  { grapheme: "u", ipa: "u" },
  { grapheme: "w", ipa: "w", note: "semiconsonante" },
  { grapheme: "y", ipa: "j", note: "semiconsonante" },
  // Duracion: vocal larga y consonante geminada llevan el diacritico de
  // longitud, porque la duracion vocalica es contrastiva en wayuunaiki.
  { grapheme: "aa", ipa: "a\u02d0", note: "vocal larga; la duracion es contrastiva" },
  { grapheme: "ee", ipa: "e\u02d0", note: "vocal larga; la duracion es contrastiva" },
  { grapheme: "ii", ipa: "i\u02d0", note: "vocal larga; la duracion es contrastiva" },
  { grapheme: "oo", ipa: "o\u02d0", note: "vocal larga; la duracion es contrastiva" },
  { grapheme: "uu", ipa: "u\u02d0", note: "vocal larga; la duracion es contrastiva" },
  {
    grapheme: "\u00fc\u00fc",
    ipa: "\u0268\u02d0",
    note: "vocal larga; la duracion es contrastiva",
  },
  { grapheme: "pp", ipa: "p\u02d0", note: "consonante geminada" },
  { grapheme: "tt", ipa: "t\u02d0", note: "consonante geminada" },
  { grapheme: "kk", ipa: "k\u02d0", note: "consonante geminada" },
];

/**
 * Fuentes de la tabla de wayuunaiki. La primera frase es la advertencia del
 * proyecto, importada de `indigenous-templates.ts` para que no existan dos
 * copias que un dia digan cosas distintas.
 */
const WAYUU_NOTES = [
  `${COMMUNITY_VALIDATION_NOTICE}.`,
  "Lo único que afirma esta demo es la correspondencia del alfabeto wayuu al AFI publicada en las fuentes citadas; no incluye léxico, morfología ni oraciones.",
  "Fuentes: Diccionario Wayuu (Webonary/SIL), alfabeto de 20 letras a, ch, e, i, j, k, ꞌ, l, m, n, o, p, r, s, sh, t, u, ü, w, y, https://www.webonary.org/wayuu/language/phonology/;",
  "«Panorámica de la fonología y morfología de la lengua wayuu», Letras 61(98), 2021, pp. 47-92, https://dialnet.unirioja.es/descarga/articulo/8548776.pdf;",
  "Berkeley SAPhon, inventario wayuu, https://linguistics.berkeley.edu/saphon/es/inv/Wayuu.html.",
  "Glottocode wayu1243, el mismo que declara la plantilla vacía de esta lengua (iso639-3.sil.org, coincide con Glottolog).",
].join(" ");

export const WAYUU_DEMO: OrthographyTable = {
  id: "guc-demo",
  languageId: "guc",
  name: "Wayuunaiki (demo, alfabeto)",
  version: 1,
  classes: {},
  rules: wayuuRules,
  notes: WAYUU_NOTES,
  status: "draft",
};

/** Las tablas de demostracion que el editor carga al abrir la herramienta. */
export const DEMO_TABLES: readonly OrthographyTable[] = [
  SPANISH_DEMO_YEISMO,
  SPANISH_DEMO_DISTINCION,
  ENGLISH_DEMO,
  PORTUGUESE_DEMO,
  WAYUU_DEMO,
];
