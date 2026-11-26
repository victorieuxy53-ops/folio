<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, ArrowRight, Briefcase, CircleCheck, Copy, ExternalLink, Eye, FolderKanban, LoaderCircle,
  Monitor, Palette, Pencil, Rocket, Smartphone, Sparkles, TicketPercent, User, Wallet, X,
} from '@lucide/vue'
import { normalize, PRICE, promoPeriod, type PortfolioData, type PortfolioRow } from '../../shared/portfolio'
import { renderPortfolio } from '../../shared/render'
import { supabase } from '../lib/supabase'
import { fcfa, host } from '../lib/format'
import SitePreview from '../components/SitePreview.vue'
import Modal from '../components/Modal.vue'
import Field from '../components/Field.vue'
import ProfileForm from '../components/editor/ProfileForm.vue'
import ExpertiseForm from '../components/editor/ExpertiseForm.vue'
import ExperienceForm from '../components/editor/ExperienceForm.vue'
import ProjectsForm from '../components/editor/ProjectsForm.vue'
import StyleForm from '../components/editor/StyleForm.vue'

const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()

const tabs = [
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'expertise', label: 'Expertise', icon: Sparkles },
  { id: 'parcours', label: 'Parcours', icon: Briefcase },
  { id: 'projets', label: 'Projets', icon: FolderKanban },
  { id: 'style', label: 'Style', icon: Palette },
] as const
const tab = ref(0)
const devices = ['desktop', 'mobile'] as const
const device = ref<(typeof devices)[number]>('desktop')
const showPreview = ref(false)

const row = ref<PortfolioRow | null>(null)
const data = ref<PortfolioData | null>(null)
const html = ref('')
const saveState = ref<'saved' | 'saving' | 'error'>('saved')
// Étape affichée pendant la publication ; '' = rien en cours.
const stages = {
  publish: ['Mise en ligne de votre portfolio…', 'Environ 20 secondes. Merci de ne pas fermer cette page.'],
  wait: ['Un instant…', 'Merci de ne pas fermer cette page.'],
  pay: ['Ouverture du paiement sécurisé…', 'Mobile Money ou carte bancaire, avec SasPay.'],
} as const
const stage = ref<keyof typeof stages | ''>('')
const publishing = computed(() => !!stage.value)
const error = ref('')
const publishedUrl = ref('')
const copied = ref(false)
// Offre de lancement : pendant sa période, la publication propose aussi un code promo.
const offer = promoPeriod(import.meta.env.VITE_PROMO_FROM, import.meta.env.VITE_PROMO_UNTIL)
const checkout = ref(false)
const promo = ref('')

const render = () => (data.value ? renderPortfolio(data.value, { appUrl: location.origin }) : '')

async function load() {
  const { data: r } = await supabase.from('portfolios').select('*').eq('id', props.id).maybeSingle()
  if (!r) return router.replace('/app')
  row.value = r as PortfolioRow
  data.value = normalize(row.value)
  html.value = render()
  // Retour de la page de paiement SasPay : la publication reprend d'elle-même.
  if (route.query.paiement !== undefined) {
    router.replace({ query: {} })
    if (!row.value.url) deploy({}, true)
  }
}
load()

// --- Enregistrement automatique + aperçu en direct --------------------------
let version = 0
let saveTimer: ReturnType<typeof setTimeout> | undefined
let previewTimer: ReturnType<typeof setTimeout> | undefined

watch(data, (_value, old) => {
  if (!old) return
  version++
  saveState.value = 'saving'
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 800)
  clearTimeout(previewTimer)
  previewTimer = setTimeout(() => (html.value = render()), 250)
}, { deep: true })

async function save() {
  clearTimeout(saveTimer)
  if (!data.value || saveState.value === 'saved') return
  const current = version
  const { template, theme, content } = data.value
  const { error: e } = await supabase.from('portfolios').update({ template, theme, content }).eq('id', props.id)
  if (current === version) saveState.value = e ? 'error' : 'saved'
}

const warnUnsaved = (e: BeforeUnloadEvent) => {
  if (saveState.value !== 'saved') e.preventDefault()
}
// Retour arrière depuis la page de paiement : la page restaurée par le navigateur ne reste pas bloquée.
const resume = (e: PageTransitionEvent) => e.persisted && (stage.value = '')
addEventListener('beforeunload', warnUnsaved)
addEventListener('pageshow', resume)
onBeforeUnmount(() => {
  removeEventListener('beforeunload', warnUnsaved)
  removeEventListener('pageshow', resume)
  clearTimeout(previewTimer)
  save()
})

const saveLabel = computed(() => ({ saved: 'Enregistré', saving: 'Enregistrement…', error: 'Échec de l’enregistrement' })[saveState.value])

