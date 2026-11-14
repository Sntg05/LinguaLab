/**
 * Transcriptor de inglés a AFI con diccionario de pronunciación.
 *
 * POR QUÉ UN DICCIONARIO Y NO REGLAS
 *
 * La ortografía del inglés no predice la pronunciación («though», «through»,
 * «tough»), así que un conjunto de reglas siempre adivina. Se usa el CMU
 * Pronouncing Dictionary (Carnegie Mellon University), que anota unas 134 000
 * palabras del inglés americano en ARPABET con acento léxico, y aquí se convierte
 * a AFI. El núcleo no carga el diccionario: recibe una función de consulta, y el
 * adaptador decide de dónde sale.
 *
 * QUÉ ENTREGA
 *
 * - Inglés americano general: vocales róticas `ɝ`/`ɚ`, `ə` en sílaba átona,
 *   sin marcas de duración (no son contrastivas en esta variedad).
 * - Acento primario y secundario delante de la sílaba; los monosílabos no llevan.
 * - Las palabras con más de una pronunciación («read», «record») se informan en
 *   `variants`: sin análisis sintáctico no se puede elegir, y se dice.
 *
 * LÍMITES DECLARADOS
 *
 * Una palabra que no está en el diccionario no se adivina: se devuelve entre
 * `⟨ ⟩` y en `skipped`. Solo se derivan el plural y el posesivo regulares.
 */

import type { Transcription } from "./spanish";
import { trimEdges } from "./trim-edges";

/** Las pronunciaciones de una palabra en ARPABET («B ER1 D»), o `undefined`. */
export type PronunciationLookup = (word: string) => readonly string[] | undefined;

export interface EnglishTranscription extends Transcription {
  /** Palabras del texto que el diccionario registra con varias pronunciaciones. */
  readonly variants: readonly { readonly word: string; readonly ipa: readonly string[] }[];
}

const CONSONANTS: Readonly<Record<string, string>> = {
  B: "b",
  CH: "t͡ʃ",
  D: "d",
  DH: "ð",
  F: "f",
  G: "ɡ",
  HH: "h",
  JH: "d͡ʒ",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ŋ",
  P: "p",
  R: "ɹ",
  S: "s",
  SH: "ʃ",
  T: "t",
  TH: "θ",
  V: "v",
  W: "w",
  Y: "j",
  Z: "z",
  ZH: "ʒ",
};
const VOWELS: Readonly<Record<string, string>> = {
  AA: "ɑ",
  AE: "æ",
  AO: "ɔ",
  AW: "aʊ",
  AY: "aɪ",
  EH: "ɛ",
  EY: "eɪ",
  IH: "ɪ",
  IY: "i",
  OW: "oʊ",
  OY: "ɔɪ",
  UH: "ʊ",
  UW: "u",
};
/** AH y ER cambian con el acento: `ʌ`/`ɝ` tónicas, `ə`/`ɚ` átonas. */
const REDUCING: Readonly<Record<string, readonly [string, string]>> = {
  AH: ["ʌ", "ə"],
  ER: ["ɝ", "ɚ"],
};

/** Ataques silábicos posibles en inglés; el acento se pone delante del más largo que quepa. */
const ONSETS = new Set(
  "pl pɹ bl bɹ tɹ dɹ kl kɹ ɡl ɡɹ fl fɹ θɹ ʃɹ sp st sk sm sn sl sw tw dw kw ɡw θw spl spɹ stɹ skɹ skw pj bj fj vj kj mj hj".split(
    " ",
  ),
);

interface Phone {
  readonly ipa: string;
  /** 1 primario, 2 secundario, 0 átono; `null` en las consonantes. */
  readonly stress: number | null;
}

const toPhones = (arpabet: readonly string[]): Phone[] | null => {
  const phones: Phone[] = [];
  for (const symbol of arpabet) {
    const match = /^([A-Z]+)([012])?$/.exec(symbol);
    if (match === null) return null;
    const [, base = "", digit] = match;
    const consonant = CONSONANTS[base];
    if (consonant !== undefined && digit === undefined) {
      phones.push({ ipa: consonant, stress: null });
      continue;
    }
    if (digit === undefined) return null;
    const stress = Number(digit);
    const reducing = REDUCING[base];
    const vowel = reducing !== undefined ? reducing[stress === 0 ? 1 : 0] : VOWELS[base];
    if (vowel === undefined) return null;
    phones.push({ ipa: vowel, stress });
  }
  return phones;
};

