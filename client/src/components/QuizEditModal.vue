<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'vue-toastification';
import { useQuizStore } from '@/stores/quizStore';
import { useApi } from '@/composables/useApi';

const props = defineProps({
  quiz: { type: Object, required: true }
});
const emit = defineEmits(['saved', 'close']);
const toast = useToast();
const quizStore = useQuizStore();
const { authFetch } = useApi();

const editingQuiz = ref(JSON.parse(JSON.stringify(props.quiz)));
const aiLoading = ref(false);
const isSaving = ref(false);

// --- DÉDOUBLONNAGE FRONTEND ---
function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const duplicateIndexes = computed(() => {
  const seen = new Map();
  const duplicates = new Set();
  editingQuiz.value.questions.forEach((q, i) => {
    const norm = normalizeText(q.text);
    if (norm.length < 3) return;
    if (seen.has(norm)) {
      duplicates.add(i);
      duplicates.add(seen.get(norm));
    } else {
      seen.set(norm, i);
    }
  });
  return duplicates;
});

const hasDuplicates = computed(() => duplicateIndexes.value.size > 0);

const addQuestion = () => {
  editingQuiz.value.questions.push({
    text: 'Nouvelle question',
    explanation: '',
    options: [
      { text: 'Choix 1', isCorrect: true },
      { text: 'Choix 2', isCorrect: false },
      { text: 'Choix 3', isCorrect: false },
      { text: 'Choix 4', isCorrect: false }
    ]
  });
};

const removeQuestion = (index) => {
  editingQuiz.value.questions.splice(index, 1);
};

const aiGenerateQuestion = async (index) => {
  aiLoading.value = true;
  try {
    const currentQuestions = editingQuiz.value.questions
      .filter((_, i) => i !== index)
      .map(q => q.text)
      .filter(t => t && t.length > 5);
    const response = await authFetch('/api/quiz/assist', {
      method: 'POST',
      body: JSON.stringify({
        type: 'question',
        context: editingQuiz.value.topic,
        difficulty: editingQuiz.value.difficulty,
        existingQuestions: currentQuestions
      })
    });
    const data = await response.json();
    editingQuiz.value.questions[index].text = data.text;
    editingQuiz.value.questions[index].explanation = data.explanation;
    editingQuiz.value.questions[index].options = data.options;
  } catch (e) {
    toast.error('Erreur IA : ' + (e.message || 'Une erreur est survenue'));
  } finally {
    aiLoading.value = false;
  }
};

const aiGenerateOptions = async (index) => {
  const qText = editingQuiz.value.questions[index].text;
  if (!qText || qText.length < 5) return toast.error('Écrivez d\'abord une question !');
  aiLoading.value = true;
  try {
    const response = await authFetch('/api/quiz/assist', {
      method: 'POST',
      body: JSON.stringify({ type: 'options', context: qText, globalTopic: editingQuiz.value.topic })
    });
    const data = await response.json();
    editingQuiz.value.questions[index].options = data;
  } catch (e) {
    toast.error(e.message || 'Erreur IA lors de la génération des réponses');
  } finally {
    aiLoading.value = false;
  }
};

const saveQuiz = async () => {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    const updated = await quizStore.updateQuiz(editingQuiz.value.id, editingQuiz.value);
    toast.success('Quiz mis à jour !');
    emit('saved', updated);
  } catch (e) {
    toast.error(e.message || 'Erreur lors de la sauvegarde');
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm" @click="emit('close')"></div>
    <div class="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col relative z-10 overflow-hidden animate-fade-in-up">

      <div class="bg-white p-4 border-b flex justify-between items-center">
        <h3 class="text-xl font-bold text-gray-800">Éditeur de Quiz</h3>
        <div class="flex gap-2">
          <button @click="emit('close')" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button @click="saveQuiz" :disabled="isSaving || hasDuplicates" :title="hasDuplicates ? 'Corrigez les questions en doublon avant de sauvegarder' : ''" class="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg disabled:opacity-50">
            {{ isSaving ? 'Sauvegarde...' : '💾 Sauvegarder tout' }}
          </button>
        </div>
      </div>

      <div class="flex-grow overflow-y-auto p-6 space-y-8">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <label class="block text-sm font-bold text-gray-700 mb-2">Titre du Quiz</label>
          <input v-model="editingQuiz.title" class="w-full text-xl font-bold border-b-2 border-gray-300 focus:border-blue-600 outline-none px-2 py-1 bg-transparent" type="text">
        </div>

        <div v-for="(question, qIndex) in editingQuiz.questions" :key="qIndex" class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group">
          <button @click="removeQuestion(qIndex)" class="absolute top-4 right-4 text-gray-300 hover:text-red-500 text-xl font-bold">&times;</button>

          <div class="mb-6">
            <label class="flex justify-between text-sm font-bold text-gray-700 mb-2">
              <span>Question {{ qIndex + 1 }}</span>
              <button @click="aiGenerateQuestion(qIndex)" :disabled="aiLoading" class="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 disabled:opacity-50">
                🤖 Générer avec IA
              </button>
            </label>
            <textarea v-model="question.text" rows="2" class="w-full p-3 border rounded-lg focus:ring-2 outline-none" :class="duplicateIndexes.has(qIndex) ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'" placeholder="Écrivez votre question ici..."></textarea>
            <p v-if="duplicateIndexes.has(qIndex)" class="text-red-500 text-xs mt-1 font-medium">Question en doublon — modifiez-la avant de sauvegarder.</p>
          </div>

          <div class="space-y-3">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Réponses</span>
              <button @click="aiGenerateOptions(qIndex)" :disabled="aiLoading" class="text-purple-600 hover:text-purple-800 text-xs flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-full border border-purple-100 disabled:opacity-50">
                🤖 Générer réponses
              </button>
            </div>
            <div v-for="(option, oIndex) in question.options" :key="oIndex" class="flex items-center gap-3">
              <input type="radio" :name="'correct-' + qIndex" :checked="option.isCorrect" @change="question.options.forEach(o => o.isCorrect = false); option.isCorrect = true" class="w-5 h-5 text-green-600 focus:ring-green-500 cursor-pointer">
              <input v-model="option.text" type="text" class="flex-grow p-2 border rounded hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition" :class="option.isCorrect ? 'border-green-500 bg-green-50 font-medium' : 'border-gray-300'">
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-100">
            <label class="text-xs font-bold text-gray-500">Explication (Correction)</label>
            <input v-model="question.explanation" type="text" class="w-full mt-1 p-2 text-sm bg-gray-50 border rounded text-gray-600" placeholder="Pourquoi est-ce la bonne réponse ?">
          </div>
        </div>

        <button @click="addQuestion" class="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2">
          <span>+</span> Ajouter une question
        </button>
      </div>

    </div>
  </div>
</template>
