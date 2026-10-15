#!/usr/bin/env node
/**
 * Comprobación de las reglas de dependencia de la arquitectura hexagonal.
 *
 * POR QUÉ UN SCRIPT Y NO EL BINARIO `depcruise` DIRECTO
 *
 * El binario de dependency-cruiser aborta con un error cuando el runtime de
 * Node no está en su matriz de soporte (`^22 || ^24 || >=26`), y Node 25 —la
 * versión de la máquina de desarrollo— queda deliberadamente fuera porque no
 * es LTS. Ejecutarlo de forma programática usa EL MISMO motor y EL MISMO
 * archivo de reglas (`.dependency-cruiser.cjs`), pero no pasa por esa puerta:
 * una sola ruta de código, idéntica en local y en CI, sin que nadie tenga que
 * reconstruir a mano lo que ya verifica la integración continua.
 *
 * El contrato de salida es el de siempre: código 0 si no hay violaciones,
 * distinto de 0 si las hay, con el informe legible en la salida estándar.
 */
import { createRequire } from "node:module";
import process from "node:process";
import { cruise, format } from "dependency-cruiser";

// El archivo de reglas sigue siendo CommonJS para que el binario `depcruise`
// pueda leerlo sin transformación si alguien decide invocarlo a mano.
const require = createRequire(import.meta.url);
const ruleSet = require("../.dependency-cruiser.cjs");

/** Las dos superficies que el hexágono debe respetar. */
const ENTRIES = ["src", "packages"];

const result = await cruise(ENTRIES, { ruleSet, validate: true });

if (Array.isArray(result)) {
  throw new Error("Se esperaba un único resultado de crucero por lote de entrada.");
}

const report = result.output;
const violations = report.summary.violations ?? [];

// `format` es el mismo formateador que usa el binario y devuelve
// `{ output, exitCode }`: el informe se lee igual en local que en CI.
const { output } = await format(report, { outputType: "err-long" });
process.stdout.write(output);

if (violations.length > 0) {
  const names = [...new Set(violations.map((v) => v.rule?.name ?? "desconocida"))].join(", ");
  process.stderr.write(
    `\n${violations.length} violación(es) de las reglas hexagonales: ${names}.\n` +
      "Cada regla explica en su comentario en .dependency-cruiser.cjs qué flecha se invirtió.\n",
  );
  process.exit(1);
}

process.stdout.write(
  `Sin violaciones. ${report.summary.totalCruised} módulos y ${report.summary.totalDependenciesCruised} dependencias revisadas.\n`,
);
