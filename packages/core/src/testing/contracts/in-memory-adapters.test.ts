import { runAnnotationStoragePortContract } from "./annotation-storage";
import { runClockPortContract } from "./clock";
import { runIdGeneratorPortContract } from "./id-generator";
import { runLanguageCatalogPortContract } from "./language-catalog";
import { runOrthographyRepositoryPortContract } from "./orthography-repository";
import { runPhonemizerPortContract } from "./phonemizer";
import { runToolRegistryPortContract } from "./tool-registry";
import { FixedClock } from "../fakes/fixed-clock";
import { InMemoryAnnotationStorage } from "../fakes/in-memory-annotation-storage";
import { InMemoryLanguageCatalog } from "../fakes/in-memory-language-catalog";
import { InMemoryOrthographyRepository } from "../fakes/in-memory-orthography-repository";
import { InMemoryPhonemizer } from "../fakes/in-memory-phonemizer";
import { InMemoryToolRegistry } from "../fakes/in-memory-tool-registry";
import { SequentialIdGenerator } from "../fakes/sequential-id-generator";

/**
 * Las suites de contrato contra los fakes en memoria.
 *
 * Es lo que convierte "hay un fake" en "el fake cumple el contrato": cuando
 * llegue el adaptador real de IndexedDB, se ejecutaran las mismas suites y una
 * diferencia de comportamiento aparecera aqui primero.
 */

runOrthographyRepositoryPortContract(() => new InMemoryOrthographyRepository());

runToolRegistryPortContract(
  () =>
    new InMemoryToolRegistry([
      {
        id: "orthography",
        name: { es: "Ortografia", en: "Orthography" },
        area: "fonetica",
        integration: "embedded",
        status: "experimental",
        languages: ["spa", "eng"],
      },
    ]),
);

runLanguageCatalogPortContract(
  () =>
    new InMemoryLanguageCatalog([
      { id: "spa", name: "Espanol", kind: "national" },
      { id: "guc", name: "Wayuunaiki", kind: "indigenous" },
    ]),
);

runPhonemizerPortContract(
  () => new InMemoryPhonemizer({ languages: ["spa"], transcriptions: { casa: "kasa" } }),
);

runAnnotationStoragePortContract(() => new InMemoryAnnotationStorage());

runIdGeneratorPortContract(() => new SequentialIdGenerator("contrato"));

runClockPortContract(() => new FixedClock(new Date(0)));
