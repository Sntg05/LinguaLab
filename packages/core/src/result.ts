/**
 * `Result`: el tipo de error explicito del hexagono.
 *
 * POR QUE UN RESULT Y NO EXCEPCIONES
 *
 * En LinguaLab los fallos no son accidentes: un TextGrid mal formado, una
 * tabla de ortografia que no existe, un modulo WebAssembly que no se pudo
 * compilar para el navegador y una lengua sin reglas son todos caminos
 * ESPERADOS, no excepcionales. Una excepcion viaja por fuera de la firma: el
 * compilador no obliga a nadie a tratarla y el error aparece lejos de su
 * causa. `Result<T, E>` mete el fallo en el tipo de retorno, asi que el
 * compilador EXIGE que quien llama decida que hacer con el. El puerto declara
 * que puede fallar; el adaptador lo cumple sin lanzar.
 *
 * La forma es la union discriminada minima: dos variantes, `ok` y `err`, sin
 * clases ni metodos. Los datos son planos a proposito para que se puedan
 * serializar, comparar con `toEqual` en las pruebas y guardar sin sorpresas.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Construye el lado exitoso. `never` permite que el error lo infiera el uso. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Construye el lado fallido. `never` permite que el valor lo infiera el uso. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Estrecha a la variante exitosa. Es un predicado de tipo, no un booleano
 * suelto: despues de `if (isOk(r))`, TypeScript ya sabe que `r.value` existe y
 * no hay que recurrir a `as` ni a `!`.
 */
export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok;

/** Estrecha a la variante fallida; simetrico a `isOk`. */
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => !result.ok;

/**
 * Transforma el valor exitoso. Si el resultado falla, el error pasa intacto:
 * mapear un valor que no existe seria inventar un camino.
 */
export const mapResult = <T, U, E>(result: Result<T, E>, f: (value: T) => U): Result<U, E> =>
  result.ok ? ok(f(result.value)) : result;

/**
 * Transforma el error. El caso simetrico de `mapResult`: sirve para traducir
 * el error de un adaptador al error del puerto sin perder el valor exitoso.
 */
export const mapError = <T, E, F>(result: Result<T, E>, f: (error: E) => F): Result<T, F> =>
  result.ok ? result : err(f(result.error));

/**
 * Encadena una operacion que tambien puede fallar. Se corta en el primer
 * error, que es la razon de existir del tipo: no hay forma de seguir sin
 * valor, asi que la cadena termina ahi.
 */
export const andThen = <T, U, E>(
  result: Result<T, E>,
  f: (value: T) => Result<U, E>,
): Result<U, E> => (result.ok ? f(result.value) : result);

/** Extrae el valor o devuelve el respaldo. Es el unico punto donde el error se descarta. */
export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.ok ? result.value : fallback;

/**
 * Convierte una lista de resultados en un resultado con la lista de valores.
 *
 * A diferencia de un `Promise.all` que solo reporta el primer rechazo, aqui se
 * ACUMULAN todos los errores: al validar una tabla de reglas interesa la lista
 * completa de reglas malas, no la primera, porque la persona las corrige de a
 * tandas. La lista vacia es exitosa con lista vacia: no hay nada que pueda
 * fallar.
 */
export const all = <T, E>(results: readonly Result<T, E>[]): Result<readonly T[], readonly E[]> => {
  const values: T[] = [];
  const errors: E[] = [];

  for (const result of results) {
    if (result.ok) {
      values.push(result.value);
    } else {
      errors.push(result.error);
    }
  }

  return errors.length > 0 ? err(errors) : ok(values);
};
