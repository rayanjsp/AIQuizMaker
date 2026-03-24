<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function handleLogin() {
  errorMessage.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    errorMessage.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">

      <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">Connexion</h2>

      <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm text-center">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">Email</label>
          <input
              v-model="email"
              type="email"
              required
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="exemple@email.com"
          >
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">Mot de passe</label>
          <input
              v-model="password"
              type="password"
              required
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="********"
          >
        </div>

        <button
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
        >
          {{ loading ? 'Connexion en cours...' : "Se connecter" }}
        </button>

      </form>

      <p class="text-center text-gray-600 text-sm mt-4">
        Pas encore de compte ?
        <RouterLink to="/register" class="text-blue-600 hover:underline">S'inscrire gratuitement</RouterLink>
      </p>
    </div>
  </div>
</template>