// --- Publication -------------------------------------------------------------
async function publish() {
  if (!data.value || !row.value || publishing.value) return
  error.value = ''
  if (!data.value.content.name.trim()) {
    tab.value = 0
    showPreview.value = false
    error.value = 'Indiquez au moins votre nom avant de publier.'
    return
  }
  await save()
  if (saveState.value === 'error') {
    error.value = 'Vos dernières modifications ne sont pas enregistrées. Vérifiez votre connexion, puis réessayez.'
    return
  }
  // Le serveur publie si le portfolio est déjà payé, sinon il renvoie vers la page de paiement SasPay.
  if (row.value.paid || !offer.open()) return deploy()
  checkout.value = true
}

function payNow() {
  checkout.value = false
  deploy()
}

function usePromo() {
  checkout.value = false
  deploy({ promo: promo.value })
}

/** `returning` : retour de la page de paiement, où le client vient de payer. */
async function deploy(proof: { promo?: string } = {}, returning = false) {
  if (stage.value) return
  stage.value = row.value?.paid || proof.promo || returning ? 'publish' : 'wait'
  error.value = ''
  let leaving = false
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ portfolioId: props.id, ...proof }),
    })
    const body = (await res.json().catch(() => ({}))) as { url?: string; checkoutUrl?: string; error?: string }
    if (body.checkoutUrl) {
      if (returning) throw new Error('Votre paiement n’est pas encore confirmé par l’opérateur. Réessayez dans un instant.')
      leaving = true
      stage.value = 'pay'
      return location.assign(body.checkoutUrl)
    }
    if (!res.ok || !body.url) throw new Error(body.error || 'La mise en ligne a échoué. Réessayez dans un instant.')
    publishedUrl.value = body.url
  } catch (e) {
    // TypeError : le réseau a coupé avant la réponse du serveur.
    const message = e instanceof TypeError ? 'Connexion interrompue. Vérifiez votre réseau, puis réessayez.' : e instanceof Error ? e.message : String(e)
    // Le serveur garde la session de paiement : un nouvel essai retrouve le paiement déjà fait.
    error.value = message + (returning ? ' Vous ne paierez pas deux fois.' : '')
  } finally {
    if (!leaving) stage.value = ''
    const { data: r } = await supabase.from('portfolios').select('*').eq('id', props.id).maybeSingle()
    if (r) row.value = r as PortfolioRow
  }
}

