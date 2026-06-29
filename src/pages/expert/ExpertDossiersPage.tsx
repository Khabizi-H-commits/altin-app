import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExpertNav } from '@/components/layout/ExpertNav'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { StepRing } from '@/components/ui/StepRing'
import { useDossierStore } from '@/stores/dossierStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { basePathForRole } from '@/lib/space'
import { STEP_LABELS, type DossierStatus, type Dossier } from '@/types'

const STATUS_LABELS: Record<DossierStatus, string> = {
  active: 'Actif', closed: 'Clôturé', pending: 'En attente',
}

type FormState = {
  ref: string; type: string; address: string; clientName: string; clientEmail: string; clientPhone: string
  insurerCompany: string; insurerContractNumber: string; insurerClaimNumber: string
  insurerPhone: string; insurerEmail: string; insurerAddress: string
  insuranceExpertName: string; insuranceExpertFirm: string
  insuranceExpertPhone: string; insuranceExpertEmail: string; insuranceExpertAddress: string
}
const emptyForm: FormState = {
  ref: '', type: '', address: '', clientName: '', clientEmail: '', clientPhone: '',
  insurerCompany: '', insurerContractNumber: '', insurerClaimNumber: '',
  insurerPhone: '', insurerEmail: '', insurerAddress: '',
  insuranceExpertName: '', insuranceExpertFirm: '',
  insuranceExpertPhone: '', insuranceExpertEmail: '', insuranceExpertAddress: '',
}

