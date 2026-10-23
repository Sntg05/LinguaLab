import { describe, expect, it } from "vitest";
import { fftInPlace, hannWindow, spectrogramColumns } from "./spectrogram";

/**
 * El espectrograma: ventana, FFT y columnas de magnitudes.
 *
 * POR QUE SE PRUEBA UNA FFT ESCRITA A MANO
 *
 * La alternativa era wavesurfer.js con su plugin de espectrograma, que trae la
 * FFT incluida pero pesa mas que el presupuesto entero de la pagina (60 KB
 * comprimidos) y obliga a fijar una version y una API que este repositorio no
 * puede verificar. Una FFT radix-2 son cincuenta lineas y se puede comprobar lo
 * unico que importa: que una sinusoide pura caiga en la banda que le
 * corresponde. Si eso no se cumple, el espectrograma es un dibujo bonito sin
 * significado.
 */

/** Sinusoide de `frequency` Hz a `sampleRate` muestras por segundo. */
const sine = (frequency: number, sampleRate: number, length: number): Float32Array => {
  const samples = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    samples[index] = Math.sin((2 * Math.PI * frequency * index) / sampleRate);
  }
  return samples;
};

/** Indice de la banda con mayor magnitud de una columna. */
const peakBin = (column: Float32Array): number => {
  let best = 0;
  for (let index = 1; index < column.length; index += 1) {
    if ((column[index] ?? 0) > (column[best] ?? 0)) {
      best = index;
    }
  }
  return best;
};

describe("hannWindow", () => {
  it("vale cero en los extremos y uno en el centro", () => {
    const window = hannWindow(5);

    expect(window[0]).toBeCloseTo(0, 6);
    expect(window[1]).toBeCloseTo(0.5, 6);
    expect(window[2]).toBeCloseTo(1, 6);
    expect(window[3]).toBeCloseTo(0.5, 6);
    expect(window[4]).toBeCloseTo(0, 6);
  });

  it("no modifica la senal original: devuelve una ventana nueva", () => {
    expect(hannWindow(8)).toHaveLength(8);
  });
});

describe("fftInPlace", () => {
  it("una sinusoide cae en su banda", () => {
    const sampleRate = 8000;
    const size = 256;
    const samples = sine(1000, sampleRate, size);
    const window = hannWindow(size);
    const real = new Float64Array(size);
    const imaginary = new Float64Array(size);
    for (let index = 0; index < size; index += 1) {
      real[index] = (samples[index] ?? 0) * (window[index] ?? 0);
    }

    fftInPlace(real, imaginary);

    const magnitudes = new Float32Array(size / 2);
    for (let bin = 0; bin < size / 2; bin += 1) {
      const re = real[bin] ?? 0;
      const im = imaginary[bin] ?? 0;
      magnitudes[bin] = Math.hypot(re, im);
    }

    // 1000 Hz con 8000 muestras/s y 256 puntos: banda 32, exactamente.
    expect(peakBin(magnitudes)).toBe(32);
  });

  it("la transformada de una constante se concentra en la banda 0", () => {
    const size = 64;
    const real = new Float64Array(size).fill(1);
    const imaginary = new Float64Array(size);

    fftInPlace(real, imaginary);

    expect(real[0]).toBeCloseTo(size, 6);
    for (let bin = 1; bin < size; bin += 1) {
      expect(Math.hypot(real[bin] ?? 0, imaginary[bin] ?? 0)).toBeCloseTo(0, 6);
    }
  });
});

describe("spectrogramColumns", () => {
  const sampleRate = 8000;
  const samples = sine(1000, sampleRate, 4096);

  it("produce columnas con la banda esperada marcada", () => {
    const spectrogram = spectrogramColumns(samples, {
      sampleRate,
      windowSeconds: 0.032,
      hopSeconds: 0.008,
      maxHz: 4000,
      minHz: 0,
    });

    expect(spectrogram.columns).toBeGreaterThan(0);
    expect(spectrogram.columnLength).toBeGreaterThan(0);

    const middle = Math.floor(spectrogram.columns / 2);
    const column = new Float32Array(spectrogram.columnLength);
    for (let band = 0; band < spectrogram.columnLength; band += 1) {
      column[band] = spectrogram.values[middle * spectrogram.columnLength + band] ?? 0;
    }

    const bandHz = (peakBin(column) / spectrogram.columnLength) * spectrogram.maxHz;
    expect(bandHz).toBeGreaterThan(800);
    expect(bandHz).toBeLessThan(1200);
  });

  it("normaliza las magnitudes al rango 0..1", () => {
    const spectrogram = spectrogramColumns(samples, {
      sampleRate,
      windowSeconds: 0.032,
      hopSeconds: 0.016,
      maxHz: 4000,
      minHz: 0,
    });

    for (const value of spectrogram.values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("respeta el rango de frecuencia pedido: por encima no hay banda", () => {
    const spectrogram = spectrogramColumns(samples, {
      sampleRate,
      windowSeconds: 0.032,
      hopSeconds: 0.016,
      maxHz: 500,
      minHz: 100,
    });

    expect(spectrogram.maxHz).toBe(500);
    expect(spectrogram.minHz).toBe(100);
  });

  it("un audio vacio devuelve cero columnas sin lanzar", () => {
    const spectrogram = spectrogramColumns(new Float32Array(0), {
      sampleRate,
      windowSeconds: 0.032,
      hopSeconds: 0.016,
      maxHz: 4000,
      minHz: 0,
    });

    expect(spectrogram.columns).toBe(0);
  });

  it("limita el numero de columnas para no reventar el canvas", () => {
    const long = sine(1000, sampleRate, 160_000);

    const spectrogram = spectrogramColumns(long, {
      sampleRate,
      windowSeconds: 0.032,
      hopSeconds: 0.001,
      maxHz: 4000,
      minHz: 0,
      maxColumns: 400,
    });

    expect(spectrogram.columns).toBeLessThanOrEqual(400);
  });
});
