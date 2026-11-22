<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { LoaderCircle, ShieldCheck } from '@lucide/vue'
import { supabase } from '../lib/supabase'
import Field from './Field.vue'

/**
 * Vérification en 2 étapes de l'administration : code à 6 chiffres d'une application d'authentification.
 * La base n'ouvre les données admin qu'aux sessions vérifiées ainsi (aal2, voir is_admin dans schema.sql) :
 * un mot de passe volé ne suffit pas.
 */
const emit = defineEmits<{ ready: [] }>()
const step = ref<'loading' | 'enroll' | 'verify' | 'failed'>('loading')
const factorId = ref('')
const qr = ref('')
const secret = ref('')
const code = ref('')
const busy = ref(false)
const error = ref('')

async function start() {
  step.value = 'loading'
  error.value = ''
  try {
    const { data: level, error: e1 } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (e1) throw e1
    if (level.currentLevel === 'aal2') return emit('ready')
    const { data: factors, error: e2 } = await supabase.auth.mfa.listFactors()
    if (e2) throw e2
    const verified = factors.totp[0]
    if (verified) {
      factorId.value = verified.id
      step.value = 'verify'
      return
    }
    // Première fois : on efface un ajout abandonné, puis on affiche le QR code à scanner.
    for (const f of factors.all) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
    const { data, error: e3 } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Folio', friendlyName: 'Administration' })
    if (e3) throw e3
    factorId.value = data.id
    qr.value = data.totp.qr_code
    secret.value = data.totp.secret
    step.value = 'enroll'
  } catch (e) {
    error.value = `Vérification indisponible : ${e instanceof Error ? e.message : String(e)}`
    step.value = 'failed'
  }
}

async function submit() {
  busy.value = true
  error.value = ''
  const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId: factorId.value, code: code.value.replace(/\D/g, '') })
  busy.value = false
  if (e) {
    code.value = ''
    error.value = 'Code incorrect ou expiré. Entrez le code affiché en ce moment dans l’application.'
    return
  }
  emit('ready')
}

onMounted(start)
</script>

<template>
  <div class="grid place-items-center px-4 py-12">
    <div class="card w-full max-w-sm p-6 shadow-xl shadow-zinc-200/50 sm:p-8">
      <div v-if="step === 'loading'" class="grid place-items-center py-10"><LoaderCircle class="size-8 animate-spin text-brand-600" /></div>
      <form v-else class="space-y-4" @submit.prevent="submit">
        <span class="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><ShieldCheck class="size-5" /></span>
        <div>
          <h1 class="text-xl font-bold">Vérification en 2 étapes</h1>
          <p v-if="step === 'enroll'" class="mt-1 text-sm text-zinc-500">
            À faire une seule fois : l’administration reste protégée même si votre mot de passe est volé.
          </p>
          <p v-else-if="step === 'verify'" class="mt-1 text-sm text-zinc-500">Entrez le code à 6 chiffres affiché dans votre application d’authentification.</p>
        </div>

        <template v-if="step === 'enroll'">
          <ol class="list-decimal space-y-1 pl-5 text-sm text-zinc-600">
            <li>Installez <strong>Google Authenticator</strong> sur votre téléphone.</li>
            <li>Touchez <strong>+</strong>, puis <strong>Scanner un code QR</strong>.</li>
            <li>Entrez ci-dessous le code à 6 chiffres affiché.</li>
          </ol>
          <img :src="qr" alt="QR code à scanner avec l’application" class="mx-auto size-44 rounded-xl border border-zinc-200 bg-white p-2" />
          <p class="text-center text-xs text-zinc-500">
            Impossible de scanner ? Saisissez cette clé : <span class="font-mono break-all select-all">{{ secret }}</span>
          </p>
        </template>

        <Field v-if="step !== 'failed'" label="Code à 6 chiffres">
          <input
            v-model="code"
            class="input text-center font-mono text-lg tracking-[0.4em]"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            required
            autofocus
          />
        </Field>
        <p v-if="error" class="alert">{{ error }}</p>
        <button v-if="step !== 'failed'" class="btn btn-primary w-full !py-3" :disabled="busy || code.replace(/\D/g, '').length !== 6">
          <LoaderCircle v-if="busy" class="size-4 animate-spin" /> Valider
        </button>
        <button v-else type="button" class="btn btn-outline w-full" @click="start">Réessayer</button>
        <p v-if="step === 'verify'" class="text-xs text-zinc-500">Téléphone perdu ? Voir « Vérification en 2 étapes » dans le README.</p>
      </form>
    </div>
  </div>
</template>
