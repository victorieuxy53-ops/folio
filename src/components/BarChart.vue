<script setup lang="ts">
// Histogramme d'une seule série (une teinte, pas de légende : le titre la nomme).
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

const props = defineProps<{ title: string; data: { label: string; value: number }[]; format: (n: number) => string }>()

const H = 200
const PAD = { top: 12, right: 4, bottom: 24, left: 52 }
const box = useTemplateRef('box')
const width = ref(0)
const hover = ref<number | null>(null)

let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([e]) => e && (width.value = e.contentRect.width))
  if (box.value) observer.observe(box.value)
})
onBeforeUnmount(() => observer?.disconnect())

/** Maximum « rond » divisible en 4 graduations entières et lisibles. */
const max = computed(() => {
  const raw = Math.max(...props.data.map((d) => d.value), 0) / 4
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  return Math.max(step, 1) * 4
})
const ticks = computed(() => [0, 1, 2, 3, 4].map((i) => (max.value / 4) * i))

const plotW = computed(() => Math.max(0, width.value - PAD.left - PAD.right))
const plotH = H - PAD.top - PAD.bottom
const slot = computed(() => plotW.value / Math.max(props.data.length, 1))
const barW = computed(() => Math.max(1, Math.min(24, slot.value - 2)))
const y = (v: number) => PAD.top + plotH - (v / max.value) * plotH

const bars = computed(() =>
  props.data.map((d, i) => {
    const x = PAD.left + i * slot.value + (slot.value - barW.value) / 2
    const top = y(d.value)
    const h = PAD.top + plotH - top
    const r = Math.min(4, barW.value / 2, h)
    // Coins arrondis en haut (4px), base droite.
    const path = h > 0 ? `M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW.value - r}Q${x + barW.value},${top} ${x + barW.value},${top + r}V${top + h}Z` : ''
    return { ...d, i, x, top, path }
  }),
)
const xLabels = computed(() => {
  const n = props.data.length
  return [0, Math.floor((n - 1) / 2), n - 1].filter((i, k, arr) => n > 0 && arr.indexOf(i) === k)
})
const tip = computed(() => (hover.value === null ? null : bars.value[hover.value] ?? null))
</script>

<template>
  <figure class="card p-5">
    <figcaption class="mb-4 text-sm font-semibold text-zinc-700">{{ title }}</figcaption>
    <div ref="box" class="relative" @mouseleave="hover = null">
      <svg v-if="width" :width="width" :height="H" role="img" :aria-label="title" class="block">
        <g class="text-[11px]">
          <template v-for="t in ticks" :key="t">
            <line :x1="PAD.left" :x2="width - PAD.right" :y1="y(t)" :y2="y(t)" stroke="#f0f0f1" />
            <text :x="PAD.left - 8" :y="y(t)" dy="0.32em" text-anchor="end" fill="#71717a">{{ format(t) }}</text>
          </template>
          <text v-for="i in xLabels" :key="i" :x="(bars[i]?.x ?? 0) + barW / 2" :y="H - 6" fill="#71717a"
            :text-anchor="i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'">{{ data[i]?.label }}</text>
        </g>
        <path v-for="b in bars" :key="b.i" :d="b.path" :fill="hover === b.i ? '#4a3bd4' : '#5b4bf0'" />
        <!-- Zones de survol : toute la hauteur de la colonne -->
        <rect
          v-for="b in bars"
          :key="`hit-${b.i}`"
          :x="PAD.left + b.i * slot"
          :y="PAD.top"
          :width="slot"
          :height="plotH"
          fill="transparent"
          @mouseenter="hover = b.i"
          @touchstart.passive="hover = b.i"
        />
      </svg>
      <div
        v-if="tip"
        class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
        :style="{ left: `${tip.x + barW / 2}px`, top: `${tip.top - 8}px` }"
      >
        <span class="text-zinc-400">{{ tip.label }}</span><br /><span class="font-semibold">{{ format(tip.value) }}</span>
      </div>
    </div>
    <details class="mt-3 text-sm">
      <summary class="cursor-pointer text-zinc-500 hover:text-zinc-800">Voir les données</summary>
      <table class="mt-2 w-full text-left">
        <tbody>
          <tr v-for="d in data" :key="d.label" class="border-t border-zinc-100">
            <td class="py-1 text-zinc-500">{{ d.label }}</td>
            <td class="py-1 text-right font-medium tabular-nums">{{ format(d.value) }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </figure>
</template>
