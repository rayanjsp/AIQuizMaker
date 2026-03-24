<script setup>
import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useQuizStore } from '@/stores/quizStore';
import { DIFFICULTIES } from '@/utils/difficultyHelpers';

const emit = defineEmits(['created', 'close']);
const toast = useToast();
const quizStore = useQuizStore();

const isCreating = ref(false);
const newTopic = ref('');
const newDifficulty = ref('Facile');
const newNbQuestions = ref(5);

const handleCreateQuiz = async () => {
  isCreating.value = true;
  try {
    const quiz = await quizStore.createQuiz({
      topic: newTopic.value,
      difficulty: newDifficulty.value,
      nbQuestions: newNbQuestions.value,
    });
    newTopic.value = '';
    emit('created', quiz);
  } catch (error) {
    toast.error('Erreur : ' + (error.message || 'Une erreur est survenue'));
  } finally {
    isCreating.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" @click="emit('close')"></div>
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6 animate-fade-in-up">
      <h3 class="text-2xl font-bold text-gray-800 mb-4">Nouveau Quiz IA</h3>

      <form @submit.prevent="handleCreateQuiz" class="space-y-4">
        <div>
          <input v-model="newTopic" type="text" placeholder="Ex: Histoire Géo Chapitre 1" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Difficulté</label>
          <select v-model="newDifficulty" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
            <option v-for="d in DIFFICULTIES" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-gray-700">Nombre de questions</label>
            <span class="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded text-xs">{{ newNbQuestions }} questions</span>
          </div>
          <div class="grid grid-cols-5 gap-2 mb-2">
            <button
              v-for="num in [5, 10, 15, 20, 25]"
              :key="num"
              type="button"
              @click="newNbQuestions = num"
              :class="`py-2 text-sm font-medium rounded-lg border transition-all ${newNbQuestions === num ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`"
            >{{ num }}</button>
          </div>
          <input type="range" v-model.number="newNbQuestions" min="1" max="30" step="1" class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span><span>30</span>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button type="button" @click="emit('close')" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button type="submit" :disabled="isCreating" class="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
            {{ isCreating ? 'Analyse & Génération...' : 'Créer' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