export default function ExpertDossiersPage() {
  const { profile } = useAuthStore()
  const { dossiers, loading, fetchDossiers } = useDossierStore()
  const base = basePathForRole(profile?.role)
  const isAdmin = profile?.role === 'admin'
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DossierStatus | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.id) fetchDossiers(profile.id, isAdmin)
  }, [profile?.id])

  const filtered = dossiers.filter(d => {
    const matchSearch = d.ref.toLowerCase().includes(search.toLowerCase()) ||
      d.type.toLowerCase().includes(search.toLowerCase()) ||
      (d.address ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (d.client_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || d.status === filter
    return matchSearch && matchFilter
  })

  const openCreate = () => {
    setEditingDossier(null)
    setForm(emptyForm)
    setCreateError(null)
    setShowCreate(true)
  }

  const openEdit = (dossier: Dossier) => {
    setEditingDossier(dossier)
    setForm({
      ref: dossier.ref,
      type: dossier.type,
      address: dossier.address ?? '',
      clientName: dossier.client_name ?? '',
      clientEmail: '',
      clientPhone: dossier.client_phone ?? '',
      insurerCompany: dossier.insurer_company ?? '',
      insurerContractNumber: dossier.insurer_contract_number ?? '',
      insurerClaimNumber: dossier.insurer_claim_number ?? '',
      insurerPhone: dossier.insurer_phone ?? '',
      insurerEmail: dossier.insurer_email ?? '',
      insurerAddress: dossier.insurer_address ?? '',
      insuranceExpertName: dossier.insurance_expert_name ?? '',
      insuranceExpertFirm: dossier.insurance_expert_firm ?? '',
      insuranceExpertPhone: dossier.insurance_expert_phone ?? '',
      insuranceExpertEmail: dossier.insurance_expert_email ?? '',
      insuranceExpertAddress: dossier.insurance_expert_address ?? '',
    })
    setCreateError(null)
    setShowCreate(true)
  }

  const handleSave = async () => {
    if (!form.ref || !form.type || !form.clientName) {
      setCreateError('Référence, type et nom client sont requis')
      return
    }
    setSaving(true)
    setCreateError(null)

    const insuranceFields = {
      insurer_company: form.insurerCompany || null,
      insurer_contract_number: form.insurerContractNumber || null,
      insurer_claim_number: form.insurerClaimNumber || null,
      insurer_phone: form.insurerPhone || null,
      insurer_email: form.insurerEmail ? form.insurerEmail.toLowerCase().trim() : null,
      insurer_address: form.insurerAddress || null,
      insurance_expert_name: form.insuranceExpertName || null,
      insurance_expert_firm: form.insuranceExpertFirm || null,
      insurance_expert_phone: form.insuranceExpertPhone || null,
      insurance_expert_email: form.insuranceExpertEmail ? form.insuranceExpertEmail.toLowerCase().trim() : null,
      insurance_expert_address: form.insuranceExpertAddress || null,
    }

    if (editingDossier) {
      // Modification
      const { error } = await supabase.from('dossiers')
        .update({
          type: form.type,
          address: form.address || null,
          client_name: form.clientName,
          client_phone: form.clientPhone || null,
          ...insuranceFields,
        })
        .eq('id', editingDossier.id)

      setSaving(false)
      if (error) { setCreateError(error.message); return }
    } else {
      // Création
      if (!form.clientEmail) { setCreateError('Email client requis'); setSaving(false); return }

      await supabase.auth.signInWithOtp({
        email: form.clientEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true },
      })

      const { error } = await supabase.from('dossiers').insert({
        ref: form.ref,
        type: form.type,
        address: form.address || null,
        client_name: form.clientName,
        client_email: form.clientEmail.toLowerCase().trim(),
        client_phone: form.clientPhone || null,
        expert_id: profile!.id,
        ...insuranceFields,
      })

      setSaving(false)
      if (error) { setCreateError(error.message); return }
    }

    setShowCreate(false)
    setEditingDossier(null)
    setForm(emptyForm)
    fetchDossiers(profile!.id, isAdmin)
  }

  const handleDelete = async (dossier: Dossier) => {
    if (!window.confirm(`Supprimer définitivement le dossier ${dossier.ref} ? Cette action est irréversible.`)) return
    setDeletingId(dossier.id)
    await supabase.from('dossiers').delete().eq('id', dossier.id)
    setDeletingId(null)
    fetchDossiers(profile!.id, isAdmin)
  }

  type Field = { key: keyof FormState; label: string; placeholder: string; disabled?: boolean; fullWidth?: boolean }
  const sections: { title: string; hint?: string; fields: Field[] }[] = [
    {
      title: 'Dossier & client',
      fields: [
        { key: 'ref', label: 'Référence dossier', placeholder: 'ALT-2026-001', disabled: !!editingDossier },
        { key: 'type', label: 'Type de sinistre', placeholder: 'Dégât des eaux' },
        { key: 'clientName', label: 'Nom et prénom du client', placeholder: 'Marie Dupont' },
        { key: 'clientPhone', label: 'Téléphone du client', placeholder: '06 12 34 56 78' },
        ...(!editingDossier ? [{ key: 'clientEmail' as const, label: 'Email client', placeholder: 'client@email.fr' }] : []),
        { key: 'address', label: 'Adresse du bien sinistré', placeholder: '12 rue du Moulin, 34000 Montpellier', fullWidth: true },
      ],
    },
    {
      title: 'Assureur',
      hint: 'Coordonnées de la compagnie d’assurance (optionnel)',
      fields: [
        { key: 'insurerCompany', label: 'Compagnie', placeholder: 'MAIF, AXA, Groupama…' },
        { key: 'insurerContractNumber', label: 'N° de contrat', placeholder: '123456789' },
        { key: 'insurerClaimNumber', label: 'N° de sinistre', placeholder: 'SIN-2026-…' },
        { key: 'insurerPhone', label: 'Téléphone', placeholder: '01 23 45 67 89' },
        { key: 'insurerEmail', label: 'Email', placeholder: 'sinistres@assureur.fr' },
        { key: 'insurerAddress', label: 'Adresse', placeholder: '1 rue de l’assurance, 75001 Paris', fullWidth: true },
      ],
    },
    {
      title: "Expert d'assurance",
      hint: 'Coordonnées de l’expert mandaté par l’assureur (optionnel)',
      fields: [
        { key: 'insuranceExpertName', label: 'Nom et prénom', placeholder: 'Jean Martin' },
        { key: 'insuranceExpertFirm', label: 'Cabinet', placeholder: 'Eurexo, Saretec…' },
        { key: 'insuranceExpertPhone', label: 'Téléphone', placeholder: '01 23 45 67 89' },
        { key: 'insuranceExpertEmail', label: 'Email', placeholder: 'expert@cabinet.fr' },
        { key: 'insuranceExpertAddress', label: 'Adresse', placeholder: '5 avenue des Experts, 75008 Paris', fullWidth: true },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-paper-2">
      <ExpertNav />
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-ink">Dossiers</h1>
          <Button variant="accent" onClick={openCreate}>+ Nouveau dossier</Button>
        </div>

        {/* Formulaire création / modification */}
        {showCreate && (
          <div className="bg-paper border border-paper-2 rounded-md p-6 mb-6 shadow-sm">
            <h2 className="font-semibold text-ink mb-4">
              {editingDossier ? `Modifier ${editingDossier.ref}` : 'Nouveau dossier'}
            </h2>
            <div className="space-y-6">
              {sections.map(section => (
                <div key={section.title}>
                  <div className="flex items-baseline justify-between mb-2 pb-1 border-b border-paper-2">
                    <h3 className="text-sm font-semibold text-ink">{section.title}</h3>
                    {section.hint && <p className="text-xs text-muted">{section.hint}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {section.fields.map(field => (
                      <div key={field.key} className={field.fullWidth ? 'col-span-2' : ''}>
                        <label className="block text-xs font-medium text-ink mb-1">{field.label}</label>
                        <input
                          value={form[field.key]}
                          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          disabled={field.disabled}
                          className="w-full px-3 py-2 rounded-sm border border-paper-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {editingDossier && (
              <p className="text-xs text-muted mt-3">
                ℹ️ La référence et l'email client ne peuvent pas être modifiés après création.
              </p>
            )}
            {createError && <p className="text-sm text-red-500 mt-3">{createError}</p>}
            <div className="flex gap-3 mt-4">
              <Button variant="primary" onClick={handleSave} loading={saving}>
                {editingDossier ? 'Enregistrer les modifications' : 'Créer le dossier'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowCreate(false); setEditingDossier(null) }}>Annuler</Button>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="flex items-center gap-3 mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par ref, client, type, adresse…"
            className="flex-1 px-3 py-2 rounded-sm border border-paper-2 bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <div className="flex gap-2">
            {(['all', 'active', 'pending', 'closed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                  filter === s ? 'bg-primary text-white' : 'bg-paper border border-paper-2 text-muted hover:text-ink'
                }`}
              >
                {s === 'all' ? 'Tous' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-paper rounded-md border border-paper-2 p-10 text-center">
            <p className="text-muted text-sm">Aucun dossier trouvé</p>
          </div>
        ) : (
          <div className="bg-paper rounded-md border border-paper-2 divide-y divide-paper-2">
            {filtered.map(dossier => (
              <div key={dossier.id} className="flex items-center gap-4 px-5 py-4 hover:bg-paper-2 transition-colors group">
                <Link to={`${base}/dossier/${dossier.ref}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <StepRing currentStep={dossier.current_step} progress={dossier.progress} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-semibold text-sm text-ink">{dossier.ref}</span>
                      <Pill variant={dossier.status === 'active' ? 'success' : dossier.status === 'closed' ? 'muted' : 'warning'}>
                        {STATUS_LABELS[dossier.status]}
                      </Pill>
                      <Pill variant="primary">{dossier.type}</Pill>
                      {isAdmin && dossier.owner && (
                        <Pill variant={dossier.owner.role === 'partenaire' ? 'accent' : 'muted'}>
                          {dossier.owner.role === 'partenaire' ? '🤝 ' : '👤 '}{dossier.owner.full_name ?? '—'}
                        </Pill>
                      )}
                    </div>
                    <p className="text-xs text-muted truncate">
                      {dossier.client_name ? `${dossier.client_name} · ` : ''}{dossier.address ?? '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted">Étape {dossier.current_step}/6</p>
                    <p className="text-xs font-medium text-ink">{STEP_LABELS[dossier.current_step]}</p>
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openEdit(dossier)}
                    className="px-2.5 py-1.5 text-xs font-medium text-muted hover:text-ink border border-paper-2 rounded-sm hover:border-ink/30 transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(dossier)}
                    disabled={deletingId === dossier.id}
                    className="px-2.5 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 rounded-sm hover:border-red-400 transition-colors disabled:opacity-50"
                  >
                    {deletingId === dossier.id ? '…' : 'Supprimer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
