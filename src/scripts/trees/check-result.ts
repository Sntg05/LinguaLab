/** Un hallazgo de la validación de un árbol, con su gravedad. */
export type CheckLevel = "error" | "note" | "ok";

export interface CheckResult {
  level: CheckLevel;
  message: string;
}
