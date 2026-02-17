-- Supabase RLS Policy für logs-Tabelle
-- 1. Jeder authentifizierte User darf Logs schreiben (insert)
create policy "Allow insert for all authenticated users" on logs
  for insert
  to authenticated
  with check (true);

-- 2. Nur Admins dürfen Logs lesen (select)
create policy "Allow select for admins only" on logs
  for select
  to authenticated
  using (
    exists (
      select 1 from musicians m
      where m.user_id = auth.uid() and m.role = 'administrator'
    )
  );

-- 3. Niemand darf Logs updaten oder löschen (optional, falls gewünscht)
create policy "Disallow update for all" on logs
  for update
  to public
  using (false);

create policy "Disallow delete for all" on logs
  for delete
  to public
  using (false);
