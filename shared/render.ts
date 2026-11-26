// Transforme un portfolio en une page HTML autonome : HTML + CSS + un petit script sans dépendance.
// Utilisé pour l'aperçu en direct (navigateur) et pour le site déployé (serveur).
import { BRAND, FONTS, SOCIALS, type Content, type Experience, type PortfolioData, type Project, type TemplateId } from './portfolio.js'

interface Link { label: string; url: string }
interface Ctx {
  c: Content
  name: string
  bio: string
  photo: string
  email: string
  /** Numéro WhatsApp, chiffres uniquement. */
  wa: string
  cv: string
  roles: string[]
  sk: string[]
  socials: Link[]
  /** Sections présentes, dans l'ordre du menu. */
  nav: Link[]
  xp: Experience[]
  edu: Experience[]
  pj: Project[]
  st: Content['stats']
  sv: Content['services']
  /** Captures d'écran d'avis clients. */
  rw: string[]
}
interface Layout { css: string; body: string }

// --- Sécurité : tout texte saisi est échappé, toute URL est filtrée ---------
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)
const href = (u: string) => {
  const v = u.trim()
  if (/^(https?:\/\/|mailto:|tel:)\S+$/i.test(v)) return v
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v) ? `https://${v}` : ''
}
const secure = (u: string) => (/^https:\/\/\S+$/i.test(u.trim()) ? u.trim() : '')
const paras = (s: string) => s.trim().split(/\n\s*\n/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('')
const inline = (s: string) => esc(s.trim()).replace(/\n/g, '<br>')
const initials = (s: string) => s.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase()
const pad = (n: number) => String(n).padStart(2, '0')

// --- Icônes (tracés Lucide, licence ISC) -------------------------------------
const ICONS = {
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  pin: '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  arrow: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  down: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
}
const ic = (n: keyof typeof ICONS) =>
  `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`

// --- Fragments communs aux modèles -------------------------------------------
const desc = (s: string) => (s.trim() ? `<p class="mu">${inline(s)}</p>` : '')
const section = (id: string, cls: string, inner: string) => `<section id="${id}" class="${cls}">${inner}</section>`
const head = (title: string, eyebrow = '') => `<div class="sh rv">${eyebrow ? `<p class="eb">${eyebrow}</p>` : ''}<h2>${title}</h2></div>`
const prose = (x: Ctx) => (x.bio ? `<div class="prose">${paras(x.bio)}</div>` : '')

const avatar = (x: Ctx) =>
  x.photo
    ? `<img class="av" src="${esc(x.photo)}" alt="${esc(x.name)}">`
    : `<div class="av ini" role="img" aria-label="${esc(x.name)}">${esc(initials(x.name))}</div>`

/** Le nom, dernier mot mis en valeur. */
const named = (x: Ctx) => {
  const w = x.name.split(/\s+/)
  return w.length > 1 ? `${esc(w.slice(0, -1).join(' '))} <span class="hl">${esc(w.at(-1)!)}</span>` : `<span class="hl">${esc(x.name)}</span>`
}

/** Les métiers qui s'écrivent tour à tour ; à défaut, la phrase d'accroche. */
const tagline = (x: Ctx) =>
  x.roles.length
    ? `<span class="sr">${esc(x.roles.join(', '))}</span><span class="ty" aria-hidden="true" data-words="${esc(JSON.stringify(x.roles))}">${esc(x.roles[0]!)}</span>`
    : esc(x.c.headline.trim())
/** La phrase d'accroche, quand elle ne sert pas déjà de titre. */
const intro = (x: Ctx, d: number) => (x.roles.length && x.c.headline.trim() ? `<p class="intro rv" style="--d:${d}">${esc(x.c.headline.trim())}</p>` : '')
const avail = (x: Ctx) => (x.c.available ? '<p class="avail rv"><i></i>Disponible pour de nouveaux projets</p>' : '')
const reach = (x: Ctx) => !!(x.email || x.wa)
const ctas = (x: Ctx, d: number) => {
  const b = (reach(x) ? `<a class="btn" href="#contact">Me contacter ${ic('right')}</a>` : '') +
    (x.cv ? `<a class="btn alt" href="${esc(x.cv)}" target="_blank" rel="noopener">${ic('down')} Télécharger mon CV</a>` : '')
  return b && `<div class="ctas rv" style="--d:${d}">${b}</div>`
}

const header = (x: Ctx, brand: string) => {
  const links = x.nav.map((n) => `<a href="#${n.url}">${n.label}</a>`).join('')
  const cta = reach(x) ? '<a class="btn sm" href="#contact">Me contacter</a>' : ''
  return `<header class="hd"><a class="brand" href="#top">${brand}</a>${links || cta
    ? `<nav class="mn spy" aria-label="Menu">${links}${cta}</nav><button class="burger" type="button" aria-label="Menu" aria-expanded="false"><span></span></button>`
    : ''}</header>`
}

const stats = (x: Ctx) =>
  x.st.length ? `<div class="stats">${x.st.map((s, i) => `<div class="stat rv" style="--d:${i}"><strong class="num">${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join('')}</div>` : ''

const tags = (x: Ctx) => (x.sk.length ? `<ul class="tags">${x.sk.map((s, i) => `<li class="tag rv" style="--d:${i % 8}">${esc(s)}</li>`).join('')}</ul>` : '')

/** Bandeau défilant sans fin (le contenu est doublé pour boucler). */
const marquee = (items: string[], cls = '') => {
  if (!items.length) return ''
  const row = Array.from({ length: Math.ceil(12 / items.length) }, () => items).flat()
  const ul = (hidden: boolean) => `<ul${hidden ? ' aria-hidden="true"' : ''}>${row.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
  return `<div class="mq ${cls}"><div class="mq-t">${ul(false)}${ul(true)}</div></div>`
}

const services = (x: Ctx) =>
  `<div class="svc">${x.sv.map((s, i) => `<article class="sv rv" style="--d:${i}"><span class="sv-n">${pad(i + 1)}</span><h3>${esc(s.title)}</h3>${desc(s.text)}</article>`).join('')}</div>`

const timeline = (list: Experience[]) =>
  `<ol class="tl">${list.map((e, i) => `<li class="rv" style="--d:${i}">${e.period.trim() ? `<p class="pd">${esc(e.period)}</p>` : ''}<h4>${esc(e.role)}</h4>${e.org.trim() ? `<p class="org">${esc(e.org)}</p>` : ''}${desc(e.text)}</li>`).join('')}</ol>`
const career = (x: Ctx) =>
  `<div class="cols">${x.xp.length ? `<div><h3 class="sub">Expérience</h3>${timeline(x.xp)}</div>` : ''}${x.edu.length ? `<div><h3 class="sub">Formation</h3>${timeline(x.edu)}</div>` : ''}</div>`

const filters = (x: Ctx) => {
  const cats = [...new Set(x.pj.map((p) => p.category.trim()).filter(Boolean))]
  return cats.length > 1
    ? `<div class="flt rv" role="group" aria-label="Filtrer les projets"><button type="button" class="on" aria-pressed="true" data-f="">Tous</button>${cats.map((c) => `<button type="button" aria-pressed="false" data-f="${esc(c)}">${esc(c)}</button>`).join('')}</div>`
    : ''
}
/** Visuel du projet (agrandissable) ou, sans image, une couverture générée aux couleurs du site. */
const cover = (p: Project, i: number) => {
  const img = secure(p.image)
  return img
    ? `<a class="cover zoom" href="${esc(img)}" aria-label="Agrandir : ${esc(p.title)}"><img src="${esc(img)}" alt="${esc(p.title)}" loading="lazy"></a>`
    : `<div class="cover ph" style="--a:${(i * 67 + 120) % 360}deg;--x:${(i * 37 + 15) % 80}%;--y:${(i * 29 + 5) % 60}%;--k:${[34, 18, 44, 26][i % 4]}%" aria-hidden="true"><span>${esc(p.title.trim() || 'Projet')}</span></div>`
}
const projectCards = (x: Ctx, cls = '') =>
  x.pj.map((p, i) => {
    const url = href(p.url)
    return `<article class="pc rv ${cls}" style="--d:${i % 3}" data-c="${esc(p.category.trim())}">${cover(p, i)}<div class="pb">${p.category.trim() ? `<p class="cat">${esc(p.category)}</p>` : ''}<h3>${esc(p.title)}</h3>${desc(p.text)}${url ? `<a class="more" href="${esc(url)}" target="_blank" rel="noopener">Voir le projet ${ic('arrow')}</a>` : ''}</div></article>`
  }).join('')
const projects = (x: Ctx, grid = 'pjg') => `${filters(x)}<div class="${grid}">${projectCards(x)}</div>`

/** Avis clients : captures d'écran en mosaïque, agrandies au clic. */
const reviews = (x: Ctx) =>
  `<div class="rws rv">${x.rw.map((u, i) => `<a class="rw zoom" href="${esc(u)}" aria-label="Agrandir l’avis client ${i + 1}"><img src="${esc(u)}" alt="Avis client ${i + 1}" loading="lazy"></a>`).join('')}</div>`

const coords = (x: Ctx) => {
  const row = (icon: keyof typeof ICONS, label: string, value: string, url = '') =>
    `<li><i>${ic(icon)}</i><span><small>${label}</small>${url ? `<a href="${esc(url)}"${url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(value)}</a>` : esc(value)}</span></li>`
  return `<ul class="co">${x.email ? row('mail', 'E-mail', x.email, `mailto:${x.email}`) : ''}${x.wa ? row('chat', 'WhatsApp', x.c.phone.trim(), `https://wa.me/${x.wa}`) : ''}${x.c.location.trim() ? row('pin', 'Localisation', x.c.location.trim()) : ''}</ul>`
}
const socials = (x: Ctx) =>
  x.socials.length ? `<div class="so">${x.socials.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</div>` : ''
/** Formulaire qui prépare le message dans la messagerie ou WhatsApp du visiteur (aucun serveur requis). */
const form = (x: Ctx) => `<form class="cf rv" data-mail="${esc(x.email)}" data-wa="${x.wa}">
<div class="cf-2"><label><span>Votre nom</span><input name="n" required autocomplete="name"></label><label><span>Votre e-mail</span><input name="e" type="email" autocomplete="email"></label></div>
<label><span>Objet</span><input name="s"></label>
<label><span>Message</span><textarea name="m" rows="5" required></textarea></label>
<div class="cf-a">${x.email ? `<button class="btn" value="mail">${ic('mail')} Envoyer par e-mail</button>` : ''}${x.wa ? `<button class="btn${x.email ? ' alt' : ''}" value="wa">${ic('chat')} Envoyer sur WhatsApp</button>` : ''}</div>
<p class="cf-ok" role="status"></p></form>`

/** Halo lumineux qui suit la souris sur les cartes. */
const glow = (sel: string) => {
  const all = (suffix: string) => sel.split(',').map((s) => s + suffix).join(',')
  return `${sel}{position:relative;isolation:isolate}${all('::before')}{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),color-mix(in srgb,var(--ac) 18%,transparent),transparent 65%);opacity:0;transition:opacity .4s}${all(':hover::before')}{opacity:1}`
}

const BASE = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;scroll-padding-top:5.5rem}
body{background:var(--bg);color:var(--fg);font-family:var(--bf);font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-wrap:break-word;overflow-x:clip}
h1,h2,h3,h4{font-family:var(--hf);line-height:1.12;letter-spacing:-.02em;font-weight:700;text-wrap:balance}
p{text-wrap:pretty}
a{color:inherit;text-underline-offset:3px}
img{display:block;max-width:100%}
ol,ul{list-style:none}
button,input,textarea{font:inherit;color:inherit}
[hidden]{display:none!important}
::selection{background:var(--ac);color:var(--on)}
:focus-visible{outline:2px solid var(--ac);outline-offset:3px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.mu{color:var(--mu)}
.ic{width:1.1em;height:1.1em;flex-shrink:0}
.wrap{width:min(100% - 3rem,1160px);margin-inline:auto}
.brand{position:relative;z-index:2;margin-right:auto;font-family:var(--hf);font-weight:700;font-size:1.15rem;text-decoration:none;letter-spacing:-.01em}
.brand b,.hl{color:var(--ac)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;padding:.9rem 1.5rem;border-radius:var(--rb,999px);border:1px solid transparent;background:var(--ac);color:var(--on);font-weight:600;font-size:.95rem;line-height:1.2;text-decoration:none;cursor:pointer;transition:transform .25s,box-shadow .25s,border-color .25s,color .25s}
.btn:hover{transform:translateY(-2px);box-shadow:0 14px 30px -12px color-mix(in srgb,var(--ac) 75%,transparent)}
.btn.alt{background:transparent;color:var(--fg);border-color:var(--ln)}
.btn.alt:hover{border-color:var(--ac);box-shadow:none}
.btn.sm{padding:.6rem 1.15rem;font-size:.875rem}
.ctas{display:flex;flex-wrap:wrap;gap:.75rem}
.av{object-fit:cover}
.ini{display:grid;place-items:center;background:radial-gradient(circle at 30% 25%,color-mix(in srgb,#fff 28%,var(--ac)),var(--ac) 70%);color:var(--on);font-family:var(--hf);font-weight:700;letter-spacing:-.03em}
.avail{display:inline-flex;align-items:center;gap:.6rem;padding:.45rem 1rem .45rem .85rem;border-radius:999px;border:1px solid var(--ln);background:var(--card);font-size:.85rem;font-weight:500}
.avail i{position:relative;width:8px;height:8px;border-radius:50%;background:#22c55e}
.avail i::after{content:"";position:absolute;inset:0;border-radius:50%;background:#22c55e;animation:ping 1.8s cubic-bezier(0,0,.2,1) infinite}
.ty::after{content:"";display:inline-block;width:2px;height:.95em;margin-left:.1em;background:currentColor;vertical-align:-.1em;animation:blink 1s steps(1) infinite}
.hd{position:fixed;inset:0 0 auto;z-index:50;display:flex;align-items:center;gap:1rem;padding:1.1rem max(1.5rem,calc((100% - 1160px)/2));transition:background .3s,padding .3s,box-shadow .3s}
.scrolled .hd{padding-block:.7rem;background:color-mix(in srgb,var(--bg) 84%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 1px 0 var(--ln)}
.mn{display:flex;align-items:center;gap:.15rem}
.mn a:not(.btn){position:relative;padding:.5rem .8rem;font-size:.925rem;font-weight:500;color:var(--mu);text-decoration:none;transition:color .2s}
.mn a:not(.btn):hover,.mn a.on{color:var(--fg)}
.mn a:not(.btn)::after{content:"";position:absolute;left:.8rem;right:.8rem;bottom:.2rem;height:2px;border-radius:2px;background:var(--ac);transform:scaleX(0);transition:transform .3s}
.mn a.on::after{transform:scaleX(1)}
.mn .btn{margin-left:.85rem}
.burger{display:none;position:relative;z-index:2;width:44px;height:44px;border:1px solid var(--ln);border-radius:12px;background:var(--bg);cursor:pointer}
.burger span,.burger span::before,.burger span::after{content:"";position:absolute;left:12px;right:12px;height:2px;border-radius:2px;background:var(--fg);transition:transform .3s,background .3s}
.burger span{top:50%;margin-top:-1px}.burger span::before{left:0;right:0;top:-6px}.burger span::after{left:0;right:0;top:6px}
.menu .burger span{background:transparent}.menu .burger span::before{transform:translateY(6px) rotate(45deg)}.menu .burger span::after{transform:translateY(-6px) rotate(-45deg)}
.menu{overflow:hidden}.menu .hd{-webkit-backdrop-filter:none;backdrop-filter:none}
@media(max-width:860px){.burger{display:block}.mn{position:fixed;inset:0;z-index:1;flex-direction:column;justify-content:center;gap:.5rem;background:var(--bg);opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}.menu .mn{opacity:1;visibility:visible}.mn a:not(.btn){font-family:var(--hf);font-size:1.6rem;color:var(--fg)}.mn .btn{margin:1rem 0 0}}
.sh{margin-bottom:clamp(2.25rem,5vw,3.5rem)}
.eb{font-size:.8rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--ac)}
.sh h2{font-size:clamp(2rem,4.4vw,3rem)}
.sub{margin-bottom:1.5rem;font-family:var(--bf);font-size:.8rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mu)}
.prose p+p{margin-top:1em}
.prose p{color:var(--mu)}
.prose p:first-child{color:var(--fg)}
.tags{display:flex;flex-wrap:wrap;gap:.5rem}
.tag{padding:.45rem 1rem;border-radius:999px;background:var(--soft);font-size:.875rem;font-weight:500;transition:background .25s,color .25s}
.tag:hover{background:var(--ac);color:var(--on)}
.mq{display:flex;overflow:hidden;-webkit-mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.mq-t{display:flex;flex-shrink:0;animation:mq 45s linear infinite}
.mq.rev .mq-t{animation-direction:reverse}
.mq:hover .mq-t{animation-play-state:paused}
.mq ul{display:flex;flex-shrink:0;gap:.6rem;padding-right:.6rem}
.mq li{white-space:nowrap}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:1rem}
.stat strong{display:block;font-family:var(--hf);font-size:clamp(2.3rem,4.5vw,3.4rem);line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.stat span{display:block;margin-top:.55rem;font-size:.95rem;color:var(--mu)}
.svc{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:1.25rem}
.sv{padding:2rem;border-radius:var(--rc,22px);border:1px solid var(--ln);background:var(--card);transition:transform .35s var(--ease),border-color .35s}
.sv:hover{transform:translateY(-6px);border-color:color-mix(in srgb,var(--ac) 45%,var(--ln))}
.sv-n{display:inline-grid;place-items:center;width:3rem;height:3rem;margin-bottom:1.5rem;border-radius:14px;background:var(--soft);color:var(--ac);font-family:var(--hf);font-weight:700}
.sv h3{margin-bottom:.5rem;font-size:1.25rem}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:3rem 4rem}
.tl{display:grid;gap:2rem;padding-left:1.75rem;border-left:2px solid var(--ln)}
.tl li{position:relative}
.tl li::before{content:"";position:absolute;left:calc(-1.75rem - 8px);top:.3rem;width:14px;height:14px;border-radius:50%;border:3px solid var(--ac);background:var(--bg)}
.pd{font-size:.85rem;font-weight:500;color:var(--mu)}
.tl h4{margin-top:.15rem;font-size:1.15rem}
.org{font-size:.95rem;font-weight:600;color:var(--ac)}
.tl .mu{margin-top:.35rem}
.flt{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:2rem}
.flt button{padding:.55rem 1.15rem;border:1px solid var(--ln);border-radius:var(--rb,999px);background:none;font-size:.9rem;font-weight:500;color:var(--mu);cursor:pointer;transition:all .25s}
.flt button:hover{color:var(--fg);border-color:var(--fg)}
.flt .on,.flt .on:hover{background:var(--fg);border-color:var(--fg);color:var(--bg)}
.pjg{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:1.5rem}
.pc{display:flex;flex-direction:column;overflow:hidden;border-radius:var(--rc,22px);border:1px solid var(--ln);background:var(--card);transition:transform .4s var(--ease),box-shadow .4s,border-color .4s}
.pc:hover{transform:translateY(-6px);border-color:color-mix(in srgb,var(--ac) 40%,var(--ln));box-shadow:0 30px 60px -30px color-mix(in srgb,var(--fg) 35%,transparent)}
.cover{position:relative;display:block;aspect-ratio:16/10;overflow:hidden;background:var(--soft)}
.cover img{width:100%;height:100%;object-fit:cover;transition:scale .7s var(--ease)}
.pc:hover .cover img{scale:1.06}
a.cover{cursor:zoom-in}
a.cover::after{content:"+";position:absolute;right:1rem;bottom:1rem;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--ac);color:var(--on);font-size:1.5rem;font-weight:300;opacity:0;scale:.6;transition:opacity .3s,scale .3s}
.pc:hover a.cover::after,a.cover:focus-visible::after{opacity:1;scale:1}
.ph{display:grid;place-items:center;padding:1.5rem;text-align:center;background:linear-gradient(var(--a,135deg),color-mix(in srgb,var(--ac) var(--k,30%),var(--bg)),color-mix(in srgb,var(--fg) 7%,var(--bg)))}
.ph::before,.ph::after{content:"";position:absolute;aspect-ratio:1;border-radius:50%;pointer-events:none;transition:scale .9s var(--ease)}
.ph::before{top:var(--y,10%);left:var(--x,20%);width:80%;translate:-50% -50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--ac) 65%,transparent),transparent)}
.ph::after{right:calc(var(--x,20%) - 14%);bottom:-22%;width:46%;border:1.5px solid color-mix(in srgb,var(--fg) 16%,transparent)}
.pc:hover .ph::before{scale:1.18}.pc:hover .ph::after{scale:.88}
.ph span{position:relative;font-family:var(--hf);font-size:clamp(1.4rem,2.6vw,2.1rem);font-weight:700;line-height:1.05;letter-spacing:-.03em;transition:scale .7s var(--ease)}
.pc:hover .ph span{scale:1.07}
.pb{display:flex;flex:1;flex-direction:column;gap:.4rem;padding:1.4rem 1.5rem 1.6rem}
.cat{font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ac)}
.pb h3{font-size:1.25rem}
.more{display:inline-flex;align-items:center;gap:.4rem;margin-top:auto;padding-top:.6rem;font-weight:600;color:var(--ac);text-decoration:none}
.more .ic{transition:translate .25s}.more:hover .ic{translate:3px -3px}
.rws{columns:4 150px;column-gap:1rem}
.rw{display:block;break-inside:avoid;margin-bottom:1rem;overflow:hidden;border-radius:var(--rc,18px);border:1px solid var(--ln);background:var(--card);cursor:zoom-in;transition:translate .3s var(--ease),box-shadow .3s}
.rw:hover{translate:0 -4px;box-shadow:0 18px 40px -18px rgb(0 0 0/.4)}
.rw img{width:100%;height:auto}
.ct-g{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(2rem,5vw,4.5rem);align-items:start}
.co{display:grid;gap:1.1rem;margin:2rem 0}
.co li{display:flex;align-items:center;gap:1rem}
.co i{display:grid;place-items:center;flex-shrink:0;width:48px;height:48px;border-radius:14px;background:var(--soft);color:var(--ac)}
.co small{display:block;font-size:.8rem;color:var(--mu)}
.co a{font-weight:600;text-decoration:none}.co a:hover{color:var(--ac)}
.so{display:flex;flex-wrap:wrap;gap:.5rem}
.so a{padding:.5rem 1rem;border:1px solid var(--ln);border-radius:999px;font-size:.875rem;font-weight:500;text-decoration:none;transition:border-color .25s,color .25s}
.so a:hover{border-color:var(--ac);color:var(--ac)}
.cf{display:grid;gap:1rem;padding:clamp(1.5rem,3vw,2.25rem);border-radius:var(--rc,24px);border:1px solid var(--ln);background:var(--card)}
.cf-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.cf label>span{display:block;margin-bottom:.4rem;font-size:.85rem;font-weight:600}
.cf input,.cf textarea{width:100%;padding:.85rem 1rem;border:1px solid var(--ln);border-radius:12px;background:var(--bg);outline:none;resize:vertical;transition:border-color .2s,box-shadow .2s}
.cf input:focus,.cf textarea:focus{border-color:var(--ac);box-shadow:0 0 0 4px color-mix(in srgb,var(--ac) 18%,transparent)}
.cf-a{display:flex;flex-wrap:wrap;gap:.75rem}
.cf-ok{font-size:.9rem;color:var(--mu)}.cf-ok:empty{display:none}
.ft{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem 1.5rem;padding:2rem max(1.5rem,calc((100% - 1160px)/2));border-top:1px solid var(--ln);font-size:.875rem;color:var(--mu)}
.ft a{color:var(--fg)}
.prog{position:fixed;inset:0 0 auto;z-index:60;height:3px;background:var(--ac);transform:scaleX(0);transform-origin:0 50%}
.top{position:fixed;right:1.25rem;bottom:1.25rem;z-index:40;display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:var(--ac);color:var(--on);box-shadow:0 12px 30px -10px color-mix(in srgb,var(--ac) 80%,transparent);opacity:0;translate:0 14px;pointer-events:none;transition:opacity .3s,translate .3s}
.far .top{opacity:1;translate:none;pointer-events:auto}
.lb{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:4vmin;background:rgb(0 0 0/.85);opacity:0;visibility:hidden;cursor:zoom-out;transition:opacity .3s,visibility .3s}
.lb.open{opacity:1;visibility:visible}
.lb img{max-height:100%;border-radius:12px;box-shadow:0 30px 80px rgb(0 0 0/.5);scale:.95;transition:scale .35s var(--ease)}
.lb.open img{scale:1}
.lb button{position:absolute;top:1rem;right:1rem;width:44px;height:44px;border:0;border-radius:50%;background:#fff;color:#111;font-size:1.1rem;cursor:pointer}
.js:not(.still) .rv{transition:opacity .9s var(--ease),translate .9s var(--ease),scale .9s var(--ease);transition-delay:calc(var(--d,0)*90ms)}
.js:not(.still) .rv:not(.in){opacity:0;translate:0 32px}
.js:not(.still) .rv.l:not(.in){translate:-48px 0}
.js:not(.still) .rv.z:not(.in){translate:none;scale:.9}
.js:not(.still) .rv.up:not(.in){opacity:1;translate:none}
.js:not(.still) .rv.up>*{transition:translate 1.1s var(--ease);transition-delay:calc(var(--d,0)*110ms)}
.js:not(.still) .rv.up:not(.in)>*{translate:0 110%}
@keyframes ping{75%,to{transform:scale(2.6);opacity:0}}
@keyframes blink{50%{opacity:0}}
@keyframes mq{to{translate:-50% 0}}
@media(max-width:760px){.ct-g{grid-template-columns:1fr}}
@media(max-width:520px){.cf-2{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;transition-delay:0s!important}}
@media print{.hd,.prog,.top,.cf{display:none}.rv,.rv>*{opacity:1!important;translate:none!important}}
`

// --- Comportements de la page (aucune dépendance) ---------------------------
// Menu mobile, défilement doux, section active, apparitions, compteurs, texte tapé,
// filtres et zoom des projets, formulaire de contact, fond animé.
const RUNTIME = String.raw`(() => {
const d = document, h = d.documentElement, still = h.classList.contains('still')
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
const $$ = (s, r = d) => [...r.querySelectorAll(s)]
const IO = window.IntersectionObserver

const prog = d.querySelector('.prog')
const onScroll = () => {
  const y = scrollY, max = h.scrollHeight - innerHeight
  if (prog) prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')'
  h.classList.toggle('scrolled', y > 30)
  h.classList.toggle('far', y > innerHeight * .8)
}
addEventListener('scroll', onScroll, { passive: true })
onScroll()

const burger = d.querySelector('.burger'), lb = d.querySelector('.lb')
const menu = open => { h.classList.toggle('menu', open); if (burger) burger.setAttribute('aria-expanded', open) }
const closeLb = () => lb && lb.classList.remove('open')
if (burger) burger.addEventListener('click', () => menu(!h.classList.contains('menu')))
addEventListener('keydown', e => { if (e.key === 'Escape') { menu(false); closeLb() } })

d.addEventListener('click', e => {
  const z = e.target.closest('a.zoom')
  if (z && lb) {
    e.preventDefault()
    const img = lb.querySelector('img')
    img.src = z.href
    img.alt = z.getAttribute('aria-label') || ''
    lb.classList.add('open')
    lb.querySelector('button').focus()
    return
  }
  if (lb && e.target.closest('.lb')) return closeLb()
  const a = e.target.closest('a[href^="#"]')
  if (!a) return
  const id = a.getAttribute('href').slice(1), el = id && id !== 'top' ? d.getElementById(id) : null
  if (id !== 'top' && !el) return
  e.preventDefault()
  menu(false)
  const behavior = calm ? 'auto' : 'smooth'
  el ? el.scrollIntoView({ behavior }) : scrollTo({ top: 0, behavior })
})

// Section active dans le menu : la dernière dont le haut a passé le tiers de l'écran.
const spyLinks = $$('.spy a[href^="#"]')
const targets = [...new Set(spyLinks.map(a => d.getElementById(a.getAttribute('href').slice(1))))].filter(Boolean)
let spyFrame = 0
const spy = () => {
  spyFrame = 0
  let cur = null, best = -Infinity
  const bottom = innerHeight + scrollY >= h.scrollHeight - 4
  for (const s of targets) {
    const top = s.getBoundingClientRect().top
    if ((top < innerHeight * .35 || bottom) && top > best) { best = top; cur = s }
  }
  spyLinks.forEach(a => a.classList.toggle('on', !!cur && a.getAttribute('href') === '#' + cur.id))
}
if (targets.length) { addEventListener('scroll', () => { if (!spyFrame) spyFrame = requestAnimationFrame(spy) }, { passive: true }); spy() }

const count = el => {
  const m = el.textContent.match(/^(\D*)(\d+)([\s\S]*)$/)
  if (!m) return
  const n = +m[2], len = m[2][0] === '0' ? m[2].length : 0, t0 = performance.now()
  const step = t => {
    const k = Math.min(1, (t - t0) / 1800)
    el.textContent = m[1] + String(Math.round(n * (1 - Math.pow(1 - k, 4)))).padStart(len, '0') + m[3]
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
// Une fois apparu, l'élément retrouve ses propres transitions (survol…).
const reveal = el => {
  const done = e => {
    if (e.target !== el && e.target.parentNode !== el) return
    el.removeEventListener('transitionend', done)
    el.classList.remove('rv')
  }
  el.addEventListener('transitionend', done)
  el.classList.add('in')
  if (!calm) $$('.num', el).forEach(count)
}
const items = $$('.rv')
if (still || !IO) items.forEach(el => el.classList.add('in'))
else {
  const ro = new IO(es => es.forEach(e => { if (e.isIntersecting) { ro.unobserve(e.target); reveal(e.target) } }), { threshold: .1, rootMargin: '0px 0px -6% 0px' })
  items.forEach(el => ro.observe(el))
  // Filet de sécurité (défilement très rapide, saut vers une ancre) : tout ce qui a déjà atteint l'écran apparaît.
  let rest = items, t = 0
  addEventListener('scroll', () => {
    clearTimeout(t)
    t = setTimeout(() => {
      rest = rest.filter(el => {
        if (el.classList.contains('in')) return false
        if (el.getBoundingClientRect().top > innerHeight) return true
        ro.unobserve(el)
        reveal(el)
        return false
      })
    }, 150)
  }, { passive: true })
}

$$('.ty').forEach(el => {
  let words
  try { words = JSON.parse(el.dataset.words).map(w => [...w]) } catch (_) { return }
  if (words.length < 2 || calm) return
  let i = 0, n = words[0].length, dir = -1, wait = 2200
  const step = () => {
    if (wait) { const t = wait; wait = 0; return setTimeout(step, t) }
    n += dir
    el.textContent = words[i].slice(0, n).join('')
    if (dir < 0 && !n) { i = (i + 1) % words.length; dir = 1; wait = 300 }
    else if (dir > 0 && n === words[i].length) { dir = -1; wait = 2200 }
    setTimeout(step, dir < 0 ? 40 : 85)
  }
  step()
})

$$('.flt').forEach(f => f.addEventListener('click', e => {
  const b = e.target.closest('button')
  if (!b) return
  $$('button', f).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b) })
  $$('[data-c]').forEach(c => {
    const was = c.hidden
    c.hidden = !!b.dataset.f && c.dataset.c !== b.dataset.f
    if (was && !c.hidden && !calm && c.animate) c.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,.7,.3,1)' })
  })
}))

$$('form.cf').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault()
  const v = k => f.querySelector('[name=' + k + ']').value.trim()
  const wa = (e.submitter ? e.submitter.value : f.dataset.mail ? 'mail' : 'wa') === 'wa'
  const who = v('n') + (v('e') ? ' (' + v('e') + ')' : '')
  const body = v('m') + (who ? '\n\n— ' + who : '')
  if (wa) open('https://wa.me/' + f.dataset.wa + '?text=' + encodeURIComponent((v('s') ? '*' + v('s') + '*\n\n' : '') + body), '_blank', 'noopener')
  else location.href = 'mailto:' + f.dataset.mail + '?subject=' + encodeURIComponent(v('s') || 'Prise de contact') + '&body=' + encodeURIComponent(body)
  f.querySelector('.cf-ok').textContent = wa ? 'WhatsApp s’ouvre avec votre message.' : 'Votre messagerie s’ouvre avec votre message prêt à partir.'
}))

