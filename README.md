# 🛡️ Cargo Security – AWB-Sicherung

Sicherheits-Webapp für die Cargo City: Air Waybills (AWBs) per Kamera-Scan oder manuell erfassen, mit Sicherheitsstatus (SPX / SCO / Nicht sicher) versehen und nachvollziehbar protokollieren – inklusive Storno-Funktion und Synchronisation mit Google Sheets.

## Funktionen

- **AWB erfassen**: per Kamera-Scan (Barcode) oder manuell
- **Status**: SPX – sicher (Passagierflugzeug), SCO – sicher (Frachter), Nicht sicher
- **Dubletten-Schutz**: doppelt erfasste AWBs werden gewarnt und blockiert
- **Storno statt Löschen**: Einträge können nur mit Pflichtgrund storniert werden und bleiben durchgestrichen im Protokoll sichtbar (lückenlose Nachverfolgung). Stornierte AWBs können neu erfasst werden.
- **Protokoll**: Zeitstempel, Bearbeiter, Bemerkung, Suche
- **Statistik**: Zähler heute / gesamt (aktive Einträge)
- **Google-Sheets-Sync**: alle Einträge und Stornos landen automatisch in einer Google-Tabelle
- **Offlinefähig (PWA)**: installierbar auf dem Homescreen; Einträge werden offline zwischengespeichert und später synchronisiert
- Dunkles Design, deutsche Oberfläche

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Oberfläche der App |
| `styles.css` | Dunkles Design |
| `app.js` | Logik (Erfassung, Storno, Sync, Scanner) |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | PWA (offline, installierbar) |
| `apps-script/Code.gs` | Backend für Google Sheets |

## Einrichtung

### 1. App online stellen (GitHub Pages)

1. Repository öffnen → **Settings** → **Pages**
2. Source: **Deploy from a branch** → Branch **main** / **(root)** → **Save**
3. Nach ca. 1 Minute läuft die App unter `https://zakiwaw.github.io/cargo-security-app/`

> Hinweis: GitHub Pages ist bei **privaten** Repositories nur mit einem bezahlten GitHub-Plan verfügbar. Falls dir Pages nicht angeboten wird: Entweder das Repo kurz auf **public** stellen (Settings → General → Danger Zone) oder die App kostenlos über Netlify/Vercel bereitstellen – beide können private Repos nutzen. Die Kamera funktioniert nur über HTTPS.

### 2. Google Sheets anbinden

1. [Google Sheets](https://sheets.google.com) öffnen → neue Tabelle, z. B. **„AWB-Sicherung“**
2. Menü **Erweiterungen → Apps Script**
3. Inhalt der Datei `apps-script/Code.gs` einfügen (vorhandenen Code ersetzen) → **Speichern**
4. **Bereitstellen → Neue Bereitstellung → Typ: Web-App**
   - Ausführen als: **Ich**
   - Zugriff: **Jeder**
5. **Bereitstellen** → Berechtigungen bestätigen → **Web-App-URL kopieren**
6. In der App unten unter **Einstellungen** die URL eintragen → **URL speichern**

Das Script legt in der Tabelle automatisch ein Blatt **„AWB-Protokoll“** mit den Spalten ID, Zeit, AWB, Status, Bemerkung, Bearbeiter, Storno-Grund, Storno-Zeit und Storno von an.

### 3. Auf dem iPhone installieren

App-Adresse in Safari öffnen → **Teilen** → **Zum Home-Bildschirm**. Danach läuft die App wie eine eigene App im Vollbild.

## Hinweise

- **Kein Löschen**: Fehlerhafte Einträge bitte stornieren – so bleibt das Protokoll revisionssicher.
- **Offline**: Ohne Internet werden Einträge lokal gespeichert (⏳-Symbol) und beim nächsten Sync übertragen.
- **Sync-Technik**: Die App sendet jeden Eintrag an die Apps-Script-URL. Da Google die Antwort ohne CORS-Header ausliefert, gilt ein fehlerfreier Versand als erfolgreich; das Sheet ist das führende Protokoll.
- **Änderungen am Apps Script**: Nach jeder Änderung an `Code.gs` muss eine neue Bereitstellung erstellt (oder die bestehende aktualisiert) werden, sonst läuft die alte Version weiter.
