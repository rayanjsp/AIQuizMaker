<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from "vue-toastification";

const toast = useToast();

const router = useRouter();
const creationMode = ref('topic'); // 'topic' ou 'pdf'
const pdfFile = ref(null);
const newNbQuestions = ref(5);

// Pour gérer le fichier sélectionné
const handleFileUpload = (event) => {
  pdfFile.value = event.target.files[0];
};
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
const detailTab = ref('infos'); // 'infos' ou 'results'
const quizResults = ref([]); // Stocker les scores

// Computed pour le lien
const publicLink = computed(() => {
  if(!selectedQuiz.value) return '';
  return `${window.location.origin}/play/${selectedQuiz.value.publicId}`;
});

// Activer/Désactiver
const togglePublic = async () => {
  const token = getToken();
  try {
    const res = await fetch(`/api/quiz/${selectedQuiz.value.id}/toggle-public`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    selectedQuiz.value.isPublic = data.isPublic; // Mise à jour locale
  } catch (e) { alert("Erreur réseau"); }
};

// Copier
const copyLink = () => {
  navigator.clipboard.writeText(publicLink.value);
  toast.success("Lien copié !");
};


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
    let response;

    if (creationMode.value === 'topic') {
      // MODE CLASSIQUE
      response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ topic: newTopic.value, difficulty: newDifficulty.value, nbQuestions: newNbQuestions.value })
      });
    } else {
      // MODE PDF (FormData obligatoire pour les fichiers)
      if (!pdfFile.value) throw new Error("Veuillez sélectionner un PDF");

      const formData = new FormData();
      formData.append('pdf', pdfFile.value); // Le fichier
      formData.append('topic', newTopic.value); // Le nom du quiz
      formData.append('difficulty', newDifficulty.value);
      formData.append('nbQuestions', newNbQuestions.value);

      response = await fetch('/api/quiz/generate-from-pdf', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // Pas de Content-Type, le navigateur le met tout seul pour FormData !
        body: formData
      });
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error);

    showCreateModal.value = false;
    newTopic.value = '';
    pdfFile.value = null;
    quizzes.value.unshift(data.quiz);

  } catch (error) {
    toast.error("Erreur : " + error.message);
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
    toast.error("Erreur suppression");
  }
};
// TÉLÉCHARGER PDF
// TÉLÉCHARGER PDF
const downloadPdf = async (isCorrection) => {
  if (!selectedQuiz.value) return;

  const token = localStorage.getItem('token'); // On utilise localStorage directement ou ta fonction getToken()
  const quizId = selectedQuiz.value.id;
  const endpoint = isCorrection ? 'pdf-correction' : 'pdf';

  try {
    // On demande le fichier au serveur
    const response = await fetch(`/api/quiz/${quizId}/${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if(!response.ok) throw new Error("Erreur téléchargement");

    // Magie pour télécharger le fichier
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `Quiz-${selectedQuiz.value.title}-${isCorrection ? 'Correction' : 'Sujet'}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (e) {
    console.error(e);
    toast.error("Impossible de générer le PDF. Vérifiez que le serveur tourne.");
  }
};
// OUVRIR LES DÉTAILS


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


// --- Résulat publique ---
const fetchResults = async () => {
  if (!selectedQuiz.value) return;
  try {
    const token = getToken();
    const res = await fetch(`/api/quiz/${selectedQuiz.value.id}/results`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    quizResults.value = await res.json();
  } catch (e) { console.error(e); }
};

// Modifier openDetail pour reset l'onglet
const openDetail = (quiz) => {
  selectedQuiz.value = quiz;
  showDetailModal.value = true;
  showMenu.value = false;
  detailTab.value = 'infos'; // On revient sur l'onglet principal
  quizResults.value = []; // Reset
};

// --- ÉDITION ---
const showEditModal = ref(false);
const editingQuiz = ref(null); // Copie locale du quiz pour ne pas casser l'affichage si on annule
const aiLoading = ref(false);  // Spinner pour le petit robot

// Ouvrir l'éditeur (Clone le quiz pour ne pas modifier l'original direct)
const openEditModal = (quiz) => {
  // On fait une "copie profonde" pour casser le lien de référence
  editingQuiz.value = JSON.parse(JSON.stringify(quiz));
  showEditModal.value = true;
  showMenu.value = false;
  showDetailModal.value = false;
};

// Ajouter une question vide
const addQuestion = () => {
  editingQuiz.value.questions.push({
    text: "Nouvelle question",
    explanation: "",
    options: [
      { text: "Choix 1", isCorrect: true },
      { text: "Choix 2", isCorrect: false },
      { text: "Choix 3", isCorrect: false },
      { text: "Choix 4", isCorrect: false },
    ]
  });
};

// Supprimer une question
const removeQuestion = (index) => {
  editingQuiz.value.questions.splice(index, 1);
};

// LE ROBOT 🤖 : Générer une question
// LE ROBOT 🤖 : Générer une question COMPLÈTE
const aiGenerateQuestion = async (index) => {
  aiLoading.value = true;
  try {
    const token = getToken();

    // 1. On prépare la liste des questions actuelles pour éviter les doublons
    // On prend le texte de toutes les questions SAUF celle qu'on est en train de modifier
    const currentQuestions = editingQuiz.value.questions
        .filter((_, i) => i !== index)
        .map(q => q.text)
        .filter(t => t && t.length > 5); // On ignore les questions vides

    const response = await fetch('/api/quiz/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        type: 'question',
        context: editingQuiz.value.topic, // Le sujet global du quiz
        difficulty: editingQuiz.value.difficulty, // La difficulté du quiz
        existingQuestions: currentQuestions // La liste pour éviter les doublons
      })
    });

    const data = await response.json();

    // 2. On remplit TOUT d'un coup
    editingQuiz.value.questions[index].text = data.text;
    editingQuiz.value.questions[index].explanation = data.explanation;
    editingQuiz.value.questions[index].options = data.options;

  } catch (e) {
    toast.error("Erreur IA : " + e.message);
  } finally {
    aiLoading.value = false;
  }
};