d.addEventListener('pointermove', e => {
  const g = e.target.closest && e.target.closest('.pc,.sv,.cd')
  if (!g) return
  const r = g.getBoundingClientRect()
  g.style.setProperty('--mx', e.clientX - r.left + 'px')
  g.style.setProperty('--my', e.clientY - r.top + 'px')
}, { passive: true })

$$('[data-y]').forEach(el => { el.textContent = new Date().getFullYear() })

const cv = d.querySelector('canvas.fx')
if (cv && cv.getContext) {
  const g = cv.getContext('2d'), cs = getComputedStyle(h)
  const fg = cs.getPropertyValue('--fg').trim(), ac = cs.getPropertyValue('--ac').trim()
  let w = 0, ht = 0, dots = [], raf = 0, on = true
  const size = () => {
    const r = devicePixelRatio || 1
    w = cv.offsetWidth; ht = cv.offsetHeight; cv.width = w * r; cv.height = ht * r
    g.setTransform(r, 0, 0, r, 0, 0)
    dots = Array.from({ length: Math.min(90, Math.round(w * ht / 15000)) }, () => ({ x: Math.random() * w, y: Math.random() * ht, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: Math.random() * 1.5 + .5 }))
  }
  const draw = () => {
    g.clearRect(0, 0, w, ht)
    g.fillStyle = fg
    for (const p of dots) {
      p.x = (p.x + p.vx + w) % w; p.y = (p.y + p.vy + ht) % ht
      g.globalAlpha = .6; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill()
    }
    g.strokeStyle = ac; g.lineWidth = .7
    for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
      const a = dots[i], b = dots[j], dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist < 130) { g.globalAlpha = (1 - dist / 130) * .4; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke() }
    }
    if (on && !calm) raf = requestAnimationFrame(draw)
  }
  size(); draw()
  addEventListener('resize', () => { size(); if (calm) draw() })
  if (IO) new IO(([e]) => { on = e.isIntersecting; cancelAnimationFrame(raf); if (on && !calm) raf = requestAnimationFrame(draw) }).observe(cv)
}
})()`

// --- Les 6 mises en page -----------------------------------------------------
const LAYOUTS: Record<TemplateId, (x: Ctx) => Layout> = {
  // Plein écran animé : particules, photo à halo, compteurs, cartes.
  vitrine: (x) => {
    const st0 = x.st[0]
    return {
      css: `.hero{position:relative;display:flex;align-items:center;min-height:100svh;padding:7.5rem 0 6rem;overflow:hidden;isolation:isolate}
