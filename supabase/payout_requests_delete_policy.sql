-- Policy: User darf eigene payout_requests löschen
CREATE POLICY "Allow users to delete own payout requests"
ON public.payout_requests
FOR DELETE
TO authenticated
USING (musician_id = auth.uid());

-- Policy: Superuser/Admin darf alle payout_requests löschen
CREATE POLICY "Allow superusers to delete all payout requests"
ON public.payout_requests
FOR DELETE
TO service_role, superuser
USING (true);

-- Hinweis: Für die Rolle 'superuser' muss ggf. ein entsprechender JWT-Claim oder eine Rolle in Supabase konfiguriert sein. Falls du nur service_role verwendest, reicht die zweite Policy für Admin-APIs.
