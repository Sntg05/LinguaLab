import type { G2PRule } from "../domain/g2p-rule";
import type { OrthographyTable } from "../domain/orthography-table";

/**
 * Tablas de demostracion para espanol e ingles (especificacion S11).
 *
 * POR QUE SON DATOS Y NO CODIGO DEL MOTOR
 *
 * El motor no sabe espanol: aplica las reglas que le da la tabla. Que el
 * espanol viva aqui, como dato, es lo que permite que el interruptor de
 * yeismo sea un cambio de tabla y no una rama en el algoritmo.
 *
 * Las tres tablas se rotulan "demo" en `notes` porque no son descripciones
 * normativas de la lengua: son ejemplos para probar la herramienta.
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

/** Las tablas de demostracion que el editor carga al abrir la herramienta. */
export const DEMO_TABLES: readonly OrthographyTable[] = [
  SPANISH_DEMO_YEISMO,
  SPANISH_DEMO_DISTINCION,
  ENGLISH_DEMO,
];
