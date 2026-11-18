<script setup lang="ts">
import { ref } from 'vue'
import { X } from '@lucide/vue'

const model = defineModel<string[]>({ required: true })
defineProps<{ placeholder: string }>()
const draft = ref('')

function add() {
  const items = draft.value.split(',').map((s) => s.trim()).filter((s) => s && !model.value.includes(s))
  if (items.length) model.value = [...model.value, ...items]
  draft.value = ''
}
function onInput() {
  if (draft.value.includes(',')) add()
}
function onBackspace() {
  if (!draft.value && model.value.length) model.value = model.value.slice(0, -1)
}
</script>

<template>
  <div class="flex flex-wrap gap-1.5 rounded-xl border border-zinc-200 bg-white p-2 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
    <span v-for="(tag, i) in model" :key="tag" class="inline-flex items-center gap-1 rounded-lg bg-brand-50 py-1 pr-1 pl-2.5 text-sm font-medium text-brand-700">
      {{ tag }}
      <button type="button" class="rounded p-0.5 hover:bg-brand-100" :aria-label="`Retirer ${tag}`" @click="model = model.filter((_, j) => j !== i)">
        <X class="size-3.5" />
      </button>
    </span>
    <input
      v-model="draft"
      class="min-w-40 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-zinc-400"
      :placeholder="placeholder"
      enterkeyhint="done"
      @input="onInput"
      @keydown.enter.prevent="add"
      @keydown.backspace="onBackspace"
      @blur="add"
    />
  </div>
</template>
