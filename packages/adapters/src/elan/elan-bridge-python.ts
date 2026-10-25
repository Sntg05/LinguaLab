/**
 * El puente Python del codec ELAN, como texto.
 *
 * POR QUE PYTHON Y NO TYPESCRIPT
 *
 * Leer y escribir ELAN a mano es posible —el Segmento 0 admite la degradacion a
 * "solo lectura basica con DOMParser"— pero perderia justo lo que hace util la
 * herramienta: `pympi-ling` ya conoce el formato (ranuras de tiempo, tipos
 * linguisticos, anotaciones por referencia) y es Python puro, asi que corre en
 * Pyodide sin compilar nada. Escribir un emisor de EAF propio seria reescribir
 * pympi peor y sin sus pruebas.
 *
 * POR QUE UN STRING Y NO UN ARCHIVO `.py`
 *
 * El worker y las pruebas en Node tienen que cargar el mismo texto. Un `.py`
 * obligaria a un import `?raw` con su declaracion ambiental y a que dos
 * herramientas de build (Vite y Vitest) lo resolvieran igual; un string no
 * depende de nadie. Ademas el archivo viaja con el bundle del worker, que es
 * exactamente donde se necesita.
 *
 * QUE CONTRATO CUMPLE
 *
 * - `lingualab_parse_eaf()` lee `/tmp/lingualab-in.eaf` y devuelve JSON:
 *   `{xmin, xmax, tiers: [{name, items: [{start, end, text}]}], report}` o
 *   `{error: {code, detail}}`. Nunca lanza: un archivo invalido es una respuesta.
 * - `lingualab_build_eaf()` lee `/tmp/lingualab-document.json` y devuelve JSON:
 *   `{text, report}`.
 *
 * El informe lleva NOMBRES (de capa, de vocabulario) y no frases: la interfaz
 * traduce, y una frase en espanol dentro del informe se veria en ingles.
 *
 * Los tiempos se convierten aqui y no en TypeScript porque ELAN los guarda en
 * milisegundos enteros y Praat en segundos: el unico lugar donde la conversion
 * es exacta y visible es junto al codigo que los lee.
 */
