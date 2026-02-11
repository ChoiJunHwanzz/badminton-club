export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// 역할: 모임장, 고문, 운영진, 회원
export type MemberRole = 'leader' | 'advisor' | 'staff' | 'member'

// 실력: 랠리X, 랠리O, 왕초심, 초심, D조, C조, B조, A조
export type MemberLevel = 'rally_x' | 'rally_o' | 'very_beginner' | 'beginner' | 'd_class' | 'c_class' | 'b_class' | 'a_class'

// 상태: 활동, 탈퇴, 강퇴
export type MemberStatus = 'active' | 'left' | 'kicked'

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: string
          name: string
          nickname: string | null
          role: MemberRole
          join_date: string
          phone: string | null
          level: MemberLevel
          status: MemberStatus
          email: string | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          nickname?: string | null
          role?: MemberRole
          join_date?: string
          phone?: string | null
          level?: MemberLevel
          status?: MemberStatus
          email?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          nickname?: string | null
          role?: MemberRole
          join_date?: string
          phone?: string | null
          level?: MemberLevel
          status?: MemberStatus
          email?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          member_id: string
          amount: number
          payment_month: string
          paid_date: string | null
          method: 'cash' | 'transfer' | 'card' | null
          status: 'paid' | 'unpaid' | 'partial'
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          amount: number
          payment_month: string
          paid_date?: string | null
          method?: 'cash' | 'transfer' | 'card' | null
          status?: 'paid' | 'unpaid' | 'partial'
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          amount?: number
          payment_month?: string
          paid_date?: string | null
          method?: 'cash' | 'transfer' | 'card' | null
          status?: 'paid' | 'unpaid' | 'partial'
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meetings: {
        Row: {
          id: string
          meeting_date: string
          location: string
          start_time: string | null
          end_time: string | null
          attendee_count: number
          staff_attendance: { memberId: string; status: 'attending' | 'pending' | 'absent' }[] | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_date: string
          location: string
          start_time?: string | null
          end_time?: string | null
          attendee_count?: number
          staff_attendance?: { memberId: string; status: 'attending' | 'pending' | 'absent' }[] | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_date?: string
          location?: string
          start_time?: string | null
          end_time?: string | null
          attendee_count?: number
          staff_attendance?: { memberId: string; status: 'attending' | 'pending' | 'absent' }[] | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      attendances: {
        Row: {
          id: string
          meeting_id: string
          member_id: string
          status: 'present' | 'absent' | 'late'
          created_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          member_id: string
          status?: 'present' | 'absent' | 'late'
          created_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          member_id?: string
          status?: 'present' | 'absent' | 'late'
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          meeting_id: string
          court_number: number
          round: number
          team1_player1_id: string
          team1_player2_id: string | null
          team2_player1_id: string
          team2_player2_id: string | null
          team1_score: number | null
          team2_score: number | null
          status: 'scheduled' | 'playing' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          court_number: number
          round: number
          team1_player1_id: string
          team1_player2_id?: string | null
          team2_player1_id: string
          team2_player2_id?: string | null
          team1_score?: number | null
          team2_score?: number | null
          status?: 'scheduled' | 'playing' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          court_number?: number
          round?: number
          team1_player1_id?: string
          team1_player2_id?: string | null
          team2_player1_id?: string
          team2_player2_id?: string | null
          team1_score?: number | null
          team2_score?: number | null
          status?: 'scheduled' | 'playing' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      member_registrations: {
        Row: {
          id: string
          member_id: string
          introduction: boolean
          fee_paid: boolean
          is_rejoin: boolean
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          introduction?: boolean
          fee_paid?: boolean
          is_rejoin?: boolean
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          introduction?: boolean
          fee_paid?: boolean
          is_rejoin?: boolean
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          username: string
          password: string
          name: string
          role: 'admin' | 'user'
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          password: string
          name: string
          role?: 'admin' | 'user'
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          password?: string
          name?: string
          role?: 'admin' | 'user'
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      member_role: MemberRole
      member_level: MemberLevel
      member_status: MemberStatus
      payment_status: 'paid' | 'unpaid' | 'partial'
      payment_method: 'cash' | 'transfer' | 'card'
      attendance_status: 'present' | 'absent' | 'late'
      match_status: 'scheduled' | 'playing' | 'completed'
    }
  }
}

// 편의용 타입 별칭
export type Member = Database['public']['Tables']['members']['Row']
export type MemberInsert = Database['public']['Tables']['members']['Insert']
export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type Meeting = Database['public']['Tables']['meetings']['Row']
export type MeetingInsert = Database['public']['Tables']['meetings']['Insert']
export type Attendance = Database['public']['Tables']['attendances']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']
export type MemberRegistration = Database['public']['Tables']['member_registrations']['Row']
export type MemberRegistrationInsert = Database['public']['Tables']['member_registrations']['Insert']
