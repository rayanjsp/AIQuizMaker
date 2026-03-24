<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useQuizGame } from '../composables/useQuizGame.js';

const route = useRoute();
const toast = useToast();
const quizUuid = route.params.uuid;

const step = ref('intro');
const quiz = ref(null);
const pseudo = ref('');
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const res = await fetch(`/api/quiz/public/${quizUuid}`);
    if (!res.ok) throw new Error('Ce quiz est introuvable ou privé.');
    quiz.value = await res.json();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

const {
  currentQuestionIndex,
  score,
  showCorrection,
  currentQuestion,
  handleAnswer,
  nextQuestion,
  getOptionClass
} = useQuizGame(quiz);

const startGame = () => {
  if (!pseudo.value.trim()) {
    toast.error('Choisis un pseudo !');
    return;
  }
  step.value = 'playing';
};

const finishGame = async () => {
  step.value = 'finished';
  await fetch(`/api/quiz/public/${quizUuid}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      score: score.value,
      total: quiz.value.questions.length,
      pseudo: pseudo.value
    })
  });
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">

    <div v-if="loading" class="text-gray-500">Chargement du quiz...</div>
    <div v-else-if="error" class="bg-white p-8 rounded-xl shadow-lg text-center">
      <div class="text-4xl mb-4">🚫</div>
      <h1 class="text-xl font-bold text-gray-800">{{ error }}</h1>
    </div>

    <div v-else-if="step === 'intro'" class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
      <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Quiz Public</span>
      <h1 class="text-2xl font-bold mt-4 text-gray-800">{{ quiz.title }}</h1>
      <p class="text-gray-500 text-sm mt-2">{{ quiz.questions.length }} Questions • Difficulté {{ quiz.difficulty }}</p>

      <div class="mt-8">
        <label class="block text-left text-sm font-bold text-gray-700 mb-2">Ton Pseudo</label>
        <input v-model="pseudo" type="text" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: SuperMario" @keyup.enter="startGame">
      </div>

      <button @click="startGame" class="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg transform hover:-translate-y-1">
        Commencer ! 🚀
      </button>
    </div>

    <div v-else-if="step === 'playing'" class="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
      <div class="bg-gray-50 p-6 border-b flex justify-between items-center">
        <span class="font-bold text-gray-500">Question {{ currentQuestionIndex + 1 }}/{{ quiz.questions.length }}</span>
        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">{{ pseudo }}</span>
      </div>

      <div class="p-8">
        <h2 class="text-xl font-bold text-gray-800 mb-6 text-center">{{ currentQuestion.text }}</h2>

        <div class="grid gap-3">
          <button
              v-for="option in currentQuestion.options"
              :key="option.id"
              @click="handleAnswer(option)"
              :disabled="showCorrection"
              :class="`p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 ${getOptionClass(option)}`"
          >
            {{ option.text }}
          </button>
        </div>
      </div>

      <div v-if="showCorrection" class="bg-blue-50 p-6 border-t flex justify-between items-center animate-fade-in-up">
        <p class="text-sm text-blue-800 flex-1 mr-4" v-if="currentQuestion.explanation">💡 {{ currentQuestion.explanation }}</p>
        <button @click="nextQuestion(finishGame)" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg">Suivant →</button>
      </div>
    </div>

    <div v-else-if="step === 'finished'" class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-fade-in-up">
      <div class="text-6xl mb-4">🏆</div>
      <h2 class="text-3xl font-bold text-gray-800 mb-2">Bien joué {{ pseudo }} !</h2>
      <p class="text-gray-500 mb-6">Ton score final</p>
      <div class="text-6xl font-black text-blue-600 mb-8">{{ score }} / {{ quiz.questions.length }}</div>

      <a href="/" class="block text-blue-600 hover:underline font-medium">Créer mon propre quiz avec l'IA</a>
    </div>

  </div>
</template>