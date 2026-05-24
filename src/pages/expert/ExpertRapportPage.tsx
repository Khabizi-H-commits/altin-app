import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ExpertNav } from '@/components/layout/ExpertNav'
import { Button } from '@/components/ui/Button'
import { fetchDossierByRef } from '@/stores/dossierStore'
import { supabase } from '@/lib/supabase'

const CHAPTERS = ['Contexte', 'Désordres constatés', 'Analyse des causes', 'Évaluation', 'Conclusions']

export default function ExpertRapportPage() {
  const { ref } = useParams<{ ref: string }>()
  const navigate = useNavigate()
  const [chapter, setChapter] = useState(0)
  const [content, setContent] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    if (ref) fetchDossierByRef(ref)
    // Charger brouillon depuis localStorage
    const draft = localStorage.getItem(`rapport-${ref}`)
    if (draft) setContent(JSON.parse(draft))
  }, [ref])

  const handleSave = () => {
    localStorage.setItem(`rapport-${ref}`, JSON.stringify(content))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleFinaliser = async () => {
    setFinalizing(true)
    handleSave()
    const dossier = await fetchDossierByRef(ref!)
    if (dossier) {
      // Marquer étape 5 comme terminée
      await supabase.from('dossier_steps')
        .update({ status: 'done', validated_at: new Date().toISOString() })
        .eq('dossier_id', dossier.id)
        .eq('step_num', 5)
      // Activer étape 6
      await supabase.from('dossier_steps')
        .update({ status: 'in_progress' })
        .eq('dossier_id', dossier.id)
        .eq('step_num', 6)
      // Mettre à jour le dossier
      await supabase.from('dossiers')
        .update({ current_step: 6, progress: Math.round(5 / 6 * 100) })
        .eq('id', dossier.id)
    }
    setFinalizing(false)
    navigate(`/expert/dossier/${ref}`)
  }

  return (
    <div className="min-h-screen bg-paper-2">
      <ExpertNav />
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted mb-6">
          <Link to="/expert/dossiers" className="hover:text-ink">Dossiers</Link>
          <span>/</span>
          <Link to={`/expert/dossier/${ref}`} className="hover:text-ink">{ref}</Link>
          <span>/</span>
          <span className="text-ink font-medium">Rapport</span>
        </div>

        <div className="flex gap-6">
          {/* Sidebar chapitres */}
          <div className="w-48 shrink-0">
            <div className="bg-paper rounded-md border border-paper-2 p-3 sticky top-20">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Chapitres</p>
              {CHAPTERS.map((ch, i) => (
                <button
                  key={i}
                  onClick={() => setChapter(i)}
                  className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors mb-1 ${
                    chapter === i ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-ink hover:bg-paper-2'
                  }`}
                >
                  <span className="text-xs mr-2 text-muted/60">{i + 1}.</span>{ch}
                </button>
              ))}
            </div>
          </div>

          {/* Éditeur */}
          <div className="flex-1">
            <div className="bg-paper rounded-md border border-paper-2 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-ink">
                  {chapter + 1}. {CHAPTERS[chapter]}
                </h2>
                <div className="flex items-center gap-3">
                  {saved && <span className="text-xs text-green-600">✓ Sauvegardé</span>}
                  <Button variant="ghost" size="sm" onClick={handleSave}>Sauvegarder</Button>
                </div>
              </div>
              <textarea
                value={content[chapter] ?? ''}
                onChange={e => setContent(c => ({ ...c, [chapter]: e.target.value }))}
                placeholder={`Rédigez le chapitre "${CHAPTERS[chapter]}"…`}
                rows={16}
                className="w-full resize-none text-sm text-ink bg-transparent outline-none leading-relaxed"
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-4">
              <Button variant="ghost" size="sm" onClick={() => setChapter(c => Math.max(0, c - 1))} disabled={chapter === 0}>
                ← Précédent
              </Button>
              {chapter < CHAPTERS.length - 1 ? (
                <Button variant="primary" size="sm" onClick={() => { handleSave(); setChapter(c => c + 1) }}>
                  Suivant →
                </Button>
              ) : (
                <Button variant="accent" size="sm" onClick={handleFinaliser} disabled={finalizing}>
                  {finalizing ? 'Finalisation...' : '✓ Finaliser le rapport'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
