/**
 * DIEGO & LIZ - SISTEMA RSVP Y GENERADOR DE WHATSAPP (UNIFICADO Y VALIDADO)
 * =========================================================================
 * Este script administra:
 *   1. La recepcion de confirmaciones validadas desde la web (pestana "RSVP"):
 *      Columnas: Nombre y Apellido | Asistencia | Fecha de Confirmación
 *      - Bloquea numeros, signos raros o inyeccion de formulas.
 *      - Normaliza mayusculas/minusculas (ej: "juan pérez" -> "Juan Pérez").
 *      - Evita duplicados si la misma persona confirma dos veces.
 *
 *   2. El panel de envios y control en vivo (pestana "Invitaciones y WhatsApp"):
 *      - Columnas A-E: Tu lista para enviar por WhatsApp con validacion de datos.
 *      - Columnas G-H: Espejo automatico en vivo de los nombres tal cual los
 *        ingresaron los invitados en la web y su respuesta.
 */

const SPREADSHEET_ID = "18OaB28TvK-y3j8D5SBJfmrJUcC-5lxMGJ_Rbkgnx5OQ";
const NOMBRE_HOJA_RSVP = "RSVP";
const NOMBRE_HOJA_ENVIOS = "Invitaciones y WhatsApp";

function obtenerLibro() {
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
}

/** Limpia cualquier numero o simbolo raro y deja solo letras y espacios simples */
function limpiarSoloLetras(valor) {
  return String(valor || "")
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Formatea en Title Case ("juan carlos pérez" -> "Juan Carlos Pérez") */
function formatearNombrePropio(valor) {
  const limpio = limpiarSoloLetras(valor);
  if (!limpio) return "";
  return limpio
    .toLowerCase()
    .replace(/(^|\s)([a-záéíóúñü])/g, function (_, sep, letra) {
      return sep + letra.toUpperCase();
    });
}

function normalizarAsistencia(valor) {
  const texto = String(valor || "").trim();
  if (/^s[ií]/i.test(texto)) return "Sí, ¡allí estaré!";
  if (/^no/i.test(texto)) return "No podré acompañarlos";
  return "";
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const libro = obtenerLibro();
    let hoja = libro.getSheetByName(NOMBRE_HOJA_RSVP);
    if (!hoja) {
      hoja = libro.insertSheet(NOMBRE_HOJA_RSVP);
      hoja.getRange(1, 1, 1, 3).setValues([["Nombre y Apellido", "Asistencia", "Fecha de Confirmación"]]);
    }

    const params = (e && e.parameter) || {};
    const nombreBruto = [params.nombre || "", params.apellido || ""].join(" ");
    const nombreCompleto = formatearNombrePropio(nombreBruto);
    const asistencia = normalizarAsistencia(params.asistencia);

    // Validacion estricta en servidor: al menos Nombre y Apellido (minimo 4 letras y un espacio)
    if (!nombreCompleto || nombreCompleto.length < 4 || nombreCompleto.indexOf(" ") === -1) {
      throw new Error("Nombre y apellido inválidos. Solo se permiten letras y espacios.");
    }

    if (!asistencia) {
      throw new Error("Opción de asistencia inválida.");
    }

    const fecha = Utilities.formatDate(new Date(), "America/Asuncion", "dd/MM/yyyy HH:mm");

    // Busca si ya respondio (evita duplicados comparando en minusculas)
    const ultima = hoja.getLastRow();
    let filaExistente = -1;
    if (ultima > 1) {
      const datos = hoja.getRange(2, 1, ultima - 1, 1).getValues();
      const claveNueva = nombreCompleto.toLowerCase();
      for (let i = 0; i < datos.length; i++) {
        const existente = limpiarSoloLetras(datos[i][0]).toLowerCase();
        if (existente && existente === claveNueva) {
          filaExistente = i + 2;
          break;
        }
      }
    }

    if (filaExistente === -1) {
      // Buscar la primera fila vacia en la columna A (para no empujar debajo del cuadro de resumen E1:F4)
      let filaDestino = 2;
      if (ultima >= 2) {
        const colA = hoja.getRange(2, 1, ultima - 1, 1).getValues();
        filaDestino = ultima + 1;
        for (let i = 0; i < colA.length; i++) {
          if (!String(colA[i][0] || "").trim()) {
            filaDestino = i + 2;
            break;
          }
        }
      }
      hoja.getRange(filaDestino, 1, 1, 3).setValues([[nombreCompleto, asistencia, fecha]]);
    } else {
      hoja.getRange(filaExistente, 2, 1, 2).setValues([[asistencia, fecha]]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ resultado: "ok", nombre: nombreCompleto, asistencia: asistencia }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ resultado: "error", mensaje: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ estado: "El script de RSVP y generador de WhatsApp esta activo." }))
    .setMimeType(ContentService.MimeType.JSON);
}
