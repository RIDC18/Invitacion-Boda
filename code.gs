/**
 * DIEGO & LIZ - SISTEMA RSVP Y GENERADOR DE WHATSAPP
 * ==================================================
 * Hoja 1 ("Invitaciones y WhatsApp"):
 *   Nombre y Apellido | Cantidad de Personas | Enlace para WhatsApp
 *
 * Hoja 2 ("RSVP"):
 *   Nombre y Apellido | Asistencia
 */

const SPREADSHEET_ID = "18OaB28TvK-y3j8D5SBJfmrJUcC-5lxMGJ_Rbkgnx5OQ";
const NOMBRE_HOJA_RSVP = "RSVP";

function obtenerLibro() {
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
}

/** Deja solo letras y espacios simples */
function limpiarSoloLetras(valor) {
  return String(valor || "")
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Formatea en Title Case ("juan pérez" -> "Juan Pérez") */
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
      hoja.getRange(1, 1, 1, 2).setValues([["Nombre y Apellido", "Asistencia"]]);
    }

    const params = (e && e.parameter) || {};
    const nombre = formatearNombrePropio(params.nombre);
    const apellido = formatearNombrePropio(params.apellido);

    if (!nombre || nombre.length < 2 || !apellido || apellido.length < 2) {
      throw new Error("Faltan nombre o apellido válidos.");
    }

    const nombreCompleto = nombre + " " + apellido;
    const asistencia = normalizarAsistencia(params.asistencia);

    if (!asistencia) {
      throw new Error("Opción de asistencia inválida.");
    }

    // Evita duplicados si la misma persona envía dos veces
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
      hoja.appendRow([nombreCompleto, asistencia]);
    } else {
      hoja.getRange(filaExistente, 2).setValue(asistencia);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ resultado: "ok" }))
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
    .createTextOutput(JSON.stringify({ estado: "El script de RSVP esta activo." }))
    .setMimeType(ContentService.MimeType.JSON);
}
