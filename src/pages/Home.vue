<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, Check, Palette, PenLine, Rocket, Smartphone, UserPlus } from '@lucide/vue'
import { PALETTES, PRICE, PROJECT_PREFIX, SAMPLE, TEMPLATES, type FontId, type PortfolioData, type TemplateId } from '../../shared/portfolio'
import { renderPortfolio } from '../../shared/render'
import { session } from '../lib/auth'
import { fcfa } from '../lib/format'
import Logo from '../components/Logo.vue'
import SitePreview from '../components/SitePreview.vue'

// Un style distinct par modèle pour montrer la variété.
const LOOKS: Record<TemplateId, { palette: number; font: FontId }> = {
  vitrine: { palette: 1, font: 'doux' },
  minimal: { palette: 0, font: 'editorial' },
  sidebar: { palette: 7, font: 'moderne' },
  bold: { palette: 5, font: 'geometrique' },
  bento: { palette: 6, font: 'elegant' },
  terminal: { palette: 2, font: 'code' },
}
const demo = (template: TemplateId): string => {
  const { palette, font } = LOOKS[template]
  const { bg, text, accent } = PALETTES[palette] ?? PALETTES[0]
  const data: PortfolioData = { slug: 'aicha-diallo', template, theme: { bg, text, accent, font }, content: SAMPLE }
  return renderPortfolio(data)
}
const gallery = TEMPLATES.map((t) => ({ ...t, html: demo(t.id) }))
const current = ref<TemplateId>('vitrine')
const heroHtml = computed(() => gallery.find((g) => g.id === current.value)?.html ?? '')
const start = computed(() => (session.value ? '/app' : '/auth?mode=signup'))

const steps = [
  { icon: UserPlus, title: 'Créez votre compte', text: 'Inscription gratuite en 30 secondes, avec votre e-mail.' },
  { icon: PenLine, title: 'Remplissez, personnalisez', text: 'Vos infos, vos projets, votre style. L’aperçu se met à jour en direct.' },
  { icon: Rocket, title: 'Publiez', text: `Payez ${fcfa(PRICE)} par Mobile Money ou carte : votre site est en ligne immédiatement.` },
]
const features = [
  'Site en ligne immédiatement, hébergement inclus',
  `${TEMPLATES.length} mises en page, ${PALETTES.length} palettes et vos propres couleurs`,
  'Animations, compteurs, filtres de projets et formulaire de contact',
  'Parfait sur téléphone, tablette et ordinateur',
  'Modifications et mises à jour illimitées',
  'Bouton WhatsApp, e-mail et réseaux sociaux',
  'Aucune compétence technique requise',
]
const faq = [
  { q: 'Dois-je savoir coder ?', a: 'Non. Vous remplissez un formulaire simple, vous choisissez un style, et nous nous occupons de tout le reste.' },
  { q: 'Quand dois-je payer ?', a: `Uniquement au moment de publier. Vous pouvez créer et prévisualiser votre portfolio gratuitement. Le paiement de ${fcfa(PRICE)} est unique, sans abonnement.` },
  { q: 'Quels moyens de paiement sont acceptés ?', a: 'Mobile Money et carte bancaire, via la plateforme de paiement sécurisée SasPay.' },
  { q: 'Quelle sera l’adresse de mon site ?', a: `Vous la choisissez à la création, sous la forme ${PROJECT_PREFIX}-votre-nom.vercel.app. Elle s’affiche dès la publication, prête à partager.` },
  { q: 'Puis-je modifier mon portfolio après publication ?', a: 'Oui, autant de fois que vous le souhaitez. Un clic sur « Mettre à jour » suffit, sans frais supplémentaires.' },
  { q: 'Mon portfolio ressemblera-t-il à celui des autres ?', a: 'Non. Mise en page, couleurs et typographie se combinent librement : chaque portfolio démarre même avec un style différent.' },
]
</script>

