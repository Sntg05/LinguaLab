/**
 * Conventional Commits, en español o en inglés pero consistentes.
 *
 * El prompt del proyecto exige este formato desde el primer commit porque es
 * lo que después alimenta el CHANGELOG automático: si un mensaje no se puede
 * clasificar, la versión no se puede calcular.
 *
 * @type {import('@commitlint/types').UserConfig}
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "test", "refactor", "perf", "build", "ci", "chore", "revert"],
    ],
    // El asunto va en español y lleva tildes; la regla de mayúsculas solo
    // aporta ruido al escribir en un idioma que no es el inglés.
    "subject-case": [0],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 120],
  },
};
