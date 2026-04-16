import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuizEditModal from '../QuizEditModal.vue';

// Mocks des dépendances externes
vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));
vi.mock('@/stores/quizStore', () => ({
  useQuizStore: () => ({ updateQuiz: vi.fn() }),
}));
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ authFetch: vi.fn() }),
}));

function makeQuiz(questions) {
  return {
    id: 1,
    title: 'Test Quiz',
    topic: 'HTML',
    difficulty: 'Facile',
    questions,
  };
}

function makeQuestion(text) {
  return {
    text,
    explanation: '',
    options: [
      { text: 'A', isCorrect: true },
      { text: 'B', isCorrect: false },
    ],
  };
}

describe('QuizEditModal — dédoublonnage', () => {
  it("n'affiche pas de warning si aucun doublon", async () => {
    const quiz = makeQuiz([makeQuestion('Question A'), makeQuestion('Question B')]);
    const wrapper = mount(QuizEditModal, { props: { quiz } });
    expect(wrapper.text()).not.toContain('doublon');
  });

  it('affiche un warning quand deux questions sont identiques', async () => {
    const quiz = makeQuiz([makeQuestion('Même question'), makeQuestion('Même question')]);
    const wrapper = mount(QuizEditModal, { props: { quiz } });
    const warnings = wrapper.findAll('p.text-red-500');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].text()).toContain('doublon');
  });

  it('le warning disparaît après correction du doublon', async () => {
    const quiz = makeQuiz([makeQuestion('Même question'), makeQuestion('Même question')]);
    const wrapper = mount(QuizEditModal, { props: { quiz } });

    const textareas = wrapper.findAll('textarea');
    await textareas[1].setValue('Question différente');

    const warnings = wrapper.findAll('p.text-red-500');
    expect(warnings.length).toBe(0);
  });

  it('désactive le bouton Sauvegarder en présence de doublons', async () => {
    const quiz = makeQuiz([makeQuestion('Même question'), makeQuestion('Même question')]);
    const wrapper = mount(QuizEditModal, { props: { quiz } });

    const saveBtn = wrapper.find('button[title]');
    expect(saveBtn.attributes('disabled')).toBeDefined();
  });

  it('réactive le bouton Sauvegarder après correction', async () => {
    const quiz = makeQuiz([makeQuestion('Même question'), makeQuestion('Même question')]);
    const wrapper = mount(QuizEditModal, { props: { quiz } });

    const textareas = wrapper.findAll('textarea');
    await textareas[1].setValue('Question différente');

    const saveBtn = wrapper.find('button[title]');
    expect(saveBtn.attributes('disabled')).toBeUndefined();
  });
});
