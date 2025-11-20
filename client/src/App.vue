<script setup>
import { ref, onMounted } from 'vue'

const message = ref('En attente du serveur...')
const status = ref('loading')

onMounted(async () => {
  try {
    // On appelle notre route de test backend
    // Grâce au proxy dans vite.config.js, /api redirige vers le port 3000
    const response = await fetch('/api/test-db')
    const data = await response.json()

    message.value = data.message // Devrait afficher "Connexion BDD OK"
    status.value = 'success'
    console.log('Données reçues du serveur :', data)
  } catch (error) {
    message.value = "Impossible de contacter le serveur (Vérifie qu'il tourne bien sur le port 3000 !)"
    status.value = 'error'
    console.error(error)
  }
})
</script>

<template>
  <div class="container">
    <h1>🤖 AI Quiz Maker</h1>

    <div class="card" :class="status">
      <h2>Test de Connexion</h2>
      <p>Réponse du Backend :</p>
      <h3 class="result">{{ message }}</h3>
    </div>
  </div>
</template>

<style scoped>
.container {
  font-family: sans-serif;
  max-width: 600px;
  margin: 2rem auto;
  text-align: center;
}
.card {
  border: 1px solid #ddd;
  padding: 2rem;
  border-radius: 8px;
  background-color: #f9f9f9;
}
.success { border-color: #4caf50; background-color: #e8f5e9; color: #2e7d32; }
.error { border-color: #f44336; background-color: #ffebee; color: #c62828; }
.result { font-size: 1.5rem; margin-top: 1rem; }
</style>