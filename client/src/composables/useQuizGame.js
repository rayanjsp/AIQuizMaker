import { ref, computed, watch } from 'vue';

export function useQuizGame(quizRef) {
  const currentQuestionIndex = ref(0);
  const score = ref(0);
  const isFinished = ref(false);
  const selectedOptionIds = ref(new Set());
  const showCorrection = ref(false);

  // Fonctionnalité 3 — récapitulatif
  const userAnswers = ref([]);   // [{ questionId, selectedOptionIds: [], wasCorrect }]
  const userComments = ref([]);  // [{ questionId, comment: '' }]

  const initComments = () => {
    if (quizRef.value) {
      userComments.value = quizRef.value.questions.map(q => ({ questionId: q.id, comment: '' }));
    }
  };
  initComments();
  // Si le quiz est chargé de manière asynchrone (ex : vue publique), on initialise dès qu'il arrive
  watch(quizRef, (val) => { if (val && userComments.value.length === 0) initComments(); }, { immediate: false });

  const currentQuestion = computed(() =>
    quizRef.value ? quizRef.value.questions[currentQuestionIndex.value] : null
  );

  const maxScore = computed(() => {
    if (!quizRef.value) return 0;
    return quizRef.value.questions.reduce((sum, q) => sum + (q.pointValue ?? 1), 0);
  });

  const isMultiAnswer = (question) => {
    if (!question) return false;
    const correctCount = question.options.filter(o => o.isCorrect).length;
    return correctCount !== 1;
  };

  const isCurrentMultiAnswer = computed(() => isMultiAnswer(currentQuestion.value));

  const hasAnyComment = computed(() =>
    userComments.value.some(c => c.comment && c.comment.trim())
  );

  const resetGame = () => {
    currentQuestionIndex.value = 0;
    score.value = 0;
    isFinished.value = false;
    selectedOptionIds.value = new Set();
    showCorrection.value = false;
    userAnswers.value = [];
    initComments();
  };

  // Réponse unique (radio)
  const handleAnswer = (option) => {
    if (showCorrection.value) return;
    selectedOptionIds.value = new Set([option.id]);
    showCorrection.value = true;
    const wasCorrect = option.isCorrect;
    if (wasCorrect) score.value += currentQuestion.value.pointValue ?? 1;
    userAnswers.value.push({
      questionId: currentQuestion.value.id,
      selectedOptionIds: [option.id],
      wasCorrect,
    });
  };

  // Multi-réponses (checkbox)
  const toggleOption = (option) => {
    if (showCorrection.value) return;
    const newSet = new Set(selectedOptionIds.value);
    if (newSet.has(option.id)) newSet.delete(option.id);
    else newSet.add(option.id);
    selectedOptionIds.value = newSet;
  };

  const validateMultiAnswer = () => {
    if (showCorrection.value) return;
    showCorrection.value = true;
    const q = currentQuestion.value;
    const correctIds = new Set(q.options.filter(o => o.isCorrect).map(o => o.id));
    const selected = selectedOptionIds.value;
    const isExact = selected.size === correctIds.size &&
      [...selected].every(id => correctIds.has(id));
    if (isExact) score.value += q.pointValue ?? 1;
    userAnswers.value.push({
      questionId: q.id,
      selectedOptionIds: [...selected],
      wasCorrect: isExact,
    });
  };

  const nextQuestion = (onFinish) => {
    if (currentQuestionIndex.value < quizRef.value.questions.length - 1) {
      currentQuestionIndex.value++;
      selectedOptionIds.value = new Set();
      showCorrection.value = false;
    } else {
      if (onFinish) onFinish();
      else isFinished.value = true;
    }
  };

  const getOptionClass = (option) => {
    if (!showCorrection.value) {
      if (selectedOptionIds.value.has(option.id)) return 'bg-blue-100 border-blue-400 font-medium';
      return 'bg-gray-100 hover:bg-blue-50 border-gray-200';
    }
    if (option.isCorrect) return 'bg-green-500 text-white border-green-600';
    if (selectedOptionIds.value.has(option.id) && !option.isCorrect) return 'bg-red-500 text-white border-red-600';
    return 'bg-gray-100 opacity-50';
  };

  // Classe pour afficher les options dans le récapitulatif
  const getRecapOptionClass = (option, answer) => {
    const wasSelected = answer && answer.selectedOptionIds.includes(option.id);
    if (option.isCorrect && wasSelected) return 'bg-green-100 border-green-400 text-green-800 font-medium';
    if (option.isCorrect && !wasSelected) return 'bg-green-50 border-green-300 text-green-700';
    if (!option.isCorrect && wasSelected) return 'bg-red-100 border-red-400 text-red-800 line-through';
    return 'bg-gray-50 border-gray-200 text-gray-500';
  };

  return {
    currentQuestionIndex,
    score,
    maxScore,
    isFinished,
    selectedOptionIds,
    showCorrection,
    currentQuestion,
    isCurrentMultiAnswer,
    isMultiAnswer,
    userAnswers,
    userComments,
    hasAnyComment,
    resetGame,
    handleAnswer,
    toggleOption,
    validateMultiAnswer,
    nextQuestion,
    getOptionClass,
    getRecapOptionClass,
  };
}
