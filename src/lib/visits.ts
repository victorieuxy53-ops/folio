import { authReady, isAdmin } from './auth'
import { configured, supabase } from './supabase'

/**
 * Compte une visite de Folio : une fois par jour et par navigateur, sans cookie ni donnée personnelle.
 * Les administrateurs connectés et les robots ne sont pas comptés.
 */
export async function countVisit() {
  await authReady
  if (!configured || isAdmin.value || navigator.webdriver) return
  const today = new Date().toISOString().slice(0, 10)
  try {
    if (localStorage.getItem('folio-visit') === today) return
    localStorage.setItem('folio-visit', today)
  } catch {
    // Stockage bloqué par le navigateur : la visite est comptée quand même.
  }
  await supabase.rpc('track_visit', { p_site: '' })
}