.fx{position:absolute;inset:0;z-index:-1;width:100%;height:100%;opacity:.6}
.hero::before,.hero::after{content:"";position:absolute;z-index:-2;aspect-ratio:1;border-radius:50%;filter:blur(80px);animation:drift 16s ease-in-out infinite alternate}
.hero::before{top:6%;right:-8%;width:min(560px,70vw);background:var(--ac);opacity:.28}
.hero::after{bottom:-12%;left:-10%;width:min(440px,60vw);background:color-mix(in srgb,var(--ac) 50%,var(--fg));opacity:.14;animation-duration:22s}
@keyframes drift{to{translate:-50px 60px;scale:1.15}}
.hero-g{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(2.5rem,6vw,5rem);align-items:center}
.hi{margin-top:1.5rem;font-size:clamp(1.05rem,2vw,1.3rem);font-weight:500;color:var(--mu)}
.hero h1{margin-top:.35rem;font-size:clamp(2.8rem,7vw,5.4rem);line-height:1.02;letter-spacing:-.035em}
.hero .hl{background:linear-gradient(100deg,var(--ac),color-mix(in srgb,var(--ac) 45%,var(--fg)));-webkit-background-clip:text;background-clip:text;color:transparent}
.role{min-height:1.3em;margin-top:1rem;font-family:var(--hf);font-size:clamp(1.35rem,3vw,2rem);font-weight:600}
.role .ty{color:var(--ac)}
.intro{max-width:34rem;margin-top:1rem;font-size:1.1rem;color:var(--mu)}
.hero .ctas{margin-top:2.25rem}
.hero-p{position:relative;justify-self:center}
@property --ang{syntax:"<angle>";inherits:false;initial-value:0deg}
.ring{position:relative;width:min(360px,72vw);aspect-ratio:4/5;padding:5px;border-radius:999px;background:conic-gradient(from var(--ang),var(--ac),transparent 30%,var(--ac) 50%,transparent 80%,var(--ac));animation:spin 7s linear infinite}
.ring::after{content:"";position:absolute;inset:12%;z-index:-1;border-radius:inherit;background:var(--ac);filter:blur(60px);opacity:.45}
@keyframes spin{to{--ang:360deg}}
.ring .av{width:100%;height:100%;border:6px solid var(--bg);border-radius:inherit}
.ring .ini{font-size:clamp(4rem,10vw,6.5rem)}
.chip{position:absolute;display:flex;align-items:center;gap:.65rem;padding:.75rem 1.1rem;border:1px solid var(--ln);border-radius:16px;background:color-mix(in srgb,var(--bg) 82%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 20px 40px -20px color-mix(in srgb,var(--fg) 45%,transparent);font-size:.85rem;font-weight:600;line-height:1.25;animation:bob 5s ease-in-out infinite}
.chip .ic{color:var(--ac)}
.chip b{font-family:var(--hf);font-size:1.6rem;line-height:1;color:var(--ac)}
.c1{bottom:12%;left:-14%}.c2{top:10%;right:-12%;animation-delay:-2.5s;max-width:12rem}
@keyframes bob{50%{translate:0 -10px}}
.cue{position:absolute;bottom:1.75rem;left:50%;width:26px;height:42px;margin-left:-13px;border:2px solid var(--ln);border-radius:20px}
.cue::after{content:"";position:absolute;top:8px;left:50%;width:4px;height:8px;margin-left:-2px;border-radius:4px;background:var(--ac);animation:cue 1.8s ease-in-out infinite}
@keyframes cue{60%{translate:0 12px;opacity:0}to{opacity:0}}
.stb{position:relative;z-index:2;margin-top:-3.5rem}
.stb .stats{gap:0;padding:clamp(1.75rem,4vw,2.5rem) 1rem;border-radius:28px;background:radial-gradient(120% 140% at 0% 0%,rgb(255 255 255/.18),transparent 55%),var(--ac);color:var(--on);box-shadow:0 30px 70px -30px color-mix(in srgb,var(--ac) 85%,transparent)}
.stb .stat{padding:.5rem 1.5rem;text-align:center}
.stb .stat+.stat{border-left:1px solid color-mix(in srgb,var(--on) 22%,transparent)}
.stb .stat span{color:inherit;opacity:.82}
.sec{padding:clamp(5rem,10vw,7.5rem) 0}
.sec:nth-of-type(odd){background:var(--card)}
.sh{text-align:center}
.sh h2{margin-top:.5rem}
.sh h2::after{content:"";display:block;width:56px;height:4px;margin:1.1rem auto 0;border-radius:4px;background:var(--ac)}
.ab{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:clamp(2rem,5vw,4rem);align-items:start}
.ab:has(>:only-child){grid-template-columns:minmax(0,46rem);justify-content:center}
.ab .prose{font-size:1.1rem}
.ab .prose p:first-child{font-size:1.3rem;font-weight:500}
.facts{padding:2rem;border:1px solid var(--ln);border-radius:24px;background:var(--bg)}
.tl{gap:1rem;padding:0;border:0}
.tl li{padding:1.5rem 1.75rem;border:1px solid var(--ln);border-left:3px solid var(--ac);border-radius:18px;background:var(--bg)}
.tl li::before{display:none}
.sec:nth-of-type(even) .tl li,.sec:nth-of-type(even) .sv,.sec:nth-of-type(even) .pc{background:var(--card)}
.sec:nth-of-type(odd) .sv,.sec:nth-of-type(odd) .pc,.sec:nth-of-type(odd) .cf{background:var(--bg)}
.sv-n{border-radius:50%;background:var(--ac);color:var(--on)}
.flt{justify-content:center}
.ct-g .sh{text-align:left}.ct-g .sh h2::after{margin-left:0}
.ct-g .lead{color:var(--mu);font-size:1.1rem}
${glow('.sv,.pc')}
@media(max-width:900px){.hero{padding-top:6.5rem}.hero-g{grid-template-columns:1fr;text-align:center}.hero-p{order:-1}.ring{width:min(210px,54vw)}.intro{margin-inline:auto}.hero .ctas{justify-content:center}.ab{grid-template-columns:1fr}.c1{left:-22%}.c2{right:-22%}}
@media(max-width:700px){.stb .stats{grid-template-columns:1fr 1fr;gap:1.5rem 0}.stb .stat:nth-child(odd){border-left:0}.cue{display:none}}
@media(max-width:520px){.chip{display:none}}`,
      body: `${header(x, `${esc(x.name)}<b>.</b>`)}
<main>
<section class="hero"><canvas class="fx" aria-hidden="true"></canvas><div class="wrap hero-g">
<div>${avail(x)}<p class="hi rv" style="--d:1">Bonjour, je m’appelle</p><h1 class="rv" style="--d:2">${named(x)}</h1>${tagline(x) ? `<p class="role rv" style="--d:3">${x.roles.length ? 'Je suis ' : ''}${tagline(x)}</p>` : ''}${intro(x, 4)}${ctas(x, 5)}</div>
<div class="hero-p rv z" style="--d:2"><div class="ring">${avatar(x)}</div>${x.c.location.trim() ? `<p class="chip c1">${ic('pin')} ${esc(x.c.location.trim())}</p>` : ''}${st0 ? `<p class="chip c2"><b>${esc(st0.value)}</b> ${esc(st0.label)}</p>` : ''}</div>
</div>${!x.st.length && x.nav[0] ? `<a class="cue" href="#${x.nav[0].url}" aria-label="Découvrir la suite"></a>` : ''}</section>
${x.st.length ? `<div class="wrap stb">${stats(x)}</div>` : ''}
${x.bio || x.sk.length ? section('a-propos', 'sec', `<div class="wrap">${head('À propos de moi', 'Qui suis-je ?')}<div class="ab">${x.bio ? `<div class="rv">${prose(x)}</div>` : ''}${x.sk.length ? `<div class="facts rv" style="--d:1"><h3 class="sub">Compétences</h3>${tags(x)}</div>` : ''}</div></div>`) : ''}
${x.sv.length ? section('services', 'sec', `<div class="wrap">${head('Mes services', 'Ce que je propose')}${services(x)}</div>`) : ''}
${x.xp.length || x.edu.length ? section('parcours', 'sec', `<div class="wrap">${head('Mon parcours', 'Expérience & formation')}${career(x)}</div>`) : ''}
${x.pj.length ? section('projets', 'sec', `<div class="wrap">${head('Mes réalisations', 'Projets')}${projects(x)}</div>`) : ''}
${x.rw.length ? section('avis', 'sec', `<div class="wrap">${head('Ils me font confiance', 'Avis clients')}${reviews(x)}</div>`) : ''}
${reach(x) ? section('contact', 'sec', `<div class="wrap ct-g"><div>${head('Travaillons ensemble', 'Contact')}<p class="lead rv">Un projet, une mission, une question ? Écrivez-moi, je vous réponds rapidement.</p>${coords(x)}${socials(x)}</div>${form(x)}</div>`) : ''}
</main>`,
    }
  },

  // Mise en page de magazine : grande typographie, sections numérotées en deux colonnes.
  minimal: (x) => {
    let k = 0
    const label = (t: string) => `<div class="sh rv"><p class="eb">${pad(++k)}</p><h2>${t}</h2></div>`
    return {
      css: `.hero{padding:clamp(8rem,16vw,11rem) 0 clamp(3.5rem,7vw,5rem)}
.meta{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1.5rem;font-size:.95rem;color:var(--mu)}
.meta .ic{color:var(--ac)}.meta span{display:inline-flex;align-items:center;gap:.4rem}
.hero h1{margin-top:2rem;font-size:clamp(3.2rem,10.5vw,8.6rem);line-height:.95;letter-spacing:-.05em}
.hero-b{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3rem;align-items:end;margin-top:3rem;padding-top:2.5rem;border-top:1px solid var(--ln)}
.role{max-width:24ch;font-family:var(--hf);font-size:clamp(1.4rem,3vw,2.1rem);font-weight:500;line-height:1.25}
.role .ty{color:var(--ac)}
.intro{max-width:36rem;margin-top:1rem;font-size:1.1rem;color:var(--mu)}
.hero .ctas{margin-top:2rem}
.pf{width:clamp(190px,23vw,290px);aspect-ratio:4/5;overflow:hidden;border-radius:20px}
.pf .av{width:100%;height:100%;transition:scale .8s var(--ease)}.pf:hover .av{scale:1.05}
.pf .ini{font-size:5rem}
.stw{border-block:1px solid var(--ln)}
.stw .stats{gap:0}
.stw .stat{padding:2.5rem 1.5rem}
.stw .stat+.stat{border-left:1px solid var(--ln)}
.sec{padding:clamp(4.5rem,9vw,7rem) 0;border-bottom:1px solid var(--ln)}
.ed{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.6fr);gap:2rem clamp(2rem,6vw,5rem)}
.ed>.sh{position:sticky;top:6.5rem;align-self:start;margin:0}
.eb{font-family:var(--mono);font-size:.9rem;letter-spacing:0}
.sh h2{margin-top:.4rem;font-size:clamp(1.6rem,3vw,2.2rem)}
.big-p .prose p:first-child{font-family:var(--hf);font-size:clamp(1.35rem,2.6vw,1.95rem);line-height:1.35;letter-spacing:-.01em}
.big-p .tags{margin-top:2.5rem}
.tag{border:1px solid var(--ln);background:none}
.svc{display:block}
.sv{display:grid;grid-template-columns:3.5rem minmax(0,1fr) minmax(0,1.3fr);gap:1.5rem;align-items:baseline;padding:1.75rem 0;border:0;border-top:1px solid var(--ln);border-radius:0;background:none;transition:padding .35s var(--ease)}
.sv:last-child{border-bottom:1px solid var(--ln)}
.sv:hover{transform:none;padding-left:.75rem}
.sv-n{width:auto;height:auto;margin:0;background:none;font-family:var(--mono);font-size:.9rem;font-weight:500}
.sv h3{margin:0;font-size:clamp(1.25rem,2.4vw,1.6rem)}
.cols{grid-template-columns:1fr}
.tl{gap:0;padding:0;border:0}
.tl li{display:grid;grid-template-columns:10rem minmax(0,1fr);column-gap:1.5rem;padding:1.4rem 0;border-top:1px solid var(--ln)}
.tl li::before{display:none}
.tl li>*{grid-column:2}
.tl .pd{grid-column:1;grid-row:1/span 3;padding-top:.2rem}
.pjg{grid-template-columns:repeat(2,minmax(0,1fr));gap:3rem 2rem}
.pc{overflow:visible;border:0;border-radius:0;background:none}
.pc:hover{transform:none;box-shadow:none}
.cover{aspect-ratio:4/3;border-radius:16px}
.pb{padding:1.25rem 0 0}
.pb h3{font-size:1.45rem}
.ct{padding:clamp(5rem,10vw,8rem) 0}
.ct .eb{display:block;margin-bottom:1rem}
.ct h2{font-size:clamp(2.6rem,8vw,6.4rem);line-height:.98;letter-spacing:-.045em}
.mail{display:inline-flex;align-items:center;gap:.6rem;margin-top:2rem;padding-bottom:.3rem;border-bottom:2px solid currentColor;font-family:var(--hf);font-size:clamp(1.2rem,3vw,2rem);font-weight:600;color:var(--ac);text-decoration:none}
.mail .ic{transition:translate .3s}.mail:hover .ic{translate:4px -4px}
.ct-g{margin-top:4rem}
@media(max-width:860px){.ed{grid-template-columns:1fr}.ed>.sh{position:static}.hero-b{grid-template-columns:1fr}.pf{order:-1;width:170px}}
@media(max-width:640px){.pjg{grid-template-columns:1fr}.sv{grid-template-columns:2.5rem minmax(0,1fr)}.sv>.mu{grid-column:2}.tl li{grid-template-columns:1fr}.tl .pd{grid-column:auto;grid-row:auto}.tl li>*{grid-column:1}.stw .stats{grid-template-columns:1fr 1fr}.stw .stat:nth-child(odd){border-left:0}.stw .stat:nth-child(n+3){border-top:1px solid var(--ln)}}`,
      body: `${header(x, esc(x.name))}
