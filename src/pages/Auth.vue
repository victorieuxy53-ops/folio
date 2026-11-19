<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LoaderCircle } from '@lucide/vue'
import { configured, supabase } from '../lib/supabase'
import Field from '../components/Field.vue'
import Logo from '../components/Logo.vue'

type Mode = 'login' | 'signup' | 'forgot' | 'update'
const route = useRoute()
const router = useRouter()
const queryMode = route.query.mode
const mode = ref<Mode>(queryMode === 'signup' || queryMode === 'update' || queryMode === 'forgot' ? queryMode : 'login')
const form = reactive({ name: '', email: '', password: '' })
const busy = ref(false)
const error = ref('')
const info = ref('')

const texts = computed(() => ({
  login: { title: 'Bon retour !', sub: 'Connectez-vous pour gérer vos portfolios.', cta: 'Se connecter' },
  signup: { title: 'Créez votre compte', sub: 'Gratuit. Vous ne payez qu’au moment de publier.', cta: 'Créer mon compte' },
  forgot: { title: 'Mot de passe oublié', sub: 'Recevez un lien pour en choisir un nouveau.', cta: 'Envoyer le lien' },
  update: { title: 'Nouveau mot de passe', sub: 'Choisissez votre nouveau mot de passe.', cta: 'Enregistrer' },
})[mode.value])

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  email_not_confirmed: 'Confirmez d’abord votre adresse via l’e-mail reçu (pensez aux spams).',
  user_already_exists: 'Un compte existe déjà avec cet e-mail. Connectez-vous.',
  weak_password: 'Mot de passe trop faible : 8 caractères minimum.',
  same_password: 'Choisissez un mot de passe différent de l’ancien.',
  over_email_send_rate_limit: 'Trop de tentatives. Patientez quelques minutes.',
  email_address_not_authorized: 'L’e-mail ne peut pas être envoyé pour le moment. Réessayez plus tard.',
}

function switchTo(m: Mode) {
  mode.value = m
  error.value = ''
  info.value = ''
}

const next = () => {
  const n = route.query.next
  return typeof n === 'string' && /^\/(?!\/)/.test(n) ? n : '/app'
}

async function submit() {
  if (!configured) {
    error.value = 'Supabase n’est pas encore configuré (fichier .env manquant).'
    return
  }
  busy.value = true
  error.value = ''
  info.value = ''
  try {
    if (mode.value === 'login') {
      const { error: e } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (e) throw e
      await router.replace(next())
    } else if (mode.value === 'signup') {
      const { data, error: e } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name.trim() }, emailRedirectTo: `${location.origin}/app` },
      })
      if (e) throw e
      if (data.session) await router.replace(next())
      else info.value = 'Compte créé ! Cliquez sur le lien envoyé à votre adresse e-mail pour l’activer.'
    } else if (mode.value === 'forgot') {
      const { error: e } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: `${location.origin}/auth?mode=update` })
      if (e) throw e
      info.value = 'Si un compte existe pour cette adresse, un lien vient de vous être envoyé.'
    } else {
      const { error: e } = await supabase.auth.updateUser({ password: form.password })
      if (e) throw e
      await router.replace('/app')
    }
  } catch (e) {
    const err = e as { code?: string; message?: string }
    error.value = (err.code && MESSAGES[err.code]) || err.message || 'Une erreur est survenue.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-dvh place-items-center bg-gradient-to-b from-brand-50 to-zinc-50 px-4 py-10">
    <div class="w-full max-w-sm">
      <RouterLink to="/" class="mb-8 flex justify-center"><Logo /></RouterLink>
      <div class="card p-6 shadow-xl shadow-zinc-200/50 sm:p-8">
        <h1 class="text-xl font-bold">{{ texts.title }}</h1>
        <p class="mt-1 mb-6 text-sm text-zinc-500">{{ texts.sub }}</p>

        <form class="space-y-4" @submit.prevent="submit">
          <Field v-if="mode === 'signup'" label="Nom complet">
            <input v-model="form.name" required class="input" autocomplete="name" placeholder="Ex. : Koffi Mensah" />
          </Field>
          <Field v-if="mode !== 'update'" label="Adresse e-mail">
            <input v-model="form.email" type="email" required class="input" autocomplete="email" placeholder="vous@exemple.com" />
          </Field>
          <Field v-if="mode !== 'forgot'" :label="mode === 'update' ? 'Nouveau mot de passe' : 'Mot de passe'" :hint="mode === 'login' ? undefined : '8 caractères minimum.'">
            <input
              v-model="form.password"
              type="password"
              required
              :minlength="mode === 'login' ? undefined : 8"
              class="input"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            />
          </Field>
          <button v-if="mode === 'login'" type="button" class="-mt-1 text-sm font-medium text-brand-600 hover:underline" @click="switchTo('forgot')">
            Mot de passe oublié ?
          </button>

          <p v-if="error" class="alert">{{ error }}</p>
          <p v-if="info" class="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ info }}</p>

          <button type="submit" class="btn btn-primary w-full !py-3" :disabled="busy">
            <LoaderCircle v-if="busy" class="size-4 animate-spin" /> {{ texts.cta }}
          </button>
        </form>
      </div>

      <p class="mt-6 text-center text-sm text-zinc-600">
        <template v-if="mode === 'login'">
          Pas encore de compte ?
          <button type="button" class="font-semibold text-brand-600 hover:underline" @click="switchTo('signup')">Inscrivez-vous</button>
        </template>
        <template v-else-if="mode !== 'update'">
          Déjà inscrit ?
          <button type="button" class="font-semibold text-brand-600 hover:underline" @click="switchTo('login')">Connectez-vous</button>
        </template>
      </p>
    </div>
  </div>
</template>
