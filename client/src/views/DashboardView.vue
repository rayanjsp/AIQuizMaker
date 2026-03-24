<script setup>
import { reactive, onMounted } from 'vue';
import { useQuizStore } from '../stores/quizStore.js';
import { useAuth } from '../composables/useAuth.js';
import QuizCard from '../components/QuizCard.vue';
import QuizCreateModal from '../components/QuizCreateModal.vue';
import QuizDetailModal from '../components/QuizDetailModal.vue';
import QuizEditModal from '../components/QuizEditModal.vue';
import QuizGame from '../components/QuizGame.vue';

const store = useQuizStore();
const { logout } = useAuth();

const modal = reactive({
  create: false,
  selected: null,
  editing: null,
  active: null,
});

onMounted(() => store.fetchQuizzes());
</script>

<template>
  <div class="min-h-screen bg-gray-50 relative">

    <nav class="bg-white shadow-sm sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-blue-600">Mon Espace</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-600 hidden sm:inline">User: <span class="font-bold">{{ store.username }}</span></span>
          <button @click="logout" class="text-red-500 hover:text-red-700 font-medium text-sm">Déconnexion</button>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-3xl font-bold text-gray-900">Mes Quiz</h2>
        <button @click="modal.create = true" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-lg">
          <span>+</span> Nouveau
        </button>
      </div>

      <div class="mb-6 relative">
        <input
          v-model="store.searchQuery"
          type="text"
          placeholder="Rechercher un quiz..."
          class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
        <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
      </div>

      <div v-if="store.loading" class="text-center py-12 text-gray-500">Chargement...</div>

      <div v-else-if="store.quizzes.length === 0" class="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="text-6xl mb-4">📂</div>
        <h3 class="text-xl font-medium text-gray-900">Aucun quiz</h3>
        <button @click="modal.create = true" class="text-blue-600 font-bold mt-2 hover:underline">Créer le premier</button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuizCard
          v-for="quiz in store.filteredQuizzes"
          :key="quiz.id"
          :quiz="quiz"
          @open="modal.selected = $event"
        />
      </div>
    </main>

    <QuizCreateModal
      v-if="modal.create"
      @created="() => { store.fetchQuizzes(); modal.create = false; }"
      @close="modal.create = false"
    />

    <QuizDetailModal
      v-if="modal.selected"
      :quiz="modal.selected"
      @close="modal.selected = null"
      @deleted="() => { store.fetchQuizzes(); modal.selected = null; }"
      @edit="quiz => { modal.editing = quiz; modal.selected = null; }"
      @play="quiz => { modal.active = quiz; modal.selected = null; }"
      @update:quiz="updatedQuiz => { store.updateQuizInList(updatedQuiz); modal.selected = updatedQuiz; }"
    />

    <QuizEditModal
      v-if="modal.editing"
      :quiz="modal.editing"
      @saved="() => { store.fetchQuizzes(); modal.editing = null; }"
      @close="modal.editing = null"
    />

    <QuizGame
      v-if="modal.active"
      :quiz="modal.active"
      @close="modal.active = null"
    />

  </div>
</template>
