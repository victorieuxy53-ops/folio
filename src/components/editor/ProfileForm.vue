<script setup lang="ts">
import { SOCIALS, type Content, type SocialId } from '../../../shared/portfolio'
import Field from '../Field.vue'
import FileUpload from '../FileUpload.vue'
import ImageUpload from '../ImageUpload.vue'
import TagInput from '../TagInput.vue'

defineProps<{ content: Content }>()

const socials = Object.entries(SOCIALS) as [SocialId, string][]
const examples: Record<SocialId, string> = {
  linkedin: 'linkedin.com/in/votre-nom',
  github: 'github.com/votre-nom',
  behance: 'behance.net/votre-nom',
  instagram: 'instagram.com/votre-nom',
  facebook: 'facebook.com/votre-nom',
  x: 'x.com/votre-nom',
  website: 'votre-site.com',
}
</script>

<template>
  <div class="space-y-8">
    <section class="space-y-4">
      <h3 class="font-semibold">Qui êtes-vous ?</h3>
      <div>
        <span class="label">Photo de profil</span>
        <ImageUpload v-model="content.avatar" round />
      </div>
      <Field label="Nom complet">
        <input v-model="content.name" class="input" placeholder="Ex. : Aïcha Diallo" autocomplete="name" />
      </Field>
      <Field label="Votre métier en une phrase">
        <input v-model="content.headline" class="input" placeholder="Ex. : Comptable & analyste financier" />
      </Field>
      <div>
        <span class="label">Vos titres animés <span class="font-normal text-zinc-500">(facultatif)</span></span>
        <TagInput v-model="content.roles" placeholder="Ex. : Graphiste, puis Entrée" />
        <span class="mt-1 block text-xs text-zinc-500">Ils s’écrivent l’un après l’autre en haut de votre site : « Je suis Graphiste… Designer UI… ».</span>
      </div>
      <Field label="Ville / pays">
        <input v-model="content.location" class="input" placeholder="Ex. : Abidjan, Côte d’Ivoire" />
      </Field>
      <label class="card flex cursor-pointer items-center gap-3 p-3.5 hover:border-zinc-300">
        <input v-model="content.available" type="checkbox" class="size-4 accent-brand-600" />
        <span class="text-sm">
          <span class="block font-medium">Je suis disponible pour de nouveaux projets</span>
          <span class="block text-zinc-500">Affiche un badge vert animé sur votre site.</span>
        </span>
      </label>
      <Field label="À propos de vous" hint="Laissez une ligne vide pour créer un nouveau paragraphe.">
        <textarea v-model="content.bio" rows="5" class="input resize-y" placeholder="Présentez votre parcours, ce que vous faites et ce qui vous motive." />
      </Field>
      <div>
        <span class="label">Votre CV <span class="font-normal text-zinc-500">(facultatif)</span></span>
        <FileUpload v-model="content.cv" />
        <span class="mt-1 block text-xs text-zinc-500">Un bouton « Télécharger mon CV » apparaît sur votre site.</span>
      </div>
    </section>

    <section class="space-y-4">
      <h3 class="font-semibold">Contact</h3>
      <Field label="E-mail">
        <input v-model="content.email" type="email" class="input" placeholder="vous@exemple.com" autocomplete="email" />
      </Field>
      <Field label="Numéro WhatsApp" hint="Avec l’indicatif du pays : vos visiteurs pourront vous écrire en un clic.">
        <input v-model="content.phone" type="tel" class="input" placeholder="+229 01 00 00 00 00" autocomplete="tel" />
      </Field>
    </section>

    <section class="space-y-4">
      <h3 class="font-semibold">Réseaux sociaux <span class="font-normal text-zinc-500">(facultatif)</span></h3>
      <Field v-for="[key, label] in socials" :key="key" :label="label">
        <input v-model="content.socials[key]" class="input" :placeholder="examples[key]" inputmode="url" />
      </Field>
    </section>
  </div>
</template>
