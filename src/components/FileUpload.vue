<script setup lang="ts">
// Envoi d'un document PDF (CV) dans le stockage Supabase.
import { ref } from 'vue'
import { FileText, LoaderCircle, Upload } from '@lucide/vue'
import { supabase } from '../lib/supabase'
import { session } from '../lib/auth'

const model = defineModel<string>({ required: true })
const busy = ref(false)
const error = ref('')

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !session.value) return
  error.value = file.type !== 'application/pdf' ? 'Choisissez un fichier PDF.' : file.size > 5 * 1024 * 1024 ? 'Le fichier dépasse 5 Mo.' : ''
  if (error.value) return
  busy.value = true
  const path = `${session.value.user.id}/${crypto.randomUUID()}.pdf`
  const { error: uploadError } = await supabase.storage.from('media').upload(path, file, { contentType: 'application/pdf' })
  busy.value = false
  if (uploadError) error.value = 'Envoi impossible. Vérifiez votre connexion et réessayez.'
  else model.value = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
</script>

<template>
  <div>
    <div class="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
      <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><FileText class="size-5" /></span>
      <div class="min-w-0 flex-1 text-sm">
        <template v-if="model">
          <p class="font-medium text-zinc-700">CV ajouté</p>
          <a :href="model" target="_blank" rel="noopener" class="font-medium text-brand-600 hover:underline">Ouvrir</a>
          <button type="button" class="ml-3 font-medium text-red-600 hover:underline" @click="model = ''">Retirer</button>
        </template>
        <template v-else>
          <p class="font-medium text-zinc-700">Aucun CV</p>
          <p class="text-zinc-500">PDF, 5 Mo maximum</p>
        </template>
      </div>
      <label class="btn btn-outline cursor-pointer !py-2" :class="{ 'pointer-events-none opacity-50': busy }">
        <LoaderCircle v-if="busy" class="size-4 animate-spin" />
        <Upload v-else class="size-4" />
        {{ model ? 'Remplacer' : 'Ajouter' }}
        <input type="file" accept="application/pdf" class="sr-only" :disabled="busy" @change="onFile" />
      </label>
    </div>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