/** Dónde empieza la sílaba de la vocal `vowelIndex`: el ataque legal más largo. */
const syllableStart = (phones: readonly Phone[], vowelIndex: number): number => {
  let first = vowelIndex;
  while (first > 0 && phones[first - 1]?.stress === null) first -= 1;
  if (first === 0) return 0;
  for (let start = first; start < vowelIndex; start += 1) {
    const cluster = phones.slice(start, vowelIndex).map((phone) => phone.ipa);
    const legal = cluster.length === 1 ? cluster[0] !== "ŋ" : ONSETS.has(cluster.join(""));
    if (legal) return start;
  }
  return vowelIndex;
};

/** Convierte una pronunciación ARPABET en AFI; `null` si trae un símbolo desconocido. */
export const arpabetToIpa = (arpabet: readonly string[]): string | null => {
  const phones = toPhones(arpabet);
  if (phones === null) return null;
  const syllables = phones.filter((phone) => phone.stress !== null).length;
  const marks = new Map<number, string>();
  if (syllables > 1) {
    phones.forEach((phone, index) => {
      if (phone.stress === 1 || phone.stress === 2) {
        marks.set(syllableStart(phones, index), phone.stress === 1 ? "ˈ" : "ˌ");
      }
    });
  }
  return phones.map((phone, index) => (marks.get(index) ?? "") + phone.ipa).join("");
};

const SIBILANTS = new Set(["S", "Z", "SH", "ZH", "CH", "JH"]);
const VOICELESS = new Set(["P", "T", "K", "F", "TH"]);

/** El plural o posesivo regular de una pronunciación: /ɪz/, /s/ o /z/ según el final. */
const withSuffixS = (arpabet: string): string => {
  const last = arpabet.split(" ").at(-1) ?? "";
  if (SIBILANTS.has(last)) return `${arpabet} IH0 Z`;
  return `${arpabet} ${VOICELESS.has(last) ? "S" : "Z"}`;
};

const pronunciationsOf = (
  word: string,
  lookup: PronunciationLookup,
): readonly string[] | undefined => {
  const direct = lookup(word);
  if (direct !== undefined) return direct;
  for (const suffix of ["'s", "es", "s"]) {
    if (!word.endsWith(suffix)) continue;
    const base = lookup(word.slice(0, -suffix.length));
    if (base !== undefined) return base.map(withSuffixS);
  }
  return undefined;
};

const WORD = /^[a-z]+(?:'[a-z]+)*$/;
/** Lo que no es letra, cifra ni apóstrofo se quita de los bordes, en tiempo lineal. */
const isEdgePunctuation = (char: string): boolean => !/[a-z0-9']/i.test(char);

export const transcribeEnglish = (
  text: string,
  lookup: PronunciationLookup,
): EnglishTranscription => {
  const out: string[] = [];
  const skipped: string[] = [];
  const variants: { word: string; ipa: string[] }[] = [];

  for (const raw of text.normalize("NFC").replace(/[’‘]/g, "'").split(/\s+/)) {
    const token = trimEdges(raw, isEdgePunctuation);
    if (token === "") continue;
    const word = token.toLowerCase();
    const found = WORD.test(word) ? pronunciationsOf(word, lookup) : undefined;
    const ipa = (found ?? []).flatMap((entry) => {
      const converted = arpabetToIpa(entry.split(" "));
      return converted === null ? [] : [converted];
    });
    const first = ipa[0];
    if (first === undefined) {
      skipped.push(token);
      out.push(`⟨${token}⟩`);
      continue;
    }
    out.push(first);
    const distinct = [...new Set(ipa)];
    if (distinct.length > 1 && !variants.some((entry) => entry.word === word)) {
      variants.push({ word, ipa: distinct });
    }
  }

  return { ipa: out.join(" "), skipped, variants };
};
