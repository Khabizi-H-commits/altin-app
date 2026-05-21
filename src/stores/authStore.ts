import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthState {
  profile: Profile | null
  loading: boolean
  setProfile: (profile: Profile | null) => void
  signOut: () => Promise<void>
  loadProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  loading: true,

  setProfile: (profile) => set({ profile, loading: false }),

  loadProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    set({ profile: data, loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ profile: null })
  },
}))
