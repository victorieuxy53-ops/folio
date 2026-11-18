<script setup lang="ts">
import { BRAND } from '../../shared/portfolio'
</script>

<template>
  <span class="inline-flex items-center gap-2 font-extrabold tracking-tight text-zinc-900">
    <img src="/favicon.svg" alt="" class="size-8" />
    <span class="text-lg">{{ BRAND }}</span>
  </span>
</template>
