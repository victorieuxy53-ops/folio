// POST /api/publish  { portfolioId, transactionId?, promo? }
// 1. vérifie l'utilisateur  2. vérifie le paiement Kkiapay ou le code promo (1re publication)
// 3. génère le HTML  4. le déploie sur Vercel  5. enregistre l'URL.
import { createClient } from '@supabase/supabase-js'
import { normalize, PRICE, PROJECT_PREFIX, promoEnd, type PortfolioRow } from '../shared/portfolio.js'
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
  try {
    const db = createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const user = token ? (await db.auth.getUser(token)).data.user : null
    if (!user) throw new HttpError(401, 'Session expirée, reconnectez-vous.')
    const userId = user.id

    const body = (await request.json().catch(() => ({}))) as { portfolioId?: unknown; transactionId?: unknown; promo?: unknown }
    const { data } = await db.from('portfolios').select('*').eq('id', String(body.portfolioId)).eq('user_id', userId).maybeSingle()
    const portfolio = data as PortfolioRow | null
    if (!portfolio) throw new HttpError(404, 'Portfolio introuvable.')

    if (!portfolio.paid) {
      const promo = typeof body.promo === 'string' ? body.promo.trim() : ''
      let transactionId = typeof body.transactionId === 'string' ? body.transactionId.trim() : ''
      let amount = 0
      if (promo) {
        checkPromo(promo)
        // Enregistré comme un paiement de 0 FCFA ; transaction_id étant unique, un seul portfolio offert par compte.
        transactionId = `promo:${userId}`
      } else if (transactionId) {
        amount = await verifyPayment(transactionId, portfolio.id)
      } else {
        throw new HttpError(402, 'Le paiement est requis pour publier.')
      }
      const { error } = await db.from('payments').insert({ user_id: userId, portfolio_id: portfolio.id, transaction_id: transactionId, amount })
      if (error?.code === '23505') {
        // Déjà enregistré : nouvel essai pour ce portfolio après une interruption (accepté),
        // ou code promo déjà utilisé par ce compte pour un autre portfolio (refusé).
        const { data: prev } = await db.from('payments').select('portfolio_id').eq('transaction_id', transactionId).maybeSingle()
        if (prev?.portfolio_id !== portfolio.id) throw new HttpError(409, 'Vous avez déjà utilisé ce code promo pour un autre portfolio.')
      } else if (error) {
        throw new Error(`Paiement non enregistré : ${error.message}`)
      }
      const { error: paidError } = await db.from('portfolios').update({ paid: true }).eq('id', portfolio.id)
      if (paidError) throw new Error(`Statut payé non enregistré : ${paidError.message}`)
      if (!error) await db.from('events').insert({ user_id: userId, type: promo ? 'promo' : 'payment', meta: { slug: portfolio.slug, amount, transaction_id: transactionId } })
    } else if (portfolio.published_at && Date.now() - Date.parse(portfolio.published_at) < 30_000) {
      // Chaque publication consomme un déploiement Vercel (quota quotidien partagé par tous les clients).
      throw new HttpError(429, 'Votre site vient d’être mis à jour. Patientez quelques secondes avant de republier.')
    }

    const html = renderPortfolio(normalize(portfolio), {
      appUrl: new URL(request.url).origin,
      track: { url: env('VITE_SUPABASE_URL'), key: env('VITE_SUPABASE_ANON_KEY') },
    })
    const url = await deploy(`${PROJECT_PREFIX}-${portfolio.slug}`, html)
    await db.from('portfolios').update({ url, published_at: new Date().toISOString() }).eq('id', portfolio.id)
    await db.from('events').insert({ user_id: userId, type: portfolio.url ? 'updated' : 'published', meta: { slug: portfolio.slug, url } })

    return Response.json({ url })
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status })
    console.error(e)
    return Response.json({ error: 'La mise en ligne a échoué. Réessayez dans un instant.' }, { status: 500 })
  }
}

/** Code promo de lancement (PROMO_CODE, majuscules indifférentes), valable jusqu'au jour VITE_PROMO_UNTIL inclus. */
function checkPromo(code: string) {
  const expected = process.env.PROMO_CODE?.trim()
  if (!expected || code.toUpperCase() !== expected.toUpperCase()) throw new HttpError(400, 'Code promo invalide.')
  if (!(Date.now() <= promoEnd(process.env.VITE_PROMO_UNTIL))) throw new HttpError(410, 'Ce code promo a expiré.')
}

/** Vérifie auprès de Kkiapay que la transaction est payée, pour ce portfolio, et renvoie le montant (FCFA). */
async function verifyPayment(transactionId: string, portfolioId: string): Promise<number> {
  if (!/^[\w-]{1,64}$/.test(transactionId)) throw new HttpError(400, 'Transaction invalide.')
  const host = process.env.VITE_KKIAPAY_SANDBOX === 'true' ? 'api-sandbox' : 'api'
  const res = await fetch(`https://${host}.kkiapay.me/api/v1/transactions/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env('VITE_KKIAPAY_PUBLIC_KEY'),
      'x-private-key': env('KKIAPAY_PRIVATE_KEY'),
      'x-secret-key': env('KKIAPAY_SECRET_KEY'),
    },
    body: JSON.stringify({ transactionId }),
  })
  // Clés absentes ou erronées, Kkiapay indisponible : erreur serveur (visible dans les logs Vercel), pas un refus de paiement.
  if (!res.ok) throw new Error(`Kkiapay ${res.status} : ${await res.text().catch(() => '')}`)
  type Transaction = { status?: string; amount?: number; partnerId?: unknown }
  const tx = (await res.json().catch(() => ({}))) as Transaction
  const amount = Number(tx.amount)
  if (tx.status !== 'SUCCESS' || !(amount >= PRICE)) throw new HttpError(402, 'Paiement non confirmé par Kkiapay.')
  // Kkiapay peut renvoyer partnerId vide : on ne refuse que s'il désigne un autre portfolio.
  if (tx.partnerId && tx.partnerId !== portfolioId) throw new HttpError(409, 'Ce paiement a été fait pour un autre portfolio.')
  return amount
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
