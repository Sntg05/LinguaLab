import type { PhonemeSequence } from "../../domain/ipa";
import { tokenizeIpa } from "../../domain/ipa";
import type { PhonemizerError, PhonemizerPort } from "../../ports/phonemizer";
import { err, ok, type Result } from "../../result";

export interface InMemoryPhonemizerOptions {
  readonly available?: boolean;
  readonly languages?: readonly string[];
  /**
   * Traducciones fijas por texto. Sin entrada, el fake devuelve el texto tal
   * cual como AFI: es suficiente para probar el flujo y deja claro en la
   * prueba cuando se espera una transcripcion concreta.
   */
  readonly transcriptions?: Readonly<Record<string, string>>;
}

/**
 * Fonemizador de mentira, pero con el contrato completo: distingue motor no
 * disponible de lengua no soportada, y devuelve fonos ya separados con
 * `tokenizeIpa` en lugar de partir la cadena por caracteres.
 */
export class InMemoryPhonemizer implements PhonemizerPort {
  private readonly available: boolean;
  private readonly languages: readonly string[];
  private readonly transcriptions: Readonly<Record<string, string>>;

  constructor(options: InMemoryPhonemizerOptions = {}) {
    this.available = options.available ?? true;
    this.languages = options.languages ?? ["spa", "eng"];
    this.transcriptions = options.transcriptions ?? {};
  }

  isAvailable(): boolean {
    return this.available;
  }

  listLanguages(): readonly string[] {
    return this.languages;
  }

  async phonemize(
    text: string,
    languageCode: string,
  ): Promise<Result<PhonemeSequence, PhonemizerError>> {
    if (!this.available) {
      return err({ code: "engine-unavailable", detail: "fake sin motor" });
    }
    if (!this.languages.includes(languageCode)) {
      return err({ code: "unsupported-language", languageCode });
    }

    const ipa = this.transcriptions[text] ?? text;
    return ok({ phones: tokenizeIpa(ipa), ipa });
  }
}
