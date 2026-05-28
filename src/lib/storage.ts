const DIACRITICS = /[̀-ͯ]/g

export function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  const cleanBase = base
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  const cleanExt = ext
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^a-zA-Z0-9.]/g, '')
  return (cleanBase || 'file') + cleanExt
}

export function buildStoragePath(dossierId: string, file: File): string {
  return `${dossierId}/${Date.now()}-${sanitizeFilename(file.name)}`
}
