<script setup lang="ts">
import { computed, ref } from 'vue'
import { ExternalLink, FilePlus, LoaderCircle, RefreshCw, Rocket, Search, TicketPercent, UserPlus, Wallet } from '@lucide/vue'
import type { PortfolioRow, Profile } from '../../shared/portfolio'
import { supabase } from '../lib/supabase'
import { dateTime, fcfa, host, num, shortDate } from '../lib/format'
import AppBar from '../components/AppBar.vue'
import BarChart from '../components/BarChart.vue'

/** Chiffres d'une journée : visites de Folio, visites des sites clients, inscriptions, portfolios créés, paiements, revenus. */
interface Day { day: string; visitors: number; site_visitors: number; signups: number; created: number; payments: number; revenue: number }
interface Stats {
  users: number
  portfolios: number
  published: number
  paying: number
  revenue: number
  daily: Day[]
  sites?: { slug: string; url: string | null; visitors: number }[]
}
type UserRow = Profile & { portfolios: { count: number }[] }
type PortfolioAdmin = PortfolioRow & { profiles: { email: string } | null }
interface PaymentRow { id: string; transaction_id: string; amount: number; created_at: string; profiles: { email: string } | null; portfolios: { slug: string } | null }
interface EventRow { id: number; type: string; meta: Record<string, unknown>; created_at: string; profiles: { email: string } | null }

const tabs = ['Vue d’ensemble', 'Utilisateurs', 'Portfolios', 'Paiements'] as const
const tab = ref(0)
const query = ref('')
const loading = ref(true)
const error = ref('')
const stats = ref<Stats | null>(null)
const users = ref<UserRow[]>([])
const portfolios = ref<PortfolioAdmin[]>([])
const payments = ref<PaymentRow[]>([])
const events = ref<EventRow[]>([])

async function load() {
  loading.value = true
  error.value = ''
  const [s, u, p, pay, ev] = await Promise.all([
    supabase.rpc('admin_stats'),
    supabase.from('profiles').select('*, portfolios(count)').order('created_at', { ascending: false }).limit(1000),
    supabase.from('portfolios').select('*, profiles(email)').order('updated_at', { ascending: false }).limit(1000),
    supabase.from('payments').select('*, profiles(email), portfolios(slug)').order('created_at', { ascending: false }).limit(1000),
    supabase.from('events').select('*, profiles(email)').order('created_at', { ascending: false }).limit(40),
  ])
  const failed = [s, u, p, pay, ev].find((r) => r.error)
  if (failed?.error) error.value = `Chargement impossible : ${failed.error.message}`
  stats.value = s.data as Stats | null
  users.value = (u.data ?? []) as UserRow[]
  portfolios.value = (p.data ?? []) as PortfolioAdmin[]
  payments.value = (pay.data ?? []) as PaymentRow[]
  events.value = (ev.data ?? []) as EventRow[]
  loading.value = false
}
load()

const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const daily = computed(() => stats.value?.daily ?? [])
const sites = computed(() => stats.value?.sites ?? [])
/** Total sur 30 jours (0 si la donnée manque, par exemple avant l'exécution de admin.sql). */
const total = (key: Exclude<keyof Day, 'day'>) => daily.value.reduce((sum, d) => sum + (Number(d[key]) || 0), 0)

const tiles = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { label: 'Revenus encaissés', value: fcfa(s.revenue), sub: `${fcfa(total('revenue'))} sur 30 jours, avant frais Kkiapay` },
    { label: 'Visites de Folio', value: num(total('visitors')), sub: 'sur 30 jours' },
    { label: 'Utilisateurs', value: num(s.users), sub: `+${num(total('signups'))} sur 30 jours` },
    { label: 'Sites publiés', value: num(s.published), sub: `${num(total('site_visitors'))} visites sur 30 jours` },
  ]
})

/** Du visiteur au client payant, sur 30 jours ; chaque étape en % de la précédente. */
const funnel = computed(() => {
  const steps = [
    { label: 'Visites de Folio', value: total('visitors') },
    { label: 'Inscriptions', value: total('signups') },
    { label: 'Portfolios créés', value: total('created') },
    { label: 'Paiements', value: total('payments') },
  ]
  const top = Math.max(1, ...steps.map((s) => s.value))
  return steps.map((s, i) => {
    const before = i ? steps[i - 1]?.value : 0
    return { ...s, width: (s.value / top) * 100, rate: before ? Math.round((s.value / before) * 100) : null }
  })
})
const conversion = computed(() => (stats.value?.users ? Math.round((stats.value.paying / stats.value.users) * 100) : 0))

