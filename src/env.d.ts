/// <reference types="vite/client" />
import 'vue-router'

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_PROMO_FROM?: string
    readonly VITE_PROMO_UNTIL?: string
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    auth?: boolean
    admin?: boolean
    guest?: boolean
  }
}
