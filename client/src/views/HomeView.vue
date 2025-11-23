<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">

    <nav class="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
      <h1 class="text-2xl font-bold text-blue-600 flex items-center gap-2">
        🤖 AI Quiz Maker
      </h1>
      <div class="space-x-4">
        <RouterLink to="/login" class="text-gray-600 hover:text-blue-600 font-medium">Connexion</RouterLink>
        <RouterLink to="/register" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          S'inscrire
        </RouterLink>
      </div>
    </nav>

    <main class="flex-grow flex items-center justify-center px-4">
      <div class="text-center max-w-3xl mx-auto">
        <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold mb-4 inline-block">
          Propulsé par DeepSeek AI
        </span>

        <h1 class="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
          Générez des Quiz <br>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            en quelques secondes
          </span>
        </h1>

        <p class="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Transformez n'importe quel sujet en un QCM interactif grâce à l'intelligence artificielle.
          Idéal pour les étudiants et les enseignants.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <RouterLink
              to="/register"
              class="px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-blue-700 transform hover:-translate-y-1 transition duration-300"
          >
            Commencer gratuitement
          </RouterLink>

          <button class="px-8 py-4 bg-white text-gray-700 text-lg font-bold rounded-xl shadow hover:bg-gray-50 transition duration-300 border border-gray-200">
            Voir la démo
          </button>
        </div>

        <div class="mt-12 grid grid-cols-3 gap-8 text-gray-500 grayscale opacity-70">
          <div>
            <p class="font-bold text-2xl text-gray-800">100+</p>
            <p class="text-sm">Quiz générés</p>
          </div>
          <div>
            <p class="font-bold text-2xl text-gray-800">IA</p>
            <p class="text-sm">DeepSeek V3</p>
          </div>
          <div>
            <p class="font-bold text-2xl text-gray-800">0€</p>
            <p class="text-sm">Gratuit (Beta)</p>
          </div>
        </div>
      </div>
    </main>

    <footer class="p-6 text-center text-gray-400 text-sm">
      &copy; 2025 AI Quiz Maker - Projet BTS SIO
    </footer>

  </div>
</template>