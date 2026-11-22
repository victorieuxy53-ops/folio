// Modèle partagé entre l'application (navigateur) et l'API (serveur).

export const BRAND = 'Folio'
export const PRICE = 2000
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const frenchDay = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  return { year, month: MONTHS[month - 1], day: day === 1 ? '1er' : String(day) }
}

/**
 * Offre de lancement (code promo) : du jour `from` à 00:00 au jour `until` à 23:59 inclus,
 * dates AAAA-MM-JJ en heure du Bénin (UTC+1). Fermée si une date manque ou est invalide.
 * `label`, par ex. « du 20 au 24 novembre 2026 » ou « du 28 novembre au 3 décembre 2026 ».
 */
export function promoPeriod(from = '', until = '') {
  const [a, b] = [from.trim(), until.trim()]
  const start = Date.parse(`${a}T00:00:00+01:00`)
  const end = Date.parse(`${b}T23:59:59.999+01:00`)
  if (!ISO_DAY.test(a) || !ISO_DAY.test(b) || !(start <= end)) return { open: () => false, label: '' }
  const x = frenchDay(a)
  const y = frenchDay(b)
  const first = x.year !== y.year ? `${x.day} ${x.month} ${x.year}` : x.month !== y.month ? `${x.day} ${x.month}` : x.day
  return { open: (now = Date.now()) => start <= now && now <= end, label: `du ${first} au ${y.day} ${y.month} ${y.year}` }
}
/** Préfixe des projets Vercel : folio-<adresse>.vercel.app */
export const PROJECT_PREFIX = 'folio'

export const TEMPLATES = [
  { id: 'vitrine', name: 'Vitrine', description: 'Plein écran animé, photo mise en valeur, compteurs et projets filtrables.' },
  { id: 'minimal', name: 'Éditorial', description: 'Mise en page de magazine, sections numérotées, grande typographie.' },
  { id: 'sidebar', name: 'Professionnel', description: 'Profil et menu fixes à gauche, parcours détaillé à droite.' },
  { id: 'bold', name: 'Impact', description: 'Titre géant, bandeau défilant et projets mis en scène.' },
  { id: 'bento', name: 'Mosaïque', description: 'Des cartes en grille qui s’illuminent au survol.' },
  { id: 'terminal', name: 'Développeur', description: 'Style éditeur de code, idéal pour les profils tech.' },
] as const
export type TemplateId = (typeof TEMPLATES)[number]['id']

export const FONTS = {
  moderne: { name: 'Moderne', heading: 'Inter', body: 'Inter' },
  elegant: { name: 'Élégant', heading: 'Playfair Display', body: 'Inter' },
  editorial: { name: 'Éditorial', heading: 'Fraunces', body: 'Manrope' },
  geometrique: { name: 'Géométrique', heading: 'Space Grotesk', body: 'Space Grotesk' },
  doux: { name: 'Doux', heading: 'Poppins', body: 'Poppins' },
  code: { name: 'Code', heading: 'JetBrains Mono', body: 'JetBrains Mono' },
} as const
export type FontId = keyof typeof FONTS

export const PALETTES = [
  { name: 'Ivoire', bg: '#faf7f2', text: '#1c1917', accent: '#c2410c' },
  { name: 'Nuit', bg: '#0b1020', text: '#e6e9f2', accent: '#7c9cff' },
  { name: 'Forêt', bg: '#f3f6f1', text: '#14231a', accent: '#2f7d4f' },
  { name: 'Papier', bg: '#ffffff', text: '#0a0a0a', accent: '#2563eb' },
  { name: 'Sable', bg: '#f5efe6', text: '#2b2118', accent: '#a16207' },
  { name: 'Néon', bg: '#0a0a0a', text: '#f5f5f5', accent: '#c6ff3d' },
  { name: 'Rose', bg: '#fff5f7', text: '#2a1220', accent: '#db2777' },
  { name: 'Océan', bg: '#eff7f9', text: '#0f2a3a', accent: '#0e7490' },
] as const

