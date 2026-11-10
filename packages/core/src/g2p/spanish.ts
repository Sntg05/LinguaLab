/**
 * Transcriptor de español a AFI por reglas.
 *
 * POR QUÉ REGLAS Y NO UN SINTETIZADOR
 *
 * La ortografía del español predice casi por completo la pronunciación, así que
 * un conjunto pequeño de reglas ordenadas basta y se puede leer, citar y
 * corregir. Sigue la descripción de Hualde (2013, *Los sonidos del español*):
 * grafema a fonema, formación de diptongos, silabeo y acento. El motor anterior
 * (eSpeak NG) es la entrada de un sintetizador de voz: ponía el acento delante de
 * la vocal y no de la sílaba, y fallaba en «allá», «pingüino» o «México».
 *
 * QUÉ ENTREGA
 *
 * - Nivel fonémico por defecto (`/b d ɡ/`), o fonético (`[β ð ɣ]` y nasales
 *   asimiladas) si se pide: son dos niveles de análisis y no se mezclan.
 * - Variedad latinoamericana (seseo) o peninsular con distinción (`θ`). Las dos
 *   son yeístas, como la mayoría de los hablantes actuales.
 * - Acento delante de la sílaba tónica y punto entre sílabas, como pide el AFI.
 *   Los monosílabos no llevan marca.
 *
 * LÍMITES DECLARADOS
 *
 * No conoce préstamos sin adaptar («jazz», «pizza»), no marca acento secundario
 * ni decide qué monosílabos son átonos en la frase, y lo que no es una palabra
 * española (cifras, siglas con otros signos) se devuelve en `skipped`, sin
 * inventar una lectura.
 */

export type SpanishVariety = "latin-american" | "castilian";
export type TranscriptionLevel = "phonemic" | "phonetic";

export interface SpanishOptions {
  readonly variety?: SpanishVariety;
  readonly level?: TranscriptionLevel;
}

export interface Transcription {
  readonly ipa: string;
  /** Lo que no se transcribió, tal como venía en el texto. */
  readonly skipped: readonly string[];
}

/** V: núcleo vocálico; G: deslizada (j, w); C: consonante; W: i/u aún sin decidir. */
type Kind = "V" | "G" | "C" | "W";

interface Segment {
  ipa: string;
  kind: Kind;
  accented?: boolean;
  /** Una «y» que no va ante vocal: nunca es núcleo si tiene una vocal al lado. */
  finalY?: boolean;
}

interface Syllable {
  readonly segments: Segment[];
}

