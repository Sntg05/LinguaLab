# Evidencia que solo puede dar una persona

Lo que ninguna sesión de código puede cerrar: hace falta un programa instalado, una comunidad, alguien que
use el sitio o una decisión del dueño del repositorio. Estaba repartido entre `PENDING`, `STATUS`, el
traspaso y los PR, y por eso esperaba en silencio. Aquí cada punto tiene qué hay que hacer, con qué, cómo
se sabe que quedó y dónde se anota.

Cuando un punto se cierra, se anota la fecha, la versión del programa y quién lo hizo, y se borra la fila:
la evidencia queda en el documento que la pedía (P17, `docs/validation/`, el ADR).

## Validación con programas externos

| Qué | Con qué | Cómo se sabe que quedó | Se anota en |
|---|---|---|---|
| Que **Praat** abra un `.TextGrid` exportado por `/visualizador` y por `/elan`, con sus capas y tiempos | Praat (cualquier versión 6.x reciente) | Se abre sin aviso y las fronteras coinciden con las de la página | P17 en `PENDING.md`, con versión y fecha |
| Que el **espectrograma** coincida con el de Praat (ventana 0,025 s, 0–5500 Hz, 70 dB) | Praat y el mismo audio | Captura de los dos lado a lado sobre un mismo archivo | P17 |
| Que **F0, formantes e intensidad** coincidan con Praat sobre voces reales | Praat y grabaciones de referencia | `e2e/fixtures/reference/` existe y el arnés da verde | `docs/validation/acoustic.md` |
| Que **ELAN** abra un `.eaf` exportado por `/elan` | ELAN (6.x) | Se abre con sus capas jerárquicas | STATUS, fila del conversor |

## Personas usuarias

| Qué | Con quién | Cómo se sabe que quedó | Se anota en |
|---|---|---|---|
| Recorrer tres herramientas con **NVDA** u **Orca** | Una persona que use lector de pantalla a diario, idealmente | Notas con lector, versión, navegador y fecha | Un archivo en `docs/validation/` |
| Prueba de uso con **estudiantes** de lingüística | 3 a 5 estudiantes, tareas guiadas | Qué se entendió y qué no, por herramienta | Un archivo en `docs/validation/` |
| Revisar a mano los enlaces de editoriales que rechazan robots (DOI de Wiley y Oxford, Packt) | Un navegador | Cada enlace abre la obra que dice la ficha | `src/data/bibliography.ts` |

## Comunidades y fuentes

| Qué | Con quién | Cómo se sabe que quedó | Se anota en |
|---|---|---|---|
| Tablas grafema→AFI de inga, wayuunaiki, nasa yuwe y arhuaco | Hablantes o fuentes citables de cada comunidad | La tabla pasa de `draft` a `reviewed` con su fuente en `notes` | P9 y su PR propio |

## Decisiones del dueño del repositorio

| Qué | Por qué espera | Se anota en |
|---|---|---|
| Fusionar `fix/auditoria-v3-1` a `main` y publicarlo | Una verificación en verde no autoriza a fusionar | `odd/tasks/audit-v3.1-closure.md` |
| Descartar en GitHub las siete alertas de CodeQL propias de un script (#5, #6, #11, #12, #13, #23, #24) | Cambia la configuración del repositorio | `SECURITY-REVIEW.md` §6 trae el motivo de cada una |
| Protección de `main`: aplicarla también a administradores e historia lineal | Hoy un administrador puede empujar a `main` sin PR, y así entró la entrega v3 | `CONTRIBUTING.md`, «Configuración recomendada de `main`» |
| Subir el piso de Node a 22.23.4 para poder usar Astro 7.4.2 | Cambia el entorno de quien contribuye | P23 |
| Etiquetar `v3.0.0` y `v3.1.0` y borrar las ramas ya fusionadas | Publica y borra en el remoto | ADR 0003 |
| Seseo o distinción en el transcriptor de FonoLab | Hoy usa distinción y lo anuncia; el resto del sitio usa seseo | STATUS, fila de FonoLab |
| P5 (editor de clases `{V}`) y P20 (borrar un proyecto) | Interfaz nueva | `PENDING.md` |
