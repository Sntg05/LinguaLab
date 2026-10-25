/**
 * Tipos minimos de las APIs de Node que usa el arnes de validacion.
 *
 * POR QUE EXISTE ESTE ARCHIVO
 *
 * `packages/adapters/tsconfig.json` fija `"types": []` a proposito —igual que el
 * del nucleo—: es la forma de que un adaptador de navegador no pueda tocar
 * `process` ni `Buffer` por accidente y descubrirlo en produccion. Agregar
 * `"types": ["node"]` para que compile el arnes abriria esa puerta para los
 * cuatro adaptadores a la vez.
 *
 * Asi que se declara SOLO lo que el arnes usa, modulo por modulo y sin globals.
 * Un `process.env` en cualquier adaptador sigue sin compilar.
 *
 * LO QUE ESTO NO PUEDE GARANTIZAR
 *
 * Si una firma se desviara de la real, TypeScript no lo notaria; las pruebas del
 * arnes la ejercitan entera (leer un JSON, listar una carpeta, escribir y borrar
 * un archivo temporal), asi que una desviacion falla en vitest y no en
 * produccion. El arnes no se ejecuta en el navegador: no viaja en ningun bundle.
 */

declare module "node:fs/promises" {
  export function readFile(path: string | URL, encoding: "utf8"): Promise<string>;
  export function readFile(path: string | URL): Promise<Uint8Array>;
  export function readdir(path: string): Promise<string[]>;
  export function writeFile(
    path: string,
    data: string | Uint8Array,
    encoding?: "utf8",
  ): Promise<void>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function rm(
    path: string,
    options?: { readonly recursive?: boolean; readonly force?: boolean },
  ): Promise<void>;
}

declare module "node:fs" {
  export function readFileSync(path: string | URL, encoding: "utf8"): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}
