import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useDossierStore } from '@/stores/dossierStore'
import { basePathForRole } from '@/lib/space'
import { searchDossiers } from '@/lib/dossierSearch'

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  pending: 'En attente',
  closed: 'Clôturé',
}

// Barre de recherche globale : trouve un dossier, quel que soit son statut,
// depuis n'importe quelle page de l'espace expert. Raccourci : touche « / ».
export function DossierSearchBar() {
  const { profile } = useAuthStore()
  const { dossiers, fetchDossiers } = useDossierStore()
  const navigate = useNavigate()
  const base = basePathForRole(profile?.role)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  // Charge les dossiers si la page courante ne l'a pas déjà fait.
  useEffect(() => {
    if (profile?.id && dossiers.length === 0) fetchDossiers(profile.id, profile.role === 'admin')
  }, [profile?.id])

  // Raccourci clavier « / » pour placer le curseur dans la recherche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
      if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Ferme la liste quand on clique ailleurs.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const results = useMemo(
    () => (query.trim() ? searchDossiers(dossiers, query).slice(0, 8) : []),
    [dossiers, query],
  )

  const go = (ref: string) => {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    navigate(`${base}/dossier/${ref}`)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      go(results[active].ref)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={boxRef} className="relative w-64 lg:w-80">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">🔍</span>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Rechercher un dossier…  ( / )"
        aria-label="Rechercher un dossier"
        className="w-full pl-9 pr-3 py-1.5 text-sm bg-paper-2 border border-paper-2 rounded-sm focus:outline-none focus:border-primary focus:bg-paper"
      />

      {open && query.trim() && (
        <div className="absolute right-0 left-0 mt-1 bg-paper border border-paper-2 rounded-md shadow-lg overflow-hidden z-20">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Aucun dossier trouvé</p>
          ) : (
            results.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(d.ref)}
                className={`w-full text-left px-4 py-2.5 flex items-start gap-3 ${i === active ? 'bg-primary/5' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{d.ref}</span>
                    <span className="text-[11px] text-muted">{STATUS_LABELS[d.status] ?? d.status}</span>
                  </div>
                  <p className="text-xs text-muted truncate">
                    {[d.client_name, d.address].filter(Boolean).join(' · ') || d.type}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
