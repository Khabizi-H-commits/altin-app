import { useState, useRef, useCallback } from 'react'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface MediaItem {
  id: string
  type: 'photo' | 'doc'
  url: string
  name: string
  size: number
}

interface MediaMap {
  [sectionId: string]: MediaItem[]
}

/* ─── Données check-list ─────────────────────────────────────────────────── */

const SECTION_A_ITEMS = [
  "Périmètre de la mission confirmé avec le mandant (ni MOE, ni AMO)",
  "Identité et qualité de chaque personne présente relevées",
  "Références cadastrales notées (si pertinent)",
  "Nombre de niveaux et surfaces relevés",
  "Statut du bien : occupé / vacant / en vente / en location",
]

const SECTION_A_DOCS = [
  "Contrat d'assurance (n° de police + formule)",
  "Déclarations de sinistre et courriers de l'assureur (refus, indemnité)",
  "Rapports d'experts antérieurs (Eurisk, Saretec, confrères…)",
  "Devis et factures de réparations déjà engagées",
  "Diagnostics, PV de réception, plans, DOE",
]

const SECTION_B_ITEMS = [
  "Nature exacte du désordre selon le client ?",
  "Date de première apparition ? Comment a-t-il été constaté ?",
  "Évolution : stable / aggravation / saisonnalité ?",
  "Lien avec un événement (pluie, sécheresse, travaux voisins, arrêté Cat-Nat) ?",
  "Interventions déjà réalisées : par qui, quand, résultat, coût ?",
  "Expertise antérieure ? Conclusions ? Rapport définitif communiqué ?",
  "Position actuelle de l'assureur ?",
  "Délais en cours (prescription biennale, délai de recours) ?",
  "Conséquences subies (gêne, perte de jouissance, sinistres en chaîne, mobilier) ?",
]

const SECTION_C_ITEMS = [
  "Description FACTUELLE (aucun pré-diagnostic énoncé devant le client)",
  "Mesures précises : dimension, orientation, localisation (ex. « fissure 3 mm à 45° »)",
  "20 à 30 photos minimum, datées, avec échelle (vue large + détail)",
  "Relevés instrumentés : humidimètre, fissuromètre, niveau, hygro/température",
  "Chaque désordre localisé (pièce par pièce, façade par façade) et cartographié",
  "Zones NON accessibles notées (vide sanitaire, combles, réseaux) → réserves",
]

const MODULES = [
  {
    id: 'fissuration',
    label: 'Fissuration / RGA',
    sub: 'sécheresse, retrait-gonflement',
    items: [
      "Nature du sol (argileux ?), végétation/arbres proches, pente, drainage",
      "Ventilation du vide sanitaire, état des fondations visibles",
      "Cartographie des fissures : traversantes ?, en escalier ?, enduit ou structurelles ?",
      "Épisode de sécheresse / arrêté Cat-Nat applicable ? Investigations géotechniques prévues ?",
    ],
  },
  {
    id: 'dde',
    label: 'Dégât des eaux',
    sub: 'humidité, infiltration',
    items: [
      "Origine présumée : réseau, toiture, remontée capillaire, refoulement, condensation",
      "Taux d'humidité : zones touchées ET zone témoin saine",
      "État des réseaux accessibles, recherche de fuite déjà faite ?",
      "Moisissures, ventilation/VMC, conditions normales d'habitabilité",
    ],
  },
  {
    id: 'incendie',
    label: 'Incendie',
    sub: 'structure, fumées, suie',
    items: [
      "Origine et zone de départ, étendue (fumées, suie, structure)",
      "Rapport pompiers / police ? Date de déclaration à l'assureur (délai) ?",
      "Éléments structurels atteints, sécurité du bâti",
    ],
  },
  {
    id: 'toiture',
    label: 'Toiture',
    sub: 'couverture, étanchéité',
    items: [
      "Type de couverture, âge, mise en œuvre, points singuliers (faîtage, noues, solins)",
      "Défauts d'étanchéité, désordres en sous-face, conséquences intérieures",
    ],
  },
  {
    id: 'locatif',
    label: 'Litige locatif',
    sub: 'propriétaire / locataire',
    items: [
      "Répartition propriétaire / locataire (entretien vs vétusté vs vice)",
      "Conditions d'habitabilité, échanges écrits propriétaire-locataire à récupérer",
    ],
  },
]