async function copyUrl() {
  await navigator.clipboard.writeText(publishedUrl.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const showSuccess = computed({ get: () => !!publishedUrl.value, set: (v) => !v && (publishedUrl.value = '') })
</script>

<template>
  <div class="flex h-dvh flex-col bg-zinc-100">
    <!-- Barre du haut -->
    <header class="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3 sm:px-4">
      <RouterLink to="/app" class="btn btn-ghost !px-2.5" title="Mes portfolios"><ArrowLeft class="size-5" /></RouterLink>
      <div class="mr-auto min-w-0">
        <p class="truncate text-sm font-semibold">{{ data?.content.name || row?.slug || '…' }}</p>
        <p class="flex items-center gap-1.5 text-xs" :class="saveState === 'error' ? 'text-red-600' : 'text-zinc-500'">
          <span class="size-1.5 rounded-full" :class="{ 'bg-emerald-500': saveState === 'saved', 'animate-pulse bg-amber-500': saveState === 'saving', 'bg-red-500': saveState === 'error' }" />
          {{ saveLabel }}
        </p>
      </div>
      <a v-if="row?.url" :href="row.url" target="_blank" rel="noopener" class="btn btn-outline hidden md:inline-flex">
        <ExternalLink class="size-4" /> Voir le site
      </a>
      <button type="button" class="btn btn-outline lg:hidden" @click="showPreview = !showPreview">
        <component :is="showPreview ? Pencil : Eye" class="size-4" />
        <span class="hidden sm:inline">{{ showPreview ? 'Modifier' : 'Aperçu' }}</span>
      </button>
      <button type="button" class="btn btn-primary" :disabled="!data || publishing" @click="publish">
        <Rocket class="size-4" />
        <template v-if="row?.paid">{{ row.url ? 'Mettre à jour' : 'Publier' }}</template>
        <template v-else>Publier<span class="hidden sm:inline">· {{ fcfa(PRICE) }}</span></template>
      </button>
    </header>

    <div v-if="data" class="flex min-h-0 flex-1">
      <!-- Formulaire -->
      <aside class="w-full shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex lg:w-[460px]" :class="showPreview ? 'hidden' : 'flex'">
        <nav class="grid shrink-0 grid-cols-5 gap-1 border-b border-zinc-200 p-2">
          <button
            v-for="(t, i) in tabs"
            :key="t.id"
            type="button"
            class="flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-semibold transition"
            :class="tab === i ? 'bg-brand-50 text-brand-700' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'"
            @click="tab = i"
          >
            <component :is="t.icon" class="size-4" /><span><span class="hidden sm:inline">{{ i + 1 }}. </span>{{ t.label }}</span>
          </button>
        </nav>
        <div class="flex-1 overflow-y-auto p-5 sm:p-6">
          <ProfileForm v-if="tab === 0" :content="data.content" />
          <ExpertiseForm v-else-if="tab === 1" :content="data.content" />
          <ExperienceForm v-else-if="tab === 2" :content="data.content" />
          <ProjectsForm v-else-if="tab === 3" :content="data.content" />
          <StyleForm v-else :data="data" />
        </div>
        <div class="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-200 p-3">
          <button v-if="tab > 0" type="button" class="btn btn-ghost" @click="tab--"><ArrowLeft class="size-4" /> Précédent</button>
          <span v-else />
          <button v-if="tab < tabs.length - 1" type="button" class="btn btn-outline" @click="tab++">
            Étape suivante : {{ tabs[tab + 1]?.label }} <ArrowRight class="size-4" />
          </button>
          <button v-else type="button" class="btn btn-primary" :disabled="publishing" @click="publish">
            <Rocket class="size-4" /> {{ row?.paid ? 'Mettre en ligne' : `Publier pour ${fcfa(PRICE)}` }}
          </button>
        </div>
      </aside>

      <!-- Aperçu -->
      <main class="min-w-0 flex-1 flex-col p-3 sm:p-5 lg:flex" :class="showPreview ? 'flex' : 'hidden'">
        <div class="mb-3 flex justify-center">
          <div class="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
            <button
              v-for="d in devices"
              :key="d"
              type="button"
              class="btn !px-3 !py-1.5"
              :class="device === d ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'"
              @click="device = d"
            >
              <component :is="d === 'desktop' ? Monitor : Smartphone" class="size-4" />
              {{ d === 'desktop' ? 'Ordinateur' : 'Téléphone' }}
            </button>
          </div>
        </div>
        <div class="min-h-0 flex-1">
          <SitePreview v-if="device === 'desktop'" :html="html" interactive class="h-full rounded-xl border border-zinc-200 bg-white shadow-sm" />
          <div v-else class="mx-auto h-full w-[400px] max-w-full overflow-hidden rounded-[2.25rem] border-[10px] border-zinc-900 bg-white shadow-xl">
            <SitePreview :html="html" :width="380" interactive class="h-full" />
          </div>
        </div>
      </main>
    </div>
    <div v-else class="grid flex-1 place-items-center"><LoaderCircle class="size-8 animate-spin text-brand-600" /></div>

    <!-- Erreur -->
    <div v-if="error" class="alert fixed inset-x-4 bottom-4 z-40 flex items-start gap-3 shadow-lg sm:right-4 sm:left-auto sm:w-96" role="alert">
      <p class="flex-1">{{ error }}</p>
      <button type="button" aria-label="Fermer" @click="error = ''"><X class="size-4" /></button>
    </div>

    <!-- Publication en cours -->
    <div v-if="stage" class="fixed inset-0 z-50 grid place-items-center bg-zinc-950/60 p-4 backdrop-blur-sm">
      <div class="card max-w-sm p-8 text-center shadow-2xl">
        <LoaderCircle class="mx-auto size-10 animate-spin text-brand-600" />
        <p class="mt-4 text-lg font-bold">{{ stages[stage][0] }}</p>
        <p class="mt-1 text-sm text-zinc-500">{{ stages[stage][1] }}</p>
      </div>
    </div>

    <!-- Paiement ou code promo (pendant l'offre de lancement) -->
    <Modal v-model="checkout" title="Publier votre portfolio">
      <button type="button" class="btn btn-primary w-full" @click="payNow">
        <Wallet class="size-4" /> Payer {{ fcfa(PRICE) }} · Mobile Money ou carte
      </button>
      <div class="my-5 flex items-center gap-3 text-xs text-zinc-400"><span class="h-px flex-1 bg-zinc-200" />ou<span class="h-px flex-1 bg-zinc-200" /></div>
      <form class="space-y-3" @submit.prevent="usePromo">
        <Field label="Code promo" :hint="`Offre de lancement, valable ${offer.label}.`">
          <input v-model="promo" class="input uppercase" autocomplete="off" autocapitalize="characters" spellcheck="false" required />
        </Field>
        <button class="btn btn-outline w-full" :disabled="!promo.trim()"><TicketPercent class="size-4" /> Publier gratuitement</button>
      </form>
    </Modal>

    <!-- Succès -->
    <Modal v-model="showSuccess" title="Votre portfolio est en ligne !">
      <div class="text-center">
        <CircleCheck class="mx-auto size-14 text-emerald-500" />
        <p class="mt-3 text-sm text-zinc-600">Partagez ce lien sur votre CV, LinkedIn ou WhatsApp :</p>
        <div class="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 pl-3">
          <span class="flex-1 truncate text-left text-sm font-medium">{{ host(publishedUrl) }}</span>
          <button type="button" class="btn btn-outline !px-3 !py-1.5" @click="copyUrl">
            <Copy class="size-4" /> {{ copied ? 'Copié !' : 'Copier' }}
          </button>
        </div>
        <a :href="publishedUrl" target="_blank" rel="noopener" class="btn btn-primary mt-4 w-full"><ExternalLink class="size-4" /> Voir mon site</a>
        <p class="mt-4 text-xs text-zinc-500">Vous pouvez modifier votre portfolio à tout moment, puis cliquer sur « Mettre à jour ».</p>
      </div>
    </Modal>
  </div>
</template>
