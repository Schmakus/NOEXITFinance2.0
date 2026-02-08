// ============================================
// Supabase API-Funktionen
// ============================================
import { supabase, supabaseAdmin } from './supabase'
import type {
  DbMusician,
  DbGroup,
  DbConcert,
  DbConcertExpense,
  DbBooking,
  DbTransaction,
  DbTransactionArchive,
  DbTag,
  DbAppSetting,
  GroupWithMembers,
  ConcertWithExpenses,
  TransactionArchiveWithMusician,
} from './database.types'

// ============================================
// AUTH USER MANAGEMENT (Admin)
// ============================================

export async function createAuthUser(email: string, password: string): Promise<string> {
  if (!supabaseAdmin) throw new Error('Service Role Key fehlt – Admin-Funktionen nicht verfügbar')
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  return data.user.id
}

export async function deleteAuthUser(authUserId: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service Role Key fehlt – Admin-Funktionen nicht verfügbar')
  const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId)
  if (error) throw error
}

// ============================================
// MUSIKER
// ============================================

export async function fetchMusicians(): Promise<DbMusician[]> {
  const { data, error } = await supabase
    .from('musicians')
    .select('*')
    .is('archived_at', null)
    .order('name')
  if (error) throw error
  return (data ?? []).map((m: any) => ({ ...m, balance: Number(m.balance) }))
}

export async function fetchAllMusicians(): Promise<DbMusician[]> {
  const { data, error } = await supabase
    .from('musicians')
    .select('*')
    .order('name')
  if (error) throw error
  return (data ?? []).map((m: any) => ({ ...m, balance: Number(m.balance) }))
}

export async function fetchArchivedMusicians(): Promise<DbMusician[]> {
  const { data, error } = await supabase
    .from('musicians')
    .select('*')
    .not('archived_at', 'is', null)
    .order('name')
  if (error) throw error
  return (data ?? []).map((m: any) => ({ ...m, balance: Number(m.balance) }))
}

export async function fetchMusicianByUserId(userId: string): Promise<DbMusician | null> {
  const { data, error } = await supabase
    .from('musicians')
    .select('*')
    .eq('user_id', userId)
    .is('archived_at', null)
    .maybeSingle()
  if (error) throw error
  return data ? { ...data, balance: Number(data.balance) } : null
}

export async function fetchMusicianById(id: string): Promise<DbMusician | null> {
  const { data, error } = await supabase
    .from('musicians')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? { ...data, balance: Number(data.balance) } : null
}

