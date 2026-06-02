import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TestimonialsCarousel from '@/components/ui/TestimonialsCarousel'

type Session = {
  id: string
  formation_name: string
  date_debut: string
  date_fin: string | null
  duree: string
  max_places: number
  inscriptions: { count: number }[]
}

type Step = 'detail' | 'form'

const FORMATION_COLORS: Record<string, string> = {
  'Expert en Bâtiment & Construction': 'bg-blue-100 text-blue-800 border-blue-200',
  'Immobilier – Pathologies du Bâtiment': 'bg-amber-100 text-amber-800 border-amber-200',
  'Techniques du Bâtiment – Mise à niveau': 'bg-green-100 text-green-800 border-green-200',
  'Bloc Administration / Expertises': 'bg-purple-100 text-purple-800 border-purple-200',
  "Expertise d'assuré – Sinistres": 'bg-red-100 text-red-800 border-red-200',
  'Expert Judiciaire': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Expertise Incendie & Explosion': 'bg-orange-100 text-orange-800 border-orange-200',
}

type FormationDetail = {
  tarif: string
  public: string
  format: string
  financement: string
  objectifs: string[]
  description: string
}

const FORMATION_DETAILS: Record<string, FormationDetail> = {
  'Expert en Bâtiment & Construction': {
    tarif: '2 990 € HT',
    public: 'Candidats à l\'expertise bâtiment',
    format: 'Présentiel & E-learning',
    financement: 'CPF, OPCO, France Travail, plan entreprise',
    description: 'Formation complète pour devenir expert en bâtiment et construction. Couvre les systèmes constructifs, pathologies, normes et rédaction de rapports.',
    objectifs: [
      'Maîtriser les systèmes constructifs et pathologies des fondations',
      'Identifier et analyser les fissures et problèmes d\'humidité',
      'Appliquer les normes DTU en vigueur',
      'Lire et interpréter des plans',
      'Rédiger des rapports d\'expertise professionnels',
    ],
  },
  'Immobilier – Pathologies du Bâtiment': {
    tarif: '450 € HT',
    public: 'Agents immobiliers et professionnels de l\'immobilier',
    format: 'Présentiel & E-learning',
    financement: 'CPF, OPCO, France Travail, plan entreprise',
    description: 'Formation d\'une journée pour identifier les principales pathologies du bâtiment lors de transactions immobilières.',
    objectifs: [
      'Identifier les fissures et évaluer leur gravité',
      'Détecter les problèmes d\'humidité',
      'Reconnaître les défauts structurels',
      'Évaluer l\'état général d\'un bien',
      'Rédiger des rapports d\'observation',
    ],
  },
  'Techniques du Bâtiment – Mise à niveau': {
    tarif: '599 € HT',
    public: 'Profils non issus du BTP souhaitant intégrer le secteur',
    format: 'Présentiel & E-learning',
    financement: 'CPF, OPCO, France Travail, plan entreprise',
    description: 'Remise à niveau sur les fondamentaux techniques du bâtiment pour les professionnels venant d\'autres secteurs.',
    objectifs: [
      'Comprendre les fondamentaux du secteur BTP',
      'Maîtriser les types de structures et matériaux',
      'Connaître les normes de construction',
      'Lire et interpréter des plans de base',
    ],
  },
  'Bloc Administration / Expertises': {
    tarif: 'Sur devis',
    public: 'Professionnels de l\'expertise et de l\'administration',
    format: 'Présentiel',
    financement: 'CPF, OPCO, France Travail, plan entreprise',
    description: 'Bloc de 10 jours dédié à la gestion administrative du cabinet d\'expertises, AMO et activités terrain.',
    objectifs: [
      'Gérer l\'administration d\'un cabinet d\'expertises',
      'Maîtriser les outils de suivi de dossiers',
      'Organiser les missions d\'AMO',
      'Optimiser les processus administratifs',
    ],
  },
  "Expertise d'assuré – Sinistres": {
    tarif: '4 490 € HT',
    public: 'Professionnels de l\'assurance et candidats à l\'expertise d\'assuré',
    format: 'Présentiel & E-learning',
    financement: 'CPF, OPCO, France Travail, plan entreprise',
    description: 'Formation intensive de 2 semaines sur la contre-expertise et la défense des assurés face aux compagnies d\'assurance.',
    objectifs: [
      'Maîtriser les contrats MRH, MRP et PNO',
      'Comprendre les garanties et exclusions',
      'Conduire une contre-expertise',
      'Négocier avec les compagnies d\'assurance',
      'Animer les réunions contradictoires',
    ],
  },
  'Expert Judiciaire': {
    tarif: '990 € HT',
    public: 'Experts souhaitant exercer en qualité d\'expert judiciaire',
    format: 'Présentiel & E-learning',
    financement: 'CPF, OPCO, France Travail, plan entreprise',
    description: 'Formation de 3 jours sur le rôle et les missions de l\'expert judiciaire dans les procédures civiles et pénales.',
    objectifs: [
      'Comprendre le cadre légal de l\'expertise judiciaire',
      'Maîtriser le rôle de l\'expert auprès des tribunaux',
      'Connaître les procédures civile et pénale',
      'Rédiger des rapports judiciaires conformes',
    ],
  },
  'Expertise Incendie & Explosion': {
    tarif: '2 490 € HT',
    public: 'Experts en bâtiment, pompiers, assureurs, enquêteurs',
    format: 'Présentiel & E-learning',
    financement: 'CPF, OPCO, France Travail, plan entreprise',
    description: 'Formation spécialisée de 5 jours sur la recherche des causes d\'incendies et d\'explosions, l\'analyse de scènes et l\'investigation.',
    objectifs: [
      'Identifier les causes et origines d\'incendies',
      'Analyser une scène post-sinistre',
      'Maîtriser les techniques d\'investigation',
      'Rédiger des rapports d\'expertise incendie',
    ],
  },
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

export default function FormationsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Session | null>(null)
  const [step, setStep] = useState<Step>('detail')
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '' })
  const [files, setFiles] = useState<FileList | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('sessions')
      .select('*, inscriptions(count)')
      .order('date_debut')
      .then(({ data }) => {
        setSessions((data ?? []) as Session[])
        setLoading(false)
      })
  }, [])

  const placesRestantes = (s: Session) =>
    s.max_places - (s.inscriptions?.[0]?.count ?? 0)

  const openSession = (session: Session) => {
    setSelected(session)
    setStep('detail')
    setDone(false)
    setError(null)
  }

  const closeModal = () => {
    setSelected(null)
    setStep('detail')
    setForm({ nom: '', prenom: '', email: '', telephone: '' })
    setFiles(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (placesRestantes(selected) <= 0) return setError('Cette session est complète.')
    setSending(true)
    setError(null)

    try {
      const uploadedDocs: { name: string; url: string }[] = []
      if (files) {
        for (const file of Array.from(files)) {
          const path = `inscriptions/${selected.id}/${Date.now()}-${file.name}`
          const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
            uploadedDocs.push({ name: file.name, url: urlData.publicUrl })
          }
        }
      }

      const { error: insertError } = await supabase.from('inscriptions').insert({
        session_id: selected.id,
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone,
        documents: uploadedDocs,
      })

      if (insertError) throw insertError

      setDone(true)
      closeModal()

      const { data } = await supabase.from('sessions').select('*, inscriptions(count)').order('date_debut')
      setSessions((data ?? []) as Session[])
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSending(false)
    }
  }

  const periods = [
    { label: 'Septembre → Octobre 2026', from: '2026-09-01', to: '2026-10-31' },
    { label: 'Novembre 2026 → Janvier 2027', from: '2026-11-01', to: '2027-01-31' },
    { label: 'Février → Juin 2027', from: '2027-02-01', to: '2027-06-30' },
  ]

  const detail = selected ? FORMATION_DETAILS[selected.formation_name] : null
  const colorClass = selected ? (FORMATION_COLORS[selected.formation_name] ?? 'bg-gray-100 text-gray-800 border-gray-200') : ''

  return (
    <div className="min-h-screen bg-paper-2">
      <header className="bg-paper border-b border-paper-2 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href="https://altin-expertises.fr" className="text-xs text-muted hover:text-ink flex items-center gap-1">← Site</a>
          <img src="/logo.png" alt="ALT'IN" className="h-8 w-8 object-contain" />
          <span className="font-bold text-lg text-primary tracking-tight">ALT'IN<span className="text-accent">.</span></span>
        </div>
        <a href="/login" className="text-xs text-muted hover:text-ink">Espace client</a>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink mb-2">Calendrier des formations</h1>
          <p className="text-muted">Septembre 2026 → Juin 2027 · Choisissez votre session et inscrivez-vous en ligne.</p>
          <p className="text-xs text-muted mt-1">Financement possible : CPF · OPCO · France Travail · Plan entreprise</p>
        </div>

        {done && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <span className="text-green-600 text-xl">✓</span>
            <div>
              <p className="font-semibold text-green-800">Candidature envoyée !</p>
              <p className="text-sm text-green-700 mt-0.5">Vous serez contacté par l'équipe ALT'IN pour confirmation.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted">Chargement...</div>
        ) : (
          <div className="space-y-8">
            {periods.map(period => {
              const periodSessions = sessions.filter(s => s.date_debut >= period.from && s.date_debut <= period.to)
              if (periodSessions.length === 0) return null
              return (
                <div key={period.label}>
                  <h2 className="text-base font-bold text-ink mb-3 pb-2 border-b border-paper-2">{period.label}</h2>
                  <div className="space-y-2">
                    {periodSessions.map(session => {
                      const restantes = placesRestantes(session)
                      const complet = restantes <= 0
                      const color = FORMATION_COLORS[session.formation_name] ?? 'bg-gray-100 text-gray-800 border-gray-200'
                      const det = FORMATION_DETAILS[session.formation_name]
                      return (
                        <div key={session.id} className={`bg-paper rounded-lg border border-paper-2 p-4 flex items-center justify-between gap-4 ${!complet ? 'hover:border-primary/30 transition-colors' : 'opacity-60'}`}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="text-center shrink-0 w-16">
                              <p className="text-xs font-bold text-primary">{formatDate(session.date_debut).split(' ')[1]?.toUpperCase()}</p>
                              <p className="text-lg font-bold text-ink leading-none">{new Date(session.date_debut).getDate()}</p>
                              {session.date_fin && session.date_fin !== session.date_debut && (
                                <p className="text-xs text-muted">→ {new Date(session.date_fin).getDate()}</p>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-ink text-sm">{session.formation_name}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>{session.duree}</span>
                                {det && <span className="text-xs text-muted font-medium">{det.tarif}</span>}
                                <span className={`text-xs ${complet ? 'text-red-500 font-semibold' : restantes <= 3 ? 'text-orange-500 font-semibold' : 'text-muted'}`}>
                                  {complet ? 'Complet' : `${restantes} place${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => openSession(session)}
                            disabled={complet}
                            className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                          >
                            {complet ? 'Complet' : 'Voir & S\'inscrire'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <TestimonialsCarousel />

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-paper rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header modal */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>{selected.duree}</span>
                  <h3 className="font-bold text-ink text-xl mt-2">{selected.formation_name}</h3>
                  <p className="text-sm text-muted mt-1">
                    📅 {formatDate(selected.date_debut)}
                    {selected.date_fin && selected.date_fin !== selected.date_debut && ` → ${formatDate(selected.date_fin)}`}
                  </p>
                </div>
                <button onClick={closeModal} className="text-muted hover:text-ink text-2xl leading-none ml-4">×</button>
              </div>

              {step === 'detail' && detail && (
                <>
                  {/* Infos clés */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-paper-2 rounded-lg p-3">
                      <p className="text-xs text-muted mb-0.5">Tarif</p>
                      <p className="font-bold text-ink text-sm">{detail.tarif}</p>
                    </div>
                    <div className="bg-paper-2 rounded-lg p-3">
                      <p className="text-xs text-muted mb-0.5">Format</p>
                      <p className="font-bold text-ink text-sm">{detail.format}</p>
                    </div>
                    <div className="bg-paper-2 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-muted mb-0.5">Public visé</p>
                      <p className="font-medium text-ink text-sm">{detail.public}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted leading-relaxed mb-5">{detail.description}</p>

                  {/* Objectifs */}
                  <div className="mb-5">
                    <h4 className="font-semibold text-ink text-sm mb-2">Objectifs pédagogiques</h4>
                    <ul className="space-y-1.5">
                      {detail.objectifs.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted">
                          <span className="text-primary mt-0.5 shrink-0">✓</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Financement */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-5">
                    <p className="text-xs font-semibold text-primary mb-1">💡 Financement possible</p>
                    <p className="text-xs text-muted">{detail.financement}</p>
                  </div>

                  {/* Places */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-sm text-muted">Places disponibles</span>
                    <span className={`font-bold text-sm ${placesRestantes(selected) <= 3 ? 'text-orange-500' : 'text-green-600'}`}>
                      {placesRestantes(selected)} / {selected.max_places}
                    </span>
                  </div>

                  <button
                    onClick={() => setStep('form')}
                    className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Je m'inscris à cette session →
                  </button>
                </>
              )}

              {step === 'form' && (
                <>
                  <button onClick={() => setStep('detail')} className="flex items-center gap-1 text-sm text-muted hover:text-ink mb-4 transition-colors">
                    ← Retour aux détails
                  </button>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Prénom *</label>
                        <input required value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-paper-2 bg-paper-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Nom *</label>
                        <input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-paper-2 bg-paper-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Email *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-paper-2 bg-paper-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Téléphone *</label>
                      <input required type="tel" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-paper-2 bg-paper-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Documents * <span className="text-muted font-normal">(CV, diplômes, expériences)</span>
                      </label>
                      <input required type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={e => setFiles(e.target.files)}
                        className="w-full px-3 py-2 rounded-lg border border-paper-2 bg-paper-2 text-sm text-muted file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:opacity-90" />
                      <p className="text-xs text-muted mt-1">PDF, Word, images acceptés</p>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={closeModal}
                        className="flex-1 py-2.5 rounded-lg border border-paper-2 text-sm font-medium text-muted hover:text-ink transition-colors">
                        Annuler
                      </button>
                      <button type="submit" disabled={sending}
                        className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity">
                        {sending ? 'Envoi...' : 'Envoyer ma candidature'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
