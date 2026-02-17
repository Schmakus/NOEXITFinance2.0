-- 11. LOGGING (Audit Log)
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('booking', 'concert', 'payout', 'login', 'musician')),
  action text not null check (action in ('create', 'update', 'delete', 'request', 'login', 'archive', 'restore')),
  label text not null, -- z.B. "Buchung", "Konzert", "Auszahlung", "Login", "Musiker"
  description text not null, -- z.B. "Einnahme von 1000€ auf 1100€ geändert"
  user_id uuid references musicians(id),
  user_name text not null,
  created_at timestamptz default now()
);

create index if not exists logs_created_at_idx on logs(created_at desc);
-- ============================================
-- NOEXIT Finance - Supabase Datenbank-Schema
-- ============================================
-- Führe dieses SQL im Supabase SQL Editor aus:
-- https://supabase.com/dashboard → SQL Editor
--
-- SETUP-REIHENFOLGE:
-- 1. Dieses SQL im SQL Editor ausführen
-- 2. Supabase Auth User anlegen (Authentication → Users → "Add user")
--    z.B. schmakus@noexit.de / Passwort123!
-- 3. Den ersten Musiker mit admin-Rolle manuell einfügen:
--    INSERT INTO musicians (user_id, name, email, role)
--    VALUES ('<auth-user-uuid>', 'Schmakus', 'schmakus@noexit.de', 'administrator');
-- 4. Weitere Musiker können dann über die App angelegt werden

-- 1. MUSIKER (= Benutzer)
create table if not exists musicians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('administrator', 'superuser', 'user')),
  balance numeric(12,2) not null default 0,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: Falls musicians-Tabelle bereits existiert:
-- ALTER TABLE musicians ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2. GRUPPEN
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 3. MUSIKER ↔ GRUPPEN (mit Prozentverteilung)
create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  musician_id uuid references musicians(id) on delete cascade,
  percent numeric(5,2) not null default 0,
  unique(group_id, musician_id)
);

