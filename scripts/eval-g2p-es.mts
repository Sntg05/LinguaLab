import { readFileSync } from "node:fs";
import { transcribeSpanish } from "../packages/core/src/g2p/spanish.ts";
import { initialize, setVoice, getPhonemes } from "espeak-phonemizer";
const lines = readFileSync("node_modules/.cache/es_MX.txt", "utf8").split("\n").filter(Boolean);
// muestra determinista: una de cada N
const step = Math.floor(lines.length / 5000);
const sample = lines.filter((_, i) => i % step === 0).map((l) => l.split("\t")).filter(([w]) => /^[a-zñáéíóúü]+$/.test(w));
// comparación segmental: sin acento ni sílabas, y con las convenciones del diccionario igualadas
const norm = (s: string) => s.replace(/[\/ˈˌ.\s]/g, "").replace(/t͡ʃ|tʃ/g, "C").replace(/g/g, "ɡ").replace(/ʝ|ʎ|ɟ͡ʝ|ɟʝ/g, "J").replace(/[βðɣ]/g, (c) => ({ β: "b", ð: "d", ɣ: "ɡ" })[c]!).replace(/ŋ|ɱ/g, "n").replace(/i̯|ɪ̯|j/g, "i").replace(/u̯|ʊ̯|w/g, "u").replace(/z/g, "s");
await initialize(); setVoice("es-419");
let own = 0, esp = 0; const miss: string[] = [];
for (const [w, ref] of sample) {
  const refs = ref.split(",").map(norm);
  const a = norm(transcribeSpanish(w).ipa);
  const b = norm(getPhonemes(w).map((c) => c.phonemes).join("").replace(/ɛ/g, "e"));
  if (refs.includes(a)) own++; else if (miss.length < 25) miss.push(`${w}: propio ${a} | ref ${refs[0]}`);
  if (refs.includes(b)) esp++;
}
console.log(`muestra ${sample.length} | propio ${(own / sample.length * 100).toFixed(1)}% | eSpeak ${(esp / sample.length * 100).toFixed(1)}%`);
console.log(miss.join("\n"));
