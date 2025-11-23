<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// --- DONNÉES ---
const quizzes = ref([]);
const loading = ref(true);
const username = localStorage.getItem('username') || 'Utilisateur';

// --- MODALES ---
const showCreateModal = ref(false); // Pour créer
const showDetailModal = ref(false); // Pour voir les détails (Nouveau !)
const showMenu = ref(false);        // Pour le menu 3 points

// --- ÉTATS ---
const isCreating = ref(false);
const newTopic = ref('');
const newDifficulty = ref('Facile');
const selectedQuiz = ref(null);     // Le quiz qu'on regarde en détail

// --- JEU ---
const activeQuiz = ref(null);
const currentQuestionIndex = ref(0);
const score = ref(0);
const isFinished = ref(false);
const selectedOptionId = ref(null);
const showCorrection = ref(false);

// ---------------------------------------------------------
// LOGIQUE API & DASHBOARD
// ---------------------------------------------------------

const logout = () => {
  localStorage.removeItem('token');
  router.push('/');
};

const getToken = () => localStorage.getItem('token');

const fetchQuizzes = async () => {
  const token = getToken();
  if (!token) return router.push('/login');

  try {
    const response = await fetch('/api/quiz/mine', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 401) return logout();
    quizzes.value = await response.json();
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
};

// CRÉER
const handleCreateQuiz = async () => {
  const token = getToken();
  isCreating.value = true;
  try {
    const response = await fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ topic: newTopic.value, difficulty: newDifficulty.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    showCreateModal.value = false;
    newTopic.value = '';
    quizzes.value.unshift(data.quiz); // Ajout direct
  } catch (error) {
    alert("Erreur : " + error.message);
  } finally {
    isCreating.value = false;
  }
};

// SUPPRIMER (Nouveau)
const handleDeleteQuiz = async () => {
  if (!confirm("Voulez-vous vraiment supprimer ce quiz ?")) return;

  const token = getToken();
  try {
    await fetch(`/api/quiz/${selectedQuiz.value.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // On le retire de la liste visuelle
    quizzes.value = quizzes.value.filter(q => q.id !== selectedQuiz.value.id);
    showDetailModal.value = false; // On ferme la modale
  } catch (error) {
    alert("Erreur suppression");
  }
};

// OUVRIR LES DÉTAILS
const openDetail = (quiz) => {
  selectedQuiz.value = quiz;
  showDetailModal.value = true;
  showMenu.value = false; // On cache le menu par défaut
};

// LANCER LE JEU DEPUIS LES DÉTAILS
const startFromDetail = () => {
  showDetailModal.value = false;
  playQuiz(selectedQuiz.value);
};

// ---------------------------------------------------------
// LOGIQUE DU JEU (Modifiée pour le bouton Suivant)
// ---------------------------------------------------------

const playQuiz = (quiz) => {
  activeQuiz.value = quiz;
  currentQuestionIndex.value = 0;
  score.value = 0;
  isFinished.value = false;
  selectedOptionId.value = null;
  showCorrection.value = false;
};

const closeGame = () => activeQuiz.value = null;

const handleAnswer = (option) => {
  if (showCorrection.value) return;

  selectedOptionId.value = option.id;
  showCorrection.value = true; // On affiche la correction

  if (option.isCorrect) score.value++;

  // ON A SUPPRIMÉ LE TIMEOUT ICI !
  // L'utilisateur doit maintenant cliquer sur "Suivant"
};

const nextQuestion = () => {
  if (currentQuestionIndex.value < activeQuiz.value.questions.length - 1) {
    currentQuestionIndex.value++;
    selectedOptionId.value = null;
    showCorrection.value = false;
  } else {
    isFinished.value = true;
  }
};

const currentQuestion = computed(() => activeQuiz.value ? activeQuiz.value.questions[currentQuestionIndex.value] : null);

// Utils
const getDifficultyColor = (diff) => {
  switch(diff?.toLowerCase()) {
    case 'facile': return 'bg-green-100 text-green-800';
    case 'moyen': return 'bg-yellow-100 text-yellow-800';
    case 'difficile': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
const getOptionClass = (option) => {
  if (!showCorrection.value) return 'bg-gray-100 hover:bg-blue-50 border-gray-200';
  if (option.isCorrect) return 'bg-green-500 text-white border-green-600';
  if (selectedOptionId.value === option.id && !option.isCorrect) return 'bg-red-500 text-white border-red-600';
  return 'bg-gray-100 opacity-50';
};

onMounted(fetchQuizzes);
</script>

<template>
  <div class="min-h-screen bg-gray-50 relative">

    <nav class="bg-white shadow-sm sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-blue-600">Mon Espace</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-600 hidden sm:inline">User: <span class="font-bold">{{ username }}</span></span>
          <button @click="logout" class="text-red-500 hover:text-red-700 font-medium text-sm">Déconnexion</button>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-3xl font-bold text-gray-900">Mes Quiz</h2>
        <button @click="showCreateModal = true" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-lg">
          <span>+</span> Nouveau
        </button>
      </div>

      <div v-if="loading" class="text-center py-12 text-gray-500">Chargement...</div>

      <div v-else-if="quizzes.length === 0" class="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="text-6xl mb-4">📂</div>
        <h3 class="text-xl font-medium text-gray-900">Aucun quiz</h3>
        <button @click="showCreateModal = true" class="text-blue-600 font-bold mt-2 hover:underline">Créer le premier</button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
            v-for="quiz in quizzes"
            :key="quiz.id"
            @click="openDetail(quiz)"
            class="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 p-6 flex flex-col cursor-pointer group"
        >
          <div class="flex justify-between items-start mb-4">
            <span :class="`px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(quiz.difficulty)}`">
              {{ quiz.difficulty }}
            </span>
            <span class="text-xs text-gray-400">{{ new Date(quiz.createdAt).toLocaleDateString() }}</span>
          </div>
          <h3 class="text-lg font-bold text-gray-800 mb-2 truncate group-hover:text-blue-600 transition">{{ quiz.title }}</h3>
          <p class="text-sm text-gray-500 mb-4 flex-grow">Sujet : {{ quiz.topic }}</p>
          <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
            <span class="text-sm text-gray-600">❓ {{ quiz.questions?.length || 0 }} Questions</span>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" @click="showCreateModal = false"></div>
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6 animate-fade-in-up">
        <h3 class="text-2xl font-bold text-gray-800 mb-2">Nouveau Quiz IA</h3>
        <form @submit.prevent="handleCreateQuiz" class="space-y-4 mt-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
            <input v-model="newTopic" type="text" placeholder="Ex: Les volcans" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Difficulté</label>
            <select v-model="newDifficulty" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="Facile">Facile</option>
              <option value="Moyen">Moyen</option>
              <option value="Difficile">Difficile</option>
            </select>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button type="button" @click="showCreateModal = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" :disabled="isCreating" class="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
              {{ isCreating ? '...' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showDetailModal && selectedQuiz" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" @click="showDetailModal = false"></div>

      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 p-8 animate-fade-in-up">

        <div class="flex justify-between items-start mb-6 relative">
          <div>
            <span :class="`px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(selectedQuiz.difficulty)}`">
              {{ selectedQuiz.difficulty }}
            </span>
            <h2 class="text-3xl font-bold text-gray-800 mt-2">{{ selectedQuiz.title }}</h2>
          </div>

          <div class="relative">
            <button @click="showMenu = !showMenu" class="p-2 hover:bg-gray-100 rounded-full">
              <span class="text-2xl leading-none text-gray-600">⋮</span>
            </button>

            <div v-if="showMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-20">
              <button class="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                ✏️ Éditer (Bientôt)
              </button>
              <button @click="handleDeleteQuiz" class="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 text-sm">
                🗑️ Supprimer
              </button>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 p-4 rounded-xl mb-6">
          <p class="text-sm text-gray-600 mb-2"><strong>Sujet :</strong> {{ selectedQuiz.topic }}</p>
          <p class="text-sm text-gray-600 mb-2"><strong>Créé le :</strong> {{ new Date(selectedQuiz.createdAt).toLocaleDateString() }}</p>
          <p class="text-sm text-gray-600"><strong>Questions :</strong> {{ selectedQuiz.questions.length }} QCM</p>
        </div>

        <p class="text-gray-500 text-sm mb-8">
          Prêt à tester vos connaissances ? Cliquez sur jouer pour lancer la session interactive.
        </p>

        <div class="flex gap-3">
          <button @click="showDetailModal = false" class="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition">
            Fermer
          </button>
          <button @click="startFromDetail" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
            Jouer Maintenant ▶
          </button>
        </div>

      </div>
    </div>

    <div v-if="activeQuiz" class="fixed inset-0 z-[100] bg-gray-900 flex flex-col">
      <div class="bg-gray-800 p-4 flex justify-between items-center text-white shadow-md">
        <div>
          <h2 class="font-bold text-lg">{{ activeQuiz.title }}</h2>
          <span class="text-sm text-gray-400">Question {{ currentQuestionIndex + 1 }} / {{ activeQuiz.questions.length }}</span>
        </div>
        <button @click="closeGame" class="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
      </div>

      <div class="flex-grow flex items-center justify-center p-4">

        <div v-if="!isFinished" class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
          <div class="p-8 text-center border-b border-gray-100">
            <h3 class="text-2xl font-bold text-gray-800">{{ currentQuestion.text }}</h3>
          </div>

          <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
                v-for="option in currentQuestion.options"
                :key="option.id"
                @click="handleAnswer(option)"
                :disabled="showCorrection"
                :class="`p-4 rounded-xl text-left border-2 transition-all duration-200 font-medium ${getOptionClass(option)}`"
            >
              {{ option.text }}
            </button>
          </div>

          <div v-if="showCorrection" class="bg-blue-50 p-6 border-t border-blue-100 animate-fade-in-up">
            <div v-if="currentQuestion.explanation" class="text-blue-800 text-sm mb-4 text-center">
              💡 <strong>Explication :</strong> {{ currentQuestion.explanation }}
            </div>

            <button
                @click="nextQuestion"
                class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg"
            >
              {{ currentQuestionIndex < activeQuiz.questions.length - 1 ? 'Question Suivante →' : 'Voir les résultats' }}
            </button>
          </div>

          <div class="h-2 bg-gray-100 w-full mt-auto">
            <div class="h-full bg-blue-500 transition-all duration-500" :style="`width: ${((currentQuestionIndex) / activeQuiz.questions.length) * 100}%`"></div>
          </div>
        </div>

        <div v-else class="bg-white rounded-2xl shadow-2xl w-full max-w-md text-center p-8 animate-fade-in-up">
          <div class="text-6xl mb-4">🏆</div>
          <h2 class="text-3xl font-bold text-gray-900 mb-2">Quiz Terminé !</h2>
          <div class="text-5xl font-black text-blue-600 mb-8">{{ score }} / {{ activeQuiz.questions.length }}</div>
          <button @click="closeGame" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg">Retour au Dashboard</button>
        </div>

      </div>
    </div>

  </div>
</template>