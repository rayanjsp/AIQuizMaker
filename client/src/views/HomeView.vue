<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans">

    <!-- Header -->
    <nav class="p-5 flex justify-between items-center border-b border-slate-200 bg-white shadow-sm">
      <div class="flex items-center gap-3">
        <span class="text-2xl">📝</span>
        <div>
          <h1 class="text-lg font-bold text-slate-800 leading-none">AI Quiz Maker</h1>
          <p class="text-xs text-slate-400">Projet BTS SIO — 2025/2026</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <RouterLink to="/login" class="text-sm text-slate-600 hover:text-blue-600 font-medium transition">Connexion</RouterLink>
        <RouterLink to="/register" class="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          Créer un compte
        </RouterLink>
      </div>
    </nav>

    <!-- Hero -->
    <main class="flex-grow flex items-center justify-center px-4 py-16">
      <div class="max-w-2xl mx-auto text-center">

        <!-- Badge scolaire -->
        <span class="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold mb-6">
          🎓 Projet de fin d'année — BTS SIO SLAM
        </span>

        <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
          Générez un quiz<br>
          <span class="text-blue-600">depuis n'importe quel texte</span>
        </h1>

        <p class="text-base text-slate-500 mb-2 max-w-lg mx-auto leading-relaxed">
          Entrez un sujet, collez un texte ou importez un PDF — l'IA génère automatiquement un QCM corrigé.
        </p>
        <p class="text-sm text-slate-400 mb-10">
          Application développée dans le cadre d'un projet scolaire, utilisant <strong class="text-slate-500">Vue.js</strong>, <strong class="text-slate-500">Node.js</strong> et <strong class="text-slate-500">DeepSeek AI</strong>.
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <RouterLink
            to="/register"
            class="px-7 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow hover:bg-blue-700 transition duration-200"
          >
            Essayer l'application
          </RouterLink>
          <RouterLink
            to="/login"
            class="px-7 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition duration-200"
          >
            Se connecter
          </RouterLink>
        </div>

        <!-- Fonctionnalités simples -->
        <div class="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left max-w-xl mx-auto">
          <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div class="text-2xl mb-2">✍️</div>
            <h3 class="font-semibold text-slate-800 text-sm mb-1">Génération par sujet</h3>
            <p class="text-xs text-slate-400">Décrivez un thème et obtenez un quiz en quelques secondes.</p>
          </div>
          <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div class="text-2xl mb-2">📊</div>
            <h3 class="font-semibold text-slate-800 text-sm mb-1">Suivi des résultats</h3>
            <p class="text-xs text-slate-400">Consultez vos quiz passés et partagez-les via un lien.</p>
          </div>
        </div>

      </div>
    </main>

    <!-- Footer -->
    <footer class="p-5 text-center border-t border-slate-100 bg-white">
      <p class="text-xs text-slate-400">
        AI Quiz Maker — Projet BTS SIO SLAM &nbsp;·&nbsp; Année scolaire 2025/2026
      </p>
    </footer>

  </div>
</template>