export async function createMusician(musician: {
  name: string
  email: string
  role: string
  balance?: number
  user_id?: string | null
}): Promise<DbMusician> {
  const { data, error } = await supabase
    .from('musicians')
    .insert({
      name: musician.name,
      email: musician.email,
      role: musician.role,
      balance: musician.balance ?? 0,
      user_id: musician.user_id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return { ...data, balance: Number(data.balance) }
}

export async function updateMusician(
  id: string,
  updates: Partial<{
    name: string
    email: string
    role: string
    balance: number
    user_id: string | null
  }>
): Promise<DbMusician> {
  const { data, error } = await supabase
    .from('musicians')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return { ...data, balance: Number(data.balance) }
}

export async function deleteMusician(id: string): Promise<void> {
  const { error } = await supabase.from('musicians').delete().eq('id', id)
  if (error) throw error
}

export async function archiveMusician(id: string): Promise<void> {
  const { data: musician, error: mErr } = await supabase
    .from('musicians')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (mErr) throw mErr
  if (!musician) throw new Error('Musiker nicht gefunden')

  const balance = Number(musician.balance)
  if (Math.abs(balance) > 0.01) {
    throw new Error('Musiker kann nur archiviert werden, wenn der Kontostand 0,00€ ist')
  }

  const { data: transactions, error: tErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('musician_id', id)
  if (tErr) throw tErr

  if ((transactions ?? []).length > 0) {
    const archiveRows = (transactions ?? []).map((t: any) => ({
      ...t,
      archived_at: new Date().toISOString(),
    }))
    const { error: aErr } = await supabase.from('transactions_archive').insert(archiveRows)
    if (aErr) throw aErr

    const { error: dErr } = await supabase
      .from('transactions')
      .delete()
      .eq('musician_id', id)
    if (dErr) throw dErr
  }

  const { error: uErr } = await supabase
    .from('musicians')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (uErr) throw uErr
}

export async function restoreMusician(id: string): Promise<void> {
  const { data: musician, error: mErr } = await supabase
    .from('musicians')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (mErr) throw mErr
  if (!musician) throw new Error('Musiker nicht gefunden')

  const { data: archivedTx, error: tErr } = await supabase
    .from('transactions_archive')
    .select('*')
    .eq('musician_id', id)
  if (tErr) throw tErr

  if ((archivedTx ?? []).length > 0) {
    const restoreRows = (archivedTx ?? []).map((t: any) => {
      const { archived_at, ...rest } = t
      return rest
    })
    const { error: iErr } = await supabase.from('transactions').insert(restoreRows)
    if (iErr) throw iErr

    const { error: dErr } = await supabase
      .from('transactions_archive')
      .delete()
      .eq('musician_id', id)
    if (dErr) throw dErr
  }

  const { error: uErr } = await supabase
    .from('musicians')
    .update({ archived_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (uErr) throw uErr
}

// ============================================
// GRUPPEN
// ============================================

export async function fetchGroups(): Promise<DbGroup[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchGroupsWithMembers(): Promise<GroupWithMembers[]> {
  const { data: groups, error: gErr } = await supabase
    .from('groups')
    .select('*')
    .order('name')
  if (gErr) throw gErr

  const { data: members, error: mErr } = await supabase
    .from('group_members')
    .select('*, musicians(name)')
  if (mErr) throw mErr

  return (groups ?? []).map((g) => ({
    ...g,
    members: (members ?? [])
      .filter((m: any) => m.group_id === g.id)
      .map((m: any) => ({
        id: m.id,
        group_id: m.group_id,
        musician_id: m.musician_id,
        percent: Number(m.percent),
        musician_name: m.musicians?.name ?? 'Unbekannt',
      })),
  }))
}

export async function fetchGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, musicians(name)')
    .eq('group_id', groupId)
  if (error) throw error
  return (data ?? []).map((m: any) => ({
    id: m.id,
    group_id: m.group_id,
    musician_id: m.musician_id,
    percent: Number(m.percent),
    musician_name: m.musicians?.name ?? 'Unbekannt',
  }))
}

export async function createGroup(
  name: string,
  members: { musician_id: string; percent: number }[]
): Promise<DbGroup> {
  const { data: group, error: gErr } = await supabase
    .from('groups')
    .insert({ name })
    .select()
    .single()
  if (gErr) throw gErr

  if (members.length > 0) {
    const { error: mErr } = await supabase.from('group_members').insert(
      members.map((m) => ({
        group_id: group.id,
        musician_id: m.musician_id,
        percent: m.percent,
      }))
    )
    if (mErr) throw mErr
  }

  return group
}

export async function updateGroup(
  id: string,
  name: string,
  members: { musician_id: string; percent: number }[]
): Promise<void> {
  const { error: gErr } = await supabase
    .from('groups')
    .update({ name })
    .eq('id', id)
  if (gErr) throw gErr

  // Replace all members
  const { error: dErr } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', id)
  if (dErr) throw dErr

  if (members.length > 0) {
    const { error: mErr } = await supabase.from('group_members').insert(
      members.map((m) => ({
        group_id: id,
        musician_id: m.musician_id,
        percent: m.percent,
      }))
    )
    if (mErr) throw mErr
  }
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// KONZERTE
// ============================================

export async function fetchConcerts(): Promise<ConcertWithExpenses[]> {
  const { data: concerts, error: cErr } = await supabase
    .from('concerts')
    .select('*, groups(name)')
    .order('date', { ascending: false })
  if (cErr) throw cErr

  const concertIds = (concerts ?? []).map((c: any) => c.id)
  let expenses: DbConcertExpense[] = []
  if (concertIds.length > 0) {
    const { data, error: eErr } = await supabase
      .from('concert_expenses')
      .select('*')
      .in('concert_id', concertIds)
    if (eErr) throw eErr
    expenses = data ?? []
  }

  return (concerts ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    location: c.location,
    date: c.date,
    time: c.time,
    netto_gage: Number(c.netto_gage),
    group_id: c.group_id,
    notes: c.notes,
    created_at: c.created_at,
    updated_at: c.updated_at,
    group_name: c.groups?.name ?? null,
    expenses: expenses
      .filter((e) => e.concert_id === c.id)
      .map((e) => ({ ...e, amount: Number(e.amount) })),
  }))
}

export async function createConcert(
  concert: {
    name: string
    location: string
    date: string
    netto_gage: number
    group_id: string | null
    notes: string
  },
  expenses: { description: string; amount: number; keyword: string }[]
): Promise<DbConcert> {
  const { data, error: cErr } = await supabase
    .from('concerts')
    .insert({
      name: concert.name,
      location: concert.location || null,
      date: concert.date || null,
      netto_gage: concert.netto_gage,
      group_id: concert.group_id,
      notes: concert.notes || null,
    })
    .select()
    .single()
  if (cErr) throw cErr

  if (expenses.length > 0) {
    const { error: eErr } = await supabase.from('concert_expenses').insert(
      expenses.map((e) => ({
        concert_id: data.id,
        description: e.description,
        amount: e.amount,
        keyword: e.keyword || null,
      }))
    )
    if (eErr) throw eErr
  }

  return { ...data, netto_gage: Number(data.netto_gage) }
}

export async function updateConcert(
  id: string,
  concert: {
    name: string
    location: string
    date: string
    netto_gage: number
    group_id: string | null
    notes: string
  },
  expenses: { description: string; amount: number; keyword: string }[]
): Promise<DbConcert> {
  const { data, error: cErr } = await supabase
    .from('concerts')
    .update({
      name: concert.name,
      location: concert.location || null,
      date: concert.date || null,
      netto_gage: concert.netto_gage,
      group_id: concert.group_id,
      notes: concert.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (cErr) throw cErr

  // Replace expenses
  const { error: dErr } = await supabase
    .from('concert_expenses')
    .delete()
    .eq('concert_id', id)
  if (dErr) throw dErr

  if (expenses.length > 0) {
    const { error: eErr } = await supabase.from('concert_expenses').insert(
      expenses.map((e) => ({
        concert_id: id,
        description: e.description,
        amount: e.amount,
        keyword: e.keyword || null,
      }))
    )
    if (eErr) throw eErr
  }

  return { ...data, netto_gage: Number(data.netto_gage) }
}

export async function deleteConcert(id: string): Promise<void> {
  await deleteTransactionsByConcert(id)
  const { error } = await supabase.from('concerts').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// BUCHUNGEN
// ============================================

export async function fetchBookings(): Promise<DbBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, groups(name)')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []).map((b: any) => ({
    id: b.id,
    description: b.description,
    amount: Number(b.amount),
    type: b.type,
    date: b.date,
    group_id: b.group_id,
    musician_id: b.musician_id,
    payout_musician_ids: b.payout_musician_ids ?? [],
    keywords: b.keywords ?? [],
    notes: b.notes,
    created_at: b.created_at,
    updated_at: b.updated_at,
    group_name: b.groups?.name ?? null,
  }))
}

export async function createBooking(booking: {
  description: string
  amount: number
  type: 'expense' | 'income' | 'payout'
  date: string
  group_id: string | null
  payout_musician_ids: string[]
  keywords: string[]
  notes: string
}): Promise<DbBooking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      description: booking.description,
      amount: booking.amount,
      type: booking.type,
      date: booking.date || null,
      group_id: booking.group_id,
      payout_musician_ids: booking.payout_musician_ids,
      keywords: booking.keywords,
      notes: booking.notes || null,
    })
    .select()
    .single()
  if (error) throw error
  return { ...data, amount: Number(data.amount) }
}

