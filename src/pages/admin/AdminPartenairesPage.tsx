import { useEffect, useState } from 'react'
import { ExpertNav } from '@/components/layout/ExpertNav'
import { Pill } from '@/components/ui/Pill'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export default function AdminPartenairesPage() {
  const [partners, setPartners] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['pending', 'partenaire'])
      .order('created_at', { ascending: false })
    setPartners((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const setRole = async (id: string, role: 'partenaire' | 'pending') => {
    setBusyId(id)
    await supabase.from('profiles').update({ role }).eq('id', id)
    setBusyId(null)
    load()
  }

  const pending = partners.filter(p => p.role === 'pending')
  const actifs = partners.filter(p => p.role === 'partenaire')

  return (
    <div className="min-h-screen bg-paper-2">
      <ExpertNav />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-ink mb-1">Partenaires</h1>
        <p className="text-sm text-muted mb-8">
          Validez les demandes d'inscription et gérez vos partenaires.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Demandes en attente */}
            <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              Demandes en attente
              {pending.length > 0 && (
                <span className="bg-accent text-primary text-xs font-bold rounded-full px-2 py-0.5">
                  {pending.length}
                </span>
              )}
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted mb-8">Aucune demande en attente.</p>
            ) : (
              <div className="bg-paper rounded-md border border-paper-2 divide-y divide-paper-2 mb-8">
                {pending.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-4 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">{p.full_name || '(sans nom)'}</p>
                      <p className="text-xs text-muted truncate">
                        Demande du {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <button
                      onClick={() => setRole(p.id, 'partenaire')}
                      disabled={busyId === p.id}
                      className="shrink-0 px-4 py-2 bg-primary text-white rounded-sm text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {busyId === p.id ? '…' : 'Activer'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Partenaires actifs */}
            <h2 className="text-sm font-semibold text-ink mb-3">
              Partenaires actifs ({actifs.length})
            </h2>
            {actifs.length === 0 ? (
              <p className="text-sm text-muted">Aucun partenaire actif pour l'instant.</p>
            ) : (
              <div className="bg-paper rounded-md border border-paper-2 divide-y divide-paper-2">
                {actifs.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-4 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate flex items-center gap-2">
                        {p.full_name || '(sans nom)'} <Pill variant="accent">Actif</Pill>
                      </p>
                    </div>
                    <button
                      onClick={() => setRole(p.id, 'pending')}
                      disabled={busyId === p.id}
                      className="shrink-0 px-4 py-2 bg-transparent text-red-600 border border-red-200 rounded-sm text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {busyId === p.id ? '…' : 'Suspendre'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
