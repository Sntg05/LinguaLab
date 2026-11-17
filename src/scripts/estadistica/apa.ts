/* ============================================================
   LinguaLab — estadística: cifras en el estilo de la APA (7.ª ed.)

   Reglas que se aplican, y solo estas: dos decimales para los estadísticos;
   p con tres decimales y «p < .001» por debajo; sin cero inicial en lo que no
   puede pasar de 1 (p, r, ρ, η², ω², V, R²); el signo menos tipográfico (−);
   punto decimal, como en el manual. La página dice que es formato APA.
   ============================================================ */

const MINUS = "−";

const fixed = (value: number, digits: number): string => {
  const text = Math.abs(value).toFixed(digits);
  return value < 0 && Number(text) !== 0 ? `${MINUS}${text}` : text;
};

/** Un estadístico: dos decimales. */
export const apaNumber = (value: number, digits = 2): string => fixed(value, digits);

/** Lo que no puede pasar de 1 en valor absoluto: sin cero inicial. */
export const apaBounded = (value: number, digits = 2): string =>
  fixed(value, digits).replace(/^(−?)0\./, "$1.");

/** Grados de libertad: enteros tal cual; los de Welch, con dos decimales. */
export const apaDf = (df: number): string => (Number.isInteger(df) ? String(df) : apaNumber(df));

/** «p = .021» o «p < .001». */
export const apaP = (p: number): string => (p < 0.001 ? "p < .001" : `p = ${apaBounded(p, 3)}`);
