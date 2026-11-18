<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ExternalLink, LoaderCircle, Palette, Pencil, Plus, Rocket, Sparkles, Trash } from '@lucide/vue'
import { isValidSlug, normalize, PRICE, PROJECT_PREFIX, randomStyle, slugify, type PortfolioRow } from '../../shared/portfolio'
import { renderPortfolio } from '../../shared/render'
import { supabase } from '../lib/supabase'
import { profile, session } from '../lib/auth'
import { fcfa, host, shortDate } from '../lib/format'
import AppBar from '../components/AppBar.vue'
import Modal from '../components/Modal.vue'
import SitePreview from '../components/SitePreview.vue'

const router = useRouter()
const steps = [
  { icon: Pencil, t: 'Remplissez vos infos' },
  { icon: Palette, t: 'Choisissez votre style' },
  { icon: Rocket, t: 'Publiez en un clic' },
]
const portfolios = ref<(PortfolioRow & { html: string })[] | null>(null)
const creating = ref(false)
const slug = ref('')
const busy = ref(false)
const error = ref('')

async function load() {
  const { data } = await supabase.from('portfolios').select('*').order('created_at', { ascending: false })
  portfolios.value = ((data ?? []) as PortfolioRow[]).map((p) => ({ ...p, html: renderPortfolio(normalize(p)) }))
}
load()

function openCreate() {
  slug.value = slugify(profile.value?.full_name || session.value?.user.email?.split('@')[0] || '')
  error.value = ''
  creating.value = true
}

async function create() {
  const s = slugify(slug.value)
  if (!isValidSlug(s)) {
    error.value = 'Entre 3 et 32 caractères : lettres, chiffres et tirets.'
    return
  }
  busy.value = true
  const { content } = normalize({})
  content.name = profile.value?.full_name ?? ''
  content.email = session.value?.user.email ?? ''
  const { data, error: e } = await supabase.from('portfolios').insert({ slug: s, ...randomStyle(), content }).select('id').single()
  busy.value = false
  if (e || !data) {
    error.value = e?.code === '23505' ? 'Cette adresse est déjà prise. Essayez une variante.' : 'Création impossible, réessayez.'
    return
  }
  router.push(`/app/${data.id}`)
}

async function remove(p: PortfolioRow) {
  if (!confirm(`Supprimer définitivement le brouillon « ${p.slug} » ?`)) return
  await supabase.from('portfolios').delete().eq('id', p.id)
  load()
}

const status = (p: PortfolioRow) =>
  p.url ? { label: 'En ligne', cls: 'bg-emerald-50 text-emerald-700' }
  : p.paid ? { label: 'Payé · à publier', cls: 'bg-amber-50 text-amber-700' }
  : { label: 'Brouillon', cls: 'bg-zinc-100 text-zinc-600' }
</script>

<template>
  <div class="min-h-dvh">
    <AppBar />
    <main class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">Mes portfolios</h1>
          <p class="mt-1 text-zinc-500">Bonjour{{ profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : '' }} 👋 Créez, modifiez et publiez vos sites.</p>
        </div>
        <button v-if="portfolios?.length" type="button" class="btn btn-primary" @click="openCreate"><Plus class="size-4" /> Nouveau portfolio</button>
      </div>

      <div v-if="!portfolios" class="grid place-items-center py-24"><LoaderCircle class="size-8 animate-spin text-brand-600" /></div>

      <!-- Premier passage -->
      <div v-else-if="!portfolios.length" class="card px-6 py-14 text-center">
        <span class="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Sparkles class="size-7" /></span>
        <h2 class="mt-5 text-xl font-bold">Créez votre premier portfolio</h2>
        <p class="mx-auto mt-2 max-w-md text-zinc-500">C’est gratuit jusqu’à la publication. Vous ne payez {{ fcfa(PRICE) }} qu’une fois satisfait du résultat.</p>
        <ol class="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          <li v-for="(s, i) in steps" :key="i" class="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 text-sm font-medium">
            <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand-600 shadow-sm"><component :is="s.icon" class="size-4" /></span>
            {{ s.t }}
          </li>
        </ol>
        <button type="button" class="btn btn-primary mt-8 !px-6 !py-3" @click="openCreate"><Plus class="size-4" /> Commencer</button>
      </div>

      <!-- Liste -->
      <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="p in portfolios" :key="p.id" class="card group overflow-hidden transition hover:shadow-lg hover:shadow-zinc-200/60">
          <RouterLink :to="`/app/${p.id}`" class="block border-b border-zinc-100">
            <SitePreview :html="p.html" class="aspect-[16/10]" />
          </RouterLink>
          <div class="p-4">
            <div class="flex items-center justify-between gap-2">
              <h2 class="truncate font-semibold">{{ p.slug }}</h2>
              <span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="status(p).cls">{{ status(p).label }}</span>
            </div>
            <a v-if="p.url" :href="p.url" target="_blank" rel="noopener" class="mt-1 flex items-center gap-1 truncate text-sm text-brand-600 hover:underline">
              {{ host(p.url) }} <ExternalLink class="size-3.5 shrink-0" />
            </a>
            <p v-else class="mt-1 text-sm text-zinc-500">Créé le {{ shortDate(p.created_at) }}</p>
            <div class="mt-4 flex gap-2">
              <RouterLink :to="`/app/${p.id}`" class="btn btn-outline flex-1"><Pencil class="size-4" /> Modifier</RouterLink>
              <button v-if="!p.paid" type="button" class="btn btn-danger" title="Supprimer" @click="remove(p)"><Trash class="size-4" /></button>
            </div>
          </div>
        </article>
      </div>
    </main>

    <Modal v-model="creating" title="Nouveau portfolio">
      <form class="space-y-4" @submit.prevent="create">
        <div>
          <label for="slug" class="label">Choisissez l’adresse de votre site</label>
          <div class="flex items-center rounded-xl border border-zinc-200 bg-white text-sm transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
            <span class="pl-3.5 text-zinc-400">{{ PROJECT_PREFIX }}-</span>
            <input id="slug" v-model="slug" class="min-w-0 flex-1 bg-transparent py-2.5 outline-none" placeholder="votre-nom" autofocus @blur="slug = slugify(slug)" />
            <span class="pr-3.5 text-zinc-400">.vercel.app</span>
          </div>
        </div>
        <p class="text-xs text-zinc-500">Lettres, chiffres et tirets. Elle ne pourra plus être modifiée. Un style unique vous est proposé au départ : vous pourrez le changer.</p>
        <p v-if="error" class="alert">{{ error }}</p>
        <button type="submit" class="btn btn-primary w-full !py-3" :disabled="busy">
          <LoaderCircle v-if="busy" class="size-4 animate-spin" /> Créer et commencer
        </button>
      </form>
    </Modal>
  </div>
</template>