<main>
<section class="hero"><div class="wrap">
<div class="meta rv">${avail(x)}${x.c.location.trim() ? `<span>${ic('pin')} ${esc(x.c.location.trim())}</span>` : ''}</div>
<h1 class="rv" style="--d:1">${named(x)}</h1>
<div class="hero-b"><div>${tagline(x) ? `<p class="role rv" style="--d:2">${tagline(x)}</p>` : ''}${intro(x, 3)}${ctas(x, 4)}</div><div class="pf rv z" style="--d:2">${avatar(x)}</div></div>
</div></section>
${x.st.length ? `<div class="stw"><div class="wrap">${stats(x)}</div></div>` : ''}
${x.bio || x.sk.length ? section('a-propos', 'sec', `<div class="wrap ed">${label('À propos')}<div class="big-p rv">${prose(x)}${tags(x)}</div></div>`) : ''}
${x.sv.length ? section('services', 'sec', `<div class="wrap ed">${label('Services')}${services(x)}</div>`) : ''}
${x.xp.length || x.edu.length ? section('parcours', 'sec', `<div class="wrap ed">${label('Parcours')}${career(x)}</div>`) : ''}
${x.pj.length ? section('projets', 'sec', `<div class="wrap ed">${label('Projets')}<div>${projects(x)}</div></div>`) : ''}
${x.rw.length ? section('avis', 'sec', `<div class="wrap ed">${label('Avis clients')}${reviews(x)}</div>`) : ''}
${reach(x) ? section('contact', 'ct', `<div class="wrap"><p class="eb rv">${pad(++k)} — Contact</p><h2 class="rv">Parlons de<br>votre projet.</h2>${x.email ? `<a class="mail rv" href="mailto:${esc(x.email)}">${esc(x.email)} ${ic('arrow')}</a>` : ''}<div class="ct-g"><div>${coords(x)}${socials(x)}</div>${form(x)}</div></div>`) : ''}
</main>`,
    }
  },

  // Profil et menu fixes à gauche, contenu détaillé à droite.
  sidebar: (x) => ({
    css: `.lay{display:grid;grid-template-columns:330px minmax(0,1fr);min-height:100vh}
