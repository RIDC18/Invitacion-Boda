// =============================================================================
// DIEGO & LIZ — SISTEMA DE INVITACIONES Y CONFIRMACIÓN DE ASISTENCIA
// =============================================================================
// Hoja 1 ("Invitaciones y WhatsApp"):
//   Nombre y Apellido | Cantidad de Personas | Teléfono (Opcional) | Enlace para WhatsApp
//
// Hoja 2 ("Confirmaciones"):
//   Nombre y Apellido | Asistencia
// =============================================================================

const SPREADSHEET_ID = "1ETEM0oO6y_pI50QHHlFamLvkGtVjad6d7ubh384no3g";
const NOMBRE_HOJA_CONFIRMACIONES = "Confirmaciones";

function obtenerLibro() {
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Deja solo letras y espacios simples
function limpiarSoloLetras(valor) {
  const texto = String(valor || "");
  const normalizado = typeof texto.normalize === "function" ? texto.normalize("NFC") : texto;
  return normalizado
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

// Formatea en Title Case ("juan pérez" -> "Juan Pérez")
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
  if (/^(s[ií]|asistir)/i.test(texto)) return "Asistira";
  if (/^no/i.test(texto)) return "No asistira";
  return "";
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const libro = obtenerLibro();
    let hoja = libro.getSheetByName(NOMBRE_HOJA_CONFIRMACIONES);
    if (!hoja) {
      hoja = libro.insertSheet(NOMBRE_HOJA_CONFIRMACIONES);
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

    // Registra siempre cada confirmación en una fila nueva (no sobrescribe homónimos)
    hoja.appendRow([nombreCompleto, asistencia]);

    return ContentService
      .createTextOutput(JSON.stringify({ resultado: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ resultado: "error", mensaje: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ estado: "El script de Confirmaciones esta activo." }))
    .setMimeType(ContentService.MimeType.JSON);
}