const EVENT_TYPES: Record<string, { label: string; icon: typeof UserPlus; cls: string }> = {
  signup: { label: 'Nouvelle inscription', icon: UserPlus, cls: 'bg-sky-50 text-sky-700' },
  portfolio_created: { label: 'Portfolio créé', icon: FilePlus, cls: 'bg-zinc-100 text-zinc-700' },
  payment: { label: 'Paiement reçu', icon: Wallet, cls: 'bg-emerald-50 text-emerald-700' },
  promo: { label: 'Code promo utilisé', icon: TicketPercent, cls: 'bg-violet-50 text-violet-700' },
  published: { label: 'Site publié', icon: Rocket, cls: 'bg-brand-50 text-brand-700' },
  updated: { label: 'Site mis à jour', icon: RefreshCw, cls: 'bg-amber-50 text-amber-700' },
}
const eventInfo = (type: string) => EVENT_TYPES[type] ?? { label: type, icon: FilePlus, cls: 'bg-zinc-100 text-zinc-700' }
const eventDetail = (e: EventRow) =>
  [typeof e.meta.slug === 'string' ? e.meta.slug : '', typeof e.meta.amount === 'number' ? fcfa(e.meta.amount) : ''].filter(Boolean).join(' · ')

const match = (...values: (string | null | undefined)[]) => {
  const q = query.value.trim().toLowerCase()
  return !q || values.some((v) => v?.toLowerCase().includes(q))
}
const filteredUsers = computed(() => users.value.filter((u) => match(u.email, u.full_name)))
const filteredPortfolios = computed(() => portfolios.value.filter((p) => match(p.slug, p.url, p.profiles?.email)))
const filteredPayments = computed(() => payments.value.filter((p) => match(p.transaction_id, p.profiles?.email, p.portfolios?.slug)))
</script>

