import { createRouter, createWebHistory } from 'vue-router'
import { authReady, ensureProfile, isAdmin, session } from './lib/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/Home.vue') },
    { path: '/auth', component: () => import('./pages/Auth.vue'), meta: { guest: true } },
    { path: '/app', component: () => import('./pages/Dashboard.vue'), meta: { auth: true } },
    { path: '/app/:id', component: () => import('./pages/Editor.vue'), meta: { auth: true }, props: true },
    { path: '/admin', component: () => import('./pages/Admin.vue'), meta: { admin: true } },
    { path: '/:path(.*)*', component: () => import('./pages/NotFound.vue') },
  ],
  scrollBehavior: (to, _from, saved) => saved ?? (to.hash ? { el: to.hash, behavior: 'smooth' } : { top: 0 }),
})

router.beforeEach(async (to) => {
  await authReady
  if (!session.value && (to.meta.auth || to.meta.admin)) return { path: '/auth', query: { next: to.fullPath } }
  if (to.meta.admin) {
    await ensureProfile()
    if (!isAdmin.value) return '/app'
  }
  // Exception : /auth?mode=update sert à choisir un nouveau mot de passe une fois connecté.
  if (to.meta.guest && session.value && to.query.mode !== 'update') return '/app'
})