.side{position:sticky;top:0;display:flex;flex-direction:column;gap:2rem;height:100vh;padding:2.5rem 2rem;overflow-y:auto;border-right:1px solid var(--ln);background:var(--soft)}
.side .av{width:104px;height:104px;border-radius:50%;box-shadow:0 0 0 4px var(--bg),0 0 0 6px var(--ac)}
.side .ini{font-size:2.4rem}
.side h1{margin-top:1.5rem;font-size:1.75rem}
.side .role{min-height:1.65em;margin-top:.3rem;font-weight:600;color:var(--ac)}
.side .avail{margin-top:1rem;border-radius:14px;background:var(--bg);line-height:1.4}
.sn{display:grid;gap:.15rem}
.sn a{display:flex;align-items:center;gap:.9rem;padding:.6rem .75rem;border-radius:10px;font-weight:500;color:var(--mu);text-decoration:none;transition:color .2s,background .2s}
.sn a::before{content:"";width:18px;height:2px;border-radius:2px;background:currentColor;opacity:.5;transition:width .3s,opacity .3s,background .3s}
.sn a:hover,.sn a.on{background:var(--bg);color:var(--fg)}
.sn a.on::before{width:32px;background:var(--ac);opacity:1}
.side .ctas{flex-direction:column}
.side .btn{width:100%}
.side .so{margin-top:auto}
.side .so a{background:var(--bg)}
.mainc{width:100%;max-width:980px;padding:clamp(3rem,6vw,5.5rem) clamp(1.5rem,5vw,5rem)}
.hero .eb{display:block}
.hero h2{max-width:22ch;margin-top:.75rem;font-size:clamp(2rem,4.4vw,3.1rem);line-height:1.12}
.hero .prose{max-width:44rem;margin-top:1.5rem;font-size:1.075rem}
.hero .tags{margin-top:2rem}
.stats{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:2.5rem}
.stat{padding:1.4rem;border:1px solid var(--ln);border-radius:18px;background:var(--card)}
.stat strong{font-size:2.3rem;color:var(--ac)}
.blk{padding-top:clamp(3.5rem,7vw,5rem)}
.sh h2{display:flex;align-items:center;gap:.9rem;font-size:clamp(1.6rem,3vw,2.1rem)}
.sh h2::before{content:"";flex-shrink:0;width:28px;height:4px;border-radius:4px;background:var(--ac)}
.pjg{grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))}
.ct-card{padding:clamp(1.5rem,4vw,2.5rem);border-radius:28px;background:var(--soft)}
.ct-card .cf{background:var(--bg)}
.ct-card .co{margin-top:0}
.ct-card .co i{background:var(--bg)}
.hd{display:none}
@media(max-width:1000px){.hd{display:flex}.lay{display:block}.side{position:static;align-items:center;height:auto;padding:6.5rem 1.5rem 2.5rem;border-right:0;text-align:center}.side .av{margin-inline:auto}.sn{display:none}.side .so{justify-content:center;margin-top:0}.side .ctas{flex-direction:row;justify-content:center}.side .btn{width:auto}}`,
    body: `${header(x, esc(x.name))}
