import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../../shared/portfolio'
import { supabase } from './supabase'

export const session = ref<Session | null>(null)
export const profile = ref<Profile | null>(null)
export const isAdmin = computed(() => profile.value?.role === 'admin')

let pending: { id?: string; promise: Promise<void> } | null = null

/** Charge le profil de l'utilisateur connecté (une seule fois par utilisateur). */
export function ensureProfile(): Promise<void> {
  const id = session.value?.user.id
  if (!pending || pending.id !== id) {
    pending = {
      id,
      promise: (async () => {
        const data = id ? (await supabase.from('profiles').select('*').eq('id', id).maybeSingle()).data : null
        if (session.value?.user.id === id) profile.value = data as Profile | null
      })(),
    }
  }
  return pending.promise
}

export const authReady = supabase.auth.getSession().then(({ data }) => {
  session.value = data.session
  return ensureProfile()
})

supabase.auth.onAuthStateChange((_event, s) => {
  session.value = s
  // Pas d'appel Supabase directement dans ce callback (risque de blocage).
  setTimeout(ensureProfile)
})

export const signOut = () => supabase.auth.signOut()
