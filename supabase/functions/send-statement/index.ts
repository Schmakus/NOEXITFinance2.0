import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

type DbBookingType = 'expense' | 'income' | 'payout'

type TransactionRow = {
  id: string
  booking_id: string | null
  musician_id: string
  concert_name: string | null
  amount: number
  date: string | null
  type: 'earn' | 'expense'
  description: string | null
}

type MusicianRow = {
  id: string
  name: string
  email: string
  balance: number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const isPayout = (t: TransactionRow, bookingType?: DbBookingType | null) =>
  bookingType === 'payout' ||
  (t.description ?? '').toLowerCase().includes('auszahlung') ||
  (t.concert_name ?? '').toLowerCase().includes('auszahlung')

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('de-DE').format(d)
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)

const toBase64 = (bytes: Uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const resendFrom = Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev'

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase service role configuration' }, 500)
  }
  if (!resendApiKey) {
    return jsonResponse({ error: 'Missing RESEND_API_KEY' }, 500)
  }

  let payload: { musician_id?: string; from_date?: string; to_date?: string }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!payload.musician_id) {
    return jsonResponse({ error: 'musician_id is required' }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: musician, error: musicianError } = await supabase
    .from('musicians')
    .select('id, name, email, balance')
    .eq('id', payload.musician_id)
    .maybeSingle()

  if (musicianError) {
    return jsonResponse({ error: musicianError.message }, 500)
  }

  if (!musician) {
    return jsonResponse({ error: 'Musician not found' }, 404)
  }

  if (!musician.email) {
    return jsonResponse({ error: 'Musician has no email address' }, 400)
  }

  const fromDate = payload.from_date ? new Date(payload.from_date) : null
  const toDate = payload.to_date ? new Date(payload.to_date) : null

  let query = supabase
    .from('transactions')
    .select('id, booking_id, musician_id, concert_name, amount, date, type, description')
    .eq('musician_id', payload.musician_id)
    .order('date', { ascending: false })

  if (fromDate) {
    query = query.gte('date', payload.from_date)
  }
  if (toDate) {
    query = query.lte('date', payload.to_date)
  }

  const { data: transactionsRaw, error: transactionsError } = await query
  if (transactionsError) {
    return jsonResponse({ error: transactionsError.message }, 500)
  }

  const transactions = (transactionsRaw ?? []) as TransactionRow[]

  const bookingIds = Array.from(
    new Set(transactions.map((t) => t.booking_id).filter(Boolean))
  ) as string[]

  let bookingTypeById: Record<string, DbBookingType> = {}
  if (bookingIds.length > 0) {
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, type')
      .in('id', bookingIds)
    if (bookingsError) {
      return jsonResponse({ error: bookingsError.message }, 500)
    }
    bookingTypeById = (bookings ?? []).reduce((acc: Record<string, DbBookingType>, b: any) => {
      if (b?.id) acc[b.id] = b.type
      return acc
    }, {})
  }

  const totals = transactions.reduce(
    (acc, t) => {
      const bookingType = t.booking_id ? bookingTypeById[t.booking_id] : null
      if (t.type === 'earn') {
        acc.income += t.amount
      } else if (t.type === 'expense' && isPayout(t, bookingType)) {
        acc.payouts += Math.abs(t.amount)
      } else {
        acc.expenses += Math.abs(t.amount)
      }
      return acc
    },
    { income: 0, expenses: 0, payouts: 0 }
  )

  const currentBalance = musician.balance + transactions.reduce((sum, t) => sum + t.amount, 0)

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const pageSize: [number, number] = [595.28, 841.89]
  const marginX = 40
  const headerHeight = 90
  const rowHeight = 22
  const columnDate = 90
  const columnAmount = 90
  const columnGap = 12
  const maxTableWidth = pageSize[0] - marginX * 2
  const columnDesc = maxTableWidth - columnDate - columnAmount - columnGap * 2

  const periodLabel = `${payload.from_date ?? '-'} bis ${payload.to_date ?? '-'}`

  const colorDark = rgb(0.07, 0.1, 0.16)
  const colorMuted = rgb(0.64, 0.68, 0.76)
  const colorCard = rgb(0.12, 0.16, 0.24)
  const colorCardBorder = rgb(0.2, 0.24, 0.32)
  const colorGreen = rgb(0.26, 0.86, 0.64)
  const colorRed = rgb(0.98, 0.47, 0.47)
  const colorBlue = rgb(0.37, 0.64, 1)
  const colorWhite = rgb(1, 1, 1)

  const addPage = () => {
    const page = pdf.addPage(pageSize)
    page.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: colorDark })
    page.drawRectangle({
      x: 0,
      y: pageSize[1] - headerHeight,
      width: pageSize[0],
      height: headerHeight,
      color: rgb(0.05, 0.08, 0.12),
    })
    page.drawText(`Kontoauszug`, {
      x: marginX,
      y: pageSize[1] - 50,
      size: 20,
      font: fontBold,
      color: colorWhite,
    })
    page.drawText(`${musician.name}`, {
      x: marginX,
      y: pageSize[1] - 72,
      size: 14,
      font: font,
      color: colorMuted,
    })
    page.drawText(`Zeitraum: ${periodLabel}`, {
      x: marginX,
      y: pageSize[1] - 88,
      size: 10,
      font: font,
      color: colorMuted,
    })
    page.drawText(`Kontostand: ${formatCurrency(currentBalance)}`, {
      x: pageSize[0] - marginX - 200,
      y: pageSize[1] - 60,
      size: 12,
      font: fontBold,
      color: currentBalance >= 0 ? colorGreen : colorRed,
    })
    return page
  }

  let page = addPage()
  let y = pageSize[1] - headerHeight - 24

  const drawCard = (x: number, title: string, value: string, accent: { r: number; g: number; b: number }) => {
    const cardWidth = (maxTableWidth - columnGap * 2) / 3
    const cardHeight = 58
    page.drawRectangle({
      x,
      y: y - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: colorCard,
      borderColor: colorCardBorder,
      borderWidth: 1,
    })
    page.drawText(title, {
      x: x + 12,
      y: y - 22,
      size: 10,
      font,
      color: colorMuted,
    })
    page.drawText(value, {
      x: x + 12,
      y: y - 40,
      size: 16,
      font: fontBold,
      color: rgb(accent.r, accent.g, accent.b),
    })
  }

  drawCard(marginX, 'Gesamteinnahmen', formatCurrency(totals.income), { r: 0.26, g: 0.86, b: 0.64 })
  drawCard(marginX + (maxTableWidth - columnGap * 2) / 3 + columnGap, 'Gesamtausgaben', formatCurrency(totals.expenses), { r: 0.98, g: 0.47, b: 0.47 })
  drawCard(marginX + ((maxTableWidth - columnGap * 2) / 3 + columnGap) * 2, 'Auszahlungen', formatCurrency(totals.payouts), { r: 0.37, g: 0.64, b: 1 })

  y -= 80

  page.drawText('Kontoauszug', {
    x: marginX,
    y: y,
    size: 14,
    font: fontBold,
    color: colorWhite,
  })
  y -= 18

  const drawTableHeader = () => {
    page.drawRectangle({ x: marginX, y: y - 18, width: maxTableWidth, height: 20, color: rgb(0.1, 0.14, 0.2) })
    page.drawText('Datum', { x: marginX + 8, y: y - 14, size: 10, font: fontBold, color: colorMuted })
    page.drawText('Beschreibung', { x: marginX + columnDate + columnGap, y: y - 14, size: 10, font: fontBold, color: colorMuted })
    page.drawText('Betrag', { x: marginX + columnDate + columnGap + columnDesc + columnGap, y: y - 14, size: 10, font: fontBold, color: colorMuted })
    y -= 26
  }

  drawTableHeader()

  const rows = transactions
  for (const t of rows) {
    if (y < 80) {
      page = addPage()
      y = pageSize[1] - headerHeight - 24
      drawTableHeader()
    }
    const bookingType = t.booking_id ? bookingTypeById[t.booking_id] : null
    const payout = t.type === 'expense' && isPayout(t, bookingType)
    const label = payout ? 'Auszahlung' : t.description ?? '-'
    const amountText = formatCurrency(Math.abs(t.amount))
    const amountColor = t.type === 'earn' ? colorGreen : colorRed

    page.drawText(formatDate(t.date), {
      x: marginX + 8,
      y: y - 6,
      size: 10,
      font,
      color: colorWhite,
    })
    page.drawText(label, {
      x: marginX + columnDate + columnGap,
      y: y - 6,
      size: 10,
      font: fontBold,
      color: payout ? colorBlue : colorWhite,
      maxWidth: columnDesc,
    })
    if (t.concert_name) {
      page.drawText(t.concert_name, {
        x: marginX + columnDate + columnGap,
        y: y - 18,
        size: 8,
        font,
        color: colorMuted,
        maxWidth: columnDesc,
      })
    }
    page.drawText(`${t.type === 'earn' ? '+' : '-'}${amountText}`, {
      x: marginX + columnDate + columnGap + columnDesc + columnGap,
      y: y - 6,
      size: 10,
      font: fontBold,
      color: amountColor,
    })

    y -= rowHeight
  }

  const pdfBytes = await pdf.save()
  const pdfBase64 = toBase64(pdfBytes)

  const subject = `Kontoauszug ${musician.name}`
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Kontoauszug ${musician.name}</h2>
      <p>Zeitraum: ${periodLabel}</p>
      <p>Gesamteinnahmen: ${formatCurrency(totals.income)}</p>
      <p>Gesamtausgaben: ${formatCurrency(totals.expenses)}</p>
      <p>Auszahlungen: ${formatCurrency(totals.payouts)}</p>
      <p>Der PDF-Anhang enthaelt den detaillierten Kontoauszug.</p>
    </div>
  `

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [musician.email],
      subject,
      html,
      attachments: [
        {
          filename: `kontoauszug-${musician.name}.pdf`,
          content: pdfBase64,
        },
      ],
    }),
  })

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text()
    return jsonResponse({ error: `Resend failed: ${errorText}` }, 500)
  }

  return jsonResponse({ ok: true })
})
