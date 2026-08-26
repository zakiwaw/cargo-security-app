/* Cargo Security – AWB-Sicherung für die Cargo City
 * Lokale Speicherung + Sync zu Google Sheets (Apps Script Web-App)
 */

const LS_ENTRIES = 'cs_entries';
const LS_AGENT = 'cs_agent';
const LS_SHEET_URL = 'cs_sheet_url';

const STATUS = { SPX: 'SPX', SCO: 'SCO', NS: 'Nicht sicher' };

let entries = loadEntries();
let scanner = null;

const $ = id => document.getElementById(id);

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(LS_ENTRIES)) || []; }
  catch (e) { return []; }
}
function saveEntries() {
  localStorage.setItem(LS_ENTRIES, JSON.stringify(entries));
}
function uuid() {
  return (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtTime(iso) {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}
function displayStatus(e) {
  return e.storniert ? 'STORNIERT' : STATUS[e.status];
}
function showMsg(text, type) {
  const el = $('message');
  el.textContent = text;
  el.className = 'message ' + type;
}

/* ---------- Erfassen ---------- */
function addEntry() {
  const awb = $('awbInput').value.trim();
  if (!awb) { showMsg('Bitte eine AWB-Nummer eingeben oder scannen.', 'error'); return; }

  const dup = entries.find(e => !e.storniert && e.awb.toLowerCase() === awb.toLowerCase());
  if (dup) {
    showMsg('⚠️ AWB „' + awb + '" ist bereits erfasst (' + fmtTime(dup.time) +
      ', ' + (dup.agent || '–') + '). Doppelte Erfassung blockiert.', 'error');
    return;
  }

  const entry = {
    id: uuid(),
    awb: awb,
    status: $('statusInput').value,
    note: $('noteInput').value.trim(),
    agent: $('agentInput').value.trim(),
    time: new Date().toISOString(),
    storniert: false,
    stornoReason: '',
    stornoTime: '',
    stornoBy: '',
    synced: false
  };
  entries.unshift(entry);
  localStorage.setItem(LS_AGENT, entry.agent);
  saveEntries();
  render();

  $('awbInput').value = '';
  $('noteInput').value = '';
  showMsg('✅ AWB „' + awb + '" gespeichert (' + STATUS[entry.status] + ').', 'ok');
  syncNow();
}

/* ---------- Storno (kein Löschen – Protokoll bleibt lückenlos) ---------- */
function stornoEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e || e.storniert) return;
  const reason = prompt('Storno-Grund für AWB „' + e.awb + '" (Pflichtangabe):');
  if (reason === null) return;
  if (!reason.trim()) { alert('Ohne Grund ist kein Storno möglich.'); return; }
  e.storniert = true;
  e.stornoReason = reason.trim();
  e.stornoTime = new Date().toISOString();
  e.stornoBy = $('agentInput').value.trim() || localStorage.getItem(LS_AGENT) || '';
  e.synced = false;
  saveEntries();
  render();
  showMsg('↩️ AWB „' + e.awb + '" wurde storniert.', 'ok');
  syncNow();
}

/* ---------- Sync zu Google Sheets ---------- */
function pendingCount() {
  return entries.filter(e => !e.synced).length;
}

async function syncNow() {
  const url = localStorage.getItem(LS_SHEET_URL);
  updateSyncBadge();
  if (!url || !navigator.onLine || !pendingCount()) return;

  const pending = entries.filter(e => !e.synced);
  for (const e of pending) {
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          id: e.id,
          time: e.time,
          awb: e.awb,
          status: displayStatus(e),
          note: e.note,
          agent: e.agent,
          stornoReason: e.stornoReason,
          stornoTime: e.stornoTime,
          stornoBy: e.stornoBy
        })
      });
      e.synced = true;
    } catch (err) {
      /* bleibt in der Warteschlange, nächster Sync versucht es erneut */
    }
  }
  saveEntries();
  render();
}

function updateSyncBadge() {
  const el = $('syncBadge');
  if (!el) return;
  const url = localStorage.getItem(LS_SHEET_URL);
  const n = pendingCount();
  if (!url) {
    el.textContent = '⚠️ Google-Sheets-URL fehlt (siehe Einstellungen)';
    el.className = 'sync warn';
  } else if (!navigator.onLine) {
    el.textContent = '📴 Offline – ' + n + ' Einträge warten';
    el.className = 'sync off';
  } else if (n > 0) {
    el.textContent = '⏳ ' + n + ' Einträge warten auf Sync';
    el.className = 'sync off';
  } else {
    el.textContent = '☁️ Synchronisiert mit Google Sheets';
    el.className = 'sync ok';
  }
}