-- 4. KONZERTE
create table if not exists concerts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  date date,
  time text,
  netto_gage numeric(12,2) default 0,
  group_id uuid references groups(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. KONZERT-AUSGABEN (Expenses)
create table if not exists concert_expenses (
  id uuid primary key default gen_random_uuid(),
  concert_id uuid references concerts(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null,
  keyword text
);

-- 6. BUCHUNGEN (Bookings)
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null,
  type text not null check (type in ('expense', 'income', 'payout')),
  date date,
  group_id uuid references groups(id),
  musician_id uuid references musicians(id),
  payout_musician_ids uuid[] default '{}',
  keywords text[] default '{}',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: Falls bookings-Tabelle bereits existiert:
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payout_musician_ids uuid[] DEFAULT '{}';

-- 7. TRANSAKTIONEN
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  musician_id uuid references musicians(id) on delete cascade,
  concert_id uuid,
  booking_id uuid,
  concert_name text,
  amount numeric(12,2) not null,
  date date,
  type text not null check (type in ('earn', 'expense')),
  description text,
  created_at timestamptz default now()
);

-- 7b. TRANSAKTIONEN ARCHIV
create table if not exists transactions_archive (
  id uuid primary key default gen_random_uuid(),
  musician_id uuid references musicians(id) on delete set null,
  concert_id uuid,
  booking_id uuid,
  concert_name text,
  amount numeric(12,2) not null,
  date date,
  type text not null check (type in ('earn', 'expense')),
  description text,
  created_at timestamptz,
  archived_at timestamptz default now()
);

-- Migration: Falls transactions_archive bereits existiert, stelle sicher dass RLS aktiv ist:
-- ALTER TABLE transactions_archive ENABLE ROW LEVEL SECURITY;

-- 8. TAGS/STICHWORTE
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 9. APP-EINSTELLUNGEN (Bandname, Logo etc.)
create table if not exists app_settings (
  key text primary key,
  value text
);

-- Standard-Einstellungen
insert into app_settings (key, value) values
  ('bandname', 'NO EXIT'),
  ('version', '0.0.1')
on conflict (key) do nothing;

-- 10. AUSZAHLUNGSANTRÄGE (Payout Requests)
create table if not exists payout_requests (
  id uuid primary key default gen_random_uuid(),
  musician_id uuid references musicians(id) on delete cascade not null,
  amount numeric(12,2) not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references musicians(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- RLS aktivieren
alter table musicians enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table concerts enable row level security;
alter table concert_expenses enable row level security;
alter table bookings enable row level security;
alter table transactions enable row level security;
alter table transactions_archive enable row level security;
alter table tags enable row level security;
alter table app_settings enable row level security;
alter table payout_requests enable row level security;

-- Alle authentifizierten Benutzer können lesen
create policy "Authenticated users can read musicians" on musicians for select to authenticated using (true);
create policy "Authenticated users can read groups" on groups for select to authenticated using (true);
create policy "Authenticated users can read group_members" on group_members for select to authenticated using (true);
create policy "Authenticated users can read concerts" on concerts for select to authenticated using (true);
create policy "Authenticated users can read concert_expenses" on concert_expenses for select to authenticated using (true);
create policy "Authenticated users can read bookings" on bookings for select to authenticated using (true);
create policy "Authenticated users can read transactions" on transactions for select to authenticated using (true);
create policy "Authenticated users can read transactions_archive" on transactions_archive for select to authenticated using (true);
create policy "Authenticated users can read tags" on tags for select to authenticated using (true);
create policy "Authenticated users can read app_settings" on app_settings for select to authenticated using (true);

-- Admins/Superuser können alles bearbeiten (via Funktion)
create or replace function is_admin_or_superuser()
returns boolean as $$
begin
  return exists (
    select 1 from musicians
    where user_id = auth.uid()
    and role in ('administrator', 'superuser')
  );
end;
$$ language plpgsql security definer;

-- Insert/Update/Delete Policies für Admins und Superuser
create policy "Admins can insert musicians" on musicians for insert to authenticated with check (is_admin_or_superuser());
create policy "Admins can update musicians" on musicians for update to authenticated using (is_admin_or_superuser());
create policy "Admins can delete musicians" on musicians for delete to authenticated using (is_admin_or_superuser());

create policy "Admins can manage groups" on groups for all to authenticated using (is_admin_or_superuser());
create policy "Admins can manage group_members" on group_members for all to authenticated using (is_admin_or_superuser());

create policy "Admins can manage concerts" on concerts for all to authenticated using (is_admin_or_superuser());
create policy "Admins can manage concert_expenses" on concert_expenses for all to authenticated using (is_admin_or_superuser());

create policy "Admins can manage bookings" on bookings for all to authenticated using (is_admin_or_superuser());
create policy "Admins can manage transactions" on transactions for all to authenticated using (is_admin_or_superuser());
create policy "Admins can manage transactions_archive" on transactions_archive for all to authenticated using (is_admin_or_superuser());

create policy "Admins can manage tags" on tags for all to authenticated using (is_admin_or_superuser());
create policy "Admins can manage app_settings" on app_settings for all to authenticated using (is_admin_or_superuser());

-- Payout Requests: Users können eigene lesen & erstellen, Admins können alles
create policy "Users can read own payout_requests" on payout_requests for select to authenticated
  using (musician_id in (select id from musicians where user_id = auth.uid()) or is_admin_or_superuser());
create policy "Users can insert own payout_requests" on payout_requests for insert to authenticated
  with check (musician_id in (select id from musicians where user_id = auth.uid()));
create policy "Admins can update payout_requests" on payout_requests for update to authenticated using (is_admin_or_superuser());
create policy "Admins can delete payout_requests" on payout_requests for delete to authenticated using (is_admin_or_superuser());

-- Users können eigene ausstehende Anträge bearbeiten
create policy "Users can update own pending payout_requests" on payout_requests
  for update to authenticated
  using (
    musician_id in (select id from musicians where user_id = auth.uid())
    and status = 'pending'
  );

-- Users können eigene ausstehende Anträge löschen
create policy "Users can delete own pending payout_requests" on payout_requests
  for delete to authenticated
  using (
    musician_id in (select id from musicians where user_id = auth.uid())
    and status = 'pending'
  );

-- ============================================
-- STANDARD-TAGS
-- ============================================
insert into tags (name) values ('Gage'), ('Reise'), ('Equipment')
on conflict (name) do nothing;
