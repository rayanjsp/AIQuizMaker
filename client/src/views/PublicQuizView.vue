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
  maxScore,
  showCorrection,
  currentQuestion,
  isCurrentMultiAnswer,
  selectedOptionIds,
  userAnswers,
  userComments,
  hasAnyComment,
  handleAnswer,
  toggleOption,
  validateMultiAnswer,
  nextQuestion,
  getOptionClass,
  getRecapOptionClass,
} = useQuizGame(quiz);

const resultId = ref(null);
const isExporting = ref(false);

const getAnswerForQuestion = (questionId) =>
  userAnswers.value.find(a => a.questionId === questionId);

const startGame = () => {
  if (!pseudo.value.trim()) {
    toast.error('Choisis un pseudo !');
    return;
  }
  step.value = 'playing';
};

const finishGame = async () => {
  step.value = 'finished';
  try {
    const res = await fetch(`/api/quiz/public/${quizUuid}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: score.value,
        total: quiz.value.mode === 'expert' ? maxScore.value : quiz.value.questions.length,
        pseudo: pseudo.value,
      })
    });
    if (res.ok) {
      const data = await res.json();
      resultId.value = data.resultId;
    }
  } catch (e) {
    console.error(e);
  }
};

const exportPersonalisedPdf = async () => {
  if (!hasAnyComment.value || isExporting.value || !resultId.value) return;
  isExporting.value = true;
  try {
    // 1. Sauvegarder les commentaires saisis après la fin du quiz
    const saveRes = await fetch(`/api/quiz/public/${quizUuid}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultId: resultId.value, comments: userComments.value }),
    });
    if (!saveRes.ok) throw new Error('Erreur sauvegarde commentaires');

    // 2. Télécharger le PDF
    const res = await fetch(`/api/quiz/public/${quizUuid}/pdf-personnalise?resultId=${resultId.value}`);
    if (!res.ok) throw new Error('Erreur génération PDF');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_correction_personnalisee.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    toast.error('Impossible de générer le PDF');
  } finally {
    isExporting.value = false;
  }
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
      <div class="flex items-center justify-center gap-2 flex-wrap">
        <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Quiz Public</span>
        <span v-if="quiz.mode === 'expert'" class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Expert</span>
      </div>
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
        <h2 class="text-xl font-bold text-gray-800 mb-2 text-center">{{ currentQuestion.text }}</h2>
        <p v-if="isCurrentMultiAnswer" class="text-xs text-purple-600 font-semibold mb-6 text-center">
          Plusieurs réponses possibles — cochez toutes les bonnes
        </p>
        <div v-else class="mb-6"></div>

        <div class="grid gap-3">
          <!-- MODE EXPERT MULTI-RÉPONSES : checkboxes -->
          <template v-if="isCurrentMultiAnswer">
            <button
              v-for="option in currentQuestion.options"
              :key="option.id"
              @click="toggleOption(option)"
              :disabled="showCorrection"
              :class="`p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 flex items-center gap-3 ${getOptionClass(option)}`"
            >
              <span :class="`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${selectedOptionIds.has(option.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`">
                <svg v-if="selectedOptionIds.has(option.id)" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
              </span>
              {{ option.text }}
            </button>
            <button
              v-if="!showCorrection"
              @click="validateMultiAnswer"
              class="mt-2 w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition shadow-lg"
            >Valider mes réponses</button>
          </template>

          <!-- MODE STANDARD (ou question à 1 réponse) : radio -->
          <template v-else>
            <button
              v-for="option in currentQuestion.options"
              :key="option.id"
              @click="handleAnswer(option)"
              :disabled="showCorrection"
              :class="`p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 ${getOptionClass(option)}`"
            >
              {{ option.text }}
            </button>
          </template>
        </div>
      </div>

      <div v-if="showCorrection" class="bg-blue-50 p-6 border-t flex justify-between items-center animate-fade-in-up">
        <p class="text-sm text-blue-800 flex-1 mr-4" v-if="currentQuestion.explanation">💡 {{ currentQuestion.explanation }}</p>
        <button @click="nextQuestion(finishGame)" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg">Suivant →</button>
      </div>
    </div>

    <div v-else-if="step === 'finished'" class="w-full max-w-2xl space-y-6 animate-fade-in-up py-8">

      <!-- Score -->
      <div class="bg-white rounded-2xl shadow-xl text-center p-8">
        <div class="text-6xl mb-4">🏆</div>
        <h2 class="text-3xl font-bold text-gray-800 mb-2">Bien joué {{ pseudo }} !</h2>
        <p class="text-gray-500 mb-2">Ton score final</p>
        <div class="text-5xl font-black mb-2" :class="quiz.mode === 'expert' ? 'text-purple-600' : 'text-blue-600'">
          {{ score }} / {{ quiz.mode === 'expert' ? maxScore : quiz.questions.length }}
        </div>
        <p v-if="quiz.mode === 'expert'" class="text-sm text-gray-500">points</p>
      </div>

      <!-- Récapitulatif des réponses -->
      <div class="bg-white rounded-2xl shadow-xl p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">Récapitulatif de tes réponses</h3>
        <div class="space-y-6">
          <div v-for="(question, qIndex) in quiz.questions" :key="question.id" class="border border-gray-200 rounded-xl p-4">
            <p class="font-semibold text-gray-800 mb-3">{{ qIndex + 1 }}. {{ question.text }}</p>

            <!-- Options colorées -->
            <div class="space-y-1 mb-3">
              <div
                v-for="option in question.options"
                :key="option.id"
                :class="`text-sm px-3 py-2 rounded-lg border ${getRecapOptionClass(option, getAnswerForQuestion(question.id))}`"
              >
                {{ option.text }}
                <span v-if="option.isCorrect" class="ml-2 text-xs font-bold">(bonne réponse)</span>
              </div>
            </div>

            <!-- Explication -->
            <div v-if="question.explanation" class="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3">
              <p class="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Explication</p>
              <p class="text-sm text-blue-800">💡 {{ question.explanation }}</p>
            </div>

            <!-- Textarea commentaire -->
            <div class="border-t border-gray-100 pt-3">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">✏️ Note personnelle</p>
              <textarea
                v-if="userComments.find(c => c.questionId === question.id)"
                v-model="userComments.find(c => c.questionId === question.id).comment"
                placeholder="Ajoute une note pour te souvenir de cette question..."
                rows="2"
                class="w-full text-sm p-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-400 outline-none"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Boutons d'action -->
      <div class="flex flex-col sm:flex-row gap-3">
        <a href="/" class="flex-1 text-center bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg">
          Créer mon propre quiz avec l'IA
        </a>
        <button
          v-if="hasAnyComment"
          @click="exportPersonalisedPdf"
          :disabled="isExporting || !resultId"
          class="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition shadow-lg disabled:opacity-50"
        >
          {{ isExporting ? 'Génération...' : '📄 Exporter le corrigé personnalisé' }}
        </button>
      </div>

    </div>

  </div>
</template>