/* ---------- Anzeige ---------- */
function render() {
  const filter = $('searchInput').value.trim().toLowerCase();
  const tbody = $('entryTable');
  tbody.innerHTML = '';

  entries
    .filter(e => !filter ||
      (e.awb + ' ' + e.note + ' ' + e.agent + ' ' + e.stornoReason).toLowerCase().includes(filter))
    .forEach(e => {
      const tr = document.createElement('tr');
      if (e.storniert) tr.className = 'row-storno';

      const badge = e.storniert
        ? '<span class="badge storno">STORNIERT</span>'
        : '<span class="badge ' + e.status.toLowerCase() + '">' + STATUS[e.status] + '</span>';

      const stornoInfo = e.storniert
        ? '<div class="storno-info">↩️ ' + esc(e.stornoReason) +
          ' · ' + fmtTime(e.stornoTime) + (e.stornoBy ? ' · ' + esc(e.stornoBy) : '') + '</div>'
        : '';

      tr.innerHTML =
        '<td>' + fmtTime(e.time) + '</td>' +
        '<td class="awb">' + esc(e.awb) +
          (e.synced ? '' : ' <span title="Noch nicht synchronisiert">⏳</span>') + stornoInfo + '</td>' +
        '<td>' + badge + '</td>' +
        '<td>' + (esc(e.note) || '–') + '</td>' +
        '<td>' + (esc(e.agent) || '–') + '</td>' +
        '<td>' + (e.storniert ? '' : '<button class="stornoBtn" data-id="' + e.id + '">Storno</button>') + '</td>';
      tbody.appendChild(tr);
    });

  const active = entries.filter(e => !e.storniert);
  const today = new Date().toDateString();
  $('statHeute').textContent = active.filter(e => new Date(e.time).toDateString() === today).length;
  $('statGesamt').textContent = active.length;
  updateSyncBadge();
}

/* ---------- Kamera-Scanner (html5-qrcode) ---------- */
async function toggleScanner() {
  if (scanner) { await stopScanner(); return; }
  if (typeof Html5Qrcode === 'undefined') {
    showMsg('Scanner-Bibliothek nicht geladen (offline? Beim ersten Start Internet nötig).', 'error');
    return;
  }
  $('scanner').classList.remove('hidden');
  scanner = new Html5Qrcode('scanner');
  try {
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 140 } },
      text => { $('awbInput').value = String(text).trim(); stopScanner(); },
      () => {}
    );
    $('scanBtn').textContent = '⏹ Scanner stoppen';
  } catch (err) {
    showMsg('Kamera-Zugriff fehlgeschlagen: ' + err, 'error');
    $('scanner').classList.add('hidden');
    scanner = null;
  }
}

async function stopScanner() {
  if (scanner) {
    try { await scanner.stop(); } catch (e) {}
    try { scanner.clear(); } catch (e) {}
    scanner = null;
  }
  $('scanner').classList.add('hidden');
  $('scanBtn').textContent = '📷 Scannen';
}

/* ---------- Einstellungen ---------- */
function initSettings() {
  $('sheetUrlInput').value = localStorage.getItem(LS_SHEET_URL) || '';
  $('saveUrlBtn').addEventListener('click', () => {
    localStorage.setItem(LS_SHEET_URL, $('sheetUrlInput').value.trim());
    showMsg('✅ URL gespeichert – Synchronisation läuft …', 'ok');
    syncNow();
  });
  $('syncBtn').addEventListener('click', syncNow);
}

/* ---------- Start ---------- */
$('saveBtn').addEventListener('click', addEntry);
$('scanBtn').addEventListener('click', toggleScanner);
$('awbInput').addEventListener('keydown', e => { if (e.key === 'Enter') addEntry(); });
$('searchInput').addEventListener('input', render);
$('entryTable').addEventListener('click', e => {
  const btn = e.target.closest('.stornoBtn');
  if (btn) stornoEntry(btn.dataset.id);
});
window.addEventListener('online', syncNow);
window.addEventListener('offline', updateSyncBadge);

$('agentInput').value = localStorage.getItem(LS_AGENT) || '';
initSettings();
render();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
