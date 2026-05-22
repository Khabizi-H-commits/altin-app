import { useEffect, useState } from 'react'
import { ExpertNav } from '@/components/layout/ExpertNav'
import { supabase } from '@/lib/supabase'

type Inscription = {
  id: string
  nom: string
  prenom: string
  email: string
  telephone: string
  status: string
  created_at: string
  documents: { name: string; url: string }[]
  sessions: { formation_name: string; date_debut: string; date_fin: string | null; duree: string }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-800' },
  confirme: { label: 'Confirmé', color: 'bg-green-100 text-green-800' },
  refuse: { label: 'Refusé', color: 'bg-red-100 text-red-800' },
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

export default function ExpertFormationsPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('tous')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('inscriptions')
      .select('*, sessions(formation_name, date_debut, date_fin, duree)')
      .order('created_at', { ascending: false })
    setInscriptions((data ?? []) as Inscription[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    await supabase.from('inscriptions').update({ status }).eq('id', id)
    await load()
    setUpdating(null)
  }

  const filtered = filter === 'tous' ? inscriptions : inscriptions.filter(i => i.status === filter)

  const counts = {
    tous: inscriptions.length,
    en_attente: inscriptions.filter(i => i.status === 'en_attente').length,
    confirme: inscriptions.filter(i => i.status === 'confirme').length,
    refuse: inscriptions.filter(i => i.status === 'refuse').length,
  }

  return (
    <div className="min-h-screen bg-paper-2">
      <ExpertNav />
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-ink">Inscriptions formations</h1>
            <p className="text-sm text-muted mt-0.5">{inscriptions.length} candidature{inscriptions.length > 1 ? 's' : ''} reçue{inscriptions.length > 1 ? 's' : ''}</p>
          </div>
          <a href="/formations" target="_blank"
            className="text-sm text-primary hover:underline flex items-center gap-1">
            Voir la page publique →
          </a>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-4">
          {(['tous', 'en_attente', 'confirme', 'refuse'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary text-white' : 'bg-paper text-muted hover:text-ink border border-paper-2'
              }`}
            >
              {f === 'tous' ? 'Tous' : STATUS_LABELS[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-paper rounded-xl border border-paper-2">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-semibold text-ink">Aucune inscription</p>
            <p className="text-sm text-muted mt-1">Les candidatures apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ins => (
              <div key={ins.id} className="bg-paper rounded-xl border border-paper-2 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-ink">{ins.prenom} {ins.nom}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[ins.status]?.color ?? 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_LABELS[ins.status]?.label ?? ins.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-primary">{ins.sessions?.formation_name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {ins.sessions?.date_debut && formatDate(ins.sessions.date_debut)}
                      {ins.sessions?.date_fin && ins.sessions.date_fin !== ins.sessions.date_debut && ` → ${formatDate(ins.sessions.date_fin)}`}
                      {' · '}{ins.sessions?.duree}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                      <span>✉ {ins.email}</span>
                      <span>📞 {ins.telephone}</span>
                      <span>📅 {formatDate(ins.created_at)}</span>
                    </div>

                    {/* Documents */}
                    {ins.documents && ins.documents.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {ins.documents.map((doc, i) => (
                          <a
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-paper-2 rounded-lg text-xs text-ink hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            📎 {doc.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {ins.status !== 'confirme' && (
                      <button
                        onClick={() => updateStatus(ins.id, 'confirme')}
                        disabled={updating === ins.id}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        ✓ Confirmer
                      </button>
                    )}
                    {ins.status !== 'refuse' && (
                      <button
                        onClick={() => updateStatus(ins.id, 'refuse')}
                        disabled={updating === ins.id}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        ✗ Refuser
                      </button>
                    )}
                    {ins.status !== 'en_attente' && (
                      <button
                        onClick={() => updateStatus(ins.id, 'en_attente')}
                        disabled={updating === ins.id}
                        className="px-3 py-1.5 border border-paper-2 text-muted rounded-lg text-xs hover:text-ink transition-colors disabled:opacity-50"
                      >
                        Remettre en attente
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
