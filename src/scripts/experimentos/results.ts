/* ============================================================
   LinguaLab — identificador anonimo y CSV de resultados

   POR QUE LAS COLUMNAS SE ESCRIBEN EN INGLES Y CON GUION BAJO

   Este CSV se abre en R, en Python o en una hoja de calculo. Nombres estables y
   sin tildes evitan que cada version de cada programa interprete el archivo a su
   manera, y el significado se documenta en la pagina, que es donde alguien lo
   busca.

   POR QUE LA SEMILLA Y LA VERSION VAN EN CADA FILA

   Una fila exportada suelta tiene que seguir siendo interpretable: si el archivo
   se parte por participante, cada parte conserva con que orden y con que version
   se genero. La version de la herramienta importa porque un cambio de plantilla
   puede cambiar la escala de lo que se midio.
   ============================================================ */

import type { ExperimentResults } from "@lingualab/core";

/** Columnas del archivo de resultados, en el orden en que salen. */
export const RESULTS_COLUMNS = [
  "participant",
  "trial",
  "condition",
  "response",
  "rt_ms",
  "tool_version",
  "seed",
] as const;

/** Un campo se entrecomilla solo si lo necesita; el CSV se lee igual. */
const escapeField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * Arma el texto del CSV de resultados.
 *
 * Termina en salto de linea porque un archivo sin el ultimo salto hace que
 * algunas herramientas se coman la ultima fila.
 */
export const buildResultsCsv = (results: ExperimentResults): string => {
  const lines: string[] = [RESULTS_COLUMNS.join(",")];
  for (const trial of results.trials) {
    const fields = [
      trial.participantId,
      trial.trialId,
      trial.condition,
      trial.response,
      String(trial.reactionTimeMs),
      trial.toolVersion,
      String(trial.seed),
    ];
    lines.push(fields.map(escapeField).join(","));
  }
  return `${lines.join("\n")}\n`;
};

/**
 * Identificador anonimo del participante, generado en este navegador.
 *
 * No se pide nombre, correo ni fecha de nacimiento: es un codigo que solo tiene
 * sentido dentro de la sesion, y es lo que permite juntar las filas de una misma
 * persona sin identificar a nadie.
 */
export const createParticipantId = (random: () => number = Math.random): string => {
  const value = Math.floor(random() * 0xffffffff)
    .toString(36)
    .padStart(7, "0");
  return `p-${value}`;
};

/**
 * Lee la semilla que escribio la persona, o sortea una nueva si no es valida.
 *
 * Una semilla vacia no es un error: el caso normal es que nadie escriba nada y
 * quiera una sesion nueva. Pero la semilla que se usa queda registrada en los
 * resultados, asi que «no escribi nada» no deja el analisis sin reproducir.
 */
export const seedFrom = (input: string, random: () => number = Math.random): number => {
  const parsed = Number.parseInt(input.trim(), 10);
  if (Number.isInteger(parsed) && parsed >= 0) {
    return parsed;
  }
  return Math.floor(random() * 0xffffffff);
};
