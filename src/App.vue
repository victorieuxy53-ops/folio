<script setup lang="ts">
import { configured } from './lib/supabase'
</script>

<template>
  <RouterView />
  <div v-if="!configured" class="fixed inset-x-3 bottom-3 z-50 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg ring-1 ring-amber-200 sm:left-auto sm:max-w-md">
    <strong>Configuration requise.</strong> Copiez <code>.env.example</code> en <code>.env</code>, renseignez vos clés Supabase, puis relancez
    <code>npm run dev</code>. L’inscription et la publication seront alors actives.
  </div>
</template>
