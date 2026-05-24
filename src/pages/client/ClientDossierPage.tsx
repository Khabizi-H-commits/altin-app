import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { ClientNav } from '@/components/layout/ClientNav'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { STEP_LABELS, type Dossier, type DossierStep, type Activity } from '@/types'

const STEP_DESC: Record<number, string> = {
  1: 'Votre demande a été reçue. Notre expert vous contactera sous 48h.',
  2: 'L\'expert se déplace sur place pour constater les dégâts.',
  3: 'Analyse approfondie et chiffrage des dommages en cours.',
  4: 'Votre dossier est en cours de finalisation.',
  5: 'Le rapport d\'expertise est en cours de rédaction.',
  6: 'Votre dossier est terminé. Merci de votre confiance.',
}

export default function ClientDossierPage() {
  const { ref } = useParams<{ ref: string }>()
  const { profile } = useAuthStore()
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [steps, setSteps] = useState<DossierStep[]>([])
  const [activity, setActivity] = useState<(Activity & { profiles: { full_name: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [redirectRef, setRedirectRef] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      setLoading(true)

      // Si pas de ref, chercher le dernier dossier actif du client
      if (!ref || ref === 'undefined') {
        const { data } = await supabase
          .from('dossiers')
          .select('ref')
          .eq('client_id', profile.id)
          .in('status', ['active', 'closed'])
          .order('opened_at', { ascending: false })
          .limit(1)
          .single()
        if (data) { setRedirectRef(data.ref); return }
        setLoading(false)
        return
      }

      const { data: d } = await supabase
        .from('dossiers').select('*').eq('ref', ref).single()
      setDossier(d)

      if (d) {
        const [{ data: s }, { data: a }] = await Promise.all([
          supabase.from('dossier_steps').select('*').eq('dossier_id', d.id).order('step_num'),
          supabase.from('activity')
            .select('*, profiles!actor_id(full_name)')
            .eq('dossier_id', d.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ])
        setSteps(s ?? [])
        setActivity((a ?? []) as any)
      }
      setLoading(false)
    }
    load()
  }, [ref, profile])

  if (redirectRef) return <Navigate to={`/client/dossier/${redirectRef}`} replace />

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-2">
        <ClientNav />
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!dossier) {
    return (
      <div className="min-h-screen bg-paper-2">
        <ClientNav />
        <div className="max-w-lg mx-auto px-4 py-16 text-center pb-24">
          <p className="text-4xl mb-4">📂</p>
          <p className="font-semibold text-ink">Aucun dossier trouvé</p>
          <p className="text-sm text-muted mt-2">
            Votre expert n'a pas encore créé votre dossier. Vous recevrez un email dès qu'il sera ouvert.
          </p>
        </div>
      </div>
    )
  }

  const currentStep = steps.find(s => s.status === 'in_progress')

  return (
    <div className="min-h-screen bg-paper-2">
      <ClientNav />
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">

        {/* Hero card */}
        <div className="bg-primary rounded-lg p-6 mb-4 text-white">
          <p className="text-xs font-semibold opacity-70 uppercase tracking-wide mb-1">{dossier.ref}</p>
          <h1 className="text-xl font-bold mb-1">{dossier.type}</h1>
          <p className="text-sm opacity-70 mb-5">{dossier.address}</p>

          {/* Ring progression */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg width="64" height="64" className="-rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26" fill="none"
                  stroke="white" strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 - (dossier.progress * 2 * Math.PI * 26)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">{Math.round(dossier.progress * 100)}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs opacity-70">Étape en cours</p>
              <p className="font-bold text-lg">{currentStep ? STEP_LABELS[currentStep.step_num] : 'Terminé'}</p>
              <p className="text-xs opacity-80 mt-0.5">
                {currentStep ? STEP_DESC[currentStep.step_num] : 'Toutes les étapes sont validées.'}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-paper rounded-lg border border-paper-2 p-5 mb-4">
          <h2 className="font-semibold text-ink mb-4 text-sm">Avancement de votre dossier</h2>
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={step.id} className="flex gap-3">
                {/* Indicateur */}
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step.status === 'done' ? 'bg-green-500 text-white' :
                    step.status === 'in_progress' ? 'bg-accent text-white' :
                    'bg-paper-2 text-muted border border-paper-2'
                  }`}>
                    {step.status === 'done' ? '✓' : step.step_num}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 h-8 mt-1 ${step.status === 'done' ? 'bg-green-200' : 'bg-paper-2'}`} />
                  )}
                </div>
                {/* Contenu */}
                <div className="pb-6">
                  <p className={`text-sm font-semibold ${
                    step.status === 'in_progress' ? 'text-accent' :
                    step.status === 'done' ? 'text-green-600' : 'text-muted'
                  }`}>
                    {STEP_LABELS[step.step_num]}
                    {step.status === 'in_progress' && step.step_num < 6 && <span className="ml-2 text-xs font-normal">● En cours</span>}
                    {step.status === 'done' && <span className="ml-2 text-xs font-normal text-muted">
                      {step.validated_at ? new Date(step.validated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                    </span>}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{STEP_DESC[step.step_num]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        {activity.length > 0 && (
          <div className="bg-paper rounded-lg border border-paper-2 p-5 mb-4">
            <h2 className="font-semibold text-ink mb-3 text-sm">Activité récente</h2>
            <div className="space-y-3">
              {activity.map(a => (
                <div key={a.id} className="flex items-start gap-2">
                  <span className="text-base mt-0.5">
                    {a.type === 'step_validated' ? '✅' :
                     a.type === 'message_sent' ? '💬' :
                     a.type === 'document_uploaded' ? '📎' : '📋'}
                  </span>
                  <div>
                    <p className="text-sm text-ink">
                      {a.type === 'step_validated' ? `Étape ${(a.payload as any)?.step} validée par votre expert` :
                       a.type === 'message_sent' ? 'Nouveau message de votre expert' :
                       a.type === 'document_uploaded' ? 'Document ajouté au dossier' : 'Dossier mis à jour'}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estimation d'indemnisation */}
        {dossier.estimate_low && (
          <div className="bg-paper rounded-lg border border-paper-2 p-5 mb-4">
            <h2 className="font-semibold text-ink mb-3 text-sm">Estimation d'indemnisation</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">
                {dossier.estimate_low.toLocaleString('fr-FR')} €
              </span>
              <span className="text-muted text-sm">–</span>
              <span className="text-2xl font-bold text-primary">
                {dossier.estimate_high?.toLocaleString('fr-FR')} €
              </span>
            </div>
            <p className="text-xs text-muted mt-2">
              Fourchette estimée par votre expert. Ce montant peut varier selon les conclusions finales de l'assureur.
            </p>
          </div>
        )}

        {/* Contact expert */}
        <div className="bg-paper rounded-lg border border-paper-2 p-5">
          <h2 className="font-semibold text-ink mb-3 text-sm">Votre expert</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
              HK
            </div>
            <div>
              <p className="font-medium text-ink text-sm">H. Khabizi</p>
              <p className="text-xs text-muted">Expert en sinistres</p>
            </div>
          </div>
          <Link
            to={`/client/dossier/${dossier.ref}/messages`}
            className="block w-full text-center py-2.5 bg-primary text-white text-sm font-semibold rounded-sm hover:opacity-90 transition-opacity"
          >
            💬 Envoyer un message
          </Link>
        </div>
      </div>
    </div>
  )
}