<div class="lay"><aside class="side">
<div class="rv">${avatar(x)}<h1>${esc(x.name)}</h1>${tagline(x) ? `<p class="role">${tagline(x)}</p>` : ''}${x.c.available ? '<p class="avail"><i></i>Disponible pour de nouveaux projets</p>' : ''}</div>
${x.nav.length ? `<nav class="sn spy rv" style="--d:1" aria-label="Sections">${[...x.nav, ...(reach(x) ? [{ label: 'Contact', url: 'contact' }] : [])].map((n) => `<a href="#${n.url}">${n.label}</a>`).join('')}</nav>` : ''}
${ctas(x, 2)}
${socials(x)}
</aside><main class="mainc">
<section${x.bio || x.sk.length ? ' id="a-propos"' : ''} class="hero"><p class="eb rv">Bonjour, je suis ${esc(x.name.split(/\s+/)[0] ?? '')}</p>${x.c.headline.trim() ? `<h2 class="rv" style="--d:1">${esc(x.c.headline.trim())}</h2>` : ''}${x.bio ? `<div class="rv" style="--d:2">${prose(x)}</div>` : ''}${tags(x)}${stats(x)}</section>
${x.sv.length ? section('services', 'blk', head('Services') + services(x)) : ''}
${x.xp.length || x.edu.length ? section('parcours', 'blk', head('Parcours') + career(x)) : ''}
${x.pj.length ? section('projets', 'blk', head('Projets') + projects(x)) : ''}
${x.rw.length ? section('avis', 'blk', head('Avis clients') + reviews(x)) : ''}
${reach(x) ? section('contact', 'blk', `${head('Contact')}<div class="ct-card ct-g"><div>${coords(x)}<p class="mu">Disponible pour échanger sur vos projets. Réponse sous 24 h.</p></div>${form(x)}</div>`) : ''}
</main></div>`,
  }),

  // Titre géant qui se dévoile, bandeau défilant, lignes de projets façon agence.
  bold: (x) => ({
    css: `.hero{position:relative;display:flex;flex-direction:column;justify-content:flex-end;min-height:100svh;padding:8rem 0 3.5rem;overflow:hidden;isolation:isolate}
.blob{position:absolute;z-index:-1;width:46vmax;aspect-ratio:1;border-radius:50%;background:var(--ac);filter:blur(90px);opacity:.3;animation:blob 18s ease-in-out infinite alternate}
.b1{top:-14vmax;left:-12vmax}
.b2{right:-14vmax;bottom:-18vmax;background:color-mix(in srgb,var(--ac) 40%,var(--fg));opacity:.14;animation-duration:24s;animation-direction:alternate-reverse}
@keyframes blob{50%{translate:12vw 8vh;scale:1.15}to{translate:4vw 18vh;scale:.9}}
.eye{display:flex;flex-wrap:wrap;align-items:center;gap:1rem 1.5rem;font-family:var(--hf);font-size:clamp(1.1rem,2.2vw,1.5rem);font-weight:600}
.eye .ty{color:var(--ac)}
.giant{margin-top:1.5rem;font-size:clamp(3.6rem,14vw,12.5rem);line-height:.88;letter-spacing:-.055em}
.ln{display:block;overflow:hidden;padding-bottom:.08em}
.ln>span{display:inline-block}
.ln:last-child:not(:first-child)>span{color:var(--ac)}
.hero-f{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:2rem;margin-top:3rem}
.hero-f .intro{max-width:30rem;font-size:1.15rem;color:var(--mu)}
.hero-f .ctas{margin-top:1.5rem}
.hero-f .av{width:clamp(120px,14vw,170px);height:auto;aspect-ratio:1;border-radius:28px;rotate:4deg;transition:rotate .5s var(--ease)}
.hero-f .av:hover{rotate:0deg}
.hero-f .ini{font-size:3rem}
.band-w{padding:2.5rem 0;overflow:hidden}
.band{margin-inline:-5%;padding:1.2rem 0;background:var(--ac);color:var(--on);rotate:-2deg;-webkit-mask:none;mask:none}
.band ul{gap:2.5rem;padding-right:2.5rem}
.band li{display:flex;align-items:center;gap:2.5rem;font-family:var(--hf);font-size:clamp(1.4rem,3vw,2.4rem);font-weight:700;letter-spacing:-.02em}
.band li::after{content:"✦";font-size:.6em;opacity:.7}
.stats{gap:2rem;padding-top:2.5rem}
.stat{padding-top:1.25rem;border-top:2px solid var(--fg)}
.stat strong{font-size:clamp(3rem,7vw,5.5rem);color:var(--ac)}
.sec{padding:clamp(5rem,11vw,8.5rem) 0}
.sh{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:1rem}
.sh h2{font-size:clamp(2.6rem,7vw,5.5rem);line-height:.95;letter-spacing:-.045em}
.eb{order:2;font-family:var(--mono);font-size:.95rem;letter-spacing:0;text-transform:none}
.stmt .prose p:first-child{max-width:none;font-family:var(--hf);font-size:clamp(1.6rem,3.6vw,2.8rem);font-weight:600;line-height:1.2;letter-spacing:-.025em}
.stmt .prose p{max-width:52rem;font-size:1.15rem}
.stmt .tags{margin-top:2.5rem}
.svc{display:block;border-top:1px solid var(--ln)}
.sv{position:relative;isolation:isolate;display:grid;grid-template-columns:5rem minmax(0,1.2fr) minmax(0,1fr);gap:1.5rem;align-items:center;padding:2.25rem 1.25rem;overflow:hidden;border:0;border-bottom:1px solid var(--ln);border-radius:0;background:none;transition:color .4s}
.sv::after{content:"";position:absolute;inset:0;z-index:-1;background:var(--ac);transform:scaleY(0);transform-origin:bottom;transition:transform .5s var(--ease)}
.sv:hover{transform:none;color:var(--on)}
.sv:hover::after{transform:scaleY(1)}
.sv:hover .mu,.sv:hover .sv-n{color:inherit}
.sv-n{width:auto;height:auto;margin:0;background:none;font-family:var(--mono);font-weight:500}
.sv h3{margin:0;font-size:clamp(1.5rem,3.4vw,2.6rem);letter-spacing:-.03em}
.pjl{counter-reset:p;border-top:1px solid var(--ln)}
.pjl .pc{display:grid;grid-template-columns:4rem minmax(0,1fr) minmax(0,1.1fr);gap:2.5rem;align-items:center;padding:2.5rem 0;overflow:visible;border:0;border-bottom:1px solid var(--ln);border-radius:0;background:none}
.pjl .pc::before{content:counter(p,decimal-leading-zero);counter-increment:p;font-family:var(--mono);font-weight:600;color:var(--ac)}
.pjl .pc:hover{transform:none;box-shadow:none}
.pjl .pb{order:1;padding:0}
.pjl .pb h3{font-size:clamp(1.8rem,4vw,3.2rem);line-height:1;letter-spacing:-.035em}
.pjl .cover{order:2;border-radius:20px}
.cols{grid-template-columns:1fr}
.tl{gap:0;padding:0;border:0}
.tl li{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto;column-gap:1.5rem;align-items:baseline;padding:1.6rem 0;border-top:1px solid var(--ln)}
.tl li::before{display:none}
.tl h4{grid-row:1;grid-column:1;font-size:clamp(1.2rem,2.4vw,1.6rem)}
.tl .org{grid-row:1;grid-column:2}
.tl .pd{grid-row:1;grid-column:3}
.tl .mu{grid-column:1/-1}
.cta h2{font-size:clamp(3rem,11vw,9rem);line-height:.9;letter-spacing:-.055em}
.cta h2 span{color:var(--ac)}
.mail{display:inline-flex;align-items:center;gap:.6rem;margin-top:2.5rem;font-family:var(--hf);font-size:clamp(1.3rem,3.4vw,2.4rem);font-weight:600;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:10px}
.mail:hover{color:var(--ac)}
.cta .ct-g{margin-top:4rem}
@media(max-width:800px){.sv{grid-template-columns:3rem minmax(0,1fr)}.sv>.mu{grid-column:2}.pjl .pc{grid-template-columns:1fr;gap:1.25rem}.pjl .pc::before{display:none}.pjl .cover{order:0}.tl li{grid-template-columns:1fr}.tl h4,.tl .org,.tl .pd{grid-row:auto;grid-column:1}}`,
    body: `${header(x, `${esc(x.name)}<b>*</b>`)}
