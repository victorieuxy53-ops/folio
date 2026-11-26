// Envoi d'une image dans le stockage (dossier du compte), redimensionnée et convertie en WebP.
import { supabase } from './supabase'
import { session } from './auth'

/** Redimensionne (1600 px max) et convertit en WebP : rapide à envoyer, rapide à afficher. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * ratio)
  canvas.height = Math.round(bitmap.height * ratio)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('conversion'))), 'image/webp', 0.85))
}

/** Envoie l'image et renvoie son adresse publique. */
export async function uploadImage(file: File): Promise<string> {
  if (!session.value) throw new Error('Session expirée')
  const path = `${session.value.user.id}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from('media').upload(path, await shrink(file), { contentType: 'image/webp' })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
