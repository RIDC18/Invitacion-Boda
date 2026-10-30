/**
 * DIEGO & LIZ - SISTEMA RSVP Y GENERADOR DE INVITACIONES
 * =======================================================
 * Este script administra la recepcion de confirmaciones desde la web
 * y el panel de generacion de invitaciones personalizadas con envio
 * directo a WhatsApp para la novia.
 *
 * Pestanas configuradas:
 *   1. "RSVP": Respuestas recibidas en tiempo real.
 *      Columnas: Nombre | Apellido | Asistencia | Lugares Asignados | Lugares Confirmados
 *
 *   2. "Generador de Invitaciones": Panel de la novia.
 *      Columnas: Nombre / Familia | Telefono | Lugares | Enlace Web | Enviar WhatsApp | Estado RSVP | Confirmados
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

const NOMBRE_HOJA_RSVP = "RSVP";
const NOMBRE_HOJA_GENERADOR = "Generador de Invitaciones";
const URL_BASE_DEFAULT = "https://boda-diego-liz-2026.web.app";

const ENCABEZADOS_RSVP = [
  "Nombre",
  "Apellido",
  "Asistencia",
  "Lugares Asignados",
  "Lugares Confirmados"
];

const ENCABEZADOS_GENERADOR = [
  "Nombre / Familia",
  "Telefono (WhatsApp)",
  "Lugares",
  "Enlace de Invitacion",
  "Enviar por WhatsApp",
  "Estado RSVP",
  "Confirmados"
];

/** Crea y formatea ambas pestanas con sus formulas y filtros listos. */
function configurarHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Configurar Pestana RSVP
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
  hojaRsvp.setColumnWidth(1, 160); // Nombre
  hojaRsvp.setColumnWidth(2, 160); // Apellido
  hojaRsvp.setColumnWidth(3, 190); // Asistencia
  hojaRsvp.setColumnWidth(4, 150); // Lugares Asignados
  hojaRsvp.setColumnWidth(5, 160); // Lugares Confirmados

  if (!hojaRsvp.getFilter()) {
    hojaRsvp.getRange(1, 1, Math.max(hojaRsvp.getMaxRows(), 2), colsRsvp).createFilter();
  }

  // Formato condicional en RSVP
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

  // 2. Configurar Pestana Generador de Invitaciones
  let hojaGen = libro.getSheetByName(NOMBRE_HOJA_GENERADOR);
  if (!hojaGen) hojaGen = libro.insertSheet(NOMBRE_HOJA_GENERADOR, 1);

  const colsGen = ENCABEZADOS_GENERADOR.length;
  hojaGen.getRange(1, 1, 1, colsGen)
    .setValues([ENCABEZADOS_GENERADOR])
    .setFontWeight("bold")
    .setFontColor("#FFFFFF")
    .setBackground("#324D3E")
    .setHorizontalAlignment("center");

  hojaGen.setFrozenRows(1);
  hojaGen.setColumnWidth(1, 200); // Nombre / Familia
  hojaGen.setColumnWidth(2, 170); // Telefono
  hojaGen.setColumnWidth(3, 90);  // Lugares
  hojaGen.setColumnWidth(4, 260); // Enlace
  hojaGen.setColumnWidth(5, 190); // WhatsApp
  hojaGen.setColumnWidth(6, 160); // Estado RSVP
  hojaGen.setColumnWidth(7, 120); // Confirmados

  // Configurar celda de URL Base en I1 e I2
  hojaGen.getRange("I1").setValue("URL BASE DE LA WEB").setFontWeight("bold").setFontColor("#324D3E");
  if (!hojaGen.getRange("I2").getValue()) {
    hojaGen.getRange("I2").setValue(URL_BASE_DEFAULT);
  }
  hojaGen.setColumnWidth(9, 280);

  // Colocar formulas automaticas en las primeras 60 filas
  const cantFilas = 60;
  for (let r = 2; r <= cantFilas + 1; r++) {
    // Columna D: Enlace de Invitacion
    hojaGen.getRange(r, 4).setFormula(
      `=IF(ISBLANK(A${r}), "", $I$2 & "/?invitado=" & ENCODEURL(A${r}) & "&cupos=" & IF(ISBLANK(C${r}), 1, C${r}))`
    );

    // Columna E: Boton WhatsApp
    hojaGen.getRange(r, 5).setFormula(
      `=IF(OR(ISBLANK(A${r}), ISBLANK(B${r})), "", HYPERLINK("https://wa.me/" & SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(TO_TEXT(B${r}),"+",""),"-","")," ",""),"(","") & "?text=" & ENCODEURL("¡Hola " & A${r} & "! ❤️ Con mucha alegría te invitamos a celebrar nuestra boda. Preparamos una invitación especial para ustedes con " & IF(ISBLANK(C${r}),1,C${r}) & IF(IF(ISBLANK(C${r}),1,C${r})=1," lugar reservado: "," lugares reservados: ") & D${r} & " Te esperamos con mucho cariño, Diego & Liz."), "📲 Enviar WhatsApp"))`
    );

    // Columna F: Estado RSVP (busca por Nombre o Apellido en RSVP)
    hojaGen.getRange(r, 6).setFormula(
      `=IF(ISBLANK(A${r}), "", IFERROR(VLOOKUP(A${r}, RSVP!A:E, 3, FALSE), IFERROR(VLOOKUP(TRIM(RIGHT(SUBSTITUTE(A${r}," ",REPT(" ",50)),50)), RSVP!B:E, 2, FALSE), "⏳ Pendiente")))`
    );

    // Columna G: Confirmados
    hojaGen.getRange(r, 7).setFormula(
      `=IF(ISBLANK(A${r}), "", IFERROR(VLOOKUP(A${r}, RSVP!A:E, 5, FALSE), IFERROR(VLOOKUP(TRIM(RIGHT(SUBSTITUTE(A${r}," ",REPT(" ",50)),50)), RSVP!B:E, 4, FALSE), "-")))`
    );
  }

  // Formato condicional en Generador (Estado RSVP)
  hojaGen.clearConditionalFormatRules();
  const rangoGen = hojaGen.getRange(2, 6, cantFilas, 1);
  hojaGen.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextStartsWith("Sí")
      .setBackground("#DDE6DA")
      .setFontColor("#263F32")
      .setRanges([rangoGen])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextStartsWith("No")
      .setBackground("#F2D9D5")
      .setFontColor("#7A2922")
      .setRanges([rangoGen])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains("Pendiente")
      .setBackground("#FFF3CD")
      .setFontColor("#856404")
      .setRanges([rangoGen])
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

    const libro = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = libro.getSheetByName(NOMBRE_HOJA_RSVP);
    if (!hoja) {
      configurarHoja();
      hoja = libro.getSheetByName(NOMBRE_HOJA_RSVP);
    }

    const params = (e && e.parameter) || {};
    const nombre = normalizar(params.nombre);
    const apellido = normalizar(params.apellido);
    const asistencia = normalizar(params.asistencia);
    const cuposAsignados = parseInt(params.cupos_asignados || "1", 10) || 1;
    const cuposConfirmados = parseInt(params.cupos_confirmados || (asistencia.startsWith("No") ? "0" : "1"), 10);

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
      hoja.appendRow([nombre, apellido, asistencia, cuposAsignados, cuposConfirmados]);
    } else {
      hoja.getRange(fila, 3).setValue(asistencia);
      hoja.getRange(fila, 4).setValue(cuposAsignados);
      hoja.getRange(fila, 5).setValue(cuposConfirmados);
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
    .createTextOutput(JSON.stringify({ estado: "El script de RSVP y generador de invitaciones esta activo." }))
    .setMimeType(ContentService.MimeType.JSON);
}
