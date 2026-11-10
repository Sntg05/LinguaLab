/* ============================================================
   LinguaLab — live transcriber on the landing page

   The same engine and Spanish demo table that the orthography tool uses,
   run on every keystroke. It shows both layers so a reader sees the
   difference between a phonological and a phonetic transcription: the
   symbols the allophonic layer changed are marked.

   The build renders the default sentence already transcribed, so the
   panel is complete without JavaScript; this only makes it respond.
   ============================================================ */

import { SPANISH_DEMO_YEISMO, convertLayer } from "@lingualab/core";

const TABLE = SPANISH_DEMO_YEISMO;

export interface Transcription {
  readonly phonemic: string;
  readonly phonetic: string;
}

export function transcribe(text: string): Transcription {
  const phonemic = convertLayer(text, TABLE.rules, {
    layer: "phonemic",
    casePolicy: "fold",
    classes: TABLE.classes,
  }).output;
  const phonetic = convertLayer(phonemic, TABLE.allophonic ?? [], {
    layer: "allophonic",
    casePolicy: "fold",
    classes: TABLE.classes,
  }).output;
  return { phonemic, phonetic };
}

/**
 * Splits the phonetic line into runs, flagging the symbols that differ from
 * the phonemic line. Only meaningful when both lines align symbol by symbol,
 * which is the case for the one-to-one allophonic rules of the demo table;
 * otherwise nothing is flagged rather than flagging the wrong symbols.
 */
export function diffRuns(
  phonemic: string,
  phonetic: string,
): { readonly text: string; readonly changed: boolean }[] {
  const a = Array.from(phonemic);
  const b = Array.from(phonetic);
  if (a.length !== b.length) {
    return [{ text: phonetic, changed: false }];
  }
  const runs: { text: string; changed: boolean }[] = [];
  b.forEach((symbol, index) => {
    const changed = symbol !== a[index];
    const last = runs[runs.length - 1];
    if (last && last.changed === changed) {
      last.text += symbol;
    } else {
      runs.push({ text: symbol, changed });
    }
  });
  return runs;
}

export function initTranscriber(): void {
  const root = document.querySelector<HTMLElement>("[data-transcriber]");
  const input = root?.querySelector<HTMLInputElement>("[data-transcriber-input]");
  const phonemicOut = root?.querySelector<HTMLElement>("[data-transcriber-phonemic]");
  const phoneticOut = root?.querySelector<HTMLElement>("[data-transcriber-phonetic]");
  if (!root || !input || !phonemicOut || !phoneticOut) return;

  const render = (): void => {
    const text = input.value.trim();
    if (text === "") {
      phonemicOut.textContent = "/ /";
      phoneticOut.textContent = "[ ]";
      return;
    }
    const { phonemic, phonetic } = transcribe(text);
    phonemicOut.textContent = `/${phonemic}/`;

    const nodes: Node[] = [document.createTextNode("[")];
    for (const run of diffRuns(phonemic, phonetic)) {
      if (run.changed) {
        const mark = document.createElement("mark");
        mark.textContent = run.text;
        nodes.push(mark);
      } else {
        nodes.push(document.createTextNode(run.text));
      }
    }
    nodes.push(document.createTextNode("]"));
    phoneticOut.replaceChildren(...nodes);
  };

  input.addEventListener("input", render);
  render();
}
