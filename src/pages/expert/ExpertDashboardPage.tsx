import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExpertNav } from '@/components/layout/ExpertNav'
import { StepRing } from '@/components/ui/StepRing'
import { Pill } from '@/components/ui/Pill'
import { useDossierStore } from '@/stores/dossierStore'
import { useAuthStore } from '@/stores/authStore'
import { STEP_LABELS } from '@/types'

export default function ExpertDashboardPage() {
  const { profile } = useAuthStore()
  const { dossiers, loading, fetchDossiers } = useDossierStore()

  useEffect(() => {
    if (profile?.id) fetchDossiers(profile.id)
  }, [profile?.id])

  const actifs = dossiers.filter(d => d.status === 'active')
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-paper-2">
      <ExpertNav />
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-muted capitalize">{today}</p>
          <h1 className="text-2xl font-bold text-ink mt-1">
            Bonjour, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'En cours', value: actifs.filter(d => d.current_step < 6).length, color: 'text-primary' },
            { label: 'À clôturer', value: actifs.filter(d => d.current_step === 6).length, color: 'text-accent' },
            { label: 'Terminés', value: dossiers.filter(d => d.status === 'closed').length, color: 'text-green-600' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-paper rounded-md border border-paper-2 p-5">
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-sm text-muted mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Dossiers actifs */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Dossiers actifs</h2>
          <Link to="/expert/dossiers" className="text-sm text-primary hover:underline">
            Voir tous →
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && actifs.length === 0 && (
          <div className="bg-paper rounded-md border border-paper-2 p-12 text-center">
            <p className="text-3xl mb-3">📂</p>
            <p className="font-semibold text-ink">Aucun dossier actif</p>
            <p className="text-sm text-muted mt-2">
              Créez votre premier dossier client dans la section Dossiers.
            </p>
            <Link
              to="/expert/dossiers"
              className="mt-4 inline-block bg-primary text-white text-sm font-semibold px-4 py-2 rounded-sm hover:opacity-90 transition-opacity"
            >
              Gérer les dossiers
            </Link>
          </div>
        )}

        {!loading && actifs.length > 0 && (
          <div className="grid gap-3">
            {actifs.map(dossier => (
              <Link
                key={dossier.id}
                to={`/expert/dossier/${dossier.ref}`}
                className="bg-paper rounded-md border border-paper-2 p-5 flex items-center gap-5 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <StepRing currentStep={dossier.current_step} progress={dossier.progress} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-ink text-sm">{dossier.ref}</span>
                    <Pill variant="primary">{dossier.type}</Pill>
                  </div>
                  <p className="text-sm text-muted truncate">{dossier.address ?? 'Adresse non renseignée'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Étape</p>
                  <p className="text-sm font-medium text-ink">{STEP_LABELS[dossier.current_step]}</p>
                </div>
                <span className="text-muted">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
