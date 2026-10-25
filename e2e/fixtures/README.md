# Fixtures del conversor ELAN ↔ TextGrid

Archivos pequeños y escritos a mano para el segmento 9. Todos son texto: el ADR
0002 prohíbe grabaciones en el repositorio, y ninguna de estas pruebas necesita
audio —solo tiempos y etiquetas—.

| Archivo | Qué prueba |
| --- | --- |
| `simple.eaf` | Dos capas de intervalos alineadas (0–3 s). La capa `palabra` deja 2200–3000 ms sin anotación a propósito: es el hueco que hay que rellenar con un intervalo vacío antes de escribir un TextGrid. |
| `simple.TextGrid` | El equivalente exacto de `simple.eaf`, con el hueco ya relleno. Sirve para afirmar que los dos lectores producen el MISMO documento de dominio. |
| `jerarquico.eaf` | Las tres estructuras que el modelo no puede representar: una capa con `PARENT_REF`, anotaciones `REF_ANNOTATION` sin tiempos propios y un vocabulario controlado. Es el fixture del informe de pérdida. |
| `malformado.eaf` | Un `.eaf` truncado. Afirma que un archivo inválido devuelve `malformed-xml` con la línea y no lanza. |
| `no-es-anotacion.txt` | Un CSV que no es ni ELAN ni TextGrid. Afirma que la detección de formato no adivina. |

Los usan `packages/adapters/src/elan/pyodide-elan-codec.test.ts` (importados con
`?raw`, como texto) y `e2e/elan.spec.ts` (subidos al navegador como archivos). Un
cambio aquí afecta a las dos suites, que es justo lo que se quiere: un solo
fixture, dos usos.
