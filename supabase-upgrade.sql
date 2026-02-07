-- ============================================
-- NOEXIT Finance - Supabase Upgrade SQL
-- Nur Aenderungen fuer bestehende Installationen
-- ============================================

-- 1) Musiker archivieren
ALTER TABLE musicians
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 1b) Buchungen: Auszahlungs-IDs
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payout_musician_ids uuid[] DEFAULT '{}';

-- 2) Transaktionen-Archiv
CREATE TABLE IF NOT EXISTS transactions_archive (
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

-- 3) RLS aktivieren
ALTER TABLE transactions_archive ENABLE ROW LEVEL SECURITY;

-- 4) Read-Policy fuer alle Auth-User
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions_archive'
      AND policyname = 'Authenticated users can read transactions_archive'
  ) THEN
    CREATE POLICY "Authenticated users can read transactions_archive"
      ON transactions_archive
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 5) Admin/ सुपरuser Policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions_archive'
      AND policyname = 'Admins can manage transactions_archive'
  ) THEN
    CREATE POLICY "Admins can manage transactions_archive"
      ON transactions_archive
      FOR ALL
      TO authenticated
      USING (is_admin_or_superuser());
  END IF;
END $$;