export async function updateBooking(
  id: string,
  booking: {
    description: string
    amount: number
    type: 'expense' | 'income' | 'payout'
    date: string
    group_id: string | null
    payout_musician_ids: string[]
    keywords: string[]
    notes: string
  }
): Promise<DbBooking> {
  const { data, error } = await supabase
    .from('bookings')
    .update({
      description: booking.description,
      amount: booking.amount,
      type: booking.type,
      date: booking.date || null,
      group_id: booking.group_id,
      payout_musician_ids: booking.payout_musician_ids,
      keywords: booking.keywords,
      notes: booking.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return { ...data, amount: Number(data.amount) }
}

export async function deleteBooking(id: string): Promise<void> {
  await deleteTransactionsByBooking(id)
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// TRANSAKTIONEN
// ============================================

export async function fetchTransactions(): Promise<DbTransaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []).map((t: any) => ({ ...t, amount: Number(t.amount) }))
}

export async function fetchTransactionsWithMusician() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, musicians(name), bookings(type)')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []).map((t: any) => ({
    ...t,
    amount: Number(t.amount),
    musician_name: t.musicians?.name ?? 'Unbekannt',
    booking_type: t.bookings?.type ?? null,
  }))
}

export async function fetchArchivedTransactions(): Promise<DbTransactionArchive[]> {
  const { data, error } = await supabase
    .from('transactions_archive')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []).map((t: any) => ({
    ...t,
    amount: Number(t.amount),
    created_at: t.created_at ?? null,
  }))
}

