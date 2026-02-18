# NOEXIT Finance App

Eine moderne **Finanzmanagement-Anwendung für Musikbands** mit aktuellem Tech-Stack (React 19, Vite, Tailwind CSS, TypeScript).

## Features

✅ **Authentifizierung** - Login mit Auth Context  
✅ **Dashboard** - Finanzübersicht mit Kontostände  
✅ **Musiker** - Bandmitglieder verwalten  
✅ **Gruppen** - Musikgruppen organisieren  
✅ **Konzerte** - Events und Auftritte verwalten  
✅ **Transaktionen** - Finanzielle Aktivitäten tracken  
✅ **Auszahlungen beantragen** - Gage beantragen  
✅ **Tags** - Transaktionen kategorisieren  
✅ **Einstellungen** - Benutzerpräferenzen  
✅ **Backup/Restore** - JSON Export & Restore (Admin)  
✅ **CSV Export** - Kontoauszuege fuer alle Musiker (Admin/Superuser)  

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 7
- **Styling:** Tailwind CSS 4, shadcn/ui
- **Routing:** React Router v7
- **State Management:** TanStack React Query
- **Backend:** Supabase (Auth + Database)
- **Icons:** Lucide React

## Installation

### Voraussetzungen
- Node.js 20+ (LTS empfohlen)
- npm 10+

### Setup

```bash
# Dependencies installieren
npm install --legacy-peer-deps

# Environment Variablen einrichten
cp .env.example .env.local
```

## Development

```bash
# Dev Server starten
npm run dev

# Browser öffnet sich auf: http://localhost:5173/
```

## Build

```bash
# Production Build
npm run build

# Lokal testen
npm run preview
```

## Release

Ein Befehl erledigt Version, Tag, Push und GitHub Release.

```bash
# Patch/Minor/Major
npm run release:patch
npm run release:minor
npm run release:major

# Beta (Prerelease)
npm run release:beta
```

Voraussetzungen:
- Du bist auf `main`
- GitHub CLI (`gh`) ist installiert und eingeloggt

## Release Notes

```
***WORKING***

v1.5.4 (18.02.2026)
- Some fixes
- Add change order of groups

v1.5.0 (17.02.2026)
- (Schmakus) New: Activity logging

v1.4.2 (17.02.2026)
- (Schmakus) some bugfixes

v1.4.1 (17.02.2026)
- (Schmakus) Fix: Release-Workflow

v1.4.0 (17.02.2026)
- (Schmakus) New: Add Passwort Vergessen funktion
- (Schmakus) Fix: Version number in settings
- (Schmakus) Fix: Open menu in desktop view

v1.3.0 (14.02.2026)
- (Schmakus) New: Auszahlung beantragen; inkl. Genehmigung und PDF Upload

v1.2.1 (08.02.2026)
- (Schmakus) Test release script
- (Schmakus) Fix PayoutRequest; PDF Upload onhold

v1.2.0 (08.02.2026)
- (Schmakus) fix Authentification
- (Schmakus) fix Buchungen
- (Schmakus) Add archiv for deleted musicians
- (Schmakus) Design fixes/changes
- (Schmakus) Edit Layout, add PDF Export und eMail for Kontoauszüge
- (Schmakus) DatePicker; Respnsive Design; Only DarkMode
- (Schmakus) Rollenzuweisung optimiert

v0.0.5 (04.02.2026)
- Beispiel: Backup/Restore hinzugefuegt
```

## Linting & Formatierung

```bash
# ESLint ausführen
npm run lint

# Code automatisch formatieren
npm run lint:fix
```

## Projektstruktur

```
src/
├── components/          # React Components
│   ├── ui/              # shadcn UI Components
│   └── Layout.tsx       # Haupt-Layout
├── pages/               # Seiten
│   ├── Dashboard.tsx
│   ├── Musicians.tsx
│   ├── Groups.tsx
│   ├── Concerts.tsx
│   ├── Transactions.tsx
│   ├── Tags.tsx
│   ├── Login.tsx
│   └── Settings.tsx
├── contexts/            # React Contexts
│   └── AuthContext.tsx  # Authentifizierung
├── lib/                 # Utilities & Konfiguration
│   ├── api-client.ts    # Supabase API Client
│   ├── query-client.ts  # TanStack Query
│   └── utils.ts         # Utility Functions
└── App.tsx              # Haupt-App Component
```

## API Integration

Die App nutzt Supabase fuer Authentifizierung und Datenbank.

## UI Components

Ready-to-use shadcn/ui Components:
- Button
- Card
- Input
- Label
- (weitere können einfach hinzugefügt werden)

## Development Tipps

- **Hot Module Replacement (HMR):** Änderungen werden live im Browser aktualisiert
- **TypeScript:** Strikte Typ-Überprüfung für Sicherheit
- **ESLint:** Code-Qualitätsprüfungen

## Conventional Commits Cheat-Sheet

**Format:** `type(scope): kurze beschreibung`

- `feat:` neue Funktion
- `fix:` Bugfix
- `docs:` nur Doku
- `chore:` Wartung/Build
- `refactor:` Code-Refactor ohne Feature/Bugfix
- `perf:` Performance
- `test:` Tests

**Beispiele**

```
feat(settings): backup export hinzugefuegt
fix(auth): lade-screen bei reload behoben
chore(release): 2.1.0
```

## Lizenz

Privat - NOEXIT Partyrock