<template>
  <div class="min-h-dvh">
    <AppBar />
    <main class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">Administration</h1>
          <p class="mt-1 text-zinc-500">Tout ce qui se passe sur la plateforme.</p>
        </div>
        <button type="button" class="btn btn-outline" :disabled="loading" @click="load">
          <RefreshCw class="size-4" :class="{ 'animate-spin': loading }" /> Actualiser
        </button>
      </div>

      <div class="mb-6 flex flex-wrap items-center gap-3">
        <div class="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1">
          <button
            v-for="(t, i) in tabs"
            :key="t"
            type="button"
            class="btn !py-1.5"
            :class="tab === i ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'"
            @click="tab = i"
          >
            {{ t }}
          </button>
        </div>
        <label v-if="tab > 0" class="relative min-w-56 flex-1 sm:max-w-xs">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <input v-model="query" type="search" class="input !pl-9" placeholder="Rechercher…" />
        </label>
      </div>

      <p v-if="error" class="alert mb-6">{{ error }}</p>
      <div v-if="loading && !stats" class="grid place-items-center py-24"><LoaderCircle class="size-8 animate-spin text-brand-600" /></div>

      <!-- Vue d'ensemble -->
      <div v-else-if="tab === 0" class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="t in tiles" :key="t.label" class="card p-5">
            <p class="text-sm text-zinc-500">{{ t.label }}</p>
            <p class="mt-2 text-2xl font-bold tracking-tight tabular-nums">{{ t.value }}</p>
            <p class="mt-1 text-xs text-zinc-500">{{ t.sub }}</p>
          </div>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
          <BarChart title="Revenus par jour (FCFA) · 30 derniers jours" :data="daily.map((d) => ({ label: dayLabel(d.day), value: d.revenue }))" :format="num" />
          <BarChart title="Visites de Folio par jour · 30 derniers jours" :data="daily.map((d) => ({ label: dayLabel(d.day), value: d.visitors ?? 0 }))" :format="num" />
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
          <section v-if="stats" class="card p-5">
            <h2 class="mb-4 text-sm font-semibold text-zinc-700">Du visiteur au client · 30 derniers jours</h2>
            <ol class="space-y-4">
              <li v-for="s in funnel" :key="s.label">
                <div class="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span class="text-zinc-600">{{ s.label }}</span>
                  <span>
                    <span class="font-semibold tabular-nums">{{ num(s.value) }}</span>
                    <span v-if="s.rate !== null" class="ml-2 text-xs text-zinc-500">{{ s.rate }} % de l’étape précédente</span>
                  </span>
                </div>
                <div class="h-2 rounded-full bg-zinc-100"><div class="h-2 rounded-full bg-brand-600" :style="{ width: `${s.width}%` }" /></div>
              </li>
            </ol>
            <p class="mt-5 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
              Depuis le lancement : <strong class="tabular-nums">{{ num(stats.paying) }}</strong> clients payants sur
              {{ num(stats.users) }} inscrits ({{ conversion }} %).
            </p>
          </section>
          <section class="card">
            <h2 class="border-b border-zinc-100 px-5 py-4 text-sm font-semibold text-zinc-700">Sites clients les plus visités · 30 derniers jours</h2>
            <p v-if="!sites.length" class="px-5 py-10 text-center text-sm text-zinc-500">Aucune visite pour le moment.</p>
            <ol class="divide-y divide-zinc-100">
              <li v-for="s in sites" :key="s.slug" class="flex items-center gap-3 px-5 py-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{{ s.slug }}</p>
                  <a v-if="s.url" :href="s.url" target="_blank" rel="noopener" class="inline-flex max-w-full items-center gap-1 text-xs text-brand-600 hover:underline">
                    <span class="truncate">{{ host(s.url) }}</span> <ExternalLink class="size-3 shrink-0" />
                  </a>
                </div>
                <span class="shrink-0 text-sm"><strong class="tabular-nums">{{ num(s.visitors) }}</strong> <span class="text-zinc-500">visites</span></span>
              </li>
            </ol>
          </section>
        </div>
        <section class="card">
          <h2 class="border-b border-zinc-100 px-5 py-4 text-sm font-semibold text-zinc-700">Activité récente</h2>
          <p v-if="!events.length" class="px-5 py-10 text-center text-sm text-zinc-500">Aucune activité pour le moment.</p>
          <ul class="divide-y divide-zinc-100">
            <li v-for="e in events" :key="e.id" class="flex items-center gap-3 px-5 py-3">
              <span class="grid size-9 shrink-0 place-items-center rounded-lg" :class="eventInfo(e.type).cls">
                <component :is="eventInfo(e.type).icon" class="size-4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium">{{ eventInfo(e.type).label }} <span v-if="eventDetail(e)" class="font-normal text-zinc-500">· {{ eventDetail(e) }}</span></p>
                <p class="truncate text-xs text-zinc-500">{{ e.profiles?.email ?? 'Compte supprimé' }}</p>
              </div>
              <time class="shrink-0 text-xs text-zinc-500" :datetime="e.created_at">{{ dateTime(e.created_at) }}</time>
            </li>
          </ul>
        </section>
        <p class="text-xs text-zinc-500">
          Une visite = un navigateur, une fois par jour et par site, sans cookie ni donnée personnelle. Vos propres visites (administrateur
          connecté) ne sont pas comptées. Les sites clients sont comptés à partir de leur prochaine publication.
        </p>
      </div>

      <!-- Tableaux -->
      <div v-else class="card overflow-x-auto">
        <table class="w-full min-w-[640px] text-left text-sm">
          <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500 uppercase">
            <tr v-if="tab === 1"><th class="px-4 py-3">Utilisateur</th><th class="px-4 py-3">Rôle</th><th class="px-4 py-3">Portfolios</th><th class="px-4 py-3">Inscrit le</th></tr>
            <tr v-else-if="tab === 2"><th class="px-4 py-3">Adresse</th><th class="px-4 py-3">Propriétaire</th><th class="px-4 py-3">Modèle</th><th class="px-4 py-3">Statut</th><th class="px-4 py-3">Modifié le</th></tr>
            <tr v-else><th class="px-4 py-3">Transaction</th><th class="px-4 py-3">Client</th><th class="px-4 py-3">Portfolio</th><th class="px-4 py-3 text-right">Montant</th><th class="px-4 py-3">Date</th></tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            <template v-if="tab === 1">
              <tr v-for="u in filteredUsers" :key="u.id">
                <td class="px-4 py-3"><p class="font-medium">{{ u.full_name || '—' }}</p><p class="text-zinc-500">{{ u.email }}</p></td>
                <td class="px-4 py-3"><span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="u.role === 'admin' ? 'bg-brand-50 text-brand-700' : 'bg-zinc-100 text-zinc-600'">{{ u.role === 'admin' ? 'Admin' : 'Client' }}</span></td>
                <td class="px-4 py-3 tabular-nums">{{ u.portfolios[0]?.count ?? 0 }}</td>
                <td class="px-4 py-3 text-zinc-500">{{ shortDate(u.created_at) }}</td>
              </tr>
            </template>
            <template v-else-if="tab === 2">
              <tr v-for="p in filteredPortfolios" :key="p.id">
                <td class="px-4 py-3">
                  <p class="font-medium">{{ p.slug }}</p>
                  <a v-if="p.url" :href="p.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-brand-600 hover:underline">{{ host(p.url) }} <ExternalLink class="size-3" /></a>
                </td>
                <td class="px-4 py-3 text-zinc-600">{{ p.profiles?.email ?? '—' }}</td>
                <td class="px-4 py-3 text-zinc-600 capitalize">{{ p.template }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="p.url ? 'bg-emerald-50 text-emerald-700' : p.paid ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-600'">
                    {{ p.url ? 'En ligne' : p.paid ? 'Payé' : 'Brouillon' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-zinc-500">{{ shortDate(p.updated_at) }}</td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="p in filteredPayments" :key="p.id">
                <td class="px-4 py-3 font-mono text-xs">{{ p.amount ? p.transaction_id : 'Code promo' }}</td>
                <td class="px-4 py-3 text-zinc-600">{{ p.profiles?.email ?? '—' }}</td>
                <td class="px-4 py-3 text-zinc-600">{{ p.portfolios?.slug ?? '—' }}</td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">{{ fcfa(p.amount) }}</td>
                <td class="px-4 py-3 text-zinc-500">{{ dateTime(p.created_at) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
        <p
          v-if="(tab === 1 && !filteredUsers.length) || (tab === 2 && !filteredPortfolios.length) || (tab === 3 && !filteredPayments.length)"
          class="px-4 py-12 text-center text-sm text-zinc-500"
        >
          Aucun résultat.
        </p>
      </div>
    </main>
  </div>
</template>
