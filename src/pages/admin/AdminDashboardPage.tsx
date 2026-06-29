import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Pill } from '@/components/ui/Pill'
import type { Dossier } from '@/types'

type Owner = { full_name: string | null; role: string; initials: string | null }
type DossierWithOwner = Dossier & { owner: Owner | null }

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif', closed: 'Clôturé', pending: 'En attente',
}

export default function AdminDashboardPage() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [dossiers, setDossiers] = useState<DossierWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [groupe, setGroupe] = useState<'tous' | 'partenaire' | 'expert'>('tous')
  const [ownerFilter, setOwnerFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      // RLS : l'admin reçoit TOUS les dossiers (cf. partenaire_admin.sql).
      // Jointure sur expert_id (le professionnel propriétaire).
      const { data } = await supabase
        .from('dossiers')
        .select('*, owner:profiles!expert_id(full_name, role, initials)')
        .order('opened_at', { ascending: false })
      setDossiers((data as DossierWithOwner[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  // Liste des propriétaires distincts (pour le filtre).
  const owners = useMemo(() => {
    const map = new Map<string, { name: string; role: string }>()
    dossiers.forEach(d => {
      if (d.expert_id && d.owner) {
        map.set(d.expert_id, { name: d.owner.full_name ?? '—', role: d.owner.role })
      }
    })
    return [...map.entries()].map(([id, v]) => ({ id, ...v }))
  }, [dossiers])

  const filtered = useMemo(() => {
    return dossiers.filter(d => {
      if (groupe !== 'tous' && d.owner?.role !== groupe) return false
      if (ownerFilter && d.expert_id !== ownerFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${d.ref} ${d.type} ${d.address ?? ''} ${d.owner?.full_name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [dossiers, groupe, ownerFilter, search])

  const stats = useMemo(() => ({
    total: dossiers.length,
    actifs: dossiers.filter(d => d.status === 'active').length,
    partenaires: new Set(dossiers.filter(d => d.owner?.role === 'partenaire').map(d => d.expert_id)).size,
    experts: new Set(dossiers.filter(d => d.owner?.role === 'expert').map(d => d.expert_id)).size,
  }), [dossiers])

  return (
    <div className="min-h-screen bg-paper-2">
      {/* Barre admin */}
      <nav className="bg-primary text-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ALT'IN" className="h-8 w-8 object-contain bg-white rounded p-0.5" />
          <span className="font-bold text-lg tracking-tight">ALT'IN<span className="text-accent">.</span></span>
          <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide bg-accent text-primary px-2 py-0.5 rounded-full">
            Administration
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm opacity-90">{profile?.full_name}</span>
          <button onClick={handleSignOut} className="text-sm opacity-80 hover:opacity-100 transition-opacity">
            Déconnexion
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">Cockpit administrateur</h1>
          <p className="text-sm text-muted mt-1">Vue globale sur tous les dossiers, partenaires et experts.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Dossiers (total)', value: stats.total, color: 'text-primary' },
            { label: 'Dossiers actifs', value: stats.actifs, color: 'text-accent' },
            { label: 'Partenaires actifs', value: stats.partenaires, color: 'text-green-600' },
            { label: 'Experts actifs', value: stats.experts, color: 'text-ink' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-paper rounded-md border border-paper-2 p-5">
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-sm text-muted mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex bg-paper-2 rounded-md p-1 border border-paper-2">
            {(['tous', 'partenaire', 'expert'] as const).map(g => (
              <button
                key={g}
                onClick={() => { setGroupe(g); setOwnerFilter('') }}
                className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-all capitalize ${
                  groupe === g ? 'bg-paper text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {g === 'tous' ? 'Tous' : g === 'partenaire' ? 'Partenaires' : 'Experts'}
              </button>
            ))}
          </div>

          <select
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
            className="px-3 py-2 rounded-sm border border-paper-2 bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Tous les comptes</option>
            {owners
              .filter(o => groupe === 'tous' || o.role === groupe)
              .map(o => <option key={o.id} value={o.id}>{o.name} ({o.role})</option>)}
          </select>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher (réf, client, adresse…)"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-sm border border-paper-2 bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Tableau */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-paper rounded-md border border-paper-2 p-12 text-center">
            <p className="text-3xl mb-3">📂</p>
            <p className="font-semibold text-ink">Aucun dossier</p>
            <p className="text-sm text-muted mt-2">Aucun dossier ne correspond à ces filtres.</p>
          </div>
        ) : (
          <div className="bg-paper rounded-md border border-paper-2 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper-2 text-left text-muted text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Propriétaire</th>
                  <th className="px-4 py-3 font-semibold">Réf.</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Adresse</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold text-right">Avancement</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-t border-paper-2 hover:bg-paper-2/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{d.owner?.full_name ?? '—'}</span>
                        <Pill variant={d.owner?.role === 'partenaire' ? 'accent' : 'primary'}>
                          {d.owner?.role === 'partenaire' ? 'Partenaire' : 'Expert'}
                        </Pill>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{d.ref}</td>
                    <td className="px-4 py-3 text-muted">{d.type}</td>
                    <td className="px-4 py-3 text-muted truncate max-w-[200px]">{d.address ?? '—'}</td>
                    <td className="px-4 py-3">{STATUS_LABEL[d.status] ?? d.status}</td>
                    <td className="px-4 py-3 text-right text-muted">{Math.round((d.progress ?? 0) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
