<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, LoaderCircle } from '@lucide/vue'
import { uploadImage } from '../lib/upload'

const model = defineModel<string>({ required: true })
defineProps<{ round?: boolean }>()
const busy = ref(false)
const error = ref('')

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    model.value = await uploadImage(file)
  } catch {
    error.value = 'Impossible d’utiliser cette image. Essayez une photo JPG ou PNG.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-4">
      <label
        class="relative grid shrink-0 cursor-pointer place-items-center overflow-hidden border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 transition hover:border-brand-500 hover:text-brand-600"
        :class="round ? 'size-20 rounded-full' : 'aspect-[16/10] w-36 rounded-xl'"
      >
        <img v-if="model" :src="model" alt="" class="absolute inset-0 size-full object-cover" />
        <LoaderCircle v-if="busy" class="relative size-6 animate-spin text-brand-600" />
        <ImagePlus v-else-if="!model" class="size-6" />
        <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" :disabled="busy" @change="onFile" />
      </label>
      <div class="text-sm">
        <p class="font-medium text-zinc-700">{{ model ? 'Cliquez sur l’image pour la changer' : 'Ajouter une image' }}</p>
        <p class="text-zinc-500">JPG, PNG ou WebP</p>
        <button v-if="model" type="button" class="mt-1 font-medium text-red-600 hover:underline" @click="model = ''">Retirer</button>
      </div>
    </div>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
