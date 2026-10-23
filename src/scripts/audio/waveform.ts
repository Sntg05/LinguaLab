/**
 * Picos de la forma de onda, uno por columna de pixel.
 *
 * Un audio de un minuto tiene millones de muestras y el canvas mide cientos de
 * pixeles: dibujar una muestra por pixel es imposible y dibujar una de cada N
 * esconde justo los picos que se buscan al mirar una oclusion. Se guarda el
 * minimo y el maximo reales de cada tramo.
 */

/** Extremos de la senal en un tramo. */
export interface Peak {
  readonly min: number;
  readonly max: number;
}

/** `buckets` tramos de `samples`, cada uno con su minimo y su maximo. */
export const computePeaks = (samples: Float32Array, buckets: number): readonly Peak[] => {
  if (buckets <= 0) {
    return [];
  }

  const peaks: Peak[] = [];
  const length = samples.length;

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const from = Math.floor((bucket * length) / buckets);
    const to = Math.max(from + 1, Math.floor(((bucket + 1) * length) / buckets));

    let min = 0;
    let max = 0;
    for (let index = from; index < to && index < length; index += 1) {
      const sample = samples[index] ?? 0;
      if (sample < min) {
        min = sample;
      }
      if (sample > max) {
        max = sample;
      }
    }

    peaks.push({ min, max });
  }

  return peaks;
};
