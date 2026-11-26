<script setup lang="ts">
import { computed } from 'vue'
import { emptyProject, type Content } from '../../../shared/portfolio'
import Field from '../Field.vue'
import ImageUpload from '../ImageUpload.vue'
import ListEditor from '../ListEditor.vue'
import ScreenshotsUpload from '../ScreenshotsUpload.vue'

const props = defineProps<{ content: Content }>()
// Catégories déjà utilisées, proposées pour écrire toujours la même (les filtres en dépendent).
const categories = computed(() => [...new Set(props.content.projects.map((p) => p.category.trim()).filter(Boolean))])
</script>

<template>
  <div class="space-y-8">
    <section class="space-y-3">
      <div>
        <h3 class="font-semibold">Projets</h3>
        <p class="text-sm text-zinc-600">Montrez vos meilleures réalisations : un visuel et deux phrases suffisent.</p>
      </div>
      <ListEditor :items="content.projects" :create="emptyProject" add-label="Ajouter un projet" :title="(p, i) => p.title || `Projet ${i + 1}`">
        <template #default="{ item }">
          <div class="space-y-3">
            <ImageUpload v-model="item.image" />
            <Field label="Titre"><input v-model="item.title" class="input" placeholder="Ex. : Site e-commerce pour une boutique" /></Field>
            <Field label="Catégorie (facultatif)" hint="Avec au moins deux catégories, vos visiteurs peuvent filtrer vos projets.">
              <input v-model="item.category" class="input" list="folio-categories" placeholder="Ex. : Logo, Site web, Affiche…" />
            </Field>
            <Field label="Description">
              <textarea v-model="item.text" rows="3" class="input resize-y" placeholder="Le contexte, votre rôle, le résultat." />
            </Field>
            <Field label="Lien (facultatif)"><input v-model="item.url" class="input" placeholder="exemple.com" inputmode="url" /></Field>
          </div>
        </template>
      </ListEditor>
      <datalist id="folio-categories">
        <option v-for="c in categories" :key="c" :value="c" />
      </datalist>
    </section>

    <section class="space-y-3">
      <div>
        <h3 class="font-semibold">Avis clients <span class="font-normal text-zinc-500">(facultatif)</span></h3>
        <p class="text-sm text-zinc-600">
          Ajoutez des captures d’écran des messages de vos clients (WhatsApp, e-mail, Facebook…). Pensez à masquer leurs numéros de téléphone.
        </p>
      </div>
      <ScreenshotsUpload v-model="content.reviews" />
    </section>
  </div>
</template>
