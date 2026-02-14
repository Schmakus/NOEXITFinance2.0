// ============================================
// TypeScript-Typen für Supabase-Tabellen
// ============================================

export interface DbMusician {
  id: string
  user_id: string | null
  name: string
  email: string
  role: 'administrator' | 'superuser' | 'user'
  balance: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface DbGroup {
  id: string
  name: string
  created_at: string
}

export interface DbGroupMember {
  id: string
  group_id: string
  musician_id: string
  percent: number
}

export interface DbConcert {
  id: string
  name: string
  location: string | null
  date: string | null
  time: string | null
  netto_gage: number
  group_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbConcertExpense {
  id: string
  concert_id: string
  description: string
  amount: number
  keyword: string | null
}

export interface DbBooking {
  id: string
  description: string
  amount: number
  type: 'expense' | 'income' | 'payout'
  date: string | null
  group_id: string | null
  musician_id: string | null
  payout_musician_ids: string[]
  keywords: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbTransaction {
  id: string
  musician_id: string
  concert_id: string | null
  booking_id: string | null
  concert_name: string | null
  amount: number
  date: string | null
  type: 'earn' | 'expense'
  description: string | null
  created_at: string
}

export interface DbTransactionArchive {
  id: string
  musician_id: string | null
  concert_id: string | null
  booking_id: string | null
  concert_name: string | null
  amount: number
  date: string | null
  type: 'earn' | 'expense'
  description: string | null
  created_at: string | null
  archived_at: string
}

export interface DbTag {
  id: string
  name: string
  created_at: string
}

export interface DbAppSetting {
  key: string
  value: string | null
}

export interface DbPayoutRequest {
  id: string
  musician_id: string
  amount: number
  note: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  pdf_url?: string | null
}

// ============================================
// Erweiterte Typen (mit Joins / für die UI)
// ============================================

export interface GroupMemberWithName extends DbGroupMember {
  musician_name: string
}

export interface GroupWithMembers extends DbGroup {
  members: GroupMemberWithName[]
}

export interface ConcertWithExpenses extends DbConcert {
  expenses: DbConcertExpense[]
  group_name?: string
}

export interface BookingWithDetails extends DbBooking {
  group_name?: string
}

export interface TransactionWithMusician extends DbTransaction {
  musician_name?: string
  booking_type?: 'expense' | 'income' | 'payout' | null
}

export interface TransactionArchiveWithMusician extends DbTransactionArchive {
  musician_name?: string
  booking_type?: 'expense' | 'income' | 'payout' | null
}

export interface PayoutRequestWithMusician extends DbPayoutRequest {
  musician_name: string
  reviewed_by_name?: string
  pdf_url?: string | null
}
