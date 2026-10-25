/**
 * El informe de perdida, del lado de la interfaz.
 *
 * POR QUE LOS TIPOS SE DECLARAN AQUI Y NO SE IMPORTAN DEL ADAPTADOR
 *
 * La regla hexagonal del repositorio (`ui-to-adapters-only-from-composition-root`)
 * prohibe que `src/**` importe `@lingualab/adapters`, y eso incluye los imports
 * de tipo: si la interfaz pudiera nombrar los tipos del adaptador, el adaptador
 * y la pantalla volverian a estar acoplados por el compilador. Asi que aqui se
 * declara la FORMA que la interfaz consume —nombres y cuentas, nada mas— y el
 * compilador comprueba en el punto de llamada que lo que devuelve el codec
 * encaja. Si el adaptador cambia el informe, `npm run check` lo dice.
 *
 * POR QUE CODIGOS Y NO FRASES
 *
 * El adaptador devuelve codigos (`gap-filled`, `point-tier-dropped`) con el
 * nombre de la capa y una cuenta. Traducirlos es trabajo de esta capa, que es la
 * unica que sabe en que idioma esta la pagina. Una frase en espanol dentro del
 * adaptador se veria tal cual en `/en/elan`.
 */

import type { ElanStringKey, ElanStrings } from "./strings";

/** Los codigos que el adaptador puede devolver hoy. */
export type ElanNoteCode =
  | "gap-filled"
  | "reference-annotations"
  | "annotation-without-time"
  | "tier-empty"
  | "overlap-detected"
  | "point-tier-dropped"
  | "empty-intervals-dropped"
  | "zero-length-dropped"
  | "time-rounded"
  | "tier-unwritable";

export interface ElanNoteView {
  readonly code: string;
  readonly tier: string;
  readonly count?: number;
}

export interface ElanReportView {
  readonly hierarchicalTiers: readonly string[];
  readonly annotationReferences: readonly string[];
  readonly controlledVocabularies: readonly string[];
  readonly notes: readonly ElanNoteView[];
}

/** Cada codigo del adaptador, con la clave de su frase. */
const NOTE_KEYS: Readonly<Record<ElanNoteCode, ElanStringKey>> = {
  "gap-filled": "elan.note.gapFilled",
  "reference-annotations": "elan.note.referenceAnnotations",
  "annotation-without-time": "elan.note.annotationWithoutTime",
  "tier-empty": "elan.note.tierEmpty",
  "overlap-detected": "elan.note.overlapDetected",
  "point-tier-dropped": "elan.note.pointTierDropped",
  "empty-intervals-dropped": "elan.note.emptyIntervalsDropped",
  "zero-length-dropped": "elan.note.zeroLengthDropped",
  "time-rounded": "elan.note.timeRounded",
  "tier-unwritable": "elan.note.tierUnwritable",
};

const isKnownCode = (code: string): code is ElanNoteCode => code in NOTE_KEYS;

/**
 * La frase de una nota, o `null` si el codigo no es de esta version.
 *
 * Devolver `null` y no una frase generica es a proposito: quien dibuja el
 * informe muestra entonces el codigo tal cual, que es feo pero verdadero. Una
 * frase inventada escondería que la interfaz y el adaptador no estan de acuerdo.
 */
export const describeNote = (note: ElanNoteView, strings: ElanStrings): string | null => {
  if (!isKnownCode(note.code)) {
    return null;
  }
  return strings.format(NOTE_KEYS[note.code], { tier: note.tier, count: note.count ?? 0 });
};

/** Verdadero si el informe no tiene nada que contar. */
export const isReportEmpty = (report: ElanReportView): boolean =>
  report.hierarchicalTiers.length === 0 &&
  report.annotationReferences.length === 0 &&
  report.controlledVocabularies.length === 0 &&
  report.notes.length === 0;
