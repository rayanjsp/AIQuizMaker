import { ref, computed } from 'vue';

export function useQuizGame(quizRef) {
  const currentQuestionIndex = ref(0);
  const score = ref(0);
  const isFinished = ref(false);
  const selectedOptionId = ref(null);
  const showCorrection = ref(false);

  const currentQuestion = computed(() =>
    quizRef.value ? quizRef.value.questions[currentQuestionIndex.value] : null
  );

  const resetGame = () => {
    currentQuestionIndex.value = 0;
    score.value = 0;
    isFinished.value = false;
    selectedOptionId.value = null;
    showCorrection.value = false;
  };

  const handleAnswer = (option) => {
    if (showCorrection.value) return;
    selectedOptionId.value = option.id;
    showCorrection.value = true;
    if (option.isCorrect) score.value++;
  };

  const nextQuestion = (onFinish) => {
    if (currentQuestionIndex.value < quizRef.value.questions.length - 1) {
      currentQuestionIndex.value++;
      selectedOptionId.value = null;
      showCorrection.value = false;
    } else {
      if (onFinish) onFinish();
      else isFinished.value = true;
    }
  };

  const getOptionClass = (option) => {
    if (!showCorrection.value) return 'bg-gray-100 hover:bg-blue-50 border-gray-200';
    if (option.isCorrect) return 'bg-green-500 text-white border-green-600';
    if (selectedOptionId.value === option.id && !option.isCorrect) return 'bg-red-500 text-white border-red-600';
    return 'bg-gray-100 opacity-50';
  };

  return {
    currentQuestionIndex,
    score,
    isFinished,
    selectedOptionId,
    showCorrection,
    currentQuestion,
    resetGame,
    handleAnswer,
    nextQuestion,
    getOptionClass
  };
}