const WORD = /^[a-zñáéíóúü]+$/;
const PUNCTUATION = /^[¿¡"'«»([—–-]+|[?!.,;:"'«»)\]…—–-]+$/g;
const FRONT = "eiéí";
const STRONG: Readonly<Record<string, string>> = { a: "a", e: "e", o: "o", á: "a", é: "e", ó: "o" };
const WEAK: Readonly<Record<string, string>> = { i: "i", u: "u", í: "i", ú: "u", ü: "u" };
const PLAIN: Readonly<Record<string, string>> = {
  p: "p",
  t: "t",
  k: "k",
  d: "d",
  f: "f",
  l: "l",
  m: "m",
  n: "n",
  s: "s",
  b: "b",
  v: "b",
  j: "x",
  ñ: "ɲ",
  w: "w",
};
/** Topónimos y derivados donde la «x» conserva el valor antiguo /x/. */
const X_AS_JOTA = /^(m[eé]xic|oaxa|texa)/;
const ONSET_FIRST = new Set(["p", "b", "f", "t", "d", "k", "ɡ"]);
const NASALS = new Set(["m", "n", "ɲ", "ŋ", "ɱ"]);

const isVowelLetter = (letter: string | undefined): boolean =>
  letter !== undefined && (letter in STRONG || letter in WEAK);

/** Grafemas a segmentos, con las i/u todavía sin decidir entre vocal y deslizada. */
const toSegments = (word: string, variety: SpanishVariety): Segment[] => {
  const sibilant = variety === "castilian" ? "θ" : "s";
  const out: Segment[] = [];
  const consonant = (ipa: string): void => {
    out.push({ ipa, kind: "C" });
  };

  for (let i = 0; i < word.length; i += 1) {
    const letter = word[i] as string;
    const next = word[i + 1];
    const afterNext = word[i + 2];
    const pair = letter + (next ?? "");

    if (letter in STRONG) {
      out.push({ ipa: STRONG[letter] as string, kind: "V", accented: "áéó".includes(letter) });
    } else if (letter in WEAK) {
      out.push({ ipa: WEAK[letter] as string, kind: "W", accented: "íú".includes(letter) });
    } else if (pair === "ch") {
      consonant("t͡ʃ");
      i += 1;
    } else if (pair === "ll") {
      consonant("ʝ");
      i += 1;
    } else if (pair === "rr") {
      consonant("r");
      i += 1;
    } else if (letter === "q") {
      consonant("k");
      if (next === "u") i += 1;
    } else if (letter === "g") {
      if (next === "ü" && afterNext !== undefined && FRONT.includes(afterNext)) {
        consonant("ɡ");
        out.push({ ipa: "w", kind: "G" });
        i += 1;
      } else if (next === "u" && afterNext !== undefined && FRONT.includes(afterNext)) {
        consonant("ɡ");
        i += 1;
      } else {
        consonant(next !== undefined && FRONT.includes(next) ? "x" : "ɡ");
      }
    } else if (letter === "c") {
      consonant(next !== undefined && FRONT.includes(next) ? sibilant : "k");
    } else if (letter === "z") {
      consonant(sibilant);
    } else if (letter === "x") {
      if (X_AS_JOTA.test(word)) consonant("x");
      else if (i === 0) consonant("s");
      else {
        consonant("k");
        consonant("s");
      }
    } else if (letter === "y") {
      if (isVowelLetter(next)) consonant("ʝ");
      else out.push({ ipa: "i", kind: "W", finalY: true });
    } else if (letter === "r") {
      const previous = word[i - 1];
      consonant(i === 0 || (previous !== undefined && "nls".includes(previous)) ? "r" : "ɾ");
    } else if (letter !== "h") {
      consonant(PLAIN[letter] ?? letter);
    }
  }
  return out;
};

/** Decide cada i/u: núcleo si está sola o acentuada, deslizada si acompaña a otra vocal. */
const resolveGlides = (segments: Segment[]): void => {
  const glide = (segment: Segment): void => {
    segment.kind = "G";
    segment.ipa = segment.ipa === "i" ? "j" : "w";
  };

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i] as Segment;
    if (segment.kind !== "W") continue;
    const previous = segments[i - 1];
    const next = segments[i + 1];
    const afterNucleus = previous?.kind === "V";

    // Núcleo: con tilde; una «y» final sin vocal antes; la primera de dos débiles
    // ante «y» final («muy»); o una i/u sin vocal al lado.
    // Deslizada: ante vocal; la primera de dos débiles («ciudad», «cuida»); o
    // detrás de un núcleo («aire», «rey»).
    const nextIsWeak = next?.kind === "W";
    const becomesGlide = segment.accented
      ? false
      : segment.finalY
        ? afterNucleus
        : next?.kind === "V" ||
          (nextIsWeak && !(next?.finalY && !next.accented)) ||
          (!nextIsWeak && afterNucleus);
    if (becomesGlide) glide(segment);
    else segment.kind = "V";
  }
};

const isOnsetCluster = (first: Segment, second: Segment): boolean =>
  ONSET_FIRST.has(first.ipa) &&
  (second.ipa === "ɾ" || second.ipa === "l") &&
  !(first.ipa === "d" && second.ipa === "l");

