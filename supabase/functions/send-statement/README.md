# send-statement

Supabase Edge Function for sending a musician statement PDF via Resend.

## Environment variables

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- RESEND_FROM (optional, defaults to onboarding@resend.dev)

## Payload

```json
{
  "musician_id": "uuid",
  "from_date": "2026-01-01",
  "to_date": "2026-02-07"
}
```
