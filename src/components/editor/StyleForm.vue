<script setup lang="ts">
import { computed } from 'vue'
import { Check } from '@lucide/vue'
import { FONTS, PALETTES, TEMPLATES, type FontId, type PortfolioData } from '../../../shared/portfolio'
import { renderPortfolio } from '../../../shared/render'
import SitePreview from '../SitePreview.vue'

const props = defineProps<{ data: PortfolioData }>()

const fonts = Object.entries(FONTS) as [FontId, (typeof FONTS)[FontId]][]
const colors = [
  { key: 'bg', label: 'Fond' },
  { key: 'text', label: 'Texte' },
  { key: 'accent', label: 'Accent' },
] as const

// Chaque modèle est prévisualisé avec le contenu et les couleurs de l'utilisateur.
const thumbs = computed(() => Object.fromEntries(TEMPLATES.map((t) => [t.id, renderPortfolio({ ...props.data, template: t.id })])))

const isPalette = (p: (typeof PALETTES)[number]) =>
  p.bg === props.data.theme.bg && p.text === props.data.theme.text && p.accent === props.data.theme.accent
function applyPalette(p: (typeof PALETTES)[number]) {
  Object.assign(props.data.theme, { bg: p.bg, text: p.text, accent: p.accent })
}
</script>

<template>
  <div class="space-y-8">
    <section>
      <h3 class="mb-3 font-semibold">Mise en page</h3>
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="t in TEMPLATES"
          :key="t.id"
          class="cursor-pointer overflow-hidden rounded-xl border-2 transition"
          :class="data.template === t.id ? 'border-brand-600 ring-4 ring-brand-500/15' : 'border-zinc-200 hover:border-zinc-300'"
          @click="data.template = t.id"
        >
          <SitePreview :html="thumbs[t.id] ?? ''" class="aspect-[16/10] border-b border-zinc-200" />
          <button type="button" class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left" :aria-pressed="data.template === t.id">
            <span class="text-sm font-semibold">{{ t.name }}</span>
            <Check v-if="data.template === t.id" class="size-4 text-brand-600" />
          </button>
        </div>
      </div>
      <p class="mt-2 text-xs text-zinc-500">{{ TEMPLATES.find((t) => t.id === data.template)?.description }}</p>
    </section>

    <section>
      <h3 class="mb-3 font-semibold">Couleurs</h3>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="p in PALETTES"
          :key="p.name"
          type="button"
          class="rounded-xl border-2 p-1.5 transition"
          :class="isPalette(p) ? 'border-brand-600' : 'border-transparent hover:border-zinc-200'"
          :title="p.name"
          @click="applyPalette(p)"
        >
          <span class="flex h-10 items-end gap-1 rounded-lg p-1.5" :style="{ background: p.bg }">
            <span class="h-full flex-1 rounded" :style="{ background: p.text }" />
            <span class="h-2/3 flex-1 rounded" :style="{ background: p.accent }" />
          </span>
          <span class="mt-1 block text-xs font-medium text-zinc-600">{{ p.name }}</span>
        </button>
      </div>
      <p class="mt-4 mb-2 text-sm font-medium text-zinc-700">Ou vos propres couleurs</p>
      <div class="grid grid-cols-3 gap-2">
        <label v-for="c in colors" :key="c.key" class="card flex cursor-pointer items-center gap-2.5 p-2.5 hover:border-zinc-300">
          <input v-model="data.theme[c.key]" type="color" class="size-8 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0" />
          <span class="min-w-0">
            <span class="block text-sm font-medium">{{ c.label }}</span>
            <span class="block text-xs text-zinc-500 uppercase">{{ data.theme[c.key] }}</span>
          </span>
        </label>
      </div>
    </section>

    <section>
      <h3 class="mb-3 font-semibold">Typographie</h3>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="[id, font] in fonts"
          :key="id"
          type="button"
          class="rounded-xl border-2 px-3 py-2.5 text-left transition"
          :class="data.theme.font === id ? 'border-brand-600 bg-brand-50' : 'border-zinc-200 hover:border-zinc-300'"
          @click="data.theme.font = id"
        >
          <span class="block text-sm font-semibold">{{ font.name }}</span>
          <span class="block truncate text-xs text-zinc-500">{{ font.heading }}{{ font.heading === font.body ? '' : ` + ${font.body}` }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
