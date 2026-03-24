import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useApi } from '../composables/useApi';

export const useQuizStore = defineStore('quiz', () => {
  const router = useRouter();
  const { getToken, getUsername } = useAuth();
  const { authFetch } = useApi();

  const quizzes = ref([]);
  const loading = ref(true);
  const error = ref(null);
  const searchQuery = ref('');
  const username = computed(() => getUsername() || 'Utilisateur');

  const filteredQuizzes = computed(() =>
    quizzes.value.filter(q =>
      q.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  );

  const fetchQuizzes = async () => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    error.value = null;
    try {
      const response = await fetch('/api/quiz/mine', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) { router.push('/login'); return; }
      quizzes.value = await response.json();
    } catch (err) {
      error.value = err.message;
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  const addQuiz = (quiz) => quizzes.value.unshift(quiz);

  const removeQuiz = (id) => {
    quizzes.value = quizzes.value.filter(q => q.id !== id);
  };

  const updateQuizInList = (updatedQuiz) => {
    const index = quizzes.value.findIndex(q => q.id === updatedQuiz.id);
    if (index !== -1) quizzes.value[index] = updatedQuiz;
  };

  const createQuiz = async (data) => {
    const res = await authFetch('/api/quiz/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Erreur création quiz');
    const quiz = json.quiz ?? json;
    quizzes.value.unshift(quiz);
    return quiz;
  };

  const deleteQuiz = async (id) => {
    const res = await authFetch(`/api/quiz/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erreur suppression quiz');
    quizzes.value = quizzes.value.filter(q => q.id !== id);
  };

  const updateQuiz = async (id, data) => {
    const res = await authFetch(`/api/quiz/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erreur sauvegarde quiz');
    const updated = await res.json();
    updateQuizInList(updated);
    return updated;
  };

  const fetchQuizResults = async (id) => {
    const res = await authFetch(`/api/quiz/${id}/results`);
    if (!res.ok) throw new Error('Erreur chargement résultats');
    return res.json();
  };

  return {
    quizzes, loading, error, searchQuery, username,
    filteredQuizzes,
    fetchQuizzes, addQuiz, removeQuiz, updateQuizInList,
    createQuiz, deleteQuiz, updateQuiz, fetchQuizResults,
  };
});
