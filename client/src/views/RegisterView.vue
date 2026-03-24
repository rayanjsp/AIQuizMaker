<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const toast = useToast()
const { register } = useAuth()

const username = ref('')
const email = ref('')
const password = ref('')

const errorMessage = ref('')
const isSubmitting = ref(false)

const handleRegister = async () => {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await register(username.value, email.value, password.value)
    toast.success('Inscription réussie !')
    router.push('/login')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">

      <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">Créer un compte</h2>

      <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">Pseudo</label>
          <input
              v-model="username"
              type="text"
              required
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ton pseudo"
          >
        </div>

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
          <p class="text-xs text-gray-500 mt-1">1 Majuscule, 1 minuscule, 1 chiffre, 6 car. min.</p>
        </div>

        <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
        >
          {{ isSubmitting ? 'Chargement...' : "S'inscrire" }}
        </button>

      </form>

      <p class="text-center text-gray-600 text-sm mt-4">
        Déjà un compte ?
        <RouterLink to="/login" class="text-blue-600 hover:underline">Se connecter</RouterLink>
      </p>
    </div>
  </div>
</template>