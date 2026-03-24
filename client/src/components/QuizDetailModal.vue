<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'vue-toastification';
import { useQuizStore } from '@/stores/quizStore';
import { getDifficultyColor } from '@/utils/difficultyHelpers';
import { useApi } from '@/composables/useApi';

const props = defineProps({
  quiz: { type: Object, required: true }
});
const emit = defineEmits(['close', 'deleted', 'edit', 'play', 'update:quiz']);
const toast = useToast();
const quizStore = useQuizStore();
const { getToken } = useApi();

const detailTab = ref('infos');
const quizResults = ref([]);
const showMenu = ref(false);

const publicLink = computed(() =>
  props.quiz ? `${window.location.origin}/play/${props.quiz.publicId}` : ''
);

const fetchResults = async () => {
  try {
    quizResults.value = await quizStore.fetchQuizResults(props.quiz.id);
  } catch (e) {
    toast.error(e.message || 'Erreur chargement des résultats');
  }
};

const togglePublic = async () => {
  try {
    const res = await fetch(`/api/quiz/${props.quiz.id}/toggle-public`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    emit('update:quiz', { ...props.quiz, isPublic: data.isPublic });
  } catch (e) {
    toast.error('Erreur réseau');
  }
};

const copyLink = () => {
  navigator.clipboard.writeText(publicLink.value);
  toast.success('Lien copié !');
};

const downloadPdf = async (isCorrection) => {
  const endpoint = isCorrection ? 'pdf-correction' : 'pdf';
  try {
    const response = await fetch(`/api/quiz/${props.quiz.id}/${endpoint}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!response.ok) throw new Error('Erreur téléchargement');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Quiz-${props.quiz.title}-${isCorrection ? 'Correction' : 'Sujet'}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (e) {
    toast.error('Impossible de générer le PDF. Vérifiez que le serveur tourne.');
  }
};

const handleDeleteQuiz = async () => {
  if (!confirm('Voulez-vous vraiment supprimer ce quiz ?')) return;
  try {
    await quizStore.deleteQuiz(props.quiz.id);
    emit('deleted', props.quiz.id);
  } catch (e) {
    toast.error(e.message || 'Erreur lors de la suppression');
  }
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" @click="emit('close')"></div>
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 p-8 animate-fade-in-up">

      <div class="flex justify-between items-start mb-6 relative">
        <div>
          <span :class="`px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(quiz.difficulty)}`">{{ quiz.difficulty }}</span>
          <h2 class="text-3xl font-bold text-gray-800 mt-2">{{ quiz.title }}</h2>
        </div>
        <div class="relative">
          <button @click="showMenu = !showMenu" class="p-2 hover:bg-gray-100 rounded-full">
            <span class="text-2xl leading-none text-gray-600">⋮</span>
          </button>
          <div v-if="showMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-20">
            <button @click="emit('edit', quiz); showMenu = false" class="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">✏️ Éditer</button>
            <button @click="handleDeleteQuiz" class="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 text-sm">🗑️ Supprimer</button>
          </div>
        </div>
      </div>

      <div class="flex border-b border-gray-200 mb-6">
        <button @click="detailTab = 'infos'" :class="`flex-1 pb-2 font-bold text-sm ${detailTab === 'infos' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`">Informations & Partage</button>
        <button @click="detailTab = 'results'; fetchResults()" :class="`flex-1 pb-2 font-bold text-sm ${detailTab === 'results' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`">Résultats Joueurs</button>
      </div>

      <div v-if="detailTab === 'results'">
        <div v-if="quizResults.length === 0" class="text-center py-8 text-gray-500 text-sm">Aucun joueur n'a encore terminé ce quiz.</div>
        <div v-else class="overflow-y-auto max-h-64">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-600 font-bold">
              <tr>
                <th class="p-3 rounded-tl-lg">Joueur</th>
                <th class="p-3">Score</th>
                <th class="p-3 rounded-tr-lg">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="res in quizResults" :key="res.id">
                <td class="p-3 font-medium text-gray-800">{{ res.guestName || 'Anonyme' }}</td>
                <td class="p-3">
                  <span :class="`px-2 py-1 rounded text-xs font-bold ${res.score >= res.totalQuestions/2 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`">{{ res.score }} / {{ res.totalQuestions }}</span>
                </td>
                <td class="p-3 text-gray-500 text-xs">{{ new Date(res.completedAt).toLocaleDateString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded-xl mb-4 mt-2">
        <p class="text-sm text-gray-600 mb-2"><strong>Sujet :</strong> {{ quiz.topic }}</p>
        <p class="text-sm text-gray-600 mb-2"><strong>Créé le :</strong> {{ new Date(quiz.createdAt).toLocaleDateString() }}</p>
        <p class="text-sm text-gray-600"><strong>Questions :</strong> {{ quiz.questions.length }} QCM</p>
      </div>

      <div class="flex gap-3 mb-4">
        <button @click="downloadPdf(false)" class="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition">📄 Quiz PDF</button>
        <button @click="downloadPdf(true)" class="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-green-700 rounded-lg font-medium flex items-center justify-center gap-2 transition">✅ PDF de la Correction</button>
      </div>

      <div class="mt-2 bg-purple-50 p-4 rounded-xl border border-purple-100 mb-6">
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-bold text-purple-900 flex items-center gap-2">
            🌍 Partage Public
            <span v-if="quiz.isPublic" class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Actif</span>
            <span v-else class="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full">Inactif</span>
          </h4>
          <button @click="togglePublic" :class="`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${quiz.isPublic ? 'bg-green-500' : 'bg-gray-300'}`">
            <div :class="`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${quiz.isPublic ? 'translate-x-6' : 'translate-x-0'}`"></div>
          </button>
        </div>
        <p class="text-xs text-purple-700 mb-3">{{ quiz.isPublic ? 'Le lien est accessible à tous.' : 'Activez pour obtenir un lien de partage.' }}</p>
        <div v-if="quiz.isPublic" class="flex gap-2">
          <input readonly :value="publicLink" class="flex-grow text-xs bg-white border border-purple-200 rounded px-3 text-gray-600 select-all">
          <button @click="copyLink" class="text-xs bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700">Copier</button>
        </div>
      </div>

      <div class="flex gap-3">
        <button @click="emit('close')" class="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition">Fermer</button>
        <button @click="emit('play', quiz)" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">Jouer Maintenant ▶</button>
      </div>

    </div>
  </div>
</template>