<template>
  <div class="bg-white">
    <!-- Navigation -->
    <header class="sticky top-0 z-30 border-b border-zinc-100 bg-white/85 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <RouterLink to="/" class="mr-auto"><Logo /></RouterLink>
        <nav class="mr-2 hidden gap-1 md:flex">
          <a href="#modeles" class="btn btn-ghost">Modèles</a>
          <a href="#tarif" class="btn btn-ghost">Tarif</a>
          <a href="#faq" class="btn btn-ghost">Questions</a>
        </nav>
        <RouterLink v-if="!session" to="/auth" class="btn btn-ghost">Connexion</RouterLink>
        <RouterLink :to="start" class="btn btn-primary">{{ session ? 'Mon espace' : 'Commencer' }}</RouterLink>
      </div>
    </header>

    <!-- Accroche -->
    <section class="relative overflow-hidden">
      <div class="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl" />
      <div class="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span class="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
            Paiement unique · {{ fcfa(PRICE) }}
          </span>
          <h1 class="mt-5 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Votre portfolio professionnel, <span class="text-brand-600">en ligne en 10 minutes.</span>
          </h1>
          <p class="mt-5 max-w-xl text-lg text-zinc-600">
            Remplissez vos informations, choisissez un style qui vous ressemble, payez par Mobile Money : votre site est publié instantanément. Aucune compétence technique requise.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <RouterLink :to="start" class="btn btn-primary !px-6 !py-3.5 !text-base">Créer mon portfolio <ArrowRight class="size-4" /></RouterLink>
            <a href="#modeles" class="btn btn-outline !px-6 !py-3.5 !text-base">Voir les modèles</a>
          </div>
          <ul class="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600">
            <li v-for="t in ['Sans abonnement', 'Mobile Money & carte', 'Modifications illimitées']" :key="t" class="flex items-center gap-1.5">
              <Check class="size-4 text-brand-600" /> {{ t }}
            </li>
          </ul>
        </div>

        <div>
          <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-brand-900/10">
            <div class="flex items-center gap-1.5 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
              <span v-for="c in ['bg-red-400', 'bg-amber-400', 'bg-emerald-400']" :key="c" class="size-2.5 rounded-full" :class="c" />
              <span class="ml-3 truncate rounded-md bg-white px-3 py-0.5 text-xs text-zinc-500">{{ PROJECT_PREFIX }}-aicha-diallo.vercel.app</span>
            </div>
            <SitePreview :html="heroHtml" class="aspect-[16/11]" />
          </div>
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <button
              v-for="g in gallery"
              :key="g.id"
              type="button"
              class="rounded-full px-3.5 py-1.5 text-sm font-semibold transition"
              :class="current === g.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'"
              @click="current = g.id"
            >
              {{ g.name }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Étapes -->
    <section class="border-y border-zinc-100 bg-zinc-50 py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="text-center text-3xl font-extrabold tracking-tight">Trois étapes, c’est tout</h2>
        <p class="mt-3 text-center text-zinc-600">Personne pour vous guider ? Pas besoin : tout est expliqué à chaque étape.</p>
        <ol class="mt-12 grid gap-5 md:grid-cols-3">
          <li v-for="(s, i) in steps" :key="s.title" class="card p-6">
            <div class="flex items-center gap-3">
              <span class="grid size-11 place-items-center rounded-xl bg-brand-600 text-white"><component :is="s.icon" class="size-5" /></span>
              <span class="text-sm font-bold text-zinc-400">Étape {{ i + 1 }}</span>
            </div>
            <h3 class="mt-5 text-lg font-bold">{{ s.title }}</h3>
            <p class="mt-1.5 text-zinc-600">{{ s.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Modèles -->
    <section id="modeles" class="scroll-mt-16 py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="text-center text-3xl font-extrabold tracking-tight">Des styles vraiment différents</h2>
        <p class="mx-auto mt-3 max-w-2xl text-center text-zinc-600">
          {{ TEMPLATES.length }} mises en page, {{ PALETTES.length }} palettes, vos propres couleurs et 6 typographies : des centaines de combinaisons pour un portfolio qui ne ressemble qu’à vous.
        </p>
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article v-for="g in gallery" :key="g.id" class="card overflow-hidden">
            <SitePreview :html="g.html" class="aspect-[16/10] border-b border-zinc-100" />
            <div class="p-5">
              <h3 class="font-bold">{{ g.name }}</h3>
              <p class="mt-1 text-sm text-zinc-600">{{ g.description }}</p>
            </div>
          </article>
          <article class="flex flex-col gap-6 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-8 text-white sm:col-span-2 lg:col-span-3 lg:flex-row lg:items-center">
            <Palette class="size-10 shrink-0" />
            <div class="flex-1">
              <h3 class="text-xl font-bold">Et vos propres couleurs</h3>
              <p class="mt-2 text-brand-100">Choisissez librement le fond, le texte et la couleur d’accent. L’aperçu se met à jour instantanément.</p>
            </div>
            <RouterLink :to="start" class="btn self-start bg-white text-brand-700 hover:bg-brand-50 lg:self-center">Essayer gratuitement</RouterLink>
          </article>
        </div>
      </div>
    </section>

    <!-- Tarif -->
    <section id="tarif" class="scroll-mt-16 bg-zinc-950 py-20 text-white">
      <div class="mx-auto grid max-w-5xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 class="text-3xl font-extrabold tracking-tight sm:text-4xl">Un seul prix. Pas d’abonnement. Pas de surprise.</h2>
          <p class="mt-4 text-zinc-400">Créez et prévisualisez gratuitement. Vous ne payez qu’une fois, au moment de mettre votre portfolio en ligne.</p>
          <p class="mt-6 flex items-center gap-2 text-sm text-zinc-400"><Smartphone class="size-4" /> Paiement sécurisé par Mobile Money ou carte via SasPay</p>
        </div>
        <div class="rounded-3xl bg-white p-8 text-zinc-900 shadow-2xl">
          <p class="font-semibold text-brand-600">Portfolio en ligne</p>
          <p class="mt-2 flex items-baseline gap-2">
            <span class="text-5xl font-extrabold tracking-tight">{{ new Intl.NumberFormat('fr-FR').format(PRICE) }}</span>
            <span class="text-lg font-semibold text-zinc-500">FCFA · une seule fois</span>
          </p>
          <ul class="mt-6 space-y-3">
            <li v-for="f in features" :key="f" class="flex items-start gap-3 text-sm">
              <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Check class="size-3.5" /></span>{{ f }}
            </li>
          </ul>
          <RouterLink :to="start" class="btn btn-primary mt-8 w-full !py-3.5 !text-base">Créer mon portfolio</RouterLink>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="scroll-mt-16 py-20">
      <div class="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 class="text-center text-3xl font-extrabold tracking-tight">Questions fréquentes</h2>
        <div class="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
          <details v-for="item in faq" :key="item.q" class="group py-5">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {{ item.q }}
              <span class="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-100 text-lg leading-none transition group-open:rotate-45">+</span>
            </summary>
            <p class="mt-3 text-zinc-600">{{ item.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Appel final -->
    <section class="px-4 pb-20 sm:px-6">
      <div class="mx-auto max-w-6xl rounded-3xl bg-brand-600 px-6 py-14 text-center text-white">
        <h2 class="text-3xl font-extrabold tracking-tight sm:text-4xl">Prêt à vous démarquer ?</h2>
        <p class="mt-3 text-brand-100">Votre portfolio professionnel vous attend. Commencez gratuitement.</p>
        <RouterLink :to="start" class="btn mt-8 bg-white !px-6 !py-3.5 !text-base text-brand-700 hover:bg-brand-50">
          Créer mon portfolio <ArrowRight class="size-4" />
        </RouterLink>
      </div>
    </section>

    <footer class="border-t border-zinc-100 py-8">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-zinc-500 sm:px-6">
        <Logo />
        <p>© {{ new Date().getFullYear() }} · Portfolios professionnels en ligne</p>
      </div>
    </footer>
  </div>
</template>