export async function fetchArchivedTransactionsWithMusician(): Promise<TransactionArchiveWithMusician[]> {
  const { data, error } = await supabase
    .from('transactions_archive')
    .select('*, musicians(name), bookings(type)')
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []).map((t: any) => ({
    ...t,
    amount: Number(t.amount),
    created_at: t.created_at ?? null,
    musician_name: t.musicians?.name ?? 'Unbekannt',
    booking_type: t.bookings?.type ?? null,
  }))
}

export async function createTransactions(
  transactions: {
    musician_id: string
    concert_id?: string | null
    booking_id?: string | null
    concert_name?: string | null
    amount: number
    date: string
    type: 'earn' | 'expense'
    description: string
  }[]
): Promise<DbTransaction[]> {
  if (transactions.length === 0) return []
  const { data, error } = await supabase
    .from('transactions')
    .insert(
      transactions.map((t) => ({
        musician_id: t.musician_id,
        concert_id: t.concert_id ?? null,
        booking_id: t.booking_id ?? null,
        concert_name: t.concert_name ?? null,
        amount: t.amount,
        date: t.date || null,
        type: t.type,
        description: t.description,
      }))
    )
    .select()
  if (error) throw error
  return (data ?? []).map((t: any) => ({ ...t, amount: Number(t.amount) }))
}

export async function deleteTransactionsByConcert(concertId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('concert_id', concertId)
  if (error) throw error
}

export async function deleteTransactionsByBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('booking_id', bookingId)
  if (error) throw error
}

export async function replaceTransactionsByConcert(
  concertId: string,
  transactions: {
    musician_id: string
    concert_name: string
    amount: number
    date: string
    type: 'earn' | 'expense'
    description: string
  }[]
): Promise<DbTransaction[]> {
  await deleteTransactionsByConcert(concertId)
  return createTransactions(
    transactions.map((t) => ({ ...t, concert_id: concertId }))
  )
}

export async function replaceTransactionsByBooking(
  bookingId: string,
  transactions: {
    musician_id: string
    concert_name: string
    amount: number
    date: string
    type: 'earn' | 'expense'
    description: string
  }[]
): Promise<DbTransaction[]> {
  await deleteTransactionsByBooking(bookingId)
  return createTransactions(
    transactions.map((t) => ({ ...t, booking_id: bookingId }))
  )
}

// ============================================
// TAGS
// ============================================

