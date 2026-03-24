<script setup>
import { ref } from 'vue';
import { useQuizGame } from '../composables/useQuizGame.js';

const props = defineProps({
  quiz: { type: Object, required: true }
});
const emit = defineEmits(['close']);

const quizRef = ref(props.quiz);
const {
  currentQuestionIndex, score, isFinished,
  showCorrection, currentQuestion,
  handleAnswer, nextQuestion, getOptionClass
} = useQuizGame(quizRef);
</script>

<template>
  <div class="fixed inset-0 z-[100] bg-gray-900 flex flex-col h-screen">
    <div class="bg-gray-800 p-4 flex justify-between items-center text-white shadow-md flex-none z-10">
      <div>
        <h2 class="font-bold text-lg">{{ quiz.title }}</h2>
        <span class="text-sm text-gray-400">Question {{ currentQuestionIndex + 1 }} / {{ quiz.questions.length }}</span>
      </div>
      <button @click="emit('close')" class="text-gray-400 hover:text-white text-2xl font-bold px-2">&times;</button>
    </div>

    <div class="flex-grow overflow-y-auto bg-gray-900 p-4">
      <div class="min-h-full flex flex-col items-center justify-center py-8">

        <div v-if="!isFinished" class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col">
          <div class="p-6 sm:p-8 text-center border-b border-gray-100">
            <h3 class="text-xl sm:text-2xl font-bold text-gray-800 leading-relaxed">{{ currentQuestion.text }}</h3>
          </div>
          <div class="p-6 grid grid-cols-1 gap-4">
            <button
              v-for="option in currentQuestion.options"
              :key="option.id"
              @click="handleAnswer(option)"
              :disabled="showCorrection"
              :class="`p-4 rounded-xl text-left border-2 transition-all duration-200 font-medium text-sm sm:text-base ${getOptionClass(option)}`"
            >{{ option.text }}</button>
          </div>
          <div v-if="showCorrection" class="bg-blue-50 p-6 border-t border-blue-100 animate-fade-in-up">
            <div v-if="currentQuestion.explanation" class="text-blue-800 text-sm mb-6 text-center leading-relaxed">
              💡 <strong>Explication :</strong> {{ currentQuestion.explanation }}
            </div>
            <button
              @click="nextQuestion()"
              class="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg text-lg"
            >{{ currentQuestionIndex < quiz.questions.length - 1 ? 'Question Suivante →' : 'Voir les résultats' }}</button>
          </div>
          <div class="h-2 bg-gray-100 w-full mt-auto">
            <div class="h-full bg-blue-500 transition-all duration-500" :style="`width: ${(currentQuestionIndex / quiz.questions.length) * 100}%`"></div>
          </div>
        </div>

        <div v-else class="bg-white rounded-2xl shadow-2xl w-full max-w-md text-center p-8 animate-fade-in-up my-auto">
          <div class="text-6xl mb-4">🏆</div>
          <h2 class="text-3xl font-bold text-gray-900 mb-2">Quiz Terminé !</h2>
          <div class="text-5xl font-black text-blue-600 mb-8">{{ score }} / {{ quiz.questions.length }}</div>
          <button @click="emit('close')" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg">Retour au Dashboard</button>
        </div>

      </div>
    </div>
  </div>
</template>
