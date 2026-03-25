Versionierte SQL-Migrationen fuer Situation Room.

Konvention:
- Dateinamen: `NNNN_beschreibung.sql`
- Reihenfolge ueber den numerischen Praefix
- neue Aenderungen nur noch als neue Datei anfuegen
- vorhandene Migrationen nach Anwendung nicht mehr inhaltlich aendern

Runner:
- `node public_html/backend/src/jobs/run-migrations.js`
- `node public_html/backend/src/jobs/run-migrations.js --baseline-existing`
