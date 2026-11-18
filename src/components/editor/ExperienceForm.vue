<script setup lang="ts">
import { emptyExperience, type Content } from '../../../shared/portfolio'
import Field from '../Field.vue'
import ListEditor from '../ListEditor.vue'

defineProps<{ content: Content }>()

const lists = [
  {
    key: 'experiences',
    title: 'Expérience professionnelle',
    hint: 'Vos postes, missions et stages, du plus récent au plus ancien.',
    add: 'Ajouter une expérience',
    item: 'Expérience',
    role: ['Poste', 'Ex. : Chef de projet'],
    org: ['Entreprise', 'Ex. : Orange'],
  },
  {
    key: 'education',
    title: 'Formation & certifications',
    hint: 'Vos diplômes, formations et certifications.',
    add: 'Ajouter une formation',
    item: 'Formation',
    role: ['Diplôme ou certification', 'Ex. : Licence en marketing'],
    org: ['École ou organisme', 'Ex. : Université de Lomé'],
  },
] as const
</script>

<template>
  <div class="space-y-8">
    <section v-for="l in lists" :key="l.key" class="space-y-3">
      <div>
        <h3 class="font-semibold">{{ l.title }}</h3>
        <p class="text-sm text-zinc-600">{{ l.hint }}</p>
      </div>
      <ListEditor :items="content[l.key]" :create="emptyExperience" :add-label="l.add" :title="(e, i) => e.role || `${l.item} ${i + 1}`">
        <template #default="{ item }">
          <div class="grid gap-3 sm:grid-cols-2">
            <Field :label="l.role[0]"><input v-model="item.role" class="input" :placeholder="l.role[1]" /></Field>
            <Field :label="l.org[0]"><input v-model="item.org" class="input" :placeholder="l.org[1]" /></Field>
            <Field label="Période" class="sm:col-span-2"><input v-model="item.period" class="input" placeholder="Ex. : 2021 — Aujourd’hui" /></Field>
            <Field label="Description (facultatif)" class="sm:col-span-2">
              <textarea v-model="item.text" rows="3" class="input resize-y" placeholder="Vos missions et vos résultats." />
            </Field>
          </div>
        </template>
      </ListEditor>
    </section>
  </div>
</template>
