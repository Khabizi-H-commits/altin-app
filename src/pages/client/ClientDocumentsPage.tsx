import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ClientNav } from '@/components/layout/ClientNav'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { buildStoragePath } from '@/lib/storage'
import type { Document } from '@/types'

export default function ClientDocumentsPage() {
  const { ref } = useParams<{ ref: string }>()
  const { profile } = useAuthStore()
  const [dossierId, setDossierId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const loadDocs = async (id: string) => {
    const { data } = await supabase
      .from('documents').select('*').eq('dossier_id', id).order('created_at', { ascending: false })
    setDocuments((data ?? []) as Document[])
  }

  useEffect(() => {
    const init = async () => {
      if (!ref) return
      const { data } = await supabase.from('dossiers').select('id').eq('ref', ref).single()
      if (data) { setDossierId(data.id); await loadDocs(data.id) }
      setLoading(false)
    }
    init()
  }, [ref])

  const handleUpload = async (files: FileList | null) => {
    if (!files || !dossierId || !profile) return
    setUploading(true)
    setUploadError(null)
    for (const file of Array.from(files)) {
      const path = buildStoragePath(dossierId, file)
      const { error: se } = await supabase.storage.from('Document').upload(path, file)
      if (se) { setUploadError(`Erreur : ${se.message}`); setUploading(false); return }
      await supabase.from('documents').insert({
        dossier_id: dossierId, name: file.name, storage_path: path,
        type: file.type, size_bytes: file.size, uploaded_by: profile.id,
      })
    }
    await loadDocs(dossierId)
    setUploading(false)
  }

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage.from('Document').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  }

  return (
    <div className="min-h-screen bg-paper-2">
      <ClientNav />
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <h1 className="text-lg font-bold text-ink mb-4">Documents</h1>

        {/* Upload */}
        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 mb-4 cursor-pointer transition-colors ${uploading ? 'border-primary/40 bg-primary/5' : 'border-paper-2 hover:border-primary/40'}`}>
          <input type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} disabled={uploading} />
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm text-primary">Upload en cours…</p>
            </>
          ) : (
            <>
              <p className="text-2xl mb-1">📎</p>
              <p className="text-sm font-medium text-ink">Ajouter des documents</p>
              <p className="text-xs text-muted mt-0.5">Photos, PDF — plusieurs fichiers acceptés</p>
            </>
          )}
        </label>
        {uploadError && <p className="text-sm text-red-500 mb-4">{uploadError}</p>}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-paper rounded-lg border border-paper-2 p-8 text-center">
            <p className="text-2xl mb-2">📂</p>
            <p className="text-sm text-muted">Aucun document pour l'instant</p>
          </div>
        ) : (
          <div className="bg-paper rounded-lg border border-paper-2 divide-y divide-paper-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-4">
                <span className="text-xl shrink-0">
                  {doc.type?.includes('pdf') ? '📄' : doc.type?.includes('image') ? '🖼️' : '📎'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{doc.name}</p>
                  <p className="text-xs text-muted">
                    {formatSize(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(doc)}
                  className="shrink-0 text-xs font-medium text-primary border border-primary/30 rounded-sm px-2.5 py-1 hover:bg-primary/5"
                >
                  Voir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
