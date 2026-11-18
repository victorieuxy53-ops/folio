<script setup lang="ts">
// Affiche une page HTML dans un iframe isolé (ses scripts tournent sans accès à l'application),
// mise à l'échelle pour tenir dans son conteneur.
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

const props = withDefaults(defineProps<{ html: string; width?: number; interactive?: boolean }>(), {
  width: 1280,
  interactive: false,
})

const box = useTemplateRef('box')
const frame = useTemplateRef('frame')
const size = ref({ w: 0, h: 0 })
const scale = computed(() => Math.min(1, size.value.w / props.width))

// La page signale sa position de défilement. À chaque rafraîchissement, on la restaure
// et on coupe les animations d'entrée, pour que l'aperçu ne « rejoue » pas à chaque frappe.
let scrollY = 0
const doc = ref('')
watch(
  () => props.html,
  (html, old) => {
    const restore = old === undefined ? '' : `document.documentElement.classList.add('still');const r=()=>scrollTo(0,${scrollY});addEventListener('DOMContentLoaded',r);addEventListener('load',r);`
    doc.value = html.replace('<head>', `<head><script>${restore}addEventListener('scroll',()=>parent.postMessage({folioY:scrollY},'*'),{passive:true})<\/script>`)
  },
  { immediate: true },
)
const onMessage = (e: MessageEvent) => {
  if (e.source === frame.value?.contentWindow && typeof e.data?.folioY === 'number') scrollY = e.data.folioY
}

let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) size.value = { w: entry.contentRect.width, h: entry.contentRect.height }
  })
  if (box.value) observer.observe(box.value)
  addEventListener('message', onMessage)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  removeEventListener('message', onMessage)
})
</script>

<template>
  <div ref="box" class="relative overflow-hidden">
    <iframe
      v-if="scale > 0"
      ref="frame"
      :srcdoc="doc"
      title="Aperçu du portfolio"
      loading="lazy"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      :tabindex="interactive ? 0 : -1"
      :aria-hidden="!interactive"
      class="absolute top-0 origin-top-left border-0"
      :class="{ 'pointer-events-none': !interactive }"
      :style="{
        width: `${width}px`,
        height: `${size.h / scale}px`,
        transform: `scale(${scale})`,
        left: `${(size.w - width * scale) / 2}px`,
      }"
    />
  </div>
</template>
