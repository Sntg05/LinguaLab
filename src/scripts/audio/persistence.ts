/* ============================================================
   LinguaLab — guardado del proyecto del visor en este navegador

   El documento se guarda solo, con un retardo corto despues de cada edicion, en
   IndexedDB. Si IndexedDB no esta, el guardado degrada a memoria y la pagina lo
   dice; si lo guardado no se puede leer, el autoguardado se detiene en vez de
   pisarlo. Aqui tambien vive el control que enumera y borra los proyectos
   guardados.
   ============================================================ */

import {
  type AnnotationStorageError,
  createLoadAnnotationProject,
  createSaveAnnotationProject,
  startAnnotationHistory,
} from "@lingualab/core";
import {
  createIndexedDbAnnotationStorage,
  type AnnotationPersistenceReason,
} from "./annotation-storage";
import { format } from "./strings";
import { AUTOSAVE_DELAY_MS } from "./viewer-rules";
import { currentDocument, type ViewerContext } from "./viewer-state";

/**
 * Por que se degrada el guardado, en el idioma de la pagina.
 *
 * Es una tabla y no una cadena de ternarios: la version anidada tenia tres
 * niveles y una de las ramas quedaba a dos pantallas de su condicion.
 */
const describeReason = (reason: AnnotationPersistenceReason | undefined): string => {
  if (reason === "quota-exceeded") {
    return document.documentElement.lang === "en"
      ? "The browser ran out of space."
      : "Se agoto el espacio del navegador.";
  }
  if (reason === "open-failed") {
    return document.documentElement.lang === "en"
      ? "IndexedDB could not be opened: private mode or browser policy."
      : "IndexedDB no se pudo abrir: modo privado o politica del navegador.";
  }
  return document.documentElement.lang === "en"
    ? "This browser does not offer IndexedDB."
    : "Este navegador no ofrece IndexedDB.";
};

export interface ProjectPersistence {
  /** Programa un guardado; no hace nada si hay un registro ilegible. */
  scheduleAutosave(): void;
  saveNow(): Promise<void>;
  /** Dice si lo guardado llega a IndexedDB o solo vive en memoria. */
  updatePersistence(): void;
  /** Recalcula cuantos proyectos hay guardados. */
  refreshProjects(): Promise<void>;
  /**
   * Abre el proyecto guardado con el nombre del campo, si lo hay.
   *
   * `onRestored` se llama solo cuando habia un documento y se cargo.
   */
  restoreSavedProject(onRestored: () => void): Promise<void>;
}