const SECTION_E_ITEMS = [
  "Bilan financier : chiffrages/factures réunis (coûts engagés vs indemnité)",
  "Volet juridique : éléments pour qualifier la responsabilité et viser les bons textes",
  "Photos suffisantes et exploitables (impossible de revenir pour un oubli)",
  "Feuille de présence émargée si visite contradictoire",
  "Pièces restant à obtenir listées (rapport définitif, documents manquants) → réserves",
]

/* ─── Utilitaires ────────────────────────────────────────────────────────── */

function uid() { return Math.random().toString(36).slice(2) }

function fmtBytes(n: number) {
  if (n < 1024) return `${n} o`
  if (n < 1048576) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / 1048576).toFixed(1)} Mo`
}

/* ─── Sub-composants ─────────────────────────────────────────────────────── */

function CheckItem({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: () => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-paper-2 accent-primary"
      />
      <span className={`text-sm leading-snug transition-colors ${
        checked ? 'line-through text-muted' : 'text-ink group-hover:text-primary'
      }`}>
        {label}
      </span>
    </label>
  )
}

function SectionBlock({ title, badge, children, defaultOpen = true }: {
  title: string; badge?: number; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-md border border-paper-2 bg-paper overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-paper-2 transition-colors"
      >
        <span className="text-sm font-semibold text-ink">{title}</span>
        <div className="flex items-center gap-2">
          {badge != null && badge > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
              {badge}
            </span>
          )}
          <span className="text-muted text-base leading-none">{open ? '−' : '+'}</span>
        </div>
      </button>
      {open && <div className="px-5 pb-5 border-t border-paper-2">{children}</div>}
    </div>
  )
}

/* ─── MediaUploader ──────────────────────────────────────────────────────── */

function MediaUploader({ sectionId, media, onAdd, onRemove, onLightbox }: {
  sectionId: string
  media: MediaMap
  onAdd: (sectionId: string, item: MediaItem) => void
  onRemove: (sectionId: string, id: string) => void
  onLightbox: (item: MediaItem) => void
}) {
  const photoRef = useRef<HTMLInputElement>(null)
  const docRef   = useRef<HTMLInputElement>(null)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(file => {
      onAdd(sectionId, { id: uid(), type: 'photo', url: URL.createObjectURL(file), name: file.name, size: file.size })
    })
    e.target.value = ''
  }

  const handleDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(file => {
      onAdd(sectionId, { id: uid(), type: 'doc', url: URL.createObjectURL(file), name: file.name, size: file.size })
    })
    e.target.value = ''
  }

  const items  = media[sectionId] ?? []
  const photos = items.filter(m => m.type === 'photo')
  const docs   = items.filter(m => m.type === 'doc')

  return (
    <div className="mt-4 pt-4 border-t border-paper-2">
      {/* Boutons */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Photo
        </button>
        <button
          type="button"
          onClick={() => docRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium bg-paper-2 text-muted border border-paper-2 hover:text-ink hover:border-paper-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Document
        </button>
        {items.length > 0 && (
          <span className="ml-auto text-xs text-muted">{items.length} pièce{items.length > 1 ? 's' : ''}</span>
        )}
      </div>

      <input ref={photoRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={handlePhoto} />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.heic" multiple hidden onChange={handleDoc} />

      {/* Grille photos */}
      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
          {photos.map(p => (
            <div key={p.id} className="relative group aspect-square">
              <img
                src={p.url}
                alt={p.name}
                onClick={() => onLightbox(p)}
                className="w-full h-full object-cover rounded-sm cursor-zoom-in border border-paper-2"
              />
              <button
                type="button"
                onClick={() => onRemove(sectionId, p.id)}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Liste docs */}
      {docs.length > 0 && (
        <ul className="mt-2 space-y-1">
          {docs.map(d => (
            <li key={d.id} className="group flex items-center gap-2 px-3 py-1.5 rounded-sm bg-paper-2">
              <span className="text-sm">📎</span>
              <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline underline-offset-2 truncate flex-1">{d.name}</a>
              <span className="text-[10px] text-muted shrink-0">{fmtBytes(d.size)}</span>
              <button
                type="button"
                onClick={() => onRemove(sectionId, d.id)}
                className="text-muted hover:text-red-500 transition-colors text-sm opacity-0 group-hover:opacity-100 shrink-0"
              >×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ─── Lightbox ───────────────────────────────────────────────────────────── */

function Lightbox({ item, onClose }: { item: MediaItem | null; onClose: () => void }) {
  if (!item) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/20 text-white text-xl flex items-center justify-center hover:bg-white/30"
      >×</button>
      <img
        src={item.url}
        alt={item.name}
        className="max-h-[90vh] max-w-[90vw] rounded-md object-contain shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">{item.name}</p>
    </div>
  )
}

/* ─── Composant principal ────────────────────────────────────────────────── */

export default function ExpertChecklistTab() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [notes, setNotes]     = useState({ a: '', b: '', c: '', mod: '', e: '' })
  const [activeModule, setActiveModule] = useState('fissuration')
  const [media, setMedia]     = useState<MediaMap>({})
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)

  const toggle = (key: string) => setChecked(prev => ({ ...prev, [key]: !prev[key] }))
  const chk = (key: string) => !!checked[key]

  const addMedia = useCallback((sectionId: string, item: MediaItem) => {
    setMedia(prev => ({ ...prev, [sectionId]: [...(prev[sectionId] ?? []), item] }))
  }, [])

  const removeMedia = useCallback((sectionId: string, id: string) => {
    setMedia(prev => {
      const updated = (prev[sectionId] ?? []).filter(m => {
        if (m.id === id) { URL.revokeObjectURL(m.url); return false }
        return true
      })
      return { ...prev, [sectionId]: updated }
    })
  }, [])

  const badge = (id: string) => (media[id] ?? []).length

  // Calcul progression
  const allKeys = [
    ...SECTION_A_ITEMS.map((_, i) => `a_${i}`),
    ...SECTION_A_DOCS.map((_, i) => `adoc_${i}`),
    ...SECTION_B_ITEMS.map((_, i) => `b_${i}`),
    ...SECTION_C_ITEMS.map((_, i) => `c_${i}`),
    ...MODULES.flatMap(m => m.items.map((_, i) => `${m.id}_${i}`)),
    ...SECTION_E_ITEMS.map((_, i) => `e_${i}`),
  ]
  const done      = allKeys.filter(k => checked[k]).length
  const progress  = Math.round((done / allKeys.length) * 100)
  const totalMedia = Object.values(media).flat().length

  const handleReset = () => {
    if (!confirm('Réinitialiser toute la check-list (cases, notes et pièces jointes) ?')) return
    Object.values(media).flat().forEach(m => URL.revokeObjectURL(m.url))
    setChecked({})
    setNotes({ a: '', b: '', c: '', mod: '', e: '' })
    setMedia({})
  }

  return (
    <>
      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />

      <div className="space-y-4">

        {/* Progression */}
        <div className="bg-primary rounded-md p-4 text-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold">Progression visite terrain</span>
            <span className="text-white/70 text-xs">{done}/{allKeys.length} points</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-white/60 text-xs">{progress}% complété</span>
            {totalMedia > 0 && (
              <span className="text-white/60 text-xs">{totalMedia} pièce{totalMedia > 1 ? 's' : ''} jointe{totalMedia > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Section A */}
        <SectionBlock title="A. À l'arrivée — Cadrage administratif" badge={badge('a')}>
          <div className="mt-4 space-y-3">
            {SECTION_A_ITEMS.map((item, i) => (
              <CheckItem key={i} id={`a_${i}`} label={item} checked={chk(`a_${i}`)} onChange={() => toggle(`a_${i}`)} />
            ))}
            <p className="text-xs font-semibold text-muted uppercase tracking-wide pt-3 mt-4 border-t border-paper-2">
              Documents à récupérer ou photographier
            </p>
            {SECTION_A_DOCS.map((item, i) => (
              <CheckItem key={i} id={`adoc_${i}`} label={item} checked={chk(`adoc_${i}`)} onChange={() => toggle(`adoc_${i}`)} />
            ))}
          </div>
          <textarea
            className="mt-4 w-full px-3 py-2 rounded-sm border border-paper-2 text-sm text-ink bg-paper-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={2} placeholder="Notes / observations…"
            value={notes.a} onChange={e => setNotes(n => ({ ...n, a: e.target.value }))}
          />
          <MediaUploader sectionId="a" media={media} onAdd={addMedia} onRemove={removeMedia} onLightbox={setLightbox} />
        </SectionBlock>

        {/* Section B */}
        <SectionBlock title="B. Contexte du désordre — Questions au client" badge={badge('b')}>
          <p className="mt-3 text-xs text-muted italic">Reconstituer la chronologie — noter les réponses du client mot à mot si utile.</p>
          <div className="mt-3 space-y-3">
            {SECTION_B_ITEMS.map((item, i) => (
              <CheckItem key={i} id={`b_${i}`} label={item} checked={chk(`b_${i}`)} onChange={() => toggle(`b_${i}`)} />
            ))}
          </div>
          <textarea
            className="mt-4 w-full px-3 py-2 rounded-sm border border-paper-2 text-sm text-ink bg-paper-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={3} placeholder="Réponses du client / chronologie…"
            value={notes.b} onChange={e => setNotes(n => ({ ...n, b: e.target.value }))}
          />
          <MediaUploader sectionId="b" media={media} onAdd={addMedia} onRemove={removeMedia} onLightbox={setLightbox} />
        </SectionBlock>

        {/* Section C */}
        <SectionBlock title="C. Constatations techniques — Méthode" badge={badge('c')}>
          <div className="mt-4 space-y-3">
            {SECTION_C_ITEMS.map((item, i) => (
              <CheckItem key={i} id={`c_${i}`} label={item} checked={chk(`c_${i}`)} onChange={() => toggle(`c_${i}`)} />
            ))}
          </div>
          <textarea
            className="mt-4 w-full px-3 py-2 rounded-sm border border-paper-2 text-sm text-ink bg-paper-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={2} placeholder="Relevés et mesures…"
            value={notes.c} onChange={e => setNotes(n => ({ ...n, c: e.target.value }))}
          />
          <MediaUploader sectionId="c" media={media} onAdd={addMedia} onRemove={removeMedia} onLightbox={setLightbox} />
        </SectionBlock>

        {/* Section D — Modules */}
        <SectionBlock title="D. Modules spécifiques selon le type de dossier" badge={badge(`mod_${activeModule}`)}>
          <div className="mt-4 flex flex-wrap gap-2">
            {MODULES.map(m => {
              const mb = badge(`mod_${m.id}`)
              return (
                <button key={m.id} type="button" onClick={() => setActiveModule(m.id)}
                  className={`relative px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${
                    activeModule === m.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-paper text-muted border-paper-2 hover:border-primary hover:text-primary'
                  }`}
                >
                  {m.label}
                  {mb > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-accent text-white text-[10px] flex items-center justify-center">{mb}</span>
                  )}
                </button>
              )
            })}
          </div>
          {MODULES.filter(m => m.id === activeModule).map(m => (
            <div key={m.id} className="mt-4">
              <p className="text-xs text-muted italic mb-3">{m.sub}</p>
              <div className="space-y-3">
                {m.items.map((item, i) => (
                  <CheckItem key={i} id={`${m.id}_${i}`} label={item} checked={chk(`${m.id}_${i}`)} onChange={() => toggle(`${m.id}_${i}`)} />
                ))}
              </div>
            </div>
          ))}
          <textarea
            className="mt-4 w-full px-3 py-2 rounded-sm border border-paper-2 text-sm text-ink bg-paper-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={2} placeholder="Observations spécifiques…"
            value={notes.mod} onChange={e => setNotes(n => ({ ...n, mod: e.target.value }))}
          />
          <MediaUploader sectionId={`mod_${activeModule}`} media={media} onAdd={addMedia} onRemove={removeMedia} onLightbox={setLightbox} />
        </SectionBlock>

        {/* Section E */}
        <SectionBlock title="E. Avant de partir — Pour boucler le rapport" badge={badge('e')}>
          <div className="mt-4 space-y-3">
            {SECTION_E_ITEMS.map((item, i) => (
              <CheckItem key={i} id={`e_${i}`} label={item} checked={chk(`e_${i}`)} onChange={() => toggle(`e_${i}`)} />
            ))}
          </div>
          <textarea
            className="mt-4 w-full px-3 py-2 rounded-sm border border-paper-2 text-sm text-ink bg-paper-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={2} placeholder="À faire / pièces à réclamer après la visite…"
            value={notes.e} onChange={e => setNotes(n => ({ ...n, e: e.target.value }))}
          />
          <MediaUploader sectionId="e" media={media} onAdd={addMedia} onRemove={removeMedia} onLightbox={setLightbox} />
        </SectionBlock>

        {/* Réinitialiser */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-sm text-xs text-muted border border-paper-2 hover:border-red-300 hover:text-red-500 transition-colors"
          >
            Réinitialiser la check-list
          </button>
        </div>

      </div>
    </>
  )
}