/** Silabeo por ataque máximo: una consonante entre vocales abre la sílaba siguiente. */
const syllabify = (segments: readonly Segment[]): Syllable[] => {
  const nuclei = segments.flatMap((segment, index) => (segment.kind === "V" ? [index] : []));
  if (nuclei.length <= 1) return [{ segments: [...segments] }];

  const starts: number[] = [0];
  for (let n = 1; n < nuclei.length; n += 1) {
    const previousNucleus = nuclei[n - 1] as number;
    let coreStart = nuclei[n] as number;
    // Las deslizadas pegadas delante del núcleo van con él («sje», «ɡwi»).
    while (coreStart - 1 > previousNucleus && segments[coreStart - 1]?.kind === "G") coreStart -= 1;
    let codaEnd = previousNucleus + 1;
    // Las deslizadas pegadas detrás del núcleo anterior se quedan con él («toj»).
    while (codaEnd < coreStart && segments[codaEnd]?.kind === "G") codaEnd += 1;

    const consonants = coreStart - codaEnd;
    let onset = Math.min(consonants, 1);
    if (consonants >= 2) {
      const first = segments[coreStart - 2] as Segment;
      const second = segments[coreStart - 1] as Segment;
      if (isOnsetCluster(first, second)) onset = 2;
    }
    starts.push(coreStart - onset);
  }

  return starts.map((start, index) => ({ segments: segments.slice(start, starts[index + 1]) }));
};

/** La sílaba tónica: la de la tilde, o la que dictan las reglas de acentuación. */
const stressedIndex = (word: string, syllables: readonly Syllable[]): number | null => {
  if (syllables.length < 2) return null;
  const marked = syllables.findIndex((syllable) =>
    syllable.segments.some((segment) => segment.accented),
  );
  if (marked !== -1) return marked;
  const last = word[word.length - 1] as string;
  return "aeiouns".includes(last) ? syllables.length - 2 : syllables.length - 1;
};

/** Alófonos sobre la frase entera: las reglas no se detienen en el límite de palabra. */
const applyAllophones = (words: readonly Syllable[][]): void => {
  const stream = words.flatMap((syllables) => syllables.flatMap((syllable) => syllable.segments));
  for (let i = 0; i < stream.length; i += 1) {
    const segment = stream[i] as Segment;
    const next = stream[i + 1];
    if (segment.ipa === "n" && next !== undefined) {
      if (["p", "b", "m"].includes(next.ipa)) segment.ipa = "m";
      else if (["k", "ɡ", "x"].includes(next.ipa)) segment.ipa = "ŋ";
      else if (next.ipa === "f") segment.ipa = "ɱ";
    }
  }
  for (let i = 1; i < stream.length; i += 1) {
    const segment = stream[i] as Segment;
    const previous = (stream[i - 1] as Segment).ipa;
    if (NASALS.has(previous)) continue;
    if (segment.ipa === "b") segment.ipa = "β";
    else if (segment.ipa === "ɡ") segment.ipa = "ɣ";
    else if (segment.ipa === "d" && previous !== "l") segment.ipa = "ð";
  }
};

const render = (syllables: readonly Syllable[], stressed: number | null): string =>
  syllables
    .map(
      (syllable, index) =>
        (index === stressed ? "ˈ" : "") + syllable.segments.map((s) => s.ipa).join(""),
    )
    .join(".");

export const transcribeSpanish = (text: string, options: SpanishOptions = {}): Transcription => {
  const variety = options.variety ?? "latin-american";
  const skipped: string[] = [];
  const analysed: { syllables: Syllable[]; stressed: number | null }[] = [];

  for (const raw of text.normalize("NFC").split(/\s+/)) {
    const token = raw.replace(PUNCTUATION, "");
    if (token === "") continue;
    const word = token.toLowerCase();
    if (!WORD.test(word)) {
      skipped.push(token);
      continue;
    }
    const segments = toSegments(word, variety);
    resolveGlides(segments);
    const syllables = syllabify(segments);
    analysed.push({ syllables, stressed: stressedIndex(word, syllables) });
  }

  if (options.level === "phonetic") applyAllophones(analysed.map((word) => word.syllables));

  return {
    ipa: analysed.map((word) => render(word.syllables, word.stressed)).join(" "),
    skipped,
  };
};
