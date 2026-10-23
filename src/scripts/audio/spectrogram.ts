/**
 * Espectrograma de banda ancha: ventana de Hann, FFT radix-2 y magnitudes en dB
 * normalizadas.
 *
 * POR QUE UNA FFT PROPIA EN VEZ DE wavesurfer.js CON SU PLUGIN
 *
 * El prompt del segmento 6 pide wavesurfer.js `[VERIFICAR]`. No se adopto: la
 * libreria con sus plugins de regiones, espectrograma y linea de tiempo pesa
 * mas que el presupuesto ENTERO de la pagina (60 KB comprimidos, comprobado por
 * `scripts/verify-build.mjs`), y este repositorio no puede verificar que la
 * version fijada haga lo que su documentacion dice. Una FFT radix-2 de cincuenta
 * lineas cubre lo que la herramienta necesita y se puede probar: una sinusoide
 * de 1000 Hz tiene que caer en la banda de 1000 Hz, y eso es lo que comprueba
 * `spectrogram.test.ts`.
 */

/** Una ventana de Hann simetrica: cero en los extremos, uno en el centro. */
export const hannWindow = (length: number): Float32Array => {
  const window = new Float32Array(length);
  if (length <= 1) {
    return window.fill(1);
  }
  for (let index = 0; index < length; index += 1) {
    window[index] = 0.5 * (1 - Math.cos((2 * Math.PI * index) / (length - 1)));
  }
  return window;
};

/** Potencia de dos mayor o igual que `value`, con un minimo util de 2. */
export const nextPowerOfTwo = (value: number): number => {
  let size = 2;
  while (size < value) {
    size *= 2;
  }
  return size;
};

/**
 * FFT compleja en el lugar (Cooley-Tukey radix 2).
 *
 * Exige un tamano potencia de dos, y lo exige en voz alta: llamarla con otro
 * tamano devolveria numeros con aspecto de espectro y sin significado, que es
 * peor que un error.
 */
const permuteBitReversed = (real: Float64Array, imaginary: Float64Array): void => {
  const size = real.length;
  for (let index = 1, reversed = 0; index < size; index += 1) {
    let bit = size >> 1;
    for (; (reversed & bit) !== 0; bit >>= 1) {
      reversed ^= bit;
    }
    reversed ^= bit;
    if (index < reversed) {
      const re = real[index] ?? 0;
      real[index] = real[reversed] ?? 0;
      real[reversed] = re;
      const im = imaginary[index] ?? 0;
      imaginary[index] = imaginary[reversed] ?? 0;
      imaginary[reversed] = im;
    }
  }
};

export const fftInPlace = (real: Float64Array, imaginary: Float64Array): void => {
  const size = real.length;
  if (size !== imaginary.length) {
    throw new RangeError("fftInPlace necesita dos arreglos del mismo tamano.");
  }
  if (size < 2 || (size & (size - 1)) !== 0) {
    throw new RangeError(`fftInPlace necesita una potencia de dos, no ${size}.`);
  }

  permuteBitReversed(real, imaginary);

  for (let length = 2; length <= size; length *= 2) {
    const angle = (-2 * Math.PI) / length;
    const stepRe = Math.cos(angle);
    const stepIm = Math.sin(angle);

    for (let offset = 0; offset < size; offset += length) {
      let twiddleRe = 1;
      let twiddleIm = 0;
      for (let k = 0; k < length / 2; k += 1) {
        const even = offset + k;
        const odd = even + length / 2;
        const oddRe = (real[odd] ?? 0) * twiddleRe - (imaginary[odd] ?? 0) * twiddleIm;
        const oddIm = (real[odd] ?? 0) * twiddleIm + (imaginary[odd] ?? 0) * twiddleRe;

        const evenRe = real[even] ?? 0;
        const evenIm = imaginary[even] ?? 0;

        real[even] = evenRe + oddRe;
        imaginary[even] = evenIm + oddIm;
        real[odd] = evenRe - oddRe;
        imaginary[odd] = evenIm - oddIm;

        const nextTwiddleRe = twiddleRe * stepRe - twiddleIm * stepIm;
        twiddleIm = twiddleRe * stepIm + twiddleIm * stepRe;
        twiddleRe = nextTwiddleRe;
      }
    }
  }
};

export interface SpectrogramOptions {
  readonly sampleRate: number;
  /** Duracion de la ventana de analisis, en segundos (5–30 ms en banda ancha). */
  readonly windowSeconds: number;
  /** Separacion entre columnas, en segundos. */
  readonly hopSeconds: number;
  readonly minHz: number;
  readonly maxHz: number;
  /** Tope de columnas: mas alla, el canvas no puede mostrarlas y es memoria tirada. */
  readonly maxColumns?: number;
}

/** Columnas de magnitudes normalizadas, listas para pintar. */
export interface Spectrogram {
  readonly columns: number;
  readonly columnLength: number;
  /** `values[column * columnLength + band]`, entre 0 y 1. */
  readonly values: Float32Array;
  readonly minHz: number;
  readonly maxHz: number;
  readonly windowSeconds: number;
  readonly hopSeconds: number;
  /** Segundos entre columnas contiguas, ya aplicado el paso para caber en el tope. */
  readonly columnSeconds: number;
}

