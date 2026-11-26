import type { Dossier } from '@/types'

// Recherche de dossiers tolérante : sans accents, sans casse,
// et qui accepte une petite faute de frappe (ex. « arsella » trouve « Arcella »).

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Distance d'édition bornée : renvoie max+1 dès que la limite est dépassée.
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (cur[j] < rowMin) rowMin = cur[j]
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

function haystack(d: Dossier & { parties?: unknown }): string {
  const parts: (string | null | undefined)[] = [
    d.ref,
    d.type,
    d.address,
    d.client_name,
    d.client_email,
    d.insurer_company,
    d.insurer_claim_number,
    d.insurer_contract_number,
    d.insurance_expert_name,
    d.insurance_expert_firm,
  ]
  if (Array.isArray(d.parties)) {
    for (const p of d.parties as { nom?: string; email?: string }[]) {
      parts.push(p?.nom, p?.email)
    }
  }
  return normalize(parts.filter(Boolean).join(' '))
}

// Score : 0 = pas trouvé, plus c'est haut, plus c'est pertinent.
export function scoreDossier(d: Dossier, query: string): number {
  const q = normalize(query)
  if (!q) return 1
  const text = haystack(d)
  const words = text.split(' ')
  const tokens = q.split(' ')
  let score = 0
  for (const t of tokens) {
    if (text.includes(t)) {
      score += normalize(d.ref).includes(t) || normalize(d.client_name ?? '').includes(t) ? 3 : 2
      continue
    }
    if (t.length < 4) return 0
    const max = t.length >= 7 ? 2 : 1
    const close = words.some(w => w.length >= 3 && distance(t, w, max) <= max)
    if (!close) return 0
    score += 1
  }
  return score
}

export function searchDossiers<T extends Dossier>(dossiers: T[], query: string): T[] {
  if (!normalize(query)) return dossiers
  return dossiers
    .map(d => ({ d, s: scoreDossier(d, query) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map(x => x.d)
}
