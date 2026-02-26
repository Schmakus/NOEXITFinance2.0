# GitHub Copilot Instructions: NOEXIT Finance Project

---
role: system
precision: high
context: strict
---

## 1. Technischer Stack
Copilot muss den folgenden Tech-Stack für alle generierten Code-Bestandteile verwenden:

* **Frontend:** React 19 (Functional Components, Hooks)
* **Sprache:** TypeScript (Strict Type Safety, no `any`)
* **Build Tool:** Vite 7
* **Routing:** React Router v7
* **State Management:** TanStack React Query (für Server-State & Caching)
* **Styling:** * Tailwind CSS 4 (Utility-only, kein externes CSS)
    * shadcn/ui (Primäre Komponentenbibliothek in `src/components/ui/`)
* **Backend/BaaS:** Supabase (Auth & Database)
* **Icons:** Lucide React
* **Datenbank-Sprache:** PLpgSQL (für Trigger & Functions)

---

## 2. Architektur-Muster & Datenfluss
Befolge strikt die modulare Struktur des Projekts:

* **Verzeichnis-Struktur:**
    * `src/components/`: Allgemeine React-Komponenten.
    * `src/components/ui/`: Ausschließlich shadcn/ui Komponenten.
    * `src/pages/`: Views/Seiten (z.B. Dashboard, Musicians).
    * `src/contexts/`: Globaler State (z.B. `AuthContext.tsx`).
    * `src/lib/`: Kernlogik, Utilities (`utils.ts`) und API-Clients.
* **API-Kommunikation:**
    * Nutze ausschließlich den Client in `src/lib/api-client.ts`.
    * Keine direkten Supabase-Calls in Komponenten; verwende TanStack Query Hooks.
* **Sicherheitsmodell:**
    * Beachte Row Level Security (RLS).
    * Nutze die SQL-Funktion `is_admin_or_superuser()` für Berechtigungsprüfungen.

---

## 3. SQL & Daten-Konventionen (Supabase Schema)
Bei Datenbank-Operationen oder Migrationen gelten diese Regeln:

* **Naming:** Tabellen und Spalten immer in `snake_case`.
* **IDs:** Typ `uuid`, Default `gen_random_uuid()`.
* **Timestamps:** `created_at` und `updated_at` (Typ `timestamptz`, Default `now()`).
* **Finanzen:** Nutze `numeric(12,2)` für Währungsbeträge (z.B. `netto_gage`, `balance`).
* **Check-Constraints:** Nutze Enums via SQL-Check für Status- und Rollenfelder.
* **Update SQL Scheme:** Update the file supabase-schema.sql immer dann, wenn neue Tabellen oder Policies hinzugekommen oder geändert wurden

---

## 4. Styling & UI-Richtlinien
* **Tailwind First:** Erzeuge keine CSS-Klassen. Nutze Tailwind Utility-Klassen.
* **shadcn/ui:** Prüfe immer, ob eine Komponente in `src/components/ui/` existiert, bevor du etwas Neues baust.
* **Responsivität:** Nutze mobile-first Präfixe (`sm:`, `md:`, `lg:`).

---


## 5. Coding-Prinzipien & Security (Definition of Done)
* **Type Safety:** Definiere für alle Props und API-Antworten explizite Interfaces. Verwende niemals `any` oder `unknown`.
* **Fehlerbehandlung:** Jede asynchrone Logik muss in `try/catch` oder via React Query `onError` behandelt werden. Beispiel:
    ```ts
    try {
        await apiCall()
    } catch (err) {
        // Fehlerbehandlung
    }
    ```
* **Input-Validierung:** Prüfe alle Benutzereingaben (z.B. Forms) auf Plausibilität und sichere Werte. Keine direkten DOM-Manipulationen.
* **Security:**
    * Verhindere XSS/CSRF/SQL-Injection durch konsequente Nutzung von React, sichere API-Calls und keine direkte DOM-Manipulation.
    * Sensible Aktionen (z.B. Datenexport, User-Management) immer mit expliziter Berechtigungsprüfung (`is_admin_or_superuser()` oder Policy).
* **API-Policy:** Alle Datenflüsse (auch neue Features) laufen ausschließlich über den Client in `src/lib/api-client.ts` und TanStack Query. Keine direkten Supabase- oder DB-Calls in Komponenten.
* **Kommentare & Dokumentation:** Nutze JSDoc für komplexe Logik. Dokumentiere alle Änderungen und Features in README und Code-Kommentaren.
* **Testing:** Schreibe Unit-Tests für kritische Logik (z.B. in `src/lib/utils.ts`).
* **Linting & Code-Stil:** Keine Class Components. Nutze `npm run lint:fix` für Formatierung. TypeScript-Strictness muss auch im Linter durchgesetzt werden (keine Ausnahmen für `any`, `no-unused-vars` etc.).
* **Conventional Commits:** Format: `type(scope): beschreibung` (z.B. `feat(auth): login hinzugefügt`). Typen: `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`.

---

## 6. Kontext-Referenz
Beziehe dich bei Fragen zur Logik primär auf diese Dateien:
- `#src/lib/api-client.ts` (API-Struktur)
- `#src/lib/utils.ts` (Helper)
- `#src/contexts/AuthContext.tsx` (Security/Session)


## 7. Generelle Anmerkungen & Review-Checkliste
* **Keine Annahmen:** Wenn Informationen fehlen, frage explizit nach.
* **Iterativ:** Generiere Code in kleinen Schritten, um Feedback zu ermöglichen.
* **Dokumentation & Testing:** README und Code-Kommentare immer aktuell halten. Schreibe Unit-Tests für kritische Logik.
* **SQL-Änderungen:** Bei jeder Änderung am Datenbankschema muss `supabase-schema.sql` aktualisiert und im Pull Request explizit referenziert werden.
* **Problemsolving:** Immer zuerst Konsolen-Logs und Fehlermeldungen prüfen, Ursache identifizieren, dann Code ändern. Dokumentation und Kommentare nachziehen. Bestehende Funktionen dürfen nicht beeinträchtigt werden.
