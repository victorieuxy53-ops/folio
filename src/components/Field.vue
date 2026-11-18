<script setup lang="ts">
defineProps<{ label: string; hint?: string }>()
</script>

<template>
  <label class="block">
    <span class="label">{{ label }}</span>
    <slot />
    <span v-if="hint" class="mt-1 block text-xs text-zinc-500">{{ hint }}</span>
  </label>
</template>
