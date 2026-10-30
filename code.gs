/**
 * DIEGO & LIZ - RSVP a Google Sheets
 * -------------------------------------------------------
 * Recibe las confirmaciones desde el formulario de la web (app.js)
 * y las guarda en la pestana "RSVP" de la hoja de calculo.
 *
 * Columnas (tabla minima):
 *   Nombre | Apellido | Asistencia
 *
 * Si la misma persona (mismo nombre y apellido) vuelve a responder,
 * se ACTUALIZA su fila en vez de duplicarla.
 *
 * Uso:
 *   1. Pega este codigo en Extensiones > Apps Script de tu hoja.
 *   2. Ejecuta una vez la funcion "configurarHoja" (autoriza los permisos).
 *   3. Implementar > Nueva implementacion > Aplicacion web
 *      (Ejecutar como: Yo | Acceso: Cualquier usuario) y copia la URL /exec en app.js.
 */

const NOMBRE_HOJA = "RSVP";
const ENCABEZADOS = ["Nombre", "Apellido", "Asistencia"];

/** Crea la pestana, los encabezados y deja la tabla con formato limpio. */
function configurarHoja() {
  const hoja = obtenerHoja();
  const cols = ENCABEZADOS.length;

  hoja.getRange(1, 1, 1, cols)
    .setValues([ENCABEZADOS])
    .setFontWeight("bold")
    .setFontColor("#FFFFFF")
    .setBackground("#324D3E")
    .setHorizontalAlignment("center");

  hoja.setFrozenRows(1);
  hoja.setColumnWidth(1, 170);
  hoja.setColumnWidth(2, 170);
  hoja.setColumnWidth(3, 190);

  // Filtro para ordenar/filtrar por columna
  if (!hoja.getFilter()) {
    hoja.getRange(1, 1, Math.max(hoja.getMaxRows(), 2), cols).createFilter();
  }

  // Formato condicional: verde si asiste, rojo suave si no
  hoja.clearConditionalFormatRules();
  const rango = hoja.getRange(2, 3, Math.max(hoja.getMaxRows() - 1, 1), 1);
  hoja.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextStartsWith("Sí")
      .setBackground("#DDE6DA")
      .setRanges([rango])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextStartsWith("No")
      .setBackground("#F2D9D5")
      .setRanges([rango])
      .build(),
  ]);
}

function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(NOMBRE_HOJA);
  if (!hoja) hoja = libro.insertSheet(NOMBRE_HOJA);
  return hoja;
}

function normalizar(valor) {
  return String(valor || "").trim().replace(/\s+/g, " ");
}

function clave(nombre, apellido) {
  return (nombre + "|" + apellido).toLowerCase();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const hoja = obtenerHoja();
    if (hoja.getLastRow() === 0) configurarHoja();

    const params = (e && e.parameter) || {};
    const nombre = normalizar(params.nombre);
    const apellido = normalizar(params.apellido);
    const asistencia = normalizar(params.asistencia);

    if (!nombre || !apellido) {
      throw new Error("Faltan nombre o apellido.");
    }

    // Busca si ya respondio (evita duplicados)
    const ultima = hoja.getLastRow();
    let fila = -1;
    if (ultima > 1) {
      const datos = hoja.getRange(2, 1, ultima - 1, 2).getValues();
      for (let i = 0; i < datos.length; i++) {
        if (clave(normalizar(datos[i][0]), normalizar(datos[i][1])) === clave(nombre, apellido)) {
          fila = i + 2;
          break;
        }
      }
    }

    if (fila === -1) {
      hoja.appendRow([nombre, apellido, asistencia]);
    } else {
      hoja.getRange(fila, 3).setValue(asistencia);
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
