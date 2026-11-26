<script setup lang="ts">
// Captures d'écran d'avis clients : plusieurs à la fois depuis la galerie, retirables une par une.
import { ref } from 'vue'
import { ImagePlus, LoaderCircle, X } from '@lucide/vue'
import { MAX_REVIEWS } from '../../shared/portfolio'
import { uploadImage } from '../lib/upload'

const shots = defineModel<string[]>({ required: true })
const pending = ref(0)
const error = ref('')

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])].slice(0, MAX_REVIEWS - shots.value.length)
  input.value = ''
  error.value = ''
  pending.value = files.length
  // Une par une, pour garder l'ordre choisi.
  for (const file of files) {
    try {
      shots.value.push(await uploadImage(file))
    } catch {
      error.value = 'Une capture n’a pas pu être ajoutée. Essayez une image JPG ou PNG.'
    }
    pending.value--
  }
}
</script>

<template>
  <div>
    <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
      <div v-for="(src, i) in shots" :key="src" class="relative aspect-[3/4] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
        <img :src="src" :alt="`Avis client ${i + 1}`" class="size-full object-cover object-top" />
        <button
          type="button"
          class="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-zinc-900/75 text-white transition hover:bg-red-600"
          :aria-label="`Retirer l’avis ${i + 1}`"
          @click="shots.splice(i, 1)"
        >
          <X class="size-4" />
        </button>
      </div>
      <label
        v-if="shots.length < MAX_REVIEWS"
        class="grid aspect-[3/4] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-2 text-center text-xs font-medium text-zinc-500 transition hover:border-brand-500 hover:text-brand-600"
      >
        <span class="grid justify-items-center gap-1.5">
          <LoaderCircle v-if="pending" class="size-6 animate-spin text-brand-600" />
          <ImagePlus v-else class="size-6" />
          {{ pending ? `Envoi… (${pending})` : 'Ajouter des captures' }}
        </span>
        <input type="file" accept="image/png,image/jpeg,image/webp" multiple class="sr-only" :disabled="pending > 0" @change="onFiles" />
      </label>
    </div>
    <p class="mt-2 text-xs text-zinc-500">{{ shots.length }} / {{ MAX_REVIEWS }} captures · JPG, PNG ou WebP</p>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
