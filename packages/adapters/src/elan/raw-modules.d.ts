/**
 * Declaracion de los imports `?raw` de Vite.
 *
 * El empaquetador entrega el contenido de un archivo como texto cuando la ruta
 * termina en `?raw`. TypeScript no conoce ese sufijo, asi que la prueba del
 * codec —que carga los fixtures `.eaf` y `.TextGrid` como texto para no depender
 * del sistema de archivos— necesita esta declaracion.
 *
 * Se declara aqui, en el paquete del adaptador, y no en `src/`: el paquete no
 * incluye los tipos de Vite a proposito, porque su codigo de produccion corre
 * en el navegador y solo el bundler resuelve esos imports.
 */
declare module "*?raw" {
  const content: string;
  export default content;
}
