import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Dossier, DossierStep, Message, Activity } from '@/types'

interface DossierState {
  dossiers: Dossier[]
  loading: boolean
  fetchDossiers: (expertId: string, isAdmin?: boolean) => Promise<void>
  validateStep: (dossierId: string, stepNum: number) => Promise<void>
}

export const useDossierStore = create<DossierState>((set, get) => ({
  dossiers: [],
  loading: false,

  // isAdmin = true => récupère TOUS les dossiers (de tous les pros), avec le
  // propriétaire (owner) pour pouvoir l'afficher. Sinon, uniquement les siens.
  fetchDossiers: async (expertId, isAdmin = false) => {
    set({ loading: true })
    let query = supabase
      .from('dossiers')
      .select('*, owner:profiles!expert_id(full_name, role)')
    if (!isAdmin) query = query.eq('expert_id', expertId)
    const { data } = await query.order('opened_at', { ascending: false })
    set({ dossiers: (data as Dossier[]) ?? [], loading: false })
  },

  validateStep: async (dossierId, stepNum) => {
    await supabase
      .from('dossier_steps')
      .update({ status: 'done', validated_at: new Date().toISOString() })
      .eq('dossier_id', dossierId)
      .eq('step_num', stepNum)
    // Refresh dossiers
    const { data: profile } = await supabase.auth.getUser()
    if (profile.user) get().fetchDossiers(profile.user.id)
  },
}))

// Fonctions utilitaires pour fetcher par ref
export async function fetchDossierByRef(ref: string) {
  const { data } = await supabase
    .from('dossiers')
    .select('*')
    .eq('ref', ref)
    .single()
  return data as Dossier | null
}

export async function fetchDossierSteps(dossierId: string) {
  const { data } = await supabase
    .from('dossier_steps')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('step_num')
  return (data ?? []) as DossierStep[]
}

export async function fetchMessages(dossierId: string) {
  const { data } = await supabase
    .from('messages')
    .select('*, profiles!from_id(full_name, initials, role)')
    .eq('dossier_id', dossierId)
    .order('created_at')
  return (data ?? []) as (Message & { profiles: { full_name: string; initials: string; role: string } })[]
}

export async function fetchActivity(dossierId: string) {
  const { data } = await supabase
    .from('activity')
    .select('*, profiles!actor_id(full_name, initials)')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .limit(10)
  return (data ?? []) as (Activity & { profiles: { full_name: string; initials: string } })[]
}