export const createProjectPersistence = (ctx: ViewerContext): ProjectPersistence => {
  const { el, state, strings, say, announce } = ctx;
  let autosaveTimer = 0;

  const storage = createIndexedDbAnnotationStorage();
  const saveProject = createSaveAnnotationProject({
    storage,
    clock: { now: () => new Date() },
  });
  const loadProject = createLoadAnnotationProject({ storage });

  const updatePersistence = (): void => {
    const note = el.persistenceNote;
    if (note === null) {
      return;
    }
    const status = storage.status();
    if (status.backend === "indexeddb") {
      note.textContent = strings.text("audio.persist.indexeddb");
      note.dataset.state = "ok";
      return;
    }
    note.textContent = `${strings.text("audio.persist.memory")} ${describeReason(status.reason)}`;
    note.dataset.state = "warn";
  };

  /**
   * Por que no se pudo leer lo guardado, en el idioma de la pagina.
   *
   * Se traducen los dos codigos que importan —forma invalida y version
   * desconocida— y no el `detail` del nucleo: quien lee esto no necesita el
   * texto tecnico, necesita saber si el problema es suyo o del sitio.
   */
  const describeRecordFault = (error: AnnotationStorageError): string => {
    if (error.code === "unsupported-schema-version") {
      return format(strings.text("audio.record.version"), {
        version: error.version,
        supported: error.supportedVersion,
      });
    }
    if (error.code === "invalid-record") {
      return strings.text("audio.record.invalid");
    }
    return error.detail ?? error.code;
  };

  const announceRecordFault = (): void => {
    if (state.recordFault === null) {
      return;
    }
    announce(
      format(strings.text("audio.error.record"), {
        reason: describeRecordFault(state.recordFault),
      }),
    );
  };

  /**
   * Cuantos proyectos hay guardados y si se pueden borrar.
   *
   * Se recalcula en vez de llevar una cuenta: la fuente de verdad es la base,
   * y una cuenta propia se desincroniza en cuanto otra pestana escribe.
   */
  const refreshProjects = async (): Promise<void> => {
    const listed = await storage.list();
    const count = listed.ok ? listed.value.length : 0;
    if (el.projectsCount !== null) {
      el.projectsCount.textContent = format(strings.text("audio.projects.count"), { count });
    }
    if (el.projectsClearButton !== null) {
      el.projectsClearButton.disabled = count === 0;
    }
    if (el.projectsConfirmText !== null) {
      el.projectsConfirmText.textContent = format(strings.text("audio.projects.confirm"), {
        count,
      });
    }
  };

  const saveNow = async (): Promise<void> => {
    if (state.recordFault !== null) {
      announceRecordFault();
      return;
    }
    const projectId = el.projectInput?.value.trim() ?? "";
    if (projectId === "") {
      announce(strings.text("audio.data.empty"));
      return;
    }
    const result = await saveProject(projectId, currentDocument(state));
    // La persistencia se mide TAMBIEN cuando el guardado falla: quedarse sin
    // cuota es justo el momento en que hay que decirlo, y esperar al proximo
    // guardado exitoso es esperar a uno que puede no llegar nunca.
    updatePersistence();
    if (result.ok) {
      const time = result.value.savedAt.toLocaleTimeString();
      announce(format(strings.text("audio.data.saved"), { time }));
      void refreshProjects();
      return;
    }
    announce(result.error.detail ?? result.error.code);
  };

  const scheduleAutosave = (): void => {
    if (el.projectInput === null) {
      return;
    }
    if (state.recordFault !== null) {
      // No se guarda encima de un registro que no se pudo leer.
      return;
    }
    announce(strings.text("audio.data.saving"));
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      void saveNow();
    }, AUTOSAVE_DELAY_MS);
  };

  /**
   * Borra los proyectos guardados en este navegador, tras la confirmacion.
   *
   * `list` y `remove` estaban en el puerto y nadie los llamaba: no habia forma
   * de liberar espacio desde la pagina, y la unica salida era borrar los datos
   * del navegador a mano. Se borra solo lo que `list` enumera —y no la base
   * entera— para que la operacion sea la que dice ser.
   */
  const clearSavedProjects = async (): Promise<void> => {
    const listed = await storage.list();
    if (!listed.ok) {
      announce(
        format(strings.text("audio.projects.clearFailed"), {
          detail: listed.error.detail ?? listed.error.code,
        }),
      );
      return;
    }

    let failure: string | null = null;
    for (const projectId of listed.value) {
      const removed = await storage.remove(projectId);
      if (!removed.ok) {
        failure = removed.error.detail ?? removed.error.code;
      }
    }

    // El registro ilegible ya no esta: el autoguardado puede volver.
    state.recordFault = null;
    if (el.projectsConfirm !== null) {
      el.projectsConfirm.hidden = true;
    }
    updatePersistence();
    await refreshProjects();
    say(strings.text("audio.projects.cleared"), "ok");
    if (failure !== null) {
      announce(format(strings.text("audio.projects.clearFailed"), { detail: failure }));
      return;
    }
    announce(strings.text("audio.projects.cleared"));
  };

  const restoreSavedProject = async (onRestored: () => void): Promise<void> => {
    const projectId = el.projectInput?.value.trim() ?? "";
    if (projectId === "") {
      return;
    }
    const restored = await loadProject(projectId);
    if (!restored.ok) {
      // Un registro que no se entiende NO se borra ni se pisa: se abre un
      // proyecto vacio, se dice por que y el autoguardado queda detenido hasta
      // que la persona exporte o borre a mano. Antes, este caso llegaba con la
      // forma de otro proyecto y rompia el render (`tiers` no existia).
      state.recordFault = restored.error;
      announceRecordFault();
      updatePersistence();
      return;
    }
    if (restored.value === null) {
      return;
    }
    state.history = startAnnotationHistory(restored.value);
    state.activeTier = 0;
    onRestored();
    announce(strings.text("audio.data.restored"));
  };

  el.projectsClearButton?.addEventListener("click", () => {
    // La confirmacion se pide en el propio control: dos botones con su texto, en
    // vez de un `window.confirm` que no se puede etiquetar ni leer en contexto.
    if (el.projectsConfirm !== null) {
      el.projectsConfirm.hidden = false;
    }
    if (el.projectsClearButton !== null) {
      el.projectsClearButton.disabled = true;
    }
    // El boton que tenia el foco acaba de quedar deshabilitado: sin mover el
    // foco, quien usa el teclado aterriza en el cuerpo del documento y tiene que
    // volver a tabular desde el principio.
    el.projectsConfirmButton?.focus();
  });

  el.projectsCancelButton?.addEventListener("click", () => {
    if (el.projectsConfirm !== null) {
      el.projectsConfirm.hidden = true;
    }
    el.projectsClearButton?.focus();
    void refreshProjects();
  });

  el.projectsConfirmButton?.addEventListener("click", () => {
    void clearSavedProjects();
  });

  el.projectInput?.addEventListener("change", () => {
    void saveNow();
  });

  return { scheduleAutosave, saveNow, updatePersistence, refreshProjects, restoreSavedProject };
};
