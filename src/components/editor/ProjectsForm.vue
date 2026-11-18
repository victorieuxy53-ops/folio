<script setup lang="ts">
import { computed } from 'vue'
import { emptyProject, emptyTestimonial, type Content } from '../../../shared/portfolio'
import Field from '../Field.vue'
import ImageUpload from '../ImageUpload.vue'
import ListEditor from '../ListEditor.vue'

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
        <h3 class="font-semibold">Témoignages <span class="font-normal text-zinc-500">(facultatif)</span></h3>
        <p class="text-sm text-zinc-600">Les mots d’un client, d’un responsable ou d’un collègue rassurent vos visiteurs.</p>
      </div>
      <ListEditor :items="content.testimonials" :create="emptyTestimonial" add-label="Ajouter un témoignage" :title="(t, i) => t.name || `Témoignage ${i + 1}`">
        <template #default="{ item }">
          <div class="grid gap-3 sm:grid-cols-2">
            <Field label="Témoignage" class="sm:col-span-2">
              <textarea v-model="item.quote" rows="3" class="input resize-y" placeholder="Ex. : Un travail remarquable, livré dans les délais." />
            </Field>
            <Field label="Nom"><input v-model="item.name" class="input" placeholder="Ex. : Koffi Mensah" /></Field>
            <Field label="Fonction"><input v-model="item.role" class="input" placeholder="Ex. : Directeur, Kora Pay" /></Field>
          </div>
        </template>
      </ListEditor>
    </section>
  </div>
</template>
