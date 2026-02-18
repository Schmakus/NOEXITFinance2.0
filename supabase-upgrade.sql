
-- Migration: Gruppen-Sortierreihenfolge
ALTER TABLE groups ADD COLUMN IF NOT EXISTS sort_order integer not null default 0;



