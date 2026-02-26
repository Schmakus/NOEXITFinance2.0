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

## 5. Coding-Prinzipien (Definition of Done)
* **Type Safety:** Definiere Interfaces für alle Props und API-Antworten.
* **Fehlerbehandlung:** Asynchrone Logik immer in `try/catch` oder via React Query `onError`.
* **Kommentare:** Nutze JSDoc für komplexe Logik.
* **Code-Stil:** * Keine Class Components.
    * Nutze `npm run lint:fix` kompatible Formatierung.
* **Conventional Commits:** * Format: `type(scope): beschreibung` (z.B. `feat(auth): login hinzugefügt`).
    * Typen: `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`.

---

## 6. Kontext-Referenz
Beziehe dich bei Fragen zur Logik primär auf diese Dateien:
- `#src/lib/api-client.ts` (API-Struktur)
- `#src/lib/utils.ts` (Helper)
- `#src/contexts/AuthContext.tsx` (Security/Session)