/** Rango dinamico que se mapea a la escala de grises: 80 dB bajo el maximo. */
const DYNAMIC_RANGE_DB = 80;

const emptySpectrogram = (options: SpectrogramOptions): Spectrogram => ({
  columns: 0,
  columnLength: 0,
  values: new Float32Array(0),
  minHz: options.minHz,
  maxHz: options.maxHz,
  windowSeconds: options.windowSeconds,
  hopSeconds: options.hopSeconds,
  columnSeconds: options.hopSeconds,
});

/**
 * Magnitudes a 0..1: dB relativos al maximo, recortados al rango dinamico.
 *
 * Se normaliza contra el maximo de TODO el archivo y no contra el de cada
 * columna: normalizar por columna haria que un silencio pareciera tan intenso
 * como un golpe, que es lo contrario de lo que un espectrograma muestra.
 */
const normalizeMagnitudes = (magnitudes: Float32Array, loudest: number): void => {
  if (loudest <= 0) {
    return;
  }
  for (let index = 0; index < magnitudes.length; index += 1) {
    const magnitude = magnitudes[index] ?? 0;
    const db = 20 * Math.log10(Math.max(magnitude, loudest * 1e-9) / loudest);
    magnitudes[index] = Math.min(Math.max((db + DYNAMIC_RANGE_DB) / DYNAMIC_RANGE_DB, 0), 1);
  }
};

interface ColumnAnalysis {
  readonly windowLength: number;
  readonly fftSize: number;
  readonly hop: number;
  readonly stride: number;
  readonly columns: number;
  readonly bandFrom: number;
  readonly columnLength: number;
}

/**
 * Magnitudes crudas de cada columna de la banda pedida, y la mayor de todas.
 *
 * El maximo se acumula aqui, en la misma pasada: recorrer el arreglo otra vez
 * solo para encontrarlo costaria un segundo recorrido sobre cientos de miles de
 * valores que ya estan en cache.
 */
const analyseColumns = (
  samples: Float32Array,
  analysis: ColumnAnalysis,
): { magnitudes: Float32Array; loudest: number } => {
  const window = hannWindow(analysis.windowLength);
  const real = new Float64Array(analysis.fftSize);
  const imaginary = new Float64Array(analysis.fftSize);
  const magnitudes = new Float32Array(analysis.columns * analysis.columnLength);

  let loudest = 0;

  for (let column = 0; column < analysis.columns; column += 1) {
    const start = column * analysis.stride * analysis.hop;
    real.fill(0);
    imaginary.fill(0);
    for (let index = 0; index < analysis.windowLength; index += 1) {
      real[index] = (samples[start + index] ?? 0) * (window[index] ?? 0);
    }

    fftInPlace(real, imaginary);

    for (let band = 0; band < analysis.columnLength; band += 1) {
      const bin = analysis.bandFrom + band;
      const magnitude = Math.hypot(real[bin] ?? 0, imaginary[bin] ?? 0);
      magnitudes[column * analysis.columnLength + band] = magnitude;
      if (magnitude > loudest) {
        loudest = magnitude;
      }
    }
  }

  return { magnitudes, loudest };
};

/** Espectrograma de `samples`: columnas en el tiempo, bandas en frecuencia. */
export const spectrogramColumns = (
  samples: Float32Array,
  options: SpectrogramOptions,
): Spectrogram => {
  const windowLength = Math.max(8, Math.round(options.windowSeconds * options.sampleRate));
  if (samples.length < windowLength || options.sampleRate <= 0) {
    return emptySpectrogram(options);
  }

  const fftSize = nextPowerOfTwo(windowLength);
  const hop = Math.max(1, Math.round(options.hopSeconds * options.sampleRate));
  const total = Math.floor((samples.length - windowLength) / hop) + 1;
  const maxColumns = options.maxColumns ?? 512;
  const stride = total > maxColumns ? Math.ceil(total / maxColumns) : 1;
  const columns = Math.ceil(total / stride);

  const bandWidthHz = options.sampleRate / fftSize;
  const bandFrom = Math.max(0, Math.floor(options.minHz / bandWidthHz));
  const bandTo = Math.min(
    fftSize / 2,
    Math.max(bandFrom + 1, Math.ceil(options.maxHz / bandWidthHz)),
  );
  const columnLength = bandTo - bandFrom;

  const { magnitudes, loudest } = analyseColumns(samples, {
    windowLength,
    fftSize,
    hop,
    stride,
    columns,
    bandFrom,
    columnLength,
  });

  normalizeMagnitudes(magnitudes, loudest);

  return {
    columns,
    columnLength,
    values: magnitudes,
    minHz: options.minHz,
    maxHz: options.maxHz,
    windowSeconds: options.windowSeconds,
    hopSeconds: options.hopSeconds,
    columnSeconds: (hop * stride) / options.sampleRate,
  };
};

/** Banda de un pixel de altura, para dibujar la escala de frecuencia. */
export const hzAtRow = (spectrogram: Spectrogram, row: number, height: number): number => {
  if (height <= 0) {
    return spectrogram.minHz;
  }
  const ratio = 1 - row / height;
  return spectrogram.minHz + (spectrogram.maxHz - spectrogram.minHz) * ratio;
};
