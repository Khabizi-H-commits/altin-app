// Compression des photos avant envoi dans le stockage Supabase (quota limité).
// Les photos sont réduites à 2560 px max, en JPEG qualité 0,82, image redressée.
// Les métadonnées EXIF (date, GPS, appareil) sont recopiées, orientation remise à 1.
// En cas d'échec (format non lu par le navigateur, ex. HEIC sur Chrome), le fichier d'origine est envoyé tel quel.

const MAX_COTE = 2560
const QUALITE = 0.82
const SEUIL_OCTETS = 800 * 1024
const TYPES_COMPRESSIBLES = ['image/jpeg', 'image/png', 'image/webp']

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', QUALITE))
}

/** Extrait le segment APP1 Exif d'un JPEG et force l'orientation à 1 (image déjà redressée). */
function extraireExif(jpeg: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> | null {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return null
  let i = 2
  while (i + 4 < jpeg.length && jpeg[i] === 0xff) {
    const marqueur = jpeg[i + 1]
    if (marqueur === 0xda) break
    const longueur = (jpeg[i + 2] << 8) | jpeg[i + 3]
    const estExif = marqueur === 0xe1 && jpeg[i + 4] === 0x45 && jpeg[i + 5] === 0x78 && jpeg[i + 6] === 0x69 && jpeg[i + 7] === 0x66
    if (estExif) {
      const seg = jpeg.slice(i, i + 2 + longueur)
      forcerOrientation(seg)
      return seg
    }
    i += 2 + longueur
  }
  return null
}

function forcerOrientation(seg: Uint8Array) {
  const tiff = 10
  const le = seg[tiff] === 0x49
  const r16 = (p: number) => (le ? seg[p] | (seg[p + 1] << 8) : (seg[p] << 8) | seg[p + 1])
  const r32 = (p: number) => (le
    ? (seg[p] | (seg[p + 1] << 8) | (seg[p + 2] << 16) | (seg[p + 3] << 24)) >>> 0
    : ((seg[p] << 24) | (seg[p + 1] << 16) | (seg[p + 2] << 8) | seg[p + 3]) >>> 0)
  const ifd = tiff + r32(tiff + 4)
  if (ifd + 2 > seg.length) return
  const n = r16(ifd)
  for (let k = 0; k < n; k++) {
    const e = ifd + 2 + k * 12
    if (e + 12 > seg.length) return
    if (r16(e) === 0x0112) {
      if (le) { seg[e + 8] = 1; seg[e + 9] = 0 } else { seg[e + 8] = 0; seg[e + 9] = 1 }
      return
    }
  }
}

/** Insère le segment Exif juste après le marqueur SOI, en retirant l'en-tête JFIF du canvas. */
function insererExif(jpeg: Uint8Array<ArrayBuffer>, exif: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  let suite = 2
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0) suite = 4 + ((jpeg[4] << 8) | jpeg[5])
  const out = new Uint8Array(2 + exif.length + jpeg.length - suite)
  out.set(jpeg.subarray(0, 2), 0)
  out.set(exif, 2)
  out.set(jpeg.subarray(suite), 2 + exif.length)
  return out
}

function nomJpeg(nom: string): string {
  return /\.(jpe?g)$/i.test(nom) ? nom : nom.replace(/\.[^.]+$/, '') + '.jpg'
}

/** Renvoie une version allégée de la photo, ou le fichier d'origine si rien n'est à gagner. */
export async function compresserPhoto(file: File): Promise<File> {
  if (!TYPES_COMPRESSIBLES.includes(file.type) || file.size < SEUIL_OCTETS) return file
  try {
    const img = await loadImage(file)
    const k = Math.min(1, MAX_COTE / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * k)
    c.height = Math.round(img.naturalHeight * k)
    const ctx = c.getContext('2d')!
    if (file.type === 'image/png') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height) }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, c.width, c.height)
    let octets = new Uint8Array(await (await canvasToBlob(c)).arrayBuffer())
    if (file.type === 'image/jpeg') {
      const exif = extraireExif(new Uint8Array(await file.arrayBuffer()))
      if (exif) octets = insererExif(octets, exif)
    }
    if (octets.length > file.size * 0.8) return file
    return new File([octets], nomJpeg(file.name), { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file
  }
}
