import { useEffect, useState } from 'react'
import { ExpertNav } from '@/components/layout/ExpertNav'
import { Pill } from '@/components/ui/Pill'
import { useDossierStore } from '@/stores/dossierStore'
import { useAuthStore } from '@/stores/authStore'
import { STEP_LABELS } from '@/types'
import { Link } from 'react-router-dom'

export default function ExpertAgendaPage() {
  const { profile } = useAuthStore()
  const { dossiers, fetchDossiers } = useDossierStore()
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (profile?.id) fetchDossiers(profile.id, profile.role === 'admin')
  }, [profile?.id])

  // Générer les 7 prochains jours
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })

  const activeDossiers = dossiers.filter(d => d.status === 'active')

  return (
    <div className="min-h-screen bg-paper-2">
      <ExpertNav />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-ink mb-6">Agenda</h1>

        {/* Sélecteur semaine */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {days.map(day => {
            const iso = day.toISOString().split('T')[0]
            const isSelected = iso === selectedDate
            const isToday = iso === new Date().toISOString().split('T')[0]
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={`flex flex-col items-center px-4 py-3 rounded-md border shrink-0 transition-all ${
                  isSelected ? 'bg-primary border-primary text-white' :
                  isToday ? 'border-accent text-ink bg-paper' :
                  'border-paper-2 text-muted bg-paper hover:border-primary/30'
                }`}
              >
                <span className="text-xs font-medium uppercase">
                  {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </span>
                <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-ink'}`}>
                  {day.getDate()}
                </span>
                <span className="text-xs">
                  {day.toLocaleDateString('fr-FR', { month: 'short' })}
                </span>
              </button>
            )
          })}
        </div>

        {/* Dossiers du jour sélectionné */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-ink mb-4">
              Visites — {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            {activeDossiers.length === 0 ? (
              <div className="bg-paper rounded-md border border-paper-2 p-8 text-center">
                <p className="text-sm text-muted">Aucune visite planifiée</p>
                <p className="text-xs text-muted/70 mt-1">Les visites apparaîtront ici une fois planifiées</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pour l'instant on affiche tous les dossiers actifs — à lier à une table d'agenda en V2 */}
                {activeDossiers.slice(0, 3).map((dossier, i) => (
                  <Link
                    key={dossier.id}
                    to={`/expert/dossier/${dossier.ref}`}
                    className="bg-paper rounded-md border border-paper-2 p-4 flex items-center gap-4 hover:border-primary/30 transition-colors block"
                  >
                    <div className="text-center shrink-0">
                      <p className="text-sm font-bold text-ink">{8 + i * 2}h00</p>
                      <p className="text-xs text-muted">~2h</p>
                    </div>
                    <div className="w-px h-10 bg-paper-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">{dossier.ref}</p>
                      <p className="text-xs text-muted truncate">{dossier.address ?? 'Adresse non renseignée'}</p>
                      <Pill variant="primary">{STEP_LABELS[dossier.current_step]}</Pill>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Résumé semaine */}
          <div>
            <h2 className="text-sm font-semibold text-ink mb-4">Résumé de la semaine</h2>
            <div className="bg-paper rounded-md border border-paper-2 p-5 space-y-4">
              {[
                { label: 'Dossiers à traiter', value: activeDossiers.length },
                { label: 'Étape Contact', value: activeDossiers.filter(d => d.current_step === 1).length },
                { label: 'Étape Visite', value: activeDossiers.filter(d => d.current_step === 2).length },
                { label: 'Étape Analyse', value: activeDossiers.filter(d => d.current_step === 3).length },
                { label: 'Étape Suivi', value: activeDossiers.filter(d => d.current_step === 4).length },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-sm text-muted">{item.label}</span>
                  <span className="text-sm font-semibold text-ink">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
