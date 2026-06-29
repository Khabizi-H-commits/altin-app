import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ExpertNav } from '@/components/layout/ExpertNav'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { StepRing } from '@/components/ui/StepRing'
import { supabase } from '@/lib/supabase'
import { buildStoragePath } from '@/lib/storage'
import { useAuthStore } from '@/stores/authStore'
import { basePathForRole } from '@/lib/space'
import { fetchDossierByRef, fetchDossierSteps, fetchMessages, fetchActivity } from '@/stores/dossierStore'
import { STEP_LABELS, type Dossier, type DossierStep, type Message, type Activity, type Document } from '@/types'
import ExpertChecklistTab from './ExpertChecklistTab'

export default function ExpertDossierPage() {
  const { ref } = useParams<{ ref: string }>()
  const { profile } = useAuthStore()
  const base = basePathForRole(profile?.role)
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [steps, setSteps] = useState<DossierStep[]>([])
  const [messages, setMessages] = useState<(Message & { profiles: { full_name: string; initials: string; role: string } })[]>([])
  const [activity, setActivity] = useState<(Activity & { profiles: { full_name: string; initials: string } })[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [tab, setTab] = useState<'etapes' | 'checklist' | 'documents' | 'messages' | 'activite'>('etapes')
  const [newMsg, setNewMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTxt, setEditingTxt] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [estimateLow, setEstimateLow] = useState<string>('')
  const [estimateHigh, setEstimateHigh] = useState<string>('')
  const [savingEstimate, setSavingEstimate] = useState(false)
  const [estimateSaved, setEstimateSaved] = useState(false)

  // Coordonnées client
  const [clientPhone, setClientPhone] = useState<string>('')

  // Coordonnées assureur
  const [insurerCompany, setInsurerCompany] = useState<string>('')
  const [insurerContractNumber, setInsurerContractNumber] = useState<string>('')
  const [insurerClaimNumber, setInsurerClaimNumber] = useState<string>('')
  const [insurerPhone, setInsurerPhone] = useState<string>('')
  const [insurerEmail, setInsurerEmail] = useState<string>('')
  const [insurerAddress, setInsurerAddress] = useState<string>('')

  // Coordonnées expert d'assurance adverse
  const [insuranceExpertName, setInsuranceExpertName] = useState<string>('')
  const [insuranceExpertFirm, setInsuranceExpertFirm] = useState<string>('')
  const [insuranceExpertPhone, setInsuranceExpertPhone] = useState<string>('')
  const [insuranceExpertEmail, setInsuranceExpertEmail] = useState<string>('')
  const [insuranceExpertAddress, setInsuranceExpertAddress] = useState<string>('')

  const [savingInsurance, setSavingInsurance] = useState(false)
  const [insuranceSaved, setInsuranceSaved] = useState(false)

  const loadDocuments = async (dossierId: string) => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false })
    setDocuments((data ?? []) as Document[])
  }

  const load = async () => {
    if (!ref) return
    setLoading(true)
    const d = await fetchDossierByRef(ref)
    if (d) {
      const [s, m, a] = await Promise.all([
        fetchDossierSteps(d.id),
        fetchMessages(d.id),
        fetchActivity(d.id),
      ])
      setDossier(d)
      setSteps(s)
      setMessages(m as any)
      setActivity(a as any)
      setEstimateLow(d.estimate_low?.toString() ?? '')
      setEstimateHigh(d.estimate_high?.toString() ?? '')
      setClientPhone(d.client_phone ?? '')
      setInsurerCompany(d.insurer_company ?? '')
      setInsurerContractNumber(d.insurer_contract_number ?? '')
      setInsurerClaimNumber(d.insurer_claim_number ?? '')
      setInsurerPhone(d.insurer_phone ?? '')
      setInsurerEmail(d.insurer_email ?? '')
      setInsurerAddress(d.insurer_address ?? '')
      setInsuranceExpertName(d.insurance_expert_name ?? '')
      setInsuranceExpertFirm(d.insurance_expert_firm ?? '')
      setInsuranceExpertPhone(d.insurance_expert_phone ?? '')
      setInsuranceExpertEmail(d.insurance_expert_email ?? '')
      setInsuranceExpertAddress(d.insurance_expert_address ?? '')
      await loadDocuments(d.id)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [ref])

  // Realtime messages
  useEffect(() => {
    if (!dossier?.id) return
    const channel = supabase
      .channel(`messages:${dossier.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `dossier_id=eq.${dossier.id}` },
        () => fetchMessages(dossier.id).then(m => setMessages(m as any))
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [dossier?.id])

  const currentStep = steps.find(s => s.status === 'in_progress')

  const handleValidateStep = async () => {
    if (!currentStep || !dossier) return
    setValidating(true)

    // Marquer l'étape comme terminée
    // Le trigger on_step_validated gère automatiquement :
    // progression du dossier, activation de l'étape suivante,
    // log d'activité et notification email au client
    await supabase.from('dossier_steps')
      .update({ status: 'done', validated_at: new Date().toISOString() })
      .eq('id', currentStep.id)

    // Si étape 6 → clôturer le dossier
    if (currentStep.step_num === 6) {
      await supabase.from('dossiers')
        .update({ status: 'closed', progress: 1, closed_at: new Date().toISOString() })
        .eq('id', dossier.id)
    }

    await load()
    setValidating(false)
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || !dossier || !profile) return
    setUploading(true)
    setUploadError(null)
    for (const file of Array.from(files)) {
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
      })
      if (dbError) {
        setUploadError(`Erreur base de données : ${dbError.message}`)
        setUploading(false)
        return
      }
    }
    await loadDocuments(dossier.id)
    setUploading(false)
  }

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage
      .from('Document')
      .createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDeleteDoc = async (doc: Document) => {
    if (!window.confirm(`Supprimer "${doc.name}" ?`)) return
    setDeletingDocId(doc.id)
    await supabase.storage.from('Document').remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    if (dossier) await loadDocuments(dossier.id)
    setDeletingDocId(null)
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  }

  const handleReactivateStep = async (stepNum: number) => {
    if (!dossier) return
    if (!window.confirm(`Revenir à l'étape ${stepNum} — ${STEP_LABELS[stepNum]} ? Les étapes suivantes repasse en attente.`)) return

    // Remettre toutes les étapes >= stepNum en pending, sauf stepNum qui passe in_progress
    for (const step of steps) {
      if (step.step_num === stepNum) {
        await supabase.from('dossier_steps')
          .update({ status: 'in_progress', validated_at: null })
          .eq('id', step.id)
      } else if (step.step_num > stepNum) {
        await supabase.from('dossier_steps')
          .update({ status: 'pending', validated_at: null })
          .eq('id', step.id)
      }
    }

    // Mettre à jour le dossier
    await supabase.from('dossiers')
      .update({
        current_step: stepNum,
        progress: (stepNum - 1) / 6,
        status: 'active',
      })
      .eq('id', dossier.id)

    await load()
  }

  const handleReopenDossier = async () => {
    if (!dossier) return
    if (!window.confirm('Rouvrir ce dossier ? Il repassera en statut Actif.')) return
    // Remettre step 6 en in_progress
    await supabase.from('dossier_steps')
      .update({ status: 'in_progress', validated_at: null })
      .eq('dossier_id', dossier.id)
      .eq('step_num', 6)
    // Rouvrir le dossier
    await supabase.from('dossiers')
      .update({ status: 'active', current_step: 6, progress: 5 / 6, closed_at: null })
      .eq('id', dossier.id)
    await load()
  }

  const handleSaveEstimate = async () => {
    if (!dossier) return
    setSavingEstimate(true)
    await supabase.from('dossiers').update({
      estimate_low: estimateLow ? parseFloat(estimateLow) : null,
      estimate_high: estimateHigh ? parseFloat(estimateHigh) : null,
    }).eq('id', dossier.id)
    setSavingEstimate(false)
    setEstimateSaved(true)
    setTimeout(() => setEstimateSaved(false), 2000)
  }

  const handleSaveInsurance = async () => {
    if (!dossier) return
    setSavingInsurance(true)
    await supabase.from('dossiers').update({
      client_phone: clientPhone || null,
      insurer_company: insurerCompany || null,
      insurer_contract_number: insurerContractNumber || null,
      insurer_claim_number: insurerClaimNumber || null,
      insurer_phone: insurerPhone || null,
      insurer_email: insurerEmail || null,
      insurer_address: insurerAddress || null,
      insurance_expert_name: insuranceExpertName || null,
      insurance_expert_firm: insuranceExpertFirm || null,
      insurance_expert_phone: insuranceExpertPhone || null,
      insurance_expert_email: insuranceExpertEmail || null,
      insurance_expert_address: insuranceExpertAddress || null,
    }).eq('id', dossier.id)
    setSavingInsurance(false)
    setInsuranceSaved(true)
    setTimeout(() => setInsuranceSaved(false), 2500)
  }

  const handleSendMessage = async () => {
    if (!newMsg.trim() || !dossier || !profile) return
    setSendingMsg(true)
    await supabase.from('messages').insert({
      dossier_id: dossier.id,
      from_id: profile.id,
      txt: newMsg.trim(),
    })
    setNewMsg('')
    setSendingMsg(false)
  }

  const handleStartEdit = (msg: Message) => {
    setEditingId(msg.id)
    setEditingTxt(msg.txt)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingTxt('')
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editingTxt.trim()) return
    setSavingEdit(true)
    await supabase.from('messages')
      .update({ txt: editingTxt.trim(), edited_at: new Date().toISOString() })
      .eq('id', editingId)
    setEditingId(null)
    setEditingTxt('')
    setSavingEdit(false)
  }

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return
    await supabase.from('messages').delete().eq('id', id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-2">
        <ExpertNav />
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!dossier) {
    return (
      <div className="min-h-screen bg-paper-2">
        <ExpertNav />
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <p className="text-muted">Dossier introuvable</p>
          <Link to={`${base}/dossiers`} className="mt-4 inline-block text-primary hover:underline text-sm">← Retour</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper-2">
      <ExpertNav />
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted mb-6">
          <Link to={`${base}/dossiers`} className="hover:text-ink">Dossiers</Link>
          <span>/</span>
          <span className="text-ink font-medium">{dossier.ref}</span>
        </div>

        {/* Hero */}
        <div className="bg-paper rounded-md border border-paper-2 p-6 mb-6">
          <div className="flex items-start gap-6">
            <StepRing currentStep={dossier.current_step} progress={dossier.progress} size="md" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-ink">{dossier.ref}</h1>
                <Pill variant="primary">{dossier.type}</Pill>
                <Pill variant={dossier.status === 'active' ? 'success' : 'muted'}>
                  {dossier.status === 'active' ? 'Actif' : 'Clôturé'}
                </Pill>
              </div>
              {dossier.client_name && (
                <p className="text-sm font-medium text-ink mb-1">👤 {dossier.client_name}</p>
              )}
              <p className="text-sm text-muted mb-4">{dossier.address ?? 'Adresse non renseignée'}</p>
              <div className="mt-3 pt-3 border-t border-paper-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Estimation d'indemnisation</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted">Min</span>
                    <input
                      type="number"
                      value={estimateLow}
                      onChange={e => setEstimateLow(e.target.value)}
                      placeholder="ex. 4200"
                      className="w-28 px-2 py-1 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                    />
                    <span className="text-xs text-muted">€</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted">Max</span>
                    <input
                      type="number"
                      value={estimateHigh}
                      onChange={e => setEstimateHigh(e.target.value)}
                      placeholder="ex. 5800"
                      className="w-28 px-2 py-1 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                    />
                    <span className="text-xs text-muted">€</span>
                  </div>
                  <button
                    onClick={handleSaveEstimate}
                    disabled={savingEstimate}
                    className="px-3 py-1 text-xs font-semibold bg-primary text-white rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {estimateSaved ? '✓ Sauvegardé' : savingEstimate ? '…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={`${base}/dossier/${dossier.ref}/rapport`}>
                <Button variant="ghost" size="sm">Rapport</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Coordonnées assurance */}
        <div className="bg-paper rounded-md border border-paper-2 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-ink">Coordonnées assurance</h2>
            <button
              onClick={handleSaveInsurance}
              disabled={savingInsurance}
              className="px-4 py-1.5 text-xs font-semibold bg-primary text-white rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {insuranceSaved ? '✓ Sauvegardé' : savingInsurance ? '…' : 'Enregistrer'}
            </button>
          </div>

          {/* Téléphone client */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">📞 Client</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Téléphone client</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="06 00 00 00 00"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
            </div>
          </div>

          {/* Assureur */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">🏢 Assureur</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Compagnie d'assurance</label>
                <input
                  type="text"
                  value={insurerCompany}
                  onChange={e => setInsurerCompany(e.target.value)}
                  placeholder="ex. Allianz, AXA, Maif…"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">N° de contrat</label>
                <input
                  type="text"
                  value={insurerContractNumber}
                  onChange={e => setInsurerContractNumber(e.target.value)}
                  placeholder="ex. CT-2024-XXXXX"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">N° de sinistre</label>
                <input
                  type="text"
                  value={insurerClaimNumber}
                  onChange={e => setInsurerClaimNumber(e.target.value)}
                  placeholder="ex. SIN-2024-XXXXX"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Téléphone assureur</label>
                <input
                  type="tel"
                  value={insurerPhone}
                  onChange={e => setInsurerPhone(e.target.value)}
                  placeholder="ex. 01 23 45 67 89"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Email assureur</label>
                <input
                  type="email"
                  value={insurerEmail}
                  onChange={e => setInsurerEmail(e.target.value)}
                  placeholder="ex. gestionnaire@assureur.fr"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Adresse assureur</label>
                <input
                  type="text"
                  value={insurerAddress}
                  onChange={e => setInsurerAddress(e.target.value)}
                  placeholder="ex. 12 rue de la Paix, 75001 Paris"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
            </div>
          </div>

          {/* Expert d'assurance adverse */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">🔍 Expert d'assurance adverse</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Nom de l'expert</label>
                <input
                  type="text"
                  value={insuranceExpertName}
                  onChange={e => setInsuranceExpertName(e.target.value)}
                  placeholder="ex. Jean Dupont"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Cabinet</label>
                <input
                  type="text"
                  value={insuranceExpertFirm}
                  onChange={e => setInsuranceExpertFirm(e.target.value)}
                  placeholder="ex. Cabinet Expertise Sud"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Téléphone expert adverse</label>
                <input
                  type="tel"
                  value={insuranceExpertPhone}
                  onChange={e => setInsuranceExpertPhone(e.target.value)}
                  placeholder="ex. 06 00 00 00 00"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Email expert adverse</label>
                <input
                  type="email"
                  value={insuranceExpertEmail}
                  onChange={e => setInsuranceExpertEmail(e.target.value)}
                  placeholder="ex. expert@cabinet.fr"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted mb-1 block">Adresse expert adverse</label>
                <input
                  type="text"
                  value={insuranceExpertAddress}
                  onChange={e => setInsuranceExpertAddress(e.target.value)}
                  placeholder="ex. 5 avenue du Marché, 34000 Montpellier"
                  className="w-full px-3 py-2 text-sm border border-paper-2 rounded-sm focus:outline-none focus:border-primary bg-paper-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Timeline étapes */}
        <div className="bg-paper rounded-md border border-paper-2 p-6 mb-6">
          <h2 className="font-semibold text-ink mb-5">Progression</h2>
          <div className="flex items-center gap-0">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    step.status === 'done' ? 'bg-primary border-primary text-white' :
                    step.status === 'in_progress' ? 'bg-accent border-accent text-white' :
                    'bg-paper border-paper-2 text-muted'
                  }`}>
                    {step.status === 'done' ? '✓' : step.step_num}
                  </div>
                  <p className="text-xs mt-1 text-center w-16 text-muted">{STEP_LABELS[step.step_num]}</p>
                  {step.validated_at && (
                    <p className="text-xs text-muted/70">
                      {new Date(step.validated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                  {step.status === 'done' && dossier.status === 'active' && (
                    <button
                      onClick={() => handleReactivateStep(step.step_num)}
                      className="text-xs text-muted/50 hover:text-accent transition-colors mt-0.5"
                      title="Revenir à cette étape"
                    >
                      ↩ Revenir
                    </button>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-5 ${step.status === 'done' ? 'bg-primary' : 'bg-paper-2'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Bouton valider étape */}
          {currentStep && dossier.status === 'active' && (
            <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-sm">
              <p className="text-sm font-medium text-ink mb-3">
                Étape en cours : <span className="text-accent">{STEP_LABELS[currentStep.step_num]}</span>
              </p>
              <Button variant="accent" onClick={handleValidateStep} loading={validating}>
                ✓ Valider l'étape {currentStep.step_num} — {STEP_LABELS[currentStep.step_num]}
              </Button>
              <p className="text-xs text-muted mt-2">Le client sera notifié par email automatiquement.</p>
            </div>
          )}
          {!currentStep && dossier.status === 'active' && (
            <p className="text-sm text-green-600 font-medium mt-4">✓ Toutes les étapes sont validées — dossier terminé</p>
          )}
          {dossier.status === 'closed' && (
            <div className="mt-6 p-4 bg-paper-2 border border-paper-2 rounded-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Dossier clôturé</p>
                <p className="text-xs text-muted mt-0.5">Rouvrir si un complément est demandé par l'assureur.</p>
              </div>
              <button
                onClick={handleReopenDossier}
                className="px-4 py-2 text-sm font-semibold text-primary border border-primary/30 rounded-sm hover:bg-primary/5 transition-colors"
              >
                🔓 Rouvrir le dossier
              </button>
            </div>
          )}
        </div>

        {/* Onglets */}
        <div className="bg-paper rounded-md border border-paper-2">
          <div className="flex border-b border-paper-2 overflow-x-auto">
            {(['etapes', 'checklist', 'documents', 'messages', 'activite'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-ink'
                }`}
              >
                {t === 'etapes' ? 'Notes'
                  : t === 'checklist' ? '☑ Check-list terrain'
                  : t === 'documents' ? `Documents (${documents.length})`
                  : t === 'messages' ? `Messages (${messages.length})`
                  : 'Activité'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Check-list terrain */}
            {tab === 'checklist' && <ExpertChecklistTab />}

            {/* Notes */}
            {tab === 'etapes' && (
              <div>
                {steps.map(step => (
                  <div key={step.id} className="mb-4 last:mb-0">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
                      Étape {step.step_num} — {STEP_LABELS[step.step_num]}
                    </p>
                    <p className="text-sm text-ink">{step.notes ?? 'Aucune note pour cette étape.'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Documents */}
            {tab === 'documents' && (
              <div>
                {/* Zone d'upload */}
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md p-8 mb-4 cursor-pointer transition-colors ${uploading ? 'border-primary/40 bg-primary/5' : 'border-paper-2 hover:border-primary/40 hover:bg-primary/5'}`}>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => handleUpload(e.target.files)}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-sm text-primary font-medium">Upload en cours…</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl mb-2">📎</p>
                      <p className="text-sm font-medium text-ink">Cliquez ou glissez des fichiers ici</p>
                      <p className="text-xs text-muted mt-1">PDF, photos, Word, Excel — plusieurs fichiers acceptés</p>
                    </>
                  )}
                </label>

                {uploadError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-600">
                    ⚠️ {uploadError}
                  </div>
                )}

                {/* Liste des documents */}
                {documents.length === 0 ? (
                  <p className="text-sm text-muted text-center py-4">Aucun document pour l'instant.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-paper-2 rounded-sm group">
                        <span className="text-xl">
                          {doc.type?.includes('pdf') ? '📄'
                            : doc.type?.includes('image') ? '🖼️'
                            : doc.type?.includes('word') ? '📝'
                            : '📎'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{doc.name}</p>
                          <p className="text-xs text-muted">
                            {formatSize(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="px-2.5 py-1 text-xs font-medium text-primary border border-primary/30 rounded-sm hover:bg-primary/5 transition-colors"
                          >
                            Télécharger
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc)}
                            disabled={deletingDocId === doc.id}
                            className="px-2.5 py-1 text-xs font-medium text-red-500 border border-red-200 rounded-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingDocId === doc.id ? '…' : 'Supprimer'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            {tab === 'messages' && (
              <div>
                <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted text-center py-6">Aucun message pour l'instant.</p>
                  )}
                  {messages.map(msg => {
                    const isMe = msg.from_id === profile?.id
                    const isEditing = editingId === msg.id
                    return (
                      <div key={msg.id} className={`group flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-primary text-white' : 'bg-paper-2 text-ink'}`}>
                          {(msg as any).profiles?.initials ?? '?'}
                        </div>
                        <div className={`max-w-xs flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1`}>
                          {isEditing ? (
                            <div className="flex flex-col gap-1 w-full">
                              <textarea
                                value={editingTxt}
                                onChange={e => setEditingTxt(e.target.value)}
                                rows={2}
                                autoFocus
                                className="px-3 py-2 rounded-md border border-paper-2 text-sm text-ink bg-paper focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-xs text-muted hover:text-ink"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={savingEdit || !editingTxt.trim()}
                                  className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                                >
                                  {savingEdit ? '…' : 'Enregistrer'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={`px-3 py-2 rounded-md text-sm whitespace-pre-wrap break-words ${isMe ? 'bg-primary text-white' : 'bg-paper-2 text-ink'}`}>
                                {msg.txt}
                              </div>
                              <div className="flex items-center gap-2 px-1">
                                {msg.edited_at && (
                                  <span className="text-[10px] text-muted italic">modifié</span>
                                )}
                                {isMe && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleStartEdit(msg)}
                                      className="text-[10px] text-muted hover:text-primary underline"
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="text-[10px] text-muted hover:text-red-600 underline"
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Écrire un message…"
                    className="flex-1 px-3 py-2 rounded-sm border border-paper-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Button variant="primary" size="sm" onClick={handleSendMessage} loading={sendingMsg}>
                    Envoyer
                  </Button>
                </div>
              </div>
            )}

            {/* Activité */}
            {tab === 'activite' && (
              <div className="space-y-3">
                {activity.length === 0 && (
                  <p className="text-sm text-muted text-center py-6">Aucune activité enregistrée.</p>
                )}
                {activity.map(a => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                    <div>
                      <p className="text-sm text-ink">
                        <span className="font-medium">{(a as any).profiles?.full_name ?? 'Inconnu'}</span>{' '}
                        {a.type === 'step_validated' ? `a validé l'étape ${(a.payload as any)?.step}` :
                         a.type === 'message_sent' ? 'a envoyé un message' :
                         a.type === 'document_uploaded' ? 'a ajouté un document' : a.type}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
