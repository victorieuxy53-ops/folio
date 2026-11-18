import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { countVisit } from './lib/visits'
import './style.css'

createApp(App).use(router).mount('#app')
void countVisit()
