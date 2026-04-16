<script setup>
import { ref } from 'vue';
import { useQuizGame } from '../composables/useQuizGame.js';
import { useApi } from '../composables/useApi.js';

const props = defineProps({
  quiz: { type: Object, required: true }
});
const emit = defineEmits(['close']);

const quizRef = ref(props.quiz);
const { authFetch } = useApi();

const {
  currentQuestionIndex, score, maxScore, isFinished,
  selectedOptionIds, showCorrection, currentQuestion,
  isCurrentMultiAnswer, isMultiAnswer,
  userAnswers, userComments, hasAnyComment,
  handleAnswer, toggleOption, validateMultiAnswer, nextQuestion,
  getOptionClass, getRecapOptionClass,
} = useQuizGame(quizRef);

const isExpertMode = props.quiz.mode === 'expert';
const isExporting = ref(false);

const getAnswerForQuestion = (questionId) =>
  userAnswers.value.find(a => a.questionId === questionId);

const exportPersonalisedPdf = async () => {
  if (!hasAnyComment.value || isExporting.value) return;
  isExporting.value = true;
  try {
    // 1. Soumettre le résultat + commentaires → obtenir resultId
    const submitRes = await authFetch(`/api/quiz/${props.quiz.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        score: score.value,
        totalQuestions: isExpertMode ? maxScore.value : props.quiz.questions.length,
        comments: userComments.value,
      }),
    });
    if (!submitRes.ok) throw new Error('Erreur sauvegarde résultat');
    const { resultId } = await submitRes.json();

    // 2. Télécharger le PDF personnalisé
    const pdfRes = await authFetch(`/api/quiz/${props.quiz.id}/pdf-personnalise?resultId=${resultId}`);
    if (!pdfRes.ok) throw new Error('Erreur génération PDF');
    const blob = await pdfRes.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_${props.quiz.id}_correction_personnalisee.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 z-[100] bg-gray-900 flex flex-col h-screen">
    <div class="bg-gray-800 p-4 flex justify-between items-center text-white shadow-md flex-none z-10">
      <div>
        <h2 class="font-bold text-lg">{{ quiz.title }}</h2>
        <span class="text-sm text-gray-400">Question {{ currentQuestionIndex + 1 }} / {{ quiz.questions.length }}</span>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="isExpertMode" class="text-xs bg-purple-600 px-2 py-1 rounded-full font-bold">EXPERT</span>
        <button @click="emit('close')" class="text-gray-400 hover:text-white text-2xl font-bold px-2">&times;</button>
      </div>
    </div>

    <div class="flex-grow overflow-y-auto bg-gray-900 p-4">
      <div class="min-h-full flex flex-col items-center justify-center py-8">

        <!-- En cours de quiz -->
        <div v-if="!isFinished" class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col">
          <div class="p-6 sm:p-8 text-center border-b border-gray-100">
            <h3 class="text-xl sm:text-2xl font-bold text-gray-800 leading-relaxed">{{ currentQuestion.text }}</h3>
            <p v-if="isCurrentMultiAnswer" class="text-xs text-purple-600 font-semibold mt-2">
              Plusieurs réponses possibles — cochez toutes les bonnes
            </p>
          </div>

          <div class="p-6 grid grid-cols-1 gap-4">
            <!-- Checkboxes (multi-réponses) -->
            <template v-if="isCurrentMultiAnswer">
              <button
                v-for="option in currentQuestion.options"
                :key="option.id"
                @click="toggleOption(option)"
                :disabled="showCorrection"
                :class="`p-4 rounded-xl text-left border-2 transition-all duration-200 font-medium text-sm sm:text-base flex items-center gap-3 ${getOptionClass(option)}`"
              >
                <span :class="`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${selectedOptionIds.has(option.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`">
                  <svg v-if="selectedOptionIds.has(option.id)" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </span>
                {{ option.text }}
              </button>
              <button v-if="!showCorrection" @click="validateMultiAnswer" class="mt-2 w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition shadow-lg">
                Valider mes réponses
              </button>
            </template>

            <!-- Radio (réponse unique) -->
            <template v-else>
              <button
                v-for="option in currentQuestion.options"
                :key="option.id"
                @click="handleAnswer(option)"
                :disabled="showCorrection"
                :class="`p-4 rounded-xl text-left border-2 transition-all duration-200 font-medium text-sm sm:text-base ${getOptionClass(option)}`"
              >{{ option.text }}</button>
            </template>
          </div>

          <div v-if="showCorrection" class="bg-blue-50 p-6 border-t border-blue-100 animate-fade-in-up">
            <div v-if="currentQuestion.explanation" class="text-blue-800 text-sm mb-6 text-center leading-relaxed">
              💡 <strong>Explication :</strong> {{ currentQuestion.explanation }}
            </div>
            <button @click="nextQuestion()" class="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg text-lg">
              {{ currentQuestionIndex < quiz.questions.length - 1 ? 'Question Suivante →' : 'Voir les résultats' }}
            </button>
          </div>

          <div class="h-2 bg-gray-100 w-full mt-auto">
            <div class="h-full bg-blue-500 transition-all duration-500" :style="`width: ${(currentQuestionIndex / quiz.questions.length) * 100}%`"></div>
          </div>
        </div>

        <!-- Écran de fin -->
        <div v-else class="w-full max-w-2xl space-y-6 animate-fade-in-up">

          <!-- Score -->
          <div class="bg-white rounded-2xl shadow-2xl text-center p-8">
            <div class="text-6xl mb-4">🏆</div>
            <h2 class="text-3xl font-bold text-gray-900 mb-2">Quiz Terminé !</h2>
            <div class="text-5xl font-black mb-2" :class="isExpertMode ? 'text-purple-600' : 'text-blue-600'">
              {{ score }} / {{ isExpertMode ? maxScore : quiz.questions.length }}
            </div>
            <p v-if="isExpertMode" class="text-sm text-gray-500">points</p>
          </div>

          <!-- Récapitulatif des réponses -->
          <div class="bg-white rounded-2xl shadow-2xl p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Récapitulatif de vos réponses</h3>
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
          <div class="flex gap-3">
            <button @click="emit('close')" class="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg">
              Retour au Dashboard
            </button>
            <button
              v-if="hasAnyComment"
              @click="exportPersonalisedPdf"
              :disabled="isExporting"
              class="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition shadow-lg disabled:opacity-50"
            >
              {{ isExporting ? 'Génération...' : '📄 Exporter le corrigé personnalisé' }}
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
