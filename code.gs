/**
 * DIEGO & LIZ - RSVP a Google Sheets
 * -------------------------------------------------------
 * Este script recibe las confirmaciones de asistencia enviadas
 * desde el formulario de la web (app.js) y las guarda en una
 * sola pestaña de Google Sheets llamada "RSVP".
 *
 * Columnas:
 * Fecha | Nombre | Apellido | Asistencia
 */

const NOMBRE_HOJA = "RSVP";
const ENCABEZADOS = ["Fecha", "Nombre", "Apellido", "Asistencia"];

function configurarEncabezados() {
  const hoja = obtenerHoja();
  hoja.getRange(1, 1, 1, ENCABEZADOS.length).setValues([ENCABEZADOS]);
  hoja.getRange(1, 1, 1, ENCABEZADOS.length).setFontWeight("bold");
  hoja.setFrozenRows(1);
  hoja.autoResizeColumns(1, ENCABEZADOS.length);
}

function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(NOMBRE_HOJA);
  }
  return hoja;
}

function doPost(e) {
  try {
    const hoja = obtenerHoja();
    const params = (e && e.parameter) || {};

    if (hoja.getLastRow() === 0) {
      configurarEncabezados();
    }

    const fecha = new Date();
    const nombre = (params.nombre || "").trim();
    const apellido = (params.apellido || "").trim();
    const asistencia = params.asistencia || "";

    hoja.appendRow([fecha, nombre, apellido, asistencia]);

    return ContentService
      .createTextOutput(JSON.stringify({ resultado: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ resultado: "error", mensaje: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ estado: "El script de RSVP está activo." }))
    .setMimeType(ContentService.MimeType.JSON);
}
