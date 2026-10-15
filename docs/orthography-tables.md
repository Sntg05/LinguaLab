# Formato de las tablas de ortografía

Una tabla de ortografía es la afirmación «así se escribe esta lengua y así suena». Este documento
describe el formato con el que se guarda, se exporta y se comparte, y la sintaxis de contexto que usa
el motor. Es la referencia que hace falta para construir una tabla fuera del editor —en un script, en
una hoja de cálculo o a mano— y volver a importarla.

La herramienta que las usa está en `/ortografia` (español) y `/en/ortografia` (inglés). El motor y
los formatos viven en `packages/core`; el editor es la interfaz del adaptador primario.

## El formato JSON

Es el formato **completo** de una tabla: la entidad entera, con sus dos capas, sus clases y sus
notas. Es el que usan `Exportar JSON`, `Importar JSON` y `Compartir por URL`, y el que guarda el
almacenamiento del navegador (IndexedDB).

```json
{
  "id": "es-demo-yeismo",
  "languageId": "spa",
  "name": "Espanol (demo, yeismo)",
  "version": 1,
  "classes": {},
  "rules": [
    { "grapheme": "ch", "ipa": "tʃ", "note": "africada palatal sorda" },
    { "grapheme": "c", "ipa": "s", "after": "[eéií]", "note": "seseo" },
    { "grapheme": "c", "ipa": "k" },
    { "grapheme": "h", "ipa": "", "note": "muda; se elimina" },
    { "grapheme": "a", "ipa": "a" }
  ],
  "allophonic": [
    { "grapheme": "b", "ipa": "β", "before": "[aeiou]", "after": "[aeiou]" }
  ],
  "notes": "Demo de espanol latinoamericano con seseo.",
  "status": "reviewed"
}
```

| Campo | Obligatorio | Qué es |
| --- | --- | --- |
| `id` | sí | Identificador único de la tabla. No puede estar vacío: un archivo sin `id` no se puede volver a importar. |
| `languageId` | sí | Código ISO 639-3 de la lengua (`spa`, `eng`, `inb`, `guc`, `pbb`, `arh`). |
| `name` | sí | Nombre visible en el catálogo del editor. |
| `version` | sí | Entero. Una tabla nueva nace en `1`. |
| `classes` | sí | Clases con nombre que las reglas pueden referenciar. Puede ir vacío (`{}`). |
| `rules` | sí | Capa **fonémica**: la que se aplica siempre. Puede ir vacía (una plantilla en construcción). |
| `allophonic` | no | Segunda pasada, opcional, aplicada **sobre la salida** de la fonémica. Su ausencia significa «esta lengua no declara alófonos», no «capa vacía». |
| `notes` | no | Texto libre para quien construye la tabla. |
| `status` | sí | `"draft"` o `"reviewed"`. Las plantillas de lenguas indígenas nacen en `"draft"` a propósito. |

Cada regla de `rules` y `allophonic` tiene esta forma:

| Campo | Obligatorio | Qué es |
| --- | --- | --- |
| `grapheme` | sí | Lo que se escribe. Puede ser un dígrafo (`"ch"`, `"rr"`). Un grafema vacío es un error: coincidiría en cualquier posición. |
| `ipa` | sí | La transcripción AFI de destino. Puede ser multi-carácter (`"tʃ"`) y puede ser vacía (`""`) cuando el grafema es mudo, como la `h` del español. |
| `before` | no | Contexto inmediatamente **anterior**. Ver la sintaxis más abajo. |
| `after` | no | Contexto inmediatamente **posterior**. Misma sintaxis. |
| `priority` | no | Número entero de desempate. Ausente equivale a `0`. |
| `note` | no | Razón lingüística de la regla. El modo «explicar» la muestra junto a la regla que ganó. |

Un archivo con el encabezado correcto pero con un objeto que no encaja en este esquema se rechaza al
importarlo, con el campo que falta nombrado en el mensaje.

## La sintaxis de contexto

`before` y `after` describen **un solo carácter vecino**, no una subcadena. Se escribe con tres
convenciones:

| Sintaxis | Significa | Ejemplo | Se lee |
| --- | --- | --- | --- |
| `#` | Límite de palabra: inicio o fin del texto, o un carácter que no es letra a ese lado. | `{ "grapheme": "r", "ipa": "r", "before": "#" }` | `r` al inicio de palabra es vibrante múltiple |
| `[abc]` | Cualquiera de esos caracteres literales. | `{ "grapheme": "c", "ipa": "s", "after": "[eéií]" }` | `c` ante vocal anterior |
| `{V}` | Cualquier carácter de la clase `V` declarada en `classes`. | `{ "grapheme": "b", "ipa": "β", "before": "{V}", "after": "{V}" }` | `b` entre vocales es aproximante |
| cualquier otra cadena | Ese carácter literal. | `{ "grapheme": "r", "ipa": "r", "before": "n" }` | `r` detrás de `n` |

Las clases se declaran en la tabla, no en el motor, para que añadir una vocal a una lengua no obligue
a tocar código:

```json
{
  "id": "mi-lengua",
  "languageId": "inb",
  "name": "Inga (borrador de trabajo)",
  "version": 1,
  "classes": { "V": ["a", "e", "i", "o", "u"] },
  "rules": [
    { "grapheme": "b", "ipa": "β", "before": "{V}", "after": "{V}", "note": "lenición entre vocales" }
  ],
  "status": "draft"
}
```

Referenciar una clase que no está declarada es un **error** de la tabla: la conversión se rechaza en
lugar de producir una transcripción que parece autoritativa.

### Cómo se elige la regla que gana

Cuando varias reglas coinciden en la misma posición, gana, en este orden:

1. el grafema **más largo** (`ch` le gana a `c`);
2. el contexto **más específico** (imponer `before` y `after` gana sobre imponer solo uno);
3. la **prioridad** más alta;
4. la que aparece **primero** en la tabla.

El panel «explicar» del editor muestra, posición a posición, cuál ganó y con qué contexto.

## El formato CSV

El CSV es la vista plana y **de una sola capa**: las reglas de la capa que se está editando en ese
momento (fonémica o alofónica). Es el formato con el que se trabaja en una hoja de cálculo; no lleva
`classes`, `notes`, `status` ni la otra capa. Para llevar la tabla completa de un sitio a otro, usa
el JSON.

```csv
grapheme,ipa,before,after,priority,note
ch,tʃ,,,,"africada palatal sorda"
c,s,, [eéií],,seseo
c,k,,,,
h,,,,,"muda; se elimina"
```

Reglas del formato:

- **El encabezado es obligatorio** y debe ser exactamente
  `grapheme,ipa,before,after,priority,note`. Si no coincide, la importación se rechaza y el mensaje
  dice qué encabezado se recibió.
- Codificación **UTF-8**. Los símbolos AFI son multibyte y una lectura en latin-1 los destroza.
- Comillas según **RFC 4180**: un campo se escribe entre comillas dobles si contiene una coma, unas
  comillas o un salto de línea, y las comillas que van dentro se duplican (`decir ""hola""`).
- Una celda vacía en `before`, `after`, `priority` o `note` significa «sin restricción» / «sin nota».
  Una celda vacía en `grapheme` **no** es lo mismo que ausencia: es un error de la tabla y el
  validador lo reporta.
- Las filas se aceptan con salto de línea `LF`, `CRLF` o `CR`, para que un archivo exportado en
  Windows se pueda importar.

## Validación

El editor valida la tabla mientras se escribe y muestra los problemas con su severidad:

- **Error** — la tabla no se puede usar y la conversión se rechaza con `table-unusable`. Un ejemplo:
  dos reglas con el mismo grafema y el mismo contexto pero transcripción distinta, porque una de las
  dos nunca podrá ganar y quien lee la tabla creerá lo contrario.
- **Aviso** — una sospecha que se puede ignorar con conocimiento de causa. Un ejemplo: un símbolo que
  no forma parte del conjunto AFI esperado.

Nunca se descarta información en silencio: los caracteres que ninguna regla cubre se **copian tal
cual** y se listan en el panel «cobertura».

## Privacidad y persistencia

Todo ocurre en el navegador. Las tablas se guardan con `OrthographyRepositoryPort` sobre IndexedDB y
la herramienta **avisa** cuando el almacenamiento se degrada a memoria (IndexedDB no disponible, modo
privado, cupo agotado): en ese caso las tablas no sobreviven a una recarga, y el editor lo dice en
lugar de fingir que guardó.

Al compartir por URL, la tabla viaja comprimida en el **hash**, que el navegador nunca envía al
servidor. Si el enlace supera unos 2000 caracteres, el editor avisa: algunos navegadores y clientes
de mensajería los truncan. En ese caso conviene exportar el JSON.