export const SOCIALS = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  behance: 'Behance',
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X (Twitter)',
  website: 'Site web',
} as const
export type SocialId = keyof typeof SOCIALS

export interface Experience { role: string; org: string; period: string; text: string }
export interface Project { title: string; category: string; text: string; image: string; url: string }
export interface Stat { value: string; label: string }
export interface Service { title: string; text: string }
export interface Testimonial { quote: string; name: string; role: string }

export interface Content {
  name: string
  headline: string
  /** Métiers affichés tour à tour (texte tapé) dans l'en-tête. */
  roles: string[]
  available: boolean
  bio: string
  avatar: string
  cv: string
  location: string
  email: string
  phone: string
  socials: Record<SocialId, string>
  stats: Stat[]
  services: Service[]
  skills: string[]
  experiences: Experience[]
  education: Experience[]
  projects: Project[]
  testimonials: Testimonial[]
}

export interface Theme { bg: string; text: string; accent: string; font: FontId }

export interface PortfolioData { slug: string; template: TemplateId; theme: Theme; content: Content }

export interface PortfolioRow {
  id: string
  user_id: string
  slug: string
  template: string
  theme: unknown
  content: unknown
  paid: boolean
  url: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface Profile { id: string; email: string; full_name: string; role: 'user' | 'admin'; created_at: string }

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const isValidSlug = (s: string) => SLUG_RE.test(s) && s.length >= 3 && s.length <= 32

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32).replace(/-+$/, '')

export const emptyExperience = (): Experience => ({ role: '', org: '', period: '', text: '' })
export const emptyProject = (): Project => ({ title: '', category: '', text: '', image: '', url: '' })
export const emptyStat = (): Stat => ({ value: '', label: '' })
export const emptyService = (): Service => ({ title: '', text: '' })
export const emptyTestimonial = (): Testimonial => ({ quote: '', name: '', role: '' })

