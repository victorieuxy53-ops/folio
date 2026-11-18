<script setup lang="ts">
import { LayoutDashboard, LogOut, Shield } from '@lucide/vue'
import { useRouter } from 'vue-router'
import Logo from './Logo.vue'
import { isAdmin, session, signOut } from '../lib/auth'

const router = useRouter()
async function logout() {
  await signOut()
  router.push('/')
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-1 px-4 sm:px-6">
      <RouterLink to="/app" class="mr-auto"><Logo /></RouterLink>
      <RouterLink to="/app" class="btn btn-ghost" active-class="!text-brand-600">
        <LayoutDashboard class="size-4" /><span class="hidden sm:inline">Mes portfolios</span>
      </RouterLink>
      <RouterLink v-if="isAdmin" to="/admin" class="btn btn-ghost" active-class="!text-brand-600">
        <Shield class="size-4" /><span class="hidden sm:inline">Administration</span>
      </RouterLink>
      <span class="hidden px-3 text-sm text-zinc-500 lg:block">{{ session?.user.email }}</span>
      <button type="button" class="btn btn-ghost" title="Se déconnecter" @click="logout">
        <LogOut class="size-4" /><span class="sr-only">Se déconnecter</span>
      </button>
    </div>
  </header>
</template>
