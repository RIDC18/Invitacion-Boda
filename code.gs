/**
 * DIEGO & LIZ - SISTEMA RSVP Y GENERADOR DE WHATSAPP
 * =======================================================
 * Este script administra:
 *   1. La recepcion de confirmaciones limpias desde la web (pestana "RSVP").
 *      Columnas: Nombre | Apellido | Asistencia
 *
 *   2. El panel de la novia (pestana "Invitaciones y WhatsApp").
 *      La novia anota el nombre, telefono y cantidad de lugares reservados.
 *      La hoja genera un enlace "📲 Enviar por WhatsApp" con un texto calido,
 *      elegante y emotivo listo para enviar por WhatsApp.
 *
 * INSTRUCCIONES:
 *   1. Abre tu hoja en Google Sheets.
 *   2. Ve a Extensiones > Apps Script y pega este codigo reemplazando todo.
 *   3. En el selector de funciones (arriba), elige "configurarHoja" y haz clic en "Ejecutar" (acepta los permisos).
 *   4. Haz clic en "Implementar" > "Nueva implementacion":
 *      - Tipo: Aplicacion web
 *      - Ejecutar como: Yo
 *      - Quien tiene acceso: Cualquier usuario (Anyone)
 *   5. Copia la URL que termina en "/exec" y pegala en app.js (const RSVP_SCRIPT_URL).
 */

const SPREADSHEET_ID = "18OaB28TvK-y3j8D5SBJfmrJUcC-5lxMGJ_Rbkgnx5OQ";
const NOMBRE_HOJA_RSVP = "RSVP";
const NOMBRE_HOJA_ENVIOS = "Invitaciones y WhatsApp";
const URL_BASE_DEFAULT = "https://boda-diego-liz-2026.web.app";

function obtenerLibro() {
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
}

const ENCABEZADOS_RSVP = ["Nombre", "Apellido", "Asistencia"];

const ENCABEZADOS_ENVIOS = [
  "Invitado / Familia",
  "Teléfono (WhatsApp)",
  "Lugares Reservados",
  "Enviar Invitación por WhatsApp",
  "Estado de Confirmación"
];

