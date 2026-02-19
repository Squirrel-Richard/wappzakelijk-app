import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export type Conversation = {
  id: string
  company_id: string
  contact_id: string
  status: string
  assigned_to: string | null
  labels: string[]
  last_message_at: string | null
  created_at: string
  contact?: {
    id: string
    naam: string | null
    telefoon: string
    labels: string[]
    opt_in: boolean
  }
}

export type Message = {
  id: string
  conversation_id: string
  richting: 'inkomend' | 'uitgaand'
  type: string
  inhoud: string | null
  media_url: string | null
  status: string
  created_at: string
}
