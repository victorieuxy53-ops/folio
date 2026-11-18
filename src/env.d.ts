/// <reference types="vite/client" />
import 'vue-router'

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_KKIAPAY_PUBLIC_KEY: string
    readonly VITE_KKIAPAY_SANDBOX?: string
    readonly VITE_PROMO_UNTIL?: string
  }
  // Fonctions ajoutées par https://cdn.kkiapay.me/k.js
  interface Window {
    openKkiapayWidget?: (options: Record<string, unknown>) => void
    closeKkiapayWidget?: () => void
    addSuccessListener?: (listener: (response: { transactionId?: string }) => void) => void
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    auth?: boolean
    admin?: boolean
    guest?: boolean
  }
}
