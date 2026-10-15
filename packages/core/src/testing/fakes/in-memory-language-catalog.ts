import type { Language } from "../../domain/language";
import type { LanguageCatalogError, LanguageCatalogPort } from "../../ports/language-catalog";
import { ok, type Result } from "../../result";

/** Catalogo de lenguas en memoria. */
export class InMemoryLanguageCatalog implements LanguageCatalogPort {
  private readonly languages: readonly Language[];

  constructor(languages: readonly Language[] = []) {
    this.languages = [...languages];
  }

  async list(): Promise<Result<readonly Language[], LanguageCatalogError>> {
    return ok(this.languages);
  }

  async byId(id: string): Promise<Result<Language | null, LanguageCatalogError>> {
    return ok(this.languages.find((language) => language.id === id) ?? null);
  }
}
