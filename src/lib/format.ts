export const num = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
export const fcfa = (n: number) => `${num(n)} FCFA`
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
export const dateTime = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const host = (url: string) => url.replace(/^https?:\/\//, '')