/** Crea y formatea ambas pestanas con sus formulas y filtros listos. */
function configurarHoja() {
  const libro = obtenerLibro();

  // 1. Configurar Pestana RSVP (lo mas limpia posible: Nombre | Apellido | Asistencia)
  let hojaRsvp = libro.getSheetByName(NOMBRE_HOJA_RSVP);
  if (!hojaRsvp) hojaRsvp = libro.insertSheet(NOMBRE_HOJA_RSVP, 0);

  const colsRsvp = ENCABEZADOS_RSVP.length;
  hojaRsvp.getRange(1, 1, 1, colsRsvp)
    .setValues([ENCABEZADOS_RSVP])
    .setFontWeight("bold")
    .setFontColor("#FFFFFF")
    .setBackground("#324D3E")
    .setHorizontalAlignment("center");

  hojaRsvp.setFrozenRows(1);
  hojaRsvp.setColumnWidth(1, 180); // Nombre
  hojaRsvp.setColumnWidth(2, 180); // Apellido
  hojaRsvp.setColumnWidth(3, 200); // Asistencia

  if (!hojaRsvp.getFilter()) {
    hojaRsvp.getRange(1, 1, Math.max(hojaRsvp.getMaxRows(), 2), colsRsvp).createFilter();
  }

  // Formato condicional en RSVP: verde si asiste, rojo suave si no
  hojaRsvp.clearConditionalFormatRules();
  const rangoRsvp = hojaRsvp.getRange(2, 3, Math.max(hojaRsvp.getMaxRows() - 1, 1), 1);
  hojaRsvp.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextStartsWith("Sí")
      .setBackground("#DDE6DA")
      .setFontColor("#263F32")
      .setRanges([rangoRsvp])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextStartsWith("No")
      .setBackground("#F2D9D5")
      .setFontColor("#7A2922")
      .setRanges([rangoRsvp])
      .build(),
  ]);

  // 2. Configurar Pestana Invitaciones y WhatsApp
  let hojaEnvios = libro.getSheetByName(NOMBRE_HOJA_ENVIOS);
  if (!hojaEnvios) hojaEnvios = libro.insertSheet(NOMBRE_HOJA_ENVIOS, 1);

  const colsEnvios = ENCABEZADOS_ENVIOS.length;
  hojaEnvios.getRange(1, 1, 1, colsEnvios)
    .setValues([ENCABEZADOS_ENVIOS])
    .setFontWeight("bold")
    .setFontColor("#FFFFFF")
    .setBackground("#324D3E")
    .setHorizontalAlignment("center");

  hojaEnvios.setFrozenRows(1);
  hojaEnvios.setColumnWidth(1, 220); // Invitado / Familia
  hojaEnvios.setColumnWidth(2, 170); // Telefono
  hojaEnvios.setColumnWidth(3, 140); // Lugares Reservados
  hojaEnvios.setColumnWidth(4, 240); // Enviar Invitacion por WhatsApp
  hojaEnvios.setColumnWidth(5, 170); // Estado de Confirmacion

  // Celda de URL de la invitacion (G1 y G2)
  hojaEnvios.getRange("G1").setValue("ENLACE DE LA INVITACIÓN (WEB):").setFontWeight("bold").setFontColor("#324D3E");
  if (!hojaEnvios.getRange("G2").getValue()) {
    hojaEnvios.getRange("G2").setValue(URL_BASE_DEFAULT);
  }
  hojaEnvios.setColumnWidth(7, 290);

  // Colocar formulas automaticas para las primeras 150 filas
  const cantFilas = 150;
  for (let r = 2; r <= cantFilas; r++) {
    const cleanPhone = `SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(TO_TEXT(B${r});"+";"");"-";"");" ";"");"(";"");")";"")`;
    const intlPhone =
      `IF(LEFT(${cleanPhone};2)="09"; "595" & MID(${cleanPhone};2;20); ` +
      `IF(AND(LEFT(${cleanPhone};1)="9"; LEN(${cleanPhone})=9); "595" & ${cleanPhone}; ${cleanPhone}))`;

    const textoLugares =
      `IF(OR(ISBLANK(C${r}); C${r}<=1); ` +
      `"Hemos reservado *1 lugar* con mucho cariño para vos."; ` +
      `"Hemos reservado *" & C${r} & " lugares* con mucho cariño para vos y tu familia.")`;

    // Columna D: Enlace de WhatsApp con el texto carinoso formateado
    const formulaWhatsApp =
      `=IF(OR(ISBLANK(A${r}); ISBLANK(B${r})); ""; HYPERLINK("https://wa.me/" & ${intlPhone} & ` +
      `"?text=" & ENCODEURL(` +
      `"¡Hola *" & TRIM(A${r}) & "*! ✨🤍" & CHAR(10) & CHAR(10) & ` +
      `"Con mucha alegría e ilusión queremos invitarte a celebrar nuestra boda. Dios y la vida nos han bendecido con este amor, y será un honor inmenso compartir este día tan especial con vos." & CHAR(10) & CHAR(10) & ` +
      `${textoLugares} & CHAR(10) & CHAR(10) & ` +
      `"Te compartimos nuestra invitación digital con todos los detalles de la ceremonia, horario y ubicación:" & CHAR(10) & ` +
      `$G$2 & CHAR(10) & CHAR(10) & ` +
      `"Por favor, confirmá tu asistencia desde la misma página web." & CHAR(10) & CHAR(10) & ` +
      `"¡Te esperamos con los brazos abiertos para celebrar juntos! 🥂💍" & CHAR(10) & CHAR(10) & ` +
      `"Con todo nuestro cariño," & CHAR(10) & ` +
      `"*Diego & Liz*"` +
      `); "📲 Enviar por WhatsApp"))`;

    hojaEnvios.getRange(r, 4).setFormula(formulaWhatsApp);

    // Columna E: Estado de Confirmacion en tiempo real (busca en RSVP)
    const formulaEstado =
      `=IF(ISBLANK(A${r}); ""; ` +
      `IFERROR(VLOOKUP(TRIM(A${r}); RSVP!A:C; 3; FALSE); ` +
      `IFERROR(VLOOKUP(TRIM(LEFT(SUBSTITUTE(TRIM(A${r});" ";REPT(" ";50));50)); RSVP!A:C; 3; FALSE); ` +
      `IFERROR(VLOOKUP(TRIM(RIGHT(SUBSTITUTE(TRIM(A${r});" ";REPT(" ";50));50)); RSVP!B:C; 2; FALSE); "⏳ Pendiente"))))`;

    hojaEnvios.getRange(r, 5).setFormula(formulaEstado);
  }

  // Formato condicional en Generador (Estado de Confirmacion)
  hojaEnvios.clearConditionalFormatRules();
  const rangoEstado = hojaEnvios.getRange(2, 5, cantFilas, 1);
  hojaEnvios.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextStartsWith("Sí")
      .setBackground("#DDE6DA")
      .setFontColor("#263F32")
      .setRanges([rangoEstado])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextStartsWith("No")
      .setBackground("#F2D9D5")
      .setFontColor("#7A2922")
      .setRanges([rangoEstado])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains("Pendiente")
      .setBackground("#FFF3CD")
      .setFontColor("#856404")
      .setRanges([rangoEstado])
      .build(),
  ]);

  SpreadsheetApp.flush();
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

    const libro = obtenerLibro();
    let hoja = libro.getSheetByName(NOMBRE_HOJA_RSVP);
    if (!hoja) {
      configurarHoja();
      hoja = libro.getSheetByName(NOMBRE_HOJA_RSVP);
    }

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
    .createTextOutput(JSON.stringify({ estado: "El script de RSVP y generador de WhatsApp esta activo." }))
    .setMimeType(ContentService.MimeType.JSON);
}
