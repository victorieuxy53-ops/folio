// POST /api/publish  { portfolioId, promo? }
// 1. vérifie l'utilisateur  2. 1re publication : paiement SasPay confirmé ou code promo, sinon renvoie
//    { checkoutUrl }, la page de paiement SasPay où envoyer le client  3. génère le HTML
// 4. le déploie sur Vercel  5. enregistre l'URL.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { normalize, PRICE, PROJECT_PREFIX, promoPeriod, type PortfolioRow } from '../shared/portfolio.js'
import { renderPortfolio } from '../shared/render.js'

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`)
  return value
}

export async function POST(request: Request): Promise<Response> {
  // Défini une fois le portfolio trouvé : tout échec est alors inscrit dans le journal de l'administration.
  let logFailure: ((error: string) => PromiseLike<unknown>) | undefined
  try {
    const db = createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const user = token ? (await db.auth.getUser(token)).data.user : null
    if (!user) throw new HttpError(401, 'Session expirée, reconnectez-vous.')
    const userId = user.id

    const body = (await request.json().catch(() => ({}))) as { portfolioId?: unknown; promo?: unknown }
    const { data } = await db.from('portfolios').select('*').eq('id', String(body.portfolioId)).eq('user_id', userId).maybeSingle()
    const portfolio = data as PortfolioRow | null
    if (!portfolio) throw new HttpError(404, 'Portfolio introuvable.')
    logFailure = (error) =>
      db.from('events').insert({ user_id: userId, type: 'failed', meta: { slug: portfolio.slug, error: error.slice(0, 300) } })

    const origin = new URL(request.url).origin
    if (!portfolio.paid) {
      const promo = typeof body.promo === 'string' ? body.promo.trim() : ''
      // Un paiement déjà fait passe avant le code promo : il n'est jamais perdu.
      const checkout = await checkoutState(db, portfolio.id)
      let payment: { transactionId: string; amount: number }
      if (checkout.paid) {
        payment = await verifyPayment(checkout.paid)
      } else if (promo) {
        checkPromo(promo)
        // Enregistré comme un paiement de 0 FCFA ; transaction_id étant unique, un seul portfolio offert par compte.
        payment = { transactionId: `promo:${userId}`, amount: 0 }
      } else {
        // Une session encore en attente est réutilisée : le client ne paie jamais deux fois.
        const customer = { email: user.email ?? '', name: normalize(portfolio).content.name.trim() || (user.email ?? '') }
        const checkoutUrl = checkout.pending ?? (await openCheckout(db, userId, portfolio, customer, `${origin}/app/${portfolio.id}?paiement=ok`))
        return Response.json({ checkoutUrl })
      }
      const { transactionId, amount } = payment
      const { error } = await db.from('payments').insert({ user_id: userId, portfolio_id: portfolio.id, transaction_id: transactionId, amount })
      if (error?.code === '23505') {
        // Déjà enregistré : nouvel essai pour ce portfolio après une interruption (accepté),
        // ou code promo déjà utilisé par ce compte pour un autre portfolio (refusé).
        const { data: prev } = await db.from('payments').select('portfolio_id').eq('transaction_id', transactionId).maybeSingle()
        if (prev?.portfolio_id !== portfolio.id) throw new HttpError(409, 'Votre compte a déjà reçu un portfolio offert avec un code promo.')
      } else if (error) {
        throw new Error(`Paiement non enregistré : ${error.message}`)
      }
      const { error: paidError } = await db.from('portfolios').update({ paid: true }).eq('id', portfolio.id)
      if (paidError) throw new Error(`Statut payé non enregistré : ${paidError.message}`)
      if (!error) await db.from('events').insert({ user_id: userId, type: amount ? 'payment' : 'promo', meta: { slug: portfolio.slug, amount, transaction_id: transactionId } })
    } else if (portfolio.published_at && Date.now() - Date.parse(portfolio.published_at) < 30_000) {
      // Chaque publication consomme un déploiement Vercel (quota quotidien partagé par tous les clients).
      throw new HttpError(429, 'Votre site vient d’être mis à jour. Patientez quelques secondes avant de republier.')
    }

    const html = renderPortfolio(normalize(portfolio), {
      appUrl: origin,
      track: { url: env('VITE_SUPABASE_URL'), key: env('VITE_SUPABASE_ANON_KEY') },
    })
    const url = await deploy(`${PROJECT_PREFIX}-${portfolio.slug}`, html)
    await db.from('portfolios').update({ url, published_at: new Date().toISOString() }).eq('id', portfolio.id)
    await db.from('events').insert({ user_id: userId, type: portfolio.url ? 'updated' : 'published', meta: { slug: portfolio.slug, url } })

    return Response.json({ url })
  } catch (e) {
    await logFailure?.(e instanceof Error ? e.message : String(e))
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status })
    console.error(e)
    return Response.json({ error: 'La mise en ligne a échoué. Réessayez dans un instant.' }, { status: 500 })
  }
}

/** Code promo de lancement (PROMO_CODE, majuscules indifférentes), valable du jour PROMO_FROM au jour PROMO_UNTIL inclus. */
function checkPromo(code: string) {
  const expected = process.env.PROMO_CODE?.trim()
  if (!expected || code.toUpperCase() !== expected.toUpperCase()) throw new HttpError(400, 'Code promo invalide.')
  const offer = promoPeriod(process.env.PROMO_FROM, process.env.PROMO_UNTIL)
  if (!offer.open()) throw new HttpError(403, offer.label ? `Le code promo est valable ${offer.label}.` : 'Aucune offre promotionnelle en cours.')
}

// --- SasPay (page de paiement hébergée : Mobile Money et carte) ----------------

type Session = { status?: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'; transaction_id?: string | null }

/**
 * Appel à l'API SasPay. La clé choisit l'environnement : sk_test_… le bac à sable (paiements fictifs),
 * sk_live_… le réel. Renvoie null si la ressource n'existe pas (ex. session du bac à sable après le passage au réel).
 */
async function saspay<T>(path: string, body?: object): Promise<T | null> {
  const key = env('SASPAY_API_KEY')
  const base = key.startsWith('sk_test_') ? 'https://sandbox-api.saspay.me/api/v1' : 'https://api.saspay.me/api/v1'
  const res = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  })
  if (res.status === 404) return null
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw new HttpError(429, 'Le service de paiement est très sollicité. Réessayez dans une minute.')
  // Clé absente ou erronée (401), compte suspendu (403), demande refusée (422) : erreur serveur, inscrite dans le journal.
  if (!res.ok) {
    const e = json.error ?? json
    throw new Error(`SasPay ${res.status} ${path} : ${typeof e.message === 'string' ? e.message : JSON.stringify(e)}`)
  }
  // Enveloppe { success, data, code } de la documentation, ou l'objet directement.
  return (json.success === true ? json.data : json) as T
}

/** Seul le statut SUCCESS de la transaction, revérifié par SasPay auprès de l'opérateur, vaut paiement. */
async function verifyPayment(transactionId: string) {
  const tx = await saspay<{ status?: string; net_amount?: string }>(`/payments/${encodeURIComponent(transactionId)}/verify/`)
  if (tx?.status !== 'SUCCESS') throw new HttpError(402, 'Votre paiement n’est pas encore confirmé par l’opérateur. Réessayez dans un instant.')
  // net_amount : ce qui revient au propriétaire, frais SasPay déduits (le prix si SasPay ne le précise pas).
  return { transactionId, amount: Math.round(Number(tx.net_amount)) || PRICE }
}

type Opened = { checkout_id: string; checkout_url: string }

/**
 * Sessions de paiement ouvertes pour ce portfolio (événements « checkout » du journal, les plus récentes d'abord),
 * revérifiées auprès de SasPay : la transaction d'une session payée, et l'adresse de la dernière encore en attente.
 */
async function checkoutState(db: SupabaseClient, portfolioId: string) {
  const { data, error } = await db.from('events').select('meta').eq('type', 'checkout').eq('meta->>portfolio_id', portfolioId)
    .order('id', { ascending: false }).limit(5)
  if (error) throw new Error(`Sessions de paiement illisibles : ${error.message}`)
  const opened = (data ?? []).map((e) => e.meta as Opened)
  const sessions = await Promise.all(opened.map((o) => saspay<Session>(`/checkout-sessions/${encodeURIComponent(o.checkout_id)}/status/`)))
  return {
    paid: sessions.find((s) => s?.status === 'PAID' && s.transaction_id)?.transaction_id ?? undefined,
    pending: opened.find((_, i) => sessions[i]?.status === 'PENDING')?.checkout_url,
  }
}

/** Ouvre une session de paiement SasPay et l'inscrit au journal avant d'y envoyer le client : son paiement sera toujours retrouvé. */
async function openCheckout(db: SupabaseClient, userId: string, portfolio: PortfolioRow, customer: { email: string; name: string }, returnUrl: string) {
  const s = await saspay<{ id?: string; checkout_url?: string }>('/checkout-sessions/', {
    amount: PRICE.toFixed(2),
    currency: 'XOF',
    description: `Publication du portfolio ${portfolio.slug}`,
    customer_email: customer.email,
    customer_name: customer.name,
    return_url: returnUrl,
    metadata: { portfolio_id: portfolio.id, slug: portfolio.slug },
  })
  if (!s?.id || !s.checkout_url?.startsWith('https://')) throw new Error(`SasPay : session de paiement invalide (${JSON.stringify(s).slice(0, 200)})`)
  const meta: Opened & { slug: string; portfolio_id: string } = { slug: portfolio.slug, portfolio_id: portfolio.id, checkout_id: s.id, checkout_url: s.checkout_url }
  const { error } = await db.from('events').insert({ user_id: userId, type: 'checkout', meta })
  if (error) throw new Error(`Session de paiement non enregistrée : ${error.message}`)
  return s.checkout_url
}

async function vercel<T>(path: string, init: RequestInit = {}): Promise<T> {
  const team = process.env.DEPLOY_TEAM_ID
  const url = `https://api.vercel.com${path}${team ? `${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(team)}` : ''}`
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${env('DEPLOY_TOKEN')}`, 'Content-Type': 'application/json' } })
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } }
  if (!res.ok) throw new Error(`Vercel ${res.status} ${path}: ${json.error?.message ?? 'erreur inconnue'}`)
  return json
}

/** Déploie une page unique en production et renvoie son URL publique. */
async function deploy(project: string, html: string): Promise<string> {
  type Deployment = { id: string; url: string; readyState: string; aliasAssigned?: boolean; alias?: string[] }
  let d = await vercel<Deployment>('/v13/deployments?skipAutoDetectionConfirmation=1', {
    method: 'POST',
    body: JSON.stringify({
      name: project,
      target: 'production',
      files: [{ file: 'index.html', data: Buffer.from(html).toString('base64'), encoding: 'base64' }],
      projectSettings: { framework: null },
    }),
  })
  // Le site doit être public : on désactive la protection Vercel du projet.
  await vercel(`/v9/projects/${project}`, { method: 'PATCH', body: JSON.stringify({ ssoProtection: null }) })

  for (let i = 0; i < 30 && !(d.readyState === 'READY' && d.aliasAssigned) && !['ERROR', 'CANCELED'].includes(d.readyState); i++) {
    await new Promise((r) => setTimeout(r, 1500))
    d = await vercel<Deployment>(`/v13/deployments/${d.id}`)
  }
  if (d.readyState !== 'READY') throw new Error(`Déploiement Vercel ${d.readyState}`)
  const alias = [...(d.alias ?? [])].sort((x, y) => x.length - y.length)[0]
  return `https://${alias ?? d.url}`
}
