<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { X } from '@lucide/vue'

const open = defineModel<boolean>({ required: true })
defineProps<{ title: string }>()

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') open.value = false
}
watch(open, (v) => (v ? addEventListener('keydown', onKey) : removeEventListener('keydown', onKey)))
onBeforeUnmount(() => removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-zinc-950/50 p-4 backdrop-blur-sm" @click.self="open = false">
      <div class="card w-full max-w-md p-6 shadow-2xl" role="dialog" aria-modal="true" :aria-label="title">
        <div class="mb-5 flex items-start justify-between gap-4">
          <h2 class="text-lg font-bold">{{ title }}</h2>
          <button type="button" class="btn btn-ghost -mt-1 -mr-2 !p-1.5" aria-label="Fermer" @click="open = false">
            <X class="size-5" />
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
