// DIEGO & LIZ - SISTEMA RSVP Y GENERADOR DE WHATSAPP
// Hoja 1 ("Invitaciones y WhatsApp"): Nombre y Apellido | Cantidad de Personas | Teléfono (Opcional) | Enlace para WhatsApp
// Hoja 2 ("Confirmaciones"): Nombre y Apellido | Asistencia

const SPREADSHEET_ID = "18OaB28TvK-y3j8D5SBJfmrJUcC-5lxMGJ_Rbkgnx5OQ";
const NOMBRE_HOJA_ENVIOS = "Invitaciones y WhatsApp";
const NOMBRE_HOJA_CONFIRMACIONES = "Confirmaciones";
const URL_WEB_BODA = "https://boda-diego-liz-2026.web.app";

function formulaWhatsAppFila(f) {
  const limpio = 'SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(TO_TEXT(C' + f + ');"+";"");"-";"");" ";"");"(";"");")";"")';
  return (
    '=IF(OR(ISBLANK(A' + f + '); ISBLANK(B' + f + ')); ""; HYPERLINK(' +
    'IF(ISBLANK(C' + f + '); "https://api.whatsapp.com/send?text="; "https://wa.me/" & ' +
    'IF(LEFT(' + limpio + ';2)="09"; "595" & MID(' + limpio + ';2;20); ' +
    'IF(AND(LEFT(' + limpio + ';1)="9"; LEN(' + limpio + ')=9); "595" & ' + limpio + '; ' + limpio + ')) & "?text=") & ' +
    'ENCODEURL("¡Hola *" & TRIM(A' + f + ') & "*! ✨🤍" & CHAR(10) & CHAR(10) & ' +
    '"Con mucha alegría e ilusión queremos invitarte a celebrar nuestra boda. Dios y la vida nos han bendecido con este amor, y será un honor inmenso compartir este día tan especial." & CHAR(10) & CHAR(10) & ' +
    'IF(VALUE(B' + f + ')=1; "Hemos reservado *1 lugar* con mucho cariño para vos."; "Hemos reservado *" & TRIM(TO_TEXT(B' + f + ')) & " lugares* con mucho cariño para vos.") & CHAR(10) & CHAR(10) & ' +
    '"Te compartimos nuestra invitación digital con todos los detalles de la ceremonia, horario y ubicación:" & CHAR(10) & ' +
    '"' + URL_WEB_BODA + '" & CHAR(10) & CHAR(10) & ' +
    '"Por favor, confirmá tu asistencia desde la misma página web." & CHAR(10) & CHAR(10) & ' +
    '"¡Te esperamos con los brazos abiertos para celebrar juntos! 🥂💍" & CHAR(10) & CHAR(10) & ' +
    '"Con todo nuestro cariño," & CHAR(10) & "*Diego & Liz*"); "📲 Enviar por WhatsApp"))'
  );
}

// Si alguien borra una fila entera con Supr y vuelve a cargar datos en A-C, restaura la fórmula en D
function onEdit(e) {
  if (!e || !e.range) return;
  const hoja = e.range.getSheet();
  if (!hoja || hoja.getName() !== NOMBRE_HOJA_ENVIOS) return;

  const filaInicio = Math.max(2, e.range.getRow());
  const filaFin = e.range.getLastRow();
  if (e.range.getColumn() > 4) return;

  for (let f = filaInicio; f <= filaFin; f++) {
    const celdaD = hoja.getRange(f, 4);
    if (!celdaD.getFormula()) {
      celdaD.setFormula(formulaWhatsAppFila(f));
    }
  }
}

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
    let hoja =
      libro.getSheetByName(NOMBRE_HOJA_CONFIRMACIONES) ||
      libro.getSheetByName("RSVP") ||
      libro.getSheets()[1];
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
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ estado: "El script de RSVP esta activo." }))
    .setMimeType(ContentService.MimeType.JSON);
}
