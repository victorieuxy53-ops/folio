<script setup lang="ts">
import { emptyService, emptyStat, type Content } from '../../../shared/portfolio'
import Field from '../Field.vue'
import ListEditor from '../ListEditor.vue'
import TagInput from '../TagInput.vue'

defineProps<{ content: Content }>()
</script>

<template>
  <div class="space-y-8">
    <section class="space-y-3">
      <div>
        <h3 class="font-semibold">Services</h3>
        <p class="text-sm text-zinc-600">Ce que vous proposez à vos clients ou à un employeur.</p>
      </div>
      <ListEditor :items="content.services" :create="emptyService" add-label="Ajouter un service" :title="(s, i) => s.title || `Service ${i + 1}`">
        <template #default="{ item }">
          <div class="space-y-3">
            <Field label="Nom du service"><input v-model="item.title" class="input" placeholder="Ex. : Création de logos" /></Field>
            <Field label="Description">
              <textarea v-model="item.text" rows="2" class="input resize-y" placeholder="En une ou deux phrases, ce que vous apportez." />
            </Field>
          </div>
        </template>
      </ListEditor>
    </section>

    <section class="space-y-3">
      <h3 class="font-semibold">Compétences</h3>
      <TagInput v-model="content.skills" placeholder="Tapez puis Entrée (ex. : Photoshop)" />
    </section>

    <section class="space-y-3">
      <div>
        <h3 class="font-semibold">Chiffres clés</h3>
        <p class="text-sm text-zinc-600">Ils défilent comme un compteur à l’écran. L’idéal : 3 ou 4 chiffres.</p>
      </div>
      <ListEditor :items="content.stats" :create="emptyStat" add-label="Ajouter un chiffre" :title="(s, i) => [s.value, s.label].filter(Boolean).join(' ') || `Chiffre ${i + 1}`">
        <template #default="{ item }">
          <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
            <Field label="Chiffre"><input v-model="item.value" class="input" placeholder="Ex. : 50+" /></Field>
            <Field label="Légende"><input v-model="item.label" class="input" placeholder="Ex. : Projets réalisés" /></Field>
          </div>
        </template>
      </ListEditor>
    </section>
  </div>
</template>
