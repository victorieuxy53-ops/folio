<script setup lang="ts" generic="T">
// Liste d'éléments modifiables : ajouter, réordonner, supprimer.
import { ChevronDown, ChevronUp, Plus, Trash } from '@lucide/vue'

const props = defineProps<{ items: T[]; create: () => T; addLabel: string; title: (item: T, index: number) => string }>()
defineSlots<{ default(props: { item: T }): unknown }>()

function move(i: number, delta: number) {
  const [item] = props.items.splice(i, 1)
  if (item !== undefined) props.items.splice(i + delta, 0, item)
}
</script>

<template>
  <div class="space-y-3">
    <div v-for="(item, i) in items" :key="i" class="card p-4">
      <div class="mb-3 flex items-center gap-0.5">
        <span class="mr-auto truncate text-sm font-semibold text-zinc-800">{{ title(item, i) }}</span>
        <button type="button" class="btn btn-ghost !p-1.5" :disabled="i === 0" aria-label="Monter" @click="move(i, -1)"><ChevronUp class="size-4" /></button>
        <button type="button" class="btn btn-ghost !p-1.5" :disabled="i === items.length - 1" aria-label="Descendre" @click="move(i, 1)"><ChevronDown class="size-4" /></button>
        <button type="button" class="btn btn-danger !p-1.5" aria-label="Supprimer" @click="items.splice(i, 1)"><Trash class="size-4" /></button>
      </div>
      <slot :item="item" />
    </div>
    <button type="button" class="btn btn-outline w-full border-dashed !py-3" @click="items.push(create())">
      <Plus class="size-4" /> {{ addLabel }}
    </button>
  </div>
</template>
