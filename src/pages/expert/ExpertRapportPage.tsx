import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ExpertNav } from '@/components/layout/ExpertNav'
import { Button } from '@/components/ui/Button'
import { fetchDossierByRef } from '@/stores/dossierStore'
import { supabase } from '@/lib/supabase'
import { buildStoragePath } from '@/lib/storage'
import { useAuthStore } from '@/stores/authStore'
import { basePathForRole } from '@/lib/space'
import type { Document, Dossier } from '@/types'

const formatBytes = (n: number | null) => {
  if (!n) return ''
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`
}

export default function ExpertRapportPage() {
  const { ref } = useParams<{ ref: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const base = basePathForRole(profile?.role)
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [rapport, setRapport] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    if (!ref) return
    setLoading(true)
    const d = await fetchDossierByRef(ref)
    if (d) {
      setDossier(d)
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('dossier_id', d.id)
        .eq('is_report', true)
        .maybeSingle()
      setRapport((data ?? null) as Document | null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [ref])

  const uploadFile = async (file: File) => {
    if (!dossier || !profile) return
    setUploading(true)
    setUploadError(null)

    // Si un rapport existe déjà, on le remplace : supprimer l'ancien (storage + db)
    if (rapport) {
      await supabase.storage.from('Document').remove([rapport.storage_path])
      await supabase.from('documents').delete().eq('id', rapport.id)
    }

    const path = buildStoragePath(dossier.id, file)
    const { error: storageError } = await supabase.storage
      .from('Document')
      .upload(path, file)
    if (storageError) {
      setUploadError(`Erreur storage : ${storageError.message}`)
      setUploading(false)
      return
    }
    const { error: dbError } = await supabase.from('documents').insert({
      dossier_id: dossier.id,
      name: file.name,
      storage_path: path,
      type: file.type,
      size_bytes: file.size,
      uploaded_by: profile.id,
      is_report: true,
    })
    if (dbError) {
      setUploadError(`Erreur base de données : ${dbError.message}`)
      setUploading(false)
      return
    }
    await load()
    setUploading(false)
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    uploadFile(files[0])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDownload = async () => {
    if (!rapport) return
    const { data } = await supabase.storage
      .from('Document')
      .createSignedUrl(rapport.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async () => {
    if (!rapport) return
    if (!confirm('Supprimer le rapport ?')) return
    await supabase.storage.from('Document').remove([rapport.storage_path])
    await supabase.from('documents').delete().eq('id', rapport.id)
    setRapport(null)
  }

  const handleFinaliser = async () => {
    if (!dossier) return
    setFinalizing(true)
    await supabase.from('dossier_steps')
      .update({ status: 'done', validated_at: new Date().toISOString() })
      .eq('dossier_id', dossier.id)
      .eq('step_num', 5)
    await supabase.from('dossier_steps')
      .update({ status: 'in_progress' })
      .eq('dossier_id', dossier.id)
      .eq('step_num', 6)
    await supabase.from('dossiers')
      .update({ current_step: 6, progress: 5 / 6 })
      .eq('id', dossier.id)
    setFinalizing(false)
    navigate(`${base}/dossier/${ref}`)
  }

  return (
    <div className="min-h-screen bg-paper-2">
      <ExpertNav />
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted mb-6">
          <Link to={`${base}/dossiers`} className="hover:text-ink">Dossiers</Link>
          <span>/</span>
          <Link to={`${base}/dossier/${ref}`} className="hover:text-ink">{ref}</Link>
          <span>/</span>
          <span className="text-ink font-medium">Rapport</span>
        </div>

        <h1 className="text-xl font-bold text-ink mb-2">Rapport d'expertise</h1>
        <p className="text-sm text-muted mb-6">
          Importez votre rapport finalisé (PDF, Word, image, ZIP, etc.). Il sera transmis automatiquement au client.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-paper rounded-md border border-paper-2 p-6 mb-4">
              {rapport ? (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{rapport.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {formatBytes(rapport.size_bytes)} · ajouté le{' '}
                      {new Date(rapport.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={handleDownload}>Télécharger</Button>
                    <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>Remplacer</Button>
                    <button
                      onClick={handleDelete}
                      className="text-xs text-muted hover:text-red-600 px-2"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-colors ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-paper-2 hover:border-primary/50 hover:bg-paper-2/50'
                  }`}
                >
                  <p className="text-3xl mb-3">📤</p>
                  <p className="font-medium text-ink mb-1">
                    {uploading ? 'Téléversement en cours…' : 'Glissez votre fichier ici'}
                  </p>
                  <p className="text-sm text-muted">ou cliquez pour parcourir</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                onChange={e => handleFileSelect(e.target.files)}
                className="hidden"
              />

              {uploadError && (
                <p className="mt-4 text-sm text-red-600">{uploadError}</p>
              )}
            </div>

            {rapport && (
              <div className="bg-paper rounded-md border border-paper-2 p-6">
                <p className="text-sm text-muted mb-4">
                  Cliquez sur « Finaliser » pour valider l'étape 5 et passer à la clôture. Le client recevra une notification automatique.
                </p>
                <Button
                  variant="accent"
                  onClick={handleFinaliser}
                  disabled={finalizing}
                >
                  {finalizing ? 'Finalisation…' : '✓ Finaliser le rapport'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