// biome-ignore lint/complexity/noUselessStringRaw: el fuente Python puede ganar un escape (`\n`, `\t`) en cualquier momento, y en una plantilla normal ese escape se convertiria en un caracter de control DENTRO del codigo Python. String.raw lo deja tal cual se escribe.
export const ELAN_BRIDGE_PYTHON = String.raw`
"""Puente entre Pyodide y el codec ELAN de LinguaLab (pympi-ling)."""

import json
import warnings
import xml.etree.ElementTree as ET

from pympi.Elan import Eaf, to_string

MILLISECONDS = 1000
INPUT_PATH = "/tmp/lingualab-in.eaf"
DOCUMENT_PATH = "/tmp/lingualab-document.json"


def _empty_report():
    """El informe de perdida, vacio. Mismas claves que ElanLossReport."""
    return {
        "hierarchicalTiers": [],
        "annotationReferences": [],
        "controlledVocabularies": [],
        "notes": [],
    }


def _error(code, detail):
    """Un fallo es una respuesta con codigo, no una excepcion que cruce el puente."""
    return json.dumps({"error": {"code": code, "detail": detail}}, ensure_ascii=False)


def _seconds(milliseconds):
    return milliseconds / MILLISECONDS


def lingualab_parse_eaf():
    with open(INPUT_PATH, "rb") as handle:
        data = handle.read()

    # Un archivo vacio no es XML mal formado: es otro caso y merece su codigo.
    if not data.strip():
        return _error("empty", "El archivo no tiene contenido.")

    try:
        root = ET.fromstring(data)
    except ET.ParseError as error:
        line, column = getattr(error, "position", (0, 0))
        return _error(
            "malformed-xml",
            "El XML no se puede leer en la linea %d, columna %d: %s" % (line, column, error),
        )

    if root.tag != "ANNOTATION_DOCUMENT":
        return _error(
            "unsupported-structure",
            "La raiz del documento es <%s>; un .eaf empieza por <ANNOTATION_DOCUMENT>." % root.tag,
        )
    if "VERSION" not in root.attrib:
        return _error(
            "unsupported-structure",
            "El documento no declara VERSION, que todo .eaf necesita para leerse.",
        )

    try:
        with warnings.catch_warnings():
            # pympi avisa por versiones de ELAN que no conoce; el aviso no cambia
            # lo que se puede leer y aqui solo ensuciaria la salida del worker.
            warnings.simplefilter("ignore")
            eaf = Eaf(INPUT_PATH)
    except Exception as error:  # pympi lanza Exception generica al no poder leer
        return _error("unsupported-structure", "pympi no pudo leer el documento: %s" % error)

    report = _empty_report()

    times = {}
    for slot, value in eaf.timeslots.items():
        if value is not None:
            times[slot] = int(value)

    # Un vocabulario controlado restringe los valores de una capa a una lista
    # cerrada. AnnotationDocument no tiene donde guardarlo, asi que se nombra
    # entero —se use o no— en vez de dejar que desaparezca.
    for vocabulary in eaf.controlled_vocabularies:
        report["controlledVocabularies"].append(vocabulary)

    tiers = []
    for tier_id, tier_data in sorted(eaf.tiers.items(), key=lambda item: item[1][3]):
        alignable, references, attributes, _order = tier_data
        name = attributes.get("TIER_ID", tier_id)

        if attributes.get("PARENT_REF"):
            report["hierarchicalTiers"].append(name)
        if references:
            report["annotationReferences"].append(name)
            report["notes"].append(
                {"code": "reference-annotations", "tier": name, "count": len(references)}
            )

        intervals = []
        without_time = 0
        for annotation in alignable.values():
            start_slot, end_slot, value = annotation[0], annotation[1], annotation[2]
            start, end = times.get(start_slot), times.get(end_slot)
            if start is None or end is None or end < start:
                without_time += 1
                continue
            intervals.append((start, end, value))
        if without_time:
            report["notes"].append(
                {"code": "annotation-without-time", "tier": name, "count": without_time}
            )

        if not intervals:
            # Una capa sin tiempos no se puede escribir en un TextGrid. Si ademas
            # no tenia referencias, estaba vacia y tambien conviene decirlo.
            if not references:
                report["notes"].append({"code": "tier-empty", "tier": name})
            continue

        intervals.sort(key=lambda interval: (interval[0], interval[1]))

        # Praat exige que los intervalos de una capa no se solapen. ELAN tampoco
        # lo permite en una capa alineable, asi que encontrarlo significa que el
        # archivo ya venia raro: se informa y se escriben tal cual, sin inventar
        # recortes que moverian tiempos que la persona no autorizo a mover.
        overlaps = 0
        cursor = intervals[0][0]
        for start, end, _value in intervals:
            if start < cursor:
                overlaps += 1
            cursor = max(cursor, end)
        if overlaps:
            report["notes"].append({"code": "overlap-detected", "tier": name, "count": overlaps})

        tiers.append({"name": name, "intervals": intervals})

    # ELAN no declara los limites del documento: el eje empieza en 0 y termina en
    # la ultima anotacion. Se usa eso, y no el fin del audio, porque el audio no
    # viaja con el archivo.
    xmax = max((interval[1] for tier in tiers for interval in tier["intervals"]), default=0)

    document_tiers = []
    for tier in tiers:
        items = []
        cursor = 0
        gaps = 0
        for start, end, text in tier["intervals"]:
            if start > cursor:
                items.append({"start": _seconds(cursor), "end": _seconds(start), "text": ""})
                gaps += 1
            items.append({"start": _seconds(start), "end": _seconds(end), "text": text})
            cursor = max(cursor, end)
        if xmax > cursor:
            items.append({"start": _seconds(cursor), "end": _seconds(xmax), "text": ""})
            gaps += 1
        if gaps:
            # El relleno es lo que hace que el TextGrid exportado abra en Praat:
            # una capa tiene que cubrir su tramo entero. Se dice cuantas veces se
            # relleno, para que nadie confunda relleno con anotacion.
            report["notes"].append({"code": "gap-filled", "tier": tier["name"], "count": gaps})
        document_tiers.append({"name": tier["name"], "items": items})

    return json.dumps(
        {
            "xmin": 0.0,
            "xmax": _seconds(xmax),
            "tiers": document_tiers,
            "report": report,
        },
        ensure_ascii=False,
    )


def lingualab_build_eaf():
    with open(DOCUMENT_PATH, "r", encoding="utf-8") as handle:
        document = json.load(handle)

    report = _empty_report()
    eaf = Eaf(author="LinguaLab")

    # pympi crea una capa "default" vacia al construir un documento nuevo. Si se
    # queda, el .eaf exportado trae una capa que nadie escribio y que la persona
    # veria en ELAN como si fuera suya.
    eaf.tiers.pop("default", None)
    eaf.header["TIME_UNITS"] = "milliseconds"

    for tier in document["tiers"]:
        name = tier["name"]

        # Una capa de puntos no tiene equivalente: pympi rechaza una anotacion de
        # duracion cero, y darle un milisegundo inventaria un tiempo. Se omite y
        # se nombra.
        if tier["kind"] == "point":
            report["notes"].append(
                {"code": "point-tier-dropped", "tier": name, "count": len(tier["points"])}
            )
            continue

        try:
            eaf.add_tier(name, ling="default-lt")
        except ValueError:
            # ELAN no admite una capa sin nombre; el TextGrid si.
            report["notes"].append({"code": "tier-unwritable", "tier": name})
            continue

        empty = 0
        zero_length = 0
        rounded = 0
        for item in tier["items"]:
            start_ms = item["start"] * MILLISECONDS
            end_ms = item["end"] * MILLISECONDS
            start = int(round(start_ms))
            end = int(round(end_ms))
            if abs(start_ms - start) > 1e-9 or abs(end_ms - end) > 1e-9:
                rounded += 1
            if item["text"].strip() == "":
                # El relleno de silencio del TextGrid no es una anotacion de ELAN:
                # escribirla llenaria el archivo de anotaciones vacias.
                empty += 1
                continue
            if end <= start:
                zero_length += 1
                continue
            eaf.add_annotation(name, start, end, item["text"])

        if empty:
            report["notes"].append(
                {"code": "empty-intervals-dropped", "tier": name, "count": empty}
            )
        if zero_length:
            report["notes"].append(
                {"code": "zero-length-dropped", "tier": name, "count": zero_length}
            )
        if rounded:
            # ELAN guarda milisegundos enteros; un tiempo con mas precision se
            # redondea. Decirlo evita que alguien busque el milisegundo perdido.
            report["notes"].append({"code": "time-rounded", "tier": name, "count": rounded})

    return json.dumps({"text": to_string(eaf), "report": report}, ensure_ascii=False)
`;
