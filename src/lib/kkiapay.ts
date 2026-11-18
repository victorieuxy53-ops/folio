// Fenêtre de paiement Kkiapay (Mobile Money + carte bancaire).
// Test ou réel : VITE_KKIAPAY_SANDBOX=true avec les clés de test, false avec les clés réelles.
let loader: Promise<void> | null = null

function load() {
  loader ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.kkiapay.me/k.js'
    script.onload = () => resolve()
    script.onerror = () => {
      loader = null
      script.remove()
      reject(new Error('Le module de paiement ne répond pas. Vérifiez votre connexion.'))
    }
    document.head.append(script)
  })
  return loader
}

/**
 * Ouvre la fenêtre de paiement ; `done` est appelé avec l'identifiant de transaction si le paiement réussit.
 * La transaction porte l'identifiant du portfolio (partnerId) : le serveur refuse de l'utiliser pour un autre.
 */
export async function pay(
  options: { amount: number; name: string; email: string; portfolioId: string },
  done: (transactionId: string) => void,
) {
  await load()
  // Un seul écouteur à la fois : chaque appel remplace le précédent.
  window.addSuccessListener?.(({ transactionId }) => {
    window.closeKkiapayWidget?.()
    if (transactionId) done(String(transactionId))
  })
  window.openKkiapayWidget?.({
    amount: options.amount,
    key: import.meta.env.VITE_KKIAPAY_PUBLIC_KEY,
    sandbox: import.meta.env.VITE_KKIAPAY_SANDBOX === 'true',
    name: options.name.trim(),
    email: options.email,
    partnerId: options.portfolioId,
    position: 'center',
  })
}