/** Combinaison de style aléatoire : deux portfolios ne démarrent pas identiques. */
export function randomStyle(): { template: TemplateId; theme: Theme } {
  const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!
  const { bg, text, accent } = pick(PALETTES)
  const font = pick(Object.keys(FONTS) as FontId[])
  return { template: pick(TEMPLATES).id, theme: { bg, text, accent, font } }
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const hex = (v: unknown, fallback: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const list = <T>(v: unknown, map: (o: Record<string, unknown>) => T): T[] => (Array.isArray(v) ? v.map((x) => map(obj(x))) : [])
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [])
const experience = (e: Record<string, unknown>): Experience => ({ role: str(e.role), org: str(e.org), period: str(e.period), text: str(e.text) })

/** Remet n'importe quelle donnée stockée dans une forme sûre et complète. */
export function normalize(raw: { slug?: unknown; template?: unknown; theme?: unknown; content?: unknown }): PortfolioData {
  const t = obj(raw.theme)
  const c = obj(raw.content)
  const socials = obj(c.socials)
  const p = PALETTES[0]
  return {
    slug: str(raw.slug),
    template: TEMPLATES.find((x) => x.id === raw.template)?.id ?? 'vitrine',
    theme: {
      bg: hex(t.bg, p.bg),
      text: hex(t.text, p.text),
      accent: hex(t.accent, p.accent),
      font: typeof t.font === 'string' && Object.hasOwn(FONTS, t.font) ? (t.font as FontId) : 'moderne',
    },
    content: {
      name: str(c.name),
      headline: str(c.headline),
      roles: strings(c.roles),
      available: c.available === true,
      bio: str(c.bio),
      avatar: str(c.avatar),
      cv: str(c.cv),
      location: str(c.location),
      email: str(c.email),
      phone: str(c.phone),
      socials: Object.fromEntries(Object.keys(SOCIALS).map((k) => [k, str(socials[k])])) as Record<SocialId, string>,
      stats: list(c.stats, (e) => ({ value: str(e.value), label: str(e.label) })),
      services: list(c.services, (e) => ({ title: str(e.title), text: str(e.text) })),
      skills: strings(c.skills),
      experiences: list(c.experiences, experience),
      education: list(c.education, experience),
      projects: list(c.projects, (e) => ({ title: str(e.title), category: str(e.category), text: str(e.text), image: str(e.image), url: str(e.url) })),
      testimonials: list(c.testimonials, (e) => ({ quote: str(e.quote), name: str(e.name), role: str(e.role) })),
    },
  }
}

/** Contenu d'exemple pour les aperçus de la page d'accueil. */
export const SAMPLE: Content = {
  name: 'Aïcha Diallo',
  headline: 'Designer produit & développeuse front-end',
  roles: ['Designer produit', 'Développeuse front-end', 'Experte UX'],
  available: true,
  bio: 'Je conçois des interfaces simples et utiles pour des startups, des banques et des ONG en Afrique de l’Ouest.\n\nSix ans d’expérience, du premier atelier avec vos utilisateurs jusqu’à la mise en production. Mon objectif : des produits que les gens adoptent dès le premier jour.',
  avatar: '',
  cv: '',
  location: 'Cotonou, Bénin',
  email: 'aicha@exemple.com',
  phone: '+229 01 00 00 00',
  socials: { linkedin: 'linkedin.com/in/aicha', github: 'github.com/aicha', behance: 'behance.net/aicha', instagram: '', facebook: '', x: '', website: '' },
  stats: [
    { value: '6+', label: 'Années d’expérience' },
    { value: '40', label: 'Projets livrés' },
    { value: '25', label: 'Clients satisfaits' },
    { value: '+38 %', label: 'De conversion en moyenne' },
  ],
  services: [
    { title: 'Design d’interfaces', text: 'Applications web et mobiles claires, belles et faciles à prendre en main.' },
    { title: 'Recherche utilisateur', text: 'Entretiens et tests pour construire ce dont vos clients ont vraiment besoin.' },
    { title: 'Développement front-end', text: 'Des maquettes transformées en sites rapides, accessibles et adaptés au mobile.' },
  ],
  skills: ['Figma', 'UI / UX', 'Vue.js', 'Design system', 'Prototypage', 'Recherche utilisateur', 'Tailwind CSS', 'Accessibilité'],
  experiences: [
    { role: 'Lead designer', org: 'Kora Pay', period: '2022 — Aujourd’hui', text: 'Refonte de l’application mobile : +38 % de paiements réussis.' },
    { role: 'Designer UI', org: 'Studio Lagune', period: '2019 — 2022', text: 'Sites et applications pour 25 clients, de la banque à la santé.' },
  ],
  education: [
    { role: 'Master Design numérique', org: 'Université d’Abomey-Calavi', period: '2017 — 2019', text: '' },
    { role: 'Certification UX Design', org: 'Google', period: '2021', text: '' },
  ],
  projects: [
    { title: 'Kora Pay', category: 'Application mobile', text: 'Application de paiement mobile utilisée par 200 000 personnes.', image: '', url: 'https://exemple.com' },
    { title: 'Marché Vert', category: 'Site web', text: 'Place de marché qui relie 300 producteurs locaux à leurs clients.', image: '', url: '' },
    { title: 'École+', category: 'Application mobile', text: 'Suivi scolaire en temps réel pour parents et enseignants.', image: '', url: '' },
    { title: 'Banque Atlantique', category: 'Design system', text: 'Bibliothèque de 120 composants pour unifier 4 applications.', image: '', url: '' },
    { title: 'Santé Direct', category: 'Site web', text: 'Prise de rendez-vous en ligne pour 15 cliniques de Cotonou.', image: '', url: '' },
    { title: 'Maison Akwaba', category: 'Identité visuelle', text: 'Logo, charte graphique et packaging d’une marque de cosmétiques.', image: '', url: '' },
  ],
  testimonials: [
    { quote: 'Aïcha a compris nos clients mieux que nous. La nouvelle application a doublé nos inscriptions en trois mois.', name: 'Koffi Mensah', role: 'CEO, Kora Pay' },
    { quote: 'Rigoureuse, créative et toujours dans les délais. Je la recommande sans hésiter.', name: 'Fatou Ndiaye', role: 'Directrice produit, Marché Vert' },
  ],
}