<main>
<section class="hero"><span class="blob b1"></span><span class="blob b2"></span><div class="wrap">
<div class="eye rv">${avail(x)}${tagline(x) ? `<span>${tagline(x)}</span>` : ''}</div>
<h1 class="giant">${x.name.split(/\s+/).map((w, i) => `<span class="ln rv up" style="--d:${i + 1}"><span>${esc(w)}</span></span>`).join('')}</h1>
<div class="hero-f"><div>${intro(x, 3)}${ctas(x, 4)}</div><div class="rv z" style="--d:3">${avatar(x)}</div></div>
</div></section>
${x.sk.length ? `<div class="band-w" aria-label="Compétences">${marquee(x.sk, 'band')}</div>` : ''}
${x.st.length ? `<div class="wrap">${stats(x)}</div>` : ''}
${x.bio || x.sk.length ? section('a-propos', 'sec', `<div class="wrap">${head('À propos', '(01)')}<div class="stmt rv">${x.bio ? prose(x) : tags(x)}</div></div>`) : ''}
${x.sv.length ? section('services', 'sec', `<div class="wrap">${head('Services', `(${pad(x.sv.length)})`)}${services(x)}</div>`) : ''}
${x.pj.length ? section('projets', 'sec', `<div class="wrap">${head('Projets', `(${pad(x.pj.length)})`)}${projects(x, 'pjl')}</div>`) : ''}
${x.xp.length || x.edu.length ? section('parcours', 'sec', `<div class="wrap">${head('Parcours')}${career(x)}</div>`) : ''}
${x.rw.length ? section('avis', 'sec', `<div class="wrap">${head('Ils en parlent')}${reviews(x)}</div>`) : ''}
${reach(x) ? section('contact', 'sec cta', `<div class="wrap"><h2 class="rv">Travaillons<br><span>ensemble.</span></h2>${x.email ? `<a class="mail rv" href="mailto:${esc(x.email)}">${esc(x.email)} ${ic('arrow')}</a>` : ''}<div class="ct-g"><div>${coords(x)}${socials(x)}</div>${form(x)}</div></div>`) : ''}
</main>`,
  }),

  // Grille de cartes façon tableau de bord, halo lumineux au survol.
  bento: (x) => ({
    css: `.hd{top:1rem;right:0;left:0;width:min(100% - 2rem,1200px);margin-inline:auto;padding:.55rem .55rem .55rem 1.4rem;border:1px solid var(--ln);border-radius:999px;background:color-mix(in srgb,var(--bg) 78%,transparent);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
.scrolled .hd{padding:.55rem .55rem .55rem 1.4rem;box-shadow:0 14px 40px -24px color-mix(in srgb,var(--fg) 50%,transparent)}
.mn .btn{margin-left:.5rem}
.bt{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-flow:dense;gap:1rem;width:min(100% - 2rem,1200px);margin:6.5rem auto 1rem}
.cd{min-width:0;padding:clamp(1.5rem,2.6vw,2.25rem);border:1px solid var(--ln);border-radius:28px;background:var(--card)}
.s2{grid-column:span 2}.s3{grid-column:span 3}.s4{grid-column:1/-1}.r2{grid-row:span 2}
.lab{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;font-size:.75rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mu)}
.hero{display:flex;flex-direction:column;justify-content:flex-end;min-height:440px;background:radial-gradient(120% 120% at 100% 0%,color-mix(in srgb,var(--ac) 22%,transparent),transparent 55%),var(--card)}
.hero .avail{align-self:flex-start;margin-bottom:auto;background:var(--bg)}
.hi{margin-top:2rem;color:var(--mu);font-weight:500}
.hero h1{margin-top:.3rem;font-size:clamp(2.6rem,6vw,4.8rem);line-height:1;letter-spacing:-.045em}
.role{margin-top:.75rem;font-family:var(--hf);font-size:clamp(1.2rem,2.4vw,1.6rem);font-weight:600}
.role .ty{color:var(--ac)}
.intro{max-width:36rem;margin-top:.75rem;color:var(--mu)}
.hero .ctas{margin-top:1.75rem}
.photo{position:relative;padding:0;overflow:hidden}
.photo .av{width:100%;height:100%;min-height:300px;transition:scale .8s var(--ease)}
.photo:hover .av{scale:1.04}
.photo .ini{font-size:5rem}
.photo .tagc{position:absolute;right:1rem;bottom:1rem;left:1rem;display:flex;align-items:center;gap:.5rem;padding:.65rem .9rem;border-radius:14px;background:color-mix(in srgb,var(--bg) 82%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-size:.875rem;font-weight:600}
.photo .tagc .ic{color:var(--ac)}
.stat strong{font-size:clamp(2.4rem,4vw,3.2rem);color:var(--ac)}
.cd .mq li{padding:.55rem 1.1rem;border-radius:999px;background:var(--soft);font-size:.9rem;font-weight:500}
.cd .mq+.mq{margin-top:.6rem}
.cd .svc{grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:1rem}
.cd .sv{background:var(--bg)}
.cd .tl li::before{background:var(--card)}
.bt .pjg{display:contents}
.bt .pc{grid-column:span 2;border-radius:28px}
.bt .flt{margin:0}
.cta{display:flex;flex-direction:column;border:0;background:var(--ac);color:var(--on)}
.cta h2{font-size:clamp(1.8rem,3.6vw,2.6rem)}
.cta .co i{background:color-mix(in srgb,var(--on) 14%,transparent);color:inherit}
.cta .co small{color:inherit;opacity:.75}
.cta .co a:hover{color:inherit;text-decoration:underline}
.cta .so{margin-top:auto}
.cta .so a{border-color:color-mix(in srgb,var(--on) 30%,transparent)}
.cta .so a:hover{border-color:currentColor;color:inherit}
.bt .cf{height:100%;border-radius:28px}
.ft{width:min(100% - 2rem,1200px);margin:0 auto;padding-inline:.5rem;border:0}
${glow('.cd,.bt .pc')}
@media(max-width:1000px){.bt{grid-template-columns:repeat(2,minmax(0,1fr))}.s3,.s4{grid-column:1/-1}}
@media(max-width:620px){.s2,.s3,.photo,.bt .pc,.ctw{grid-column:1/-1}.hero{min-height:0}.photo .av{min-height:260px}}`,
    body: `${header(x, esc(x.name))}
<main class="bt">
<section class="cd s3 r2 hero rv">${avail(x)}<p class="hi">Bonjour, je suis</p><h1>${esc(x.name)}</h1>${tagline(x) ? `<p class="role">${tagline(x)}</p>` : ''}${intro(x, 0)}${ctas(x, 0)}</section>
<div class="cd r2 photo rv z" style="--d:1">${avatar(x)}${x.c.location.trim() ? `<p class="tagc">${ic('pin')} ${esc(x.c.location.trim())}</p>` : ''}</div>
${x.st.map((s, i) => `<div class="cd stat rv" style="--d:${i}"><strong class="num">${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join('')}
${x.bio ? `<section id="a-propos" class="cd s2 rv"><p class="lab">À propos</p>${prose(x)}</section>` : ''}
${x.sk.length ? `<div${x.bio ? '' : ' id="a-propos"'} class="cd s2 rv" style="--d:1"><p class="lab">Compétences</p>${marquee(x.sk)}${marquee([...x.sk].reverse(), 'rev')}</div>` : ''}
${x.sv.length ? section('services', 'cd s4 rv', `<p class="lab">Ce que je propose</p>${services(x)}`) : ''}
${x.xp.length ? `<section id="parcours" class="cd ${x.edu.length ? 's2' : 's4'} rv"><p class="lab">Expérience</p>${timeline(x.xp)}</section>` : ''}
${x.edu.length ? `<section${x.xp.length ? '' : ' id="parcours"'} class="cd ${x.xp.length ? 's2' : 's4'} rv" style="--d:1"><p class="lab">Formation</p>${timeline(x.edu)}</section>` : ''}
${x.pj.length ? `<div id="projets" class="cd s4 rv"><p class="lab" style="margin:0">Projets · ${pad(x.pj.length)}</p>${filters(x) ? `<div style="margin-top:1.25rem">${filters(x)}</div>` : ''}</div><div class="pjg">${projectCards(x)}</div>` : ''}
${x.rw.length ? section('avis', 'cd s4 rv', `<p class="lab">Avis clients</p>${reviews(x)}`) : ''}
${reach(x) ? `<section id="contact" class="cd s2 cta rv"><p class="lab" style="color:inherit;opacity:.8">Contact</p><h2>Un projet en tête ?<br>Parlons-en.</h2>${coords(x)}${socials(x)}</section><div class="s2 ctw">${form(x)}</div>` : ''}
</main>`,
  }),

  // Esprit éditeur de code : terminal animé, numérotation, accents monospace.
  terminal: (x) => {
    let k = 0
    const label = (t: string) => head(t, `${pad(++k)}.`)
    const lines: string[] = [
      `<p class="cmd">whoami</p><div class="out who">${avatar(x)}<span><b>${esc(x.name)}</b>${x.c.headline.trim() ? `<br><span class="mu">${esc(x.c.headline.trim())}</span>` : ''}</span></div>`,
      ...(x.sk.length ? [`<p class="cmd">cat competences.txt</p><p class="out">[ ${x.sk.map((s) => `<span class="str">"${esc(s)}"</span>`).join(', ')} ]</p>`] : []),
      ...(x.c.location.trim() || x.c.available ? [`<p class="cmd">status</p><p class="out">${x.c.available ? '<span class="ok">●</span> Disponible pour de nouveaux projets' : ''}${x.c.available && x.c.location.trim() ? '<br>' : ''}${x.c.location.trim() ? `<span class="mu">~/${esc(x.c.location.trim())}</span>` : ''}</p>`] : []),
      '<p class="cmd"><span class="cur"></span></p>',
    ]
    return {
      css: `:root{--rc:14px;--rb:10px}
.mono{font-family:var(--mono)}
.hd .brand{font-family:var(--mono);font-size:1rem}
.mn{counter-reset:n}
.mn a:not(.btn)::before{content:counter(n,decimal-leading-zero) ".";counter-increment:n;margin-right:.35rem;font-family:var(--mono);font-size:.8em;color:var(--ac)}
.hero{position:relative;display:flex;align-items:center;min-height:100svh;padding:8rem 0 4rem;isolation:isolate}
.hero::before{content:"";position:absolute;inset:0;z-index:-1;background-image:linear-gradient(var(--ln) 1px,transparent 1px),linear-gradient(90deg,var(--ln) 1px,transparent 1px);background-size:48px 48px;-webkit-mask:radial-gradient(ellipse at 50% 35%,#000 5%,transparent 70%);mask:radial-gradient(ellipse at 50% 35%,#000 5%,transparent 70%)}
.hero-g{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(2.5rem,5vw,4.5rem);align-items:center}
.hi{margin-top:1.25rem;font-family:var(--mono);color:var(--ac)}
.hero h1{margin-top:.75rem;font-size:clamp(2.8rem,6.5vw,5rem);line-height:1.02;letter-spacing:-.04em}
.role{margin-top:1rem;font-family:var(--mono);font-size:clamp(1.05rem,2vw,1.35rem)}
.role b{color:var(--ac)}
.intro{max-width:34rem;margin-top:1.25rem;font-size:1.075rem;color:var(--mu)}
.hero .ctas{margin-top:2rem}
.win{overflow:hidden;border:1px solid var(--ln);border-radius:16px;background:color-mix(in srgb,var(--fg) 5%,var(--bg));box-shadow:0 40px 100px -40px color-mix(in srgb,var(--fg) 45%,transparent);font-family:var(--mono);font-size:.9rem}
.bar{display:flex;align-items:center;gap:.5rem;padding:.8rem 1rem;border-bottom:1px solid var(--ln);font-size:.78rem;color:var(--mu)}
.bar i{width:12px;height:12px;border-radius:50%;background:#ff5f57}.bar i:nth-child(2){background:#febc2e}.bar i:nth-child(3){background:#28c840}
.bar span{flex:1;padding-right:3.5rem;text-align:center}
.scr{display:grid;gap:.35rem;padding:1.4rem 1.5rem 1.6rem}
.js .scr .rv{transition-delay:calc(var(--d,0)*350ms)}
.cmd{color:var(--ac)}.cmd::before{content:"$ ";color:var(--mu)}
.out{margin-bottom:.9rem;line-height:1.7}
.who{display:flex;align-items:center;gap:.9rem}
.who .av{width:52px;height:52px;border-radius:12px}
.who .ini{font-size:1.1rem}
.str{color:var(--ac)}
.ok{color:#22c55e}
.cur{display:inline-block;width:.6em;height:1.1em;vertical-align:text-bottom;background:var(--ac);animation:blink 1s steps(1) infinite}
.stats .stat{padding:1.5rem;border:1px solid var(--ln);border-radius:14px;background:var(--card)}
.stat strong{font-family:var(--mono);font-size:clamp(2rem,4vw,2.8rem);letter-spacing:-.02em;color:var(--ac)}
.sec{padding:clamp(4.5rem,9vw,7rem) 0}
.sh{display:flex;align-items:center;gap:.9rem}
.sh::after{content:"";flex:1;max-width:320px;min-width:2rem;height:1px;background:var(--ln)}
.eb{font-family:var(--mono);font-size:1.05rem;letter-spacing:0;text-transform:none}
.sh h2{font-size:clamp(1.6rem,3.2vw,2.2rem)}
.ab{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:clamp(2.5rem,5vw,4.5rem);align-items:start}
.ab .prose{font-size:1.075rem}
.sk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem 1.25rem;margin-top:1.75rem;font-family:var(--mono);font-size:.9rem;color:var(--mu)}
.sk li::before{content:"▹ ";color:var(--ac)}
.pf{position:relative;width:min(300px,100%);justify-self:center}
.pf .av{position:relative;width:100%;aspect-ratio:1;border-radius:14px;filter:grayscale(.35);transition:filter .4s}
.pf:hover .av{filter:none}
.pf .ini{font-size:5rem}
.pf::after{content:"";position:absolute;inset:0;z-index:-1;border:2px solid var(--ac);border-radius:14px;translate:16px 16px;transition:translate .3s}
.pf:hover::after{translate:10px 10px}
.sv-n{display:block;width:auto;height:auto;margin-bottom:1.25rem;background:none;font-family:var(--mono);font-size:.95rem}
.sv-n::before{content:"// "}
.pd{font-family:var(--mono)}
.cat,.flt button{font-family:var(--mono);letter-spacing:0;text-transform:none}
.cat::before{content:"#"}
.ct{text-align:center}
.ct .sh{justify-content:center}.ct .sh::after{display:none}
.ct .lead{max-width:36rem;margin:0 auto;color:var(--mu);font-size:1.1rem}
.ct .ct-g{margin-top:3.5rem;text-align:left}
@media(max-width:900px){.hero-g,.ab{grid-template-columns:1fr}.pf{width:220px}}
@media(max-width:520px){.sk{grid-template-columns:1fr}}`,
      body: `${header(x, `<b>&lt;</b>${esc(x.name.split(/\s+/)[0] ?? '')}<b> /&gt;</b>`)}
<main>
<section class="hero"><div class="wrap hero-g">
<div>${avail(x)}<p class="hi rv" style="--d:1">// Bonjour, je suis</p><h1 class="rv" style="--d:2">${esc(x.name)}</h1>${tagline(x) ? `<p class="role rv" style="--d:3"><b>&gt;</b> ${tagline(x)}</p>` : ''}${intro(x, 4)}${ctas(x, 5)}</div>
<div class="win rv z" style="--d:3"><div class="bar"><i></i><i></i><i></i><span>~/portfolio — zsh</span></div><div class="scr">${lines.map((l, i) => `<div class="rv" style="--d:${i + 2}">${l}</div>`).join('')}</div></div>
</div></section>
${x.st.length ? `<div class="wrap">${stats(x)}</div>` : ''}
${x.bio || x.sk.length ? section('a-propos', 'sec', `<div class="wrap">${label('À propos')}<div class="ab"><div class="rv">${prose(x)}${x.sk.length ? `<ul class="sk">${x.sk.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}</div><div class="pf rv z" style="--d:1">${avatar(x)}</div></div></div>`) : ''}
${x.sv.length ? section('services', 'sec', `<div class="wrap">${label('Services')}${services(x)}</div>`) : ''}
${x.xp.length || x.edu.length ? section('parcours', 'sec', `<div class="wrap">${label('Parcours')}${career(x)}</div>`) : ''}
${x.pj.length ? section('projets', 'sec', `<div class="wrap">${label('Projets')}${projects(x)}</div>`) : ''}
${x.rw.length ? section('avis', 'sec', `<div class="wrap">${label('Avis clients')}${reviews(x)}</div>`) : ''}
${reach(x) ? section('contact', 'sec ct', `<div class="wrap">${head('Me contacter', `${pad(++k)}. Et maintenant ?`)}<p class="lead rv">Une opportunité, un projet ou simplement envie d’échanger ? Ma boîte de réception est ouverte.</p><div class="ct-g"><div>${coords(x)}${socials(x)}</div>${form(x)}</div></div>`) : ''}
</main>`,
    }
  },
}

const stack = (font: string) =>
  `'${font}',${font === 'JetBrains Mono' ? 'ui-monospace,monospace' : /Playfair|Fraunces/.test(font) ? 'Georgia,serif' : 'system-ui,sans-serif'}`

/** Couleur lisible (noir ou blanc) posée sur la couleur d'accent. */
function onColor(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? '#111111' : '#ffffff'
}

/**
 * Compteur de visites du site publié (absent de l'aperçu) : une fois par jour et par navigateur,
 * sans cookie ni donnée personnelle, via la fonction `track_visit` de Supabase.
 */
function tracker(track: { url: string; key: string }, slug: string): string {
  const config = JSON.stringify({ url: `${track.url.replace(/\/+$/, '')}/rest/v1/rpc/track_visit`, key: track.key, site: slug })
  return `<script>(c=>{if(navigator.webdriver)return;const day=new Date().toISOString().slice(0,10);try{if(localStorage.getItem('folio-visit')===day)return;localStorage.setItem('folio-visit',day)}catch{}fetch(c.url,{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({p_site:c.site})}).catch(()=>{})})(${config.replace(/</g, '\\u003c')})</script>\n`
}

export function renderPortfolio(p: PortfolioData, opts: { appUrl?: string; track?: { url: string; key: string } } = {}): string {
  const { content: c, theme: t } = p
  const name = c.name.trim() || 'Votre nom'
  const phone = c.phone.replace(/\D/g, '')
  const email = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(c.email.trim()) ? c.email.trim() : ''
  const filled = (...v: string[]) => v.some((s) => s.trim())
  const x: Ctx = {
    c,
    name,
    bio: c.bio.trim(),
    photo: secure(c.avatar),
    email,
    wa: phone.length >= 8 ? phone : '',
    cv: secure(c.cv),
    roles: c.roles.map((r) => r.trim()).filter(Boolean),
    sk: c.skills.map((s) => s.trim()).filter(Boolean),
    socials: (Object.keys(SOCIALS) as (keyof typeof SOCIALS)[]).map((k) => ({ label: SOCIALS[k], url: href(c.socials[k]) })).filter((l) => l.url),
    nav: [],
    xp: c.experiences.filter((e) => filled(e.role, e.org, e.text)),
    edu: c.education.filter((e) => filled(e.role, e.org, e.text)),
    pj: c.projects.filter((pr) => filled(pr.title, pr.text) || secure(pr.image)),
    st: c.stats.filter((s) => filled(s.value)),
    sv: c.services.filter((s) => filled(s.title, s.text)),
    rw: c.reviews.map((u) => secure(u)).filter(Boolean),
  }
  x.nav = [
    ...(x.bio || x.sk.length ? [{ label: 'À propos', url: 'a-propos' }] : []),
    ...(x.sv.length ? [{ label: 'Services', url: 'services' }] : []),
    ...(x.xp.length || x.edu.length ? [{ label: 'Parcours', url: 'parcours' }] : []),
    ...(x.pj.length ? [{ label: 'Projets', url: 'projets' }] : []),
  ]

  const layout = LAYOUTS[p.template](x)
  const on = onColor(t.accent)
  const f = FONTS[t.font]
  const mono = p.template === 'terminal'
  const families = [...new Set([f.heading, f.body])].map((n) => `family=${n.replace(/ /g, '+')}:wght@400;500;600;700`)
  if (mono && !families.some((s) => s.startsWith('family=JetBrains'))) families.push('family=JetBrains+Mono:wght@400;500;600')
  const title = esc([name, c.headline.trim()].filter(Boolean).join(' — '))
  const description = esc((c.bio || c.headline).replace(/\s+/g, ' ').trim().slice(0, 160))
  const ini = initials(name)
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="${t.accent}"/><text x="32" y="42" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="${on}">${esc(ini)}</text></svg>`
  const vars = `:root{--bg:${t.bg};--fg:${t.text};--ac:${t.accent};--on:${on};--hf:${stack(f.heading)};--bf:${stack(f.body)};--mono:${mono ? "'JetBrains Mono'," : ''}ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--ease:cubic-bezier(.2,.7,.2,1);--mu:color-mix(in srgb,var(--fg) 64%,var(--bg));--ln:color-mix(in srgb,var(--fg) 13%,var(--bg));--card:color-mix(in srgb,var(--fg) 4%,var(--bg));--soft:color-mix(in srgb,var(--ac) 14%,var(--bg))}\n`
  const credit = opts.appUrl ? `<a href="${esc(opts.appUrl)}" target="_blank" rel="noopener">${BRAND}</a>` : BRAND
  const person = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle: c.headline.trim() || undefined,
    description: c.bio.trim().slice(0, 300) || undefined,
    image: x.photo || undefined,
    email: email || undefined,
    address: c.location.trim() || undefined,
    sameAs: x.socials.length ? x.socials.map((l) => l.url) : undefined,
  }).replace(/</g, '\\u003c')

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
${x.photo ? `<meta property="og:image" content="${esc(x.photo)}">\n` : ''}<meta name="theme-color" content="${t.bg}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families.join('&amp;')}&amp;display=swap">
<script>document.documentElement.classList.add('js')</script>
<script type="application/ld+json">${person}</script>
<style>${vars}${BASE}${layout.css}</style>
</head>
<body id="top">
<div class="prog" aria-hidden="true"></div>
${layout.body}
<footer class="ft"><p>© <span data-y>${new Date().getFullYear()}</span> ${esc(name)}</p><p>Portfolio créé avec ${credit}</p></footer>
<a class="top" href="#top" aria-label="Revenir en haut">${ic('up')}</a>
${x.rw.length || x.pj.some((pr) => secure(pr.image)) ? '<div class="lb" role="dialog" aria-modal="true" aria-label="Image agrandie"><img alt=""><button type="button" aria-label="Fermer">✕</button></div>\n' : ''}<script>${RUNTIME}</script>
${opts.track ? tracker(opts.track, p.slug) : ''}</body>
</html>`
}
