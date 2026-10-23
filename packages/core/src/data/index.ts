/**
 * Superficie publica de los datos que viajan con el nucleo: demos, plantillas
 * y el formato JSON compartido de una tabla.
 *
 * Son datos, no comportamiento: el motor los aplica y los adaptadores los
 * guardan, pero ninguno de los dos los interpreta a su manera.
 */

export {
  DEMO_TABLES,
  ENGLISH_DEMO,
  PORTUGUESE_DEMO,
  SPANISH_DEMO_DISTINCION,
  SPANISH_DEMO_YEISMO,
  WAYUU_DEMO,
} from "./demo-tables";
export {
  ARHUACO_TEMPLATE,
  COMMUNITY_VALIDATION_NOTICE,
  INDIGENOUS_TEMPLATES,
  INGA_TEMPLATE,
  NASA_YUWE_TEMPLATE,
  WAYUUNAIKI_TEMPLATE,
} from "./indigenous-templates";
export { orthographyTableFromJson, orthographyTableToJson } from "./table-json";
export {
  ANNOTATION_CSV_HEADER,
  createTextGridCodec,
  decodeTextGridBytes,
  exportAnnotationCsv,
  parseTextGridBytes,
  parseTextGridText,
  serializeTextGrid,
} from "./textgrid";
export type { ParsedTextGrid, TextGridTierGap } from "./textgrid";
export type { OrthographyTableJsonError } from "./table-json";
