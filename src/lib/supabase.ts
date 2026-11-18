import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Faux tant que le fichier .env n'est pas rempli : le site s'affiche quand même. */
export const configured = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost:54321', key || 'non-configure')
