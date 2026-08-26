/**
 * Cargo Security – Google-Sheets-Backend
 *
 * EINRICHTUNG (5 Minuten):
 * 1. https://sheets.google.com öffnen → neue Tabelle „AWB-Sicherung“ anlegen
 * 2. Menü: Erweiterungen → Apps Script
 * 3. Diesen kompletten Code einfügen (alten Code ersetzen) → Speichern
 * 4. Bereitstellen → Neue Bereitstellung → Typ: „Web-App“
 *      Ausführen als: Ich
 *      Zugriff: Jeder
 * 5. Bereitstellen → Zugriff erlauben → die Web-App-URL kopieren
 * 6. URL in der App unter „Einstellungen“ eintragen → fertig
 *
 * Die App sendet jede AWB (und jeden Storno) an dieses Script.
 * Pro AWB gibt es genau eine Zeile; ein Storno aktualisiert die Zeile.
 */

const SHEET_NAME = 'AWB-Protokoll';
const HEADERS = ['ID', 'Zeit', 'AWB', 'Status', 'Bemerkung', 'Bearbeiter',
                 'Storno-Grund', 'Storno-Zeit', 'Storno von'];

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const sheet = getSheet();

  let targetRow = -1;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === d.id) { targetRow = i + 2; break; }
    }
  }

  const row = [
    d.id,
    d.time,
    d.awb,
    d.status,
    d.note || '',
    d.agent || '',
    d.stornoReason || '',
    d.stornoTime || '',
    d.stornoBy || ''
  ];

  if (targetRow > 0) sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'cargo-security-app' }))
    .setMimeType(ContentService.MimeType.JSON);
}