export async function fetchTags(): Promise<DbTag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createTag(name: string): Promise<DbTag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({ name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createTags(names: string[]): Promise<DbTag[]> {
  if (names.length === 0) return []
  const { data, error } = await supabase
    .from('tags')
    .upsert(
      names.map((name) => ({ name })),
      { onConflict: 'name', ignoreDuplicates: true }
    )
    .select()
  if (error) throw error
  return data ?? []
}

export async function updateTagApi(id: string, name: string): Promise<DbTag> {
  const { data, error } = await supabase
    .from('tags')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTagApi(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// APP SETTINGS
// ============================================

export async function fetchSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('app_settings').select('*')
  if (error) throw error
  const settings: Record<string, string> = {}
  ;(data ?? []).forEach((s: DbAppSetting) => {
    if (s.value !== null) settings[s.key] = s.value
  })
  return settings
}

export async function fetchSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) throw error
  return data?.value ?? null
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  const { error, status } = await supabase
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw new Error(`Setting speichern fehlgeschlagen: ${error.message}`)
  // RLS can silently block writes returning 200/201 with no error
  // Try a select to verify it was saved
  if (status === 201 || status === 200) {
    const { data } = await supabase.from('app_settings').select('value').eq('key', key).single()
    if (data?.value !== value) {
      throw new Error('Setting wurde nicht gespeichert (RLS-Berechtigung fehlt)')
    }
  }
}

export async function deleteSetting(key: string): Promise<void> {
  const { error } = await supabase.from('app_settings').delete().eq('key', key)
  if (error) throw error
}

// ============================================
// BULK DELETE (Danger Zone)
// ============================================

export async function deleteAllConcertsAndTransactions(): Promise<void> {
  const { error: tErr } = await supabase
    .from('transactions')
    .delete()
    .not('concert_id', 'is', null)
  if (tErr) throw tErr
  // Delete expenses first (FK constraint)
  const { error: eErr } = await supabase
    .from('concert_expenses')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (eErr) throw eErr
  const { error } = await supabase
    .from('concerts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}

export async function deleteAllBookingsAndTransactions(): Promise<void> {
  const { error: tErr } = await supabase
    .from('transactions')
    .delete()
    .not('booking_id', 'is', null)
  if (tErr) throw tErr
  const { error } = await supabase
    .from('bookings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}

export async function deleteAllTransactions(): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error

  const { error: aErr } = await supabase
    .from('transactions_archive')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (aErr) throw aErr
}

export async function deleteAllData(): Promise<void> {
  await deleteAllTransactions()
  const { error: ceErr } = await supabase
    .from('concert_expenses')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (ceErr) throw ceErr
  const { error: cErr } = await supabase
    .from('concerts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (cErr) throw cErr
  const { error: bErr } = await supabase
    .from('bookings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (bErr) throw bErr
}

  // ============================================
  // BACKUP & RESTORE
  // ============================================

  export interface BackupData {
    version: string
    timestamp: string
    musicians: DbMusician[]
    groups: GroupWithMembers[]
    concerts: ConcertWithExpenses[]
    bookings: DbBooking[]
    transactions: DbTransaction[]
    transactions_archive: DbTransactionArchive[]
    tags: DbTag[]
    settings: Record<string, string>
  }

  export function validateBackup(data: any): asserts data is BackupData {
    const isObj = (v: any) => v !== null && typeof v === 'object'
    if (!isObj(data)) throw new Error('Backup ist kein Objekt')

    if (typeof data.version !== 'string') throw new Error('Backup-Version fehlt oder ungültig')
    if (typeof data.timestamp !== 'string') throw new Error('Backup-Timestamp fehlt oder ungültig')

    const requireArray = (key: string) => {
      if (!Array.isArray((data as any)[key])) throw new Error(`Backup-Feld fehlt: ${key}`)
    }

    requireArray('musicians')
    requireArray('groups')
    requireArray('concerts')
    requireArray('bookings')
    requireArray('transactions')
    requireArray('transactions_archive')
    requireArray('tags')

    if (!isObj(data.settings)) throw new Error('Backup-Feld fehlt: settings')
  }

  export async function exportBackup(): Promise<BackupData> {
    const [musicians, groups, concerts, bookings, transactions, transactionsArchive, tags, settings] = await Promise.all([
      fetchAllMusicians(),
      fetchGroupsWithMembers(),
      fetchConcerts(),
      fetchBookings(),
      fetchTransactions(),
      fetchArchivedTransactions(),
      fetchTags(),
      fetchSettings(),
    ])

    return {
      version: '2.0',
      timestamp: new Date().toISOString(),
      musicians,
      groups,
      concerts,
      bookings,
      transactions,
      transactions_archive: transactionsArchive,
      tags,
      settings,
    }
  }

  export async function importBackup(data: BackupData): Promise<void> {
    // Destructive restore: delete all existing data, then insert backup
    await deleteAllDataForRestore()

    if (data.musicians?.length) {
      const { error } = await supabase.from('musicians').insert(data.musicians)
      if (error) throw error
    }

    if (data.groups?.length) {
      const groups = data.groups.map(({ members, ...group }) => group)
      const { error } = await supabase.from('groups').insert(groups)
      if (error) throw error

      const groupMembers = data.groups.flatMap((g) =>
        (g.members ?? []).map((m) => ({
          id: m.id,
          group_id: m.group_id,
          musician_id: m.musician_id,
          percent: m.percent,
        }))
      )
      if (groupMembers.length > 0) {
        const { error: mErr } = await supabase.from('group_members').insert(groupMembers)
        if (mErr) throw mErr
      }
    }

    if (data.concerts?.length) {
      const concerts = data.concerts.map((c: any) => {
        const { expenses, group_name, ...rest } = c
        return rest
      })
      const { error } = await supabase.from('concerts').insert(concerts)
      if (error) throw error

      const expenses = data.concerts.flatMap((c: any) => c.expenses ?? [])
      if (expenses.length > 0) {
        const { error: eErr } = await supabase.from('concert_expenses').insert(expenses)
        if (eErr) throw eErr
      }
    }

    if (data.bookings?.length) {
      const { error } = await supabase.from('bookings').insert(data.bookings)
      if (error) throw error
    }

    if (data.transactions?.length) {
      const { error } = await supabase.from('transactions').insert(data.transactions)
      if (error) throw error
    }

    if (data.transactions_archive?.length) {
      const { error } = await supabase
        .from('transactions_archive')
        .insert(data.transactions_archive)
      if (error) throw error
    }

    if (data.tags?.length) {
      const { error } = await supabase.from('tags').insert(data.tags)
      if (error) throw error
    }

    if (data.settings) {
      const settings = Object.entries(data.settings).map(([key, value]) => ({ key, value }))
      if (settings.length > 0) {
        const { error } = await supabase.from('app_settings').insert(settings)
        if (error) throw error
      }
    }
  }

  async function deleteAllDataForRestore(): Promise<void> {
    const emptyUuid = '00000000-0000-0000-0000-000000000000'

    const { error: tErr } = await supabase.from('transactions').delete().neq('id', emptyUuid)
    if (tErr) throw tErr

    const { error: taErr } = await supabase.from('transactions_archive').delete().neq('id', emptyUuid)
    if (taErr) throw taErr

    const { error: ceErr } = await supabase.from('concert_expenses').delete().neq('id', emptyUuid)
    if (ceErr) throw ceErr

    const { error: bErr } = await supabase.from('bookings').delete().neq('id', emptyUuid)
    if (bErr) throw bErr

    const { error: cErr } = await supabase.from('concerts').delete().neq('id', emptyUuid)
    if (cErr) throw cErr

    const { error: gmErr } = await supabase.from('group_members').delete().neq('id', emptyUuid)
    if (gmErr) throw gmErr

    const { error: gErr } = await supabase.from('groups').delete().neq('id', emptyUuid)
    if (gErr) throw gErr

    const { error: tagErr } = await supabase.from('tags').delete().neq('id', emptyUuid)
    if (tagErr) throw tagErr

    const { error: sErr } = await supabase.from('app_settings').delete().neq('key', '__never__')
    if (sErr) throw sErr

    const { error: mErr } = await supabase.from('musicians').delete().neq('id', emptyUuid)
    if (mErr) throw mErr
  }

  // ============================================
  // CSV EXPORT
  // ============================================

  export async function exportTransactionsCSV(): Promise<string> {
    const transactions = await fetchTransactionsWithMusician()
  
    const header = 'Datum,Musiker,Typ,Betrag,Beschreibung,Konzert\n'
    const rows = transactions.map((t) => {
      const date = t.date || ''
      const musician = t.musician_name
      const type = t.type === 'earn' ? 'Einnahme' : 'Ausgabe'
      const amount = t.amount.toFixed(2)
      const description = `"${(t.description || '').replace(/"/g, '""')}"` // CSV escape
      const concert = `"${(t.concert_name || '').replace(/"/g, '""')}"`
      return `${date},${musician},${type},${amount},${description},${concert}`
    })

    return header + rows.join('\n')
  }

  export async function exportArchivedTransactionsCSV(): Promise<string> {
    const transactions = await fetchArchivedTransactionsWithMusician()

    const header = 'Datum,Musiker,Typ,Betrag,Beschreibung,Konzert,Archiviert\n'
    const rows = transactions.map((t) => {
      const date = t.date || ''
      const musician = t.musician_name
      const type = t.type === 'earn' ? 'Einnahme' : 'Ausgabe'
      const amount = t.amount.toFixed(2)
      const description = `"${(t.description || '').replace(/"/g, '""')}"`
      const concert = `"${(t.concert_name || '').replace(/"/g, '""')}"`
      const archived = t.archived_at ? new Date(t.archived_at).toISOString().split('T')[0] : ''
      return `${date},${musician},${type},${amount},${description},${concert},${archived}`
    })

    return header + rows.join('\n')
  }
