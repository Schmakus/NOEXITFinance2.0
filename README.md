# NOEXIT Finance App

Eine moderne **Finanzmanagement-Anwendung für Musikbands** mit aktuellem Tech-Stack (React 19, Vite, Tailwind CSS, TypeScript).

## Features

✅ **Authentifizierung** - Login mit Auth Context  
✅ **Dashboard** - Finanzübersicht mit Kontostände  
✅ **Musiker** - Bandmitglieder verwalten  
✅ **Gruppen** - Musikgruppen organisieren  
✅ **Konzerte** - Events und Auftritte verwalten  
✅ **Transaktionen** - Finanzielle Aktivitäten tracken  
✅ **Tags** - Transaktionen kategorisieren  
✅ **Einstellungen** - Benutzerpräferenzen  

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 7
- **Styling:** Tailwind CSS 3.4, shadcn/ui
- **Routing:** React Router v6
- **State Management:** TanStack React Query
- **Forms:** React Hook Form + Zod Validation
- **Icons:** Lucide React
- **Utilities:** Date-fns, Lodash, Axios

## Installation

### Voraussetzungen
- Node.js 25.6.0+
- npm 11.8.0+

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

### Demo Anmeldung
Beliebige E-Mail und Passwort verwenden (Demo-Authentifizierung).

## Build

```bash
# Production Build
npm run build

# Lokal testen
npm run preview
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
│   ├── api-client.ts    # Axios Client
│   ├── query-client.ts  # TanStack Query
│   └── utils.ts         # Utility Functions
└── App.tsx              # Haupt-App Component
```

## API Integration

The app is configured to connect to a backend API at `http://localhost:3000/api` (configurable via `.env.local`).

Alle API-Requests verwenden einen Bearer Token für Authentifizierung:

```typescript
Authorization: Bearer <auth_token>
```

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

## Lizenz

Privat - NOEXIT Band
