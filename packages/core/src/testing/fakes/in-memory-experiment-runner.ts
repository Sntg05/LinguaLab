import type { ExperimentSpec } from "../../domain/experiment";
import type {
  ExperimentError,
  ExperimentResults,
  ExperimentRunnerPort,
} from "../../ports/experiment-runner";
import { err, ok, type Result } from "../../result";

const EMPTY_RESULTS: ExperimentResults = { trials: [], seed: 0, toolVersion: "fake" };

/** Ejecutor de experimentos de mentira: rechaza una especificacion sin items. */
export class InMemoryExperimentRunner implements ExperimentRunnerPort {
  private readonly results: ExperimentResults;

  constructor(results: ExperimentResults = EMPTY_RESULTS) {
    this.results = results;
  }

  async run(spec: ExperimentSpec): Promise<Result<ExperimentResults, ExperimentError>> {
    if (spec.items.length === 0) {
      return err({ code: "spec-invalid", detail: "el experimento no tiene items" });
    }
    return ok(this.results);
  }
}