// LE ROBOT 🤖 : Générer les options
const aiGenerateOptions = async (index) => {
  const qText = editingQuiz.value.questions[index].text;
  if(!qText || qText.length < 5) return toast.error("Écrivez d'abord une question !");

  aiLoading.value = true;
  try {
    const token = getToken();
    const response = await fetch('/api/quiz/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ type: 'options', context: qText, globalTopic: editingQuiz.value.topic})
    });
    const data = await response.json();
    // On remplace les options
    editingQuiz.value.questions[index].options = data;
  } catch (e) { toast.error("Erreur IA"); }
  finally { aiLoading.value = false; }
};

// SAUVEGARDER TOUT
const saveQuiz = async () => {
  try {
    const token = getToken();
    await fetch(`/api/quiz/${editingQuiz.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(editingQuiz.value)
    });

    // On met à jour la liste locale et on ferme
    const index = quizzes.value.findIndex(q => q.id === editingQuiz.value.id);
    if(index !== -1) quizzes.value[index] = editingQuiz.value;

    showEditModal.value = false;
    toast.success("Quiz mis à jour !");
  } catch (e) { toast.error("Erreur sauvegarde"); }
};
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
        <h3 class="text-2xl font-bold text-gray-800 mb-4">Nouveau Quiz IA</h3>

        <div class="flex border-b border-gray-200 mb-4">
          <button
              @click="creationMode = 'topic'"
              :class="`flex-1 pb-2 font-bold ${creationMode === 'topic' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`"
          >
            Par Sujet
          </button>
          <button
              @click="creationMode = 'pdf'"
              :class="`flex-1 pb-2 font-bold ${creationMode === 'pdf' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`"
          >
            Par PDF 📄
          </button>
        </div>

        <form @submit.prevent="handleCreateQuiz" class="space-y-4">

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ creationMode === 'topic' ? 'Sujet du quiz' : 'Nom du Quiz' }}
            </label>
            <input v-model="newTopic" type="text" placeholder="Ex: Histoire Géo Chapitre 1" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>

          <div v-if="creationMode === 'pdf'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Votre cours (PDF)</label>
            <input @change="handleFileUpload" type="file" accept="application/pdf" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
            <p class="text-xs text-gray-400 mt-1">Max 5MB. Le texte sera extrait pour générer les questions.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Difficulté</label>
            <select v-model="newDifficulty" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="Facile">Facile</option>
              <option value="Moyen">Moyen</option>
              <option value="Difficile">Difficile</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre de questions</label>
            <div class="flex items-center gap-4">
              <input
                  type="range"
                  v-model.number="newNbQuestions"
                  min="5"
                  max="30"
                  step="5"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              >
              <span class="text-blue-600 font-bold w-12 text-right">{{ newNbQuestions }}</span>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button type="button" @click="showCreateModal = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" :disabled="isCreating" class="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
              {{ isCreating ? 'Analyse & Génération...' : 'Créer' }}
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
              <button @click="openEditModal(selectedQuiz)" class="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                ✏️ Éditer
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

        <div class="flex gap-3 mb-6">
          <button
              @click="downloadPdf(false)"
              class="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition"
          >
            📄 Quiz PDF
          </button>
          <button
              @click="downloadPdf(true)"
              class="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-green-700 rounded-lg font-medium flex items-center justify-center gap-2 transition"
          >
            ✅ PDF de la Correction
          </button>
        </div>

        <div class="mt-6 bg-purple-50 p-4 rounded-xl border border-purple-100">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-bold text-purple-900 flex items-center gap-2">
              🌍 Partage Public
              <span v-if="selectedQuiz.isPublic" class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Actif</span>
              <span v-else class="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full">Inactif</span>
            </h4>

            <button
                @click="togglePublic"
                :class="`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${selectedQuiz.isPublic ? 'bg-green-500' : 'bg-gray-300'}`"
            >
              <div :class="`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${selectedQuiz.isPublic ? 'translate-x-6' : 'translate-x-0'}`"></div>
            </button>
          </div>

          <p class="text-xs text-purple-700 mb-3">
            {{ selectedQuiz.isPublic ? 'Le lien est accessible à tous.' : 'Activez pour obtenir un lien de partage.' }}
          </p>

          <div v-if="selectedQuiz.isPublic" class="flex gap-2">
            <input readonly :value="publicLink" class="flex-grow text-xs bg-white border border-purple-200 rounded px-3 text-gray-600 select-all">
            <button @click="copyLink" class="text-xs bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700">Copier</button>
          </div>
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

    <div v-if="activeQuiz" class="fixed inset-0 z-[100] bg-gray-900 flex flex-col h-screen">

      <div class="bg-gray-800 p-4 flex justify-between items-center text-white shadow-md flex-none z-10">
        <div>
          <h2 class="font-bold text-lg">{{ activeQuiz.title }}</h2>
          <span class="text-sm text-gray-400">Question {{ currentQuestionIndex + 1 }} / {{ activeQuiz.questions.length }}</span>
        </div>
        <button @click="closeGame" class="text-gray-400 hover:text-white text-2xl font-bold px-2">&times;</button>
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
              >
                {{ option.text }}
              </button>
            </div>

            <div v-if="showCorrection" class="bg-blue-50 p-6 border-t border-blue-100 animate-fade-in-up">
              <div v-if="currentQuestion.explanation" class="text-blue-800 text-sm mb-6 text-center leading-relaxed">
                💡 <strong>Explication :</strong> {{ currentQuestion.explanation }}
              </div>

              <button
                  @click="nextQuestion"
                  class="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg text-lg"
              >
                {{ currentQuestionIndex < activeQuiz.questions.length - 1 ? 'Question Suivante →' : 'Voir les résultats' }}
              </button>
            </div>

            <div class="h-2 bg-gray-100 w-full mt-auto">
              <div class="h-full bg-blue-500 transition-all duration-500" :style="`width: ${((currentQuestionIndex) / activeQuiz.questions.length) * 100}%`"></div>
            </div>
          </div>

          <div v-else class="bg-white rounded-2xl shadow-2xl w-full max-w-md text-center p-8 animate-fade-in-up my-auto">
            <div class="text-6xl mb-4">🏆</div>
            <h2 class="text-3xl font-bold text-gray-900 mb-2">Quiz Terminé !</h2>
            <div class="text-5xl font-black text-blue-600 mb-8">{{ score }} / {{ activeQuiz.questions.length }}</div>
            <button @click="closeGame" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg">Retour au Dashboard</button>
          </div>

        </div>
      </div>
    </div>

  </div>
  <div v-if="showEditModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm" @click="showEditModal = false"></div>

    <div class="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col relative z-10 overflow-hidden animate-fade-in-up">

      <div class="bg-white p-4 border-b flex justify-between items-center">
        <h3 class="text-xl font-bold text-gray-800">Éditeur de Quiz</h3>
        <div class="flex gap-2">
          <button @click="showEditModal = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button @click="saveQuiz" class="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg">
            💾 Sauvegarder tout
          </button>
        </div>
      </div>

      <div class="flex-grow overflow-y-auto p-6 space-y-8">

        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <label class="block text-sm font-bold text-gray-700 mb-2">Titre du Quiz</label>
          <input v-model="editingQuiz.title" class="w-full text-xl font-bold border-b-2 border-gray-300 focus:border-blue-600 outline-none px-2 py-1 bg-transparent" type="text">
        </div>




        <div v-for="(question, qIndex) in editingQuiz.questions" :key="qIndex" class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group">

          <button @click="removeQuestion(qIndex)" class="absolute top-4 right-4 text-gray-300 hover:text-red-500 text-xl font-bold" title="Supprimer la question">
            &times;
          </button>

          <div class="mb-6">
            <label class="flex justify-between text-sm font-bold text-gray-700 mb-2">
              <span>Question {{ qIndex + 1 }}</span>
              <button @click="aiGenerateQuestion(qIndex)" class="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                🤖 Générer avec IA
              </button>
            </label>
            <textarea v-model="question.text" rows="2" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Écrivez votre question ici..."></textarea>
          </div>

          <div class="space-y-3">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Réponses</span>
              <button @click="aiGenerateOptions(qIndex)" class="text-purple-600 hover:text-purple-800 text-xs flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
                🤖 Générer réponses
              </button>
            </div>

            <div v-for="(option, oIndex) in question.options" :key="oIndex" class="flex items-center gap-3">
              <input
                  type="radio"
                  :name="'correct-' + qIndex"
                  :checked="option.isCorrect"
                  @change="question.options.forEach(o => o.isCorrect = false); option.isCorrect = true"
                  class="w-5 h-5 text-green-600 focus:ring-green-500 cursor-pointer"
                  title="Marquer comme bonne réponse"
              >
              <input
                  v-model="option.text"
                  type="text"
                  class="flex-grow p-2 border rounded hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition"
                  :class="option.isCorrect ? 'border-green-500 bg-green-50 font-medium' : 'border-gray-300'"
              >
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