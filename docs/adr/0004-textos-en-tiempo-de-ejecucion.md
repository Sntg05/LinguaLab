# 0004 — Textos en tiempo de ejecución sin enviar el diccionario al cliente

- **Estado:** aceptada
- **Fecha:** 2025-10-15
- **Contexto del que surge:** segmento 4, el editor de tablas de ortografía

## Contexto

El sitio resuelve las traducciones **en la compilación**: cada idioma es su propia ruta estática, no hay
diccionario en el cliente y desapareció toda la superficie de `innerHTML` del motor de i18n anterior.
Esa decisión es la razón de que no haya parpadeo de idioma ni payload de traducción en el navegador.

Pero el editor es interactivo, y su script de cliente necesita frases que **no existen en el HTML**
porque dependen de lo que ocurra en tiempo de ejecución: un guardado que falló, una letra de la entrada
sin regla, por qué el almacenamiento se degradó, qué regla ganó en tal posición. Esas frases no se pueden
renderizar de antemano porque no se sabe cuáles van a hacer falta.

La tentación evidente es enviar el diccionario completo al cliente y traducir en el navegador. Eso
volvería a introducir exactamente lo que el diseño del sitio eliminó: un diccionario en el bundle, una
búsqueda de claves que puede fallar en tiempo de ejecución, y `innerHTML` para insertar el resultado.

## Decisión

1. **El componente declara qué claves necesita el cliente en tiempo de ejecución**, en una lista
   (`EDITOR_STRING_KEYS`) tipada con `satisfies readonly MessageKey[]`. Una clave mal escrita o que no
   exista en el diccionario español **falla `npm run check`**, no muestra la clave cruda a un estudiante.
2. **El componente las renderiza ya traducidas**, en el idioma de esa ruta, dentro de un único atributo
   `data-json` sobre un elemento oculto. El script de cliente las lee de ahí.
3. **El cliente nunca traduce.** Recibe pares clave→texto ya resueltos y solo los inserta como **nodos de
   texto**, nunca como HTML.

## Consecuencias

- El diccionario **sigue sin llegar al navegador**. Lo que viaja son las frases que esa página usa, como
  datos, y no un mecanismo de traducción. La decisión original del sitio queda intacta.
- Es imposible que aparezca una clave cruda en la interfaz: no hay búsqueda que pueda fallar, porque el
  texto que se muestra ya estaba resuelto antes de salir del servidor.
- Añadir una frase que solo existe en tiempo de ejecución cuesta dos pasos —el diccionario y la lista de
  claves—, y **el compilador vigila el segundo**. Es el precio correcto: el paso que un humano puede
  olvidar es justamente el que la máquina comprueba.
- El coste es un puñado de cientos de bytes de JSON en el HTML de esa página. Con la página del editor en
  24.0 KB comprimidos sobre un presupuesto de 60 KB, ese coste no se discute.
- El patrón sirve para cualquier herramienta futura con texto dinámico. Lo que **no** debe copiarse es
  enviar el diccionario completo «por si acaso»: eso convierte una decisión de arquitectura en una
  costumbre, y la costumbre no se revisa.
