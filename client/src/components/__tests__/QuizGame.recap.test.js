import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import QuizGame from '../QuizGame.vue';

vi.mock('../../composables/useApi.js', () => ({
  useApi: () => ({ authFetch: vi.fn() }),
}));

function makeOption(id, text, isCorrect) {
  return { id, text, isCorrect };
}

function makeQuestion(id, text) {
  return {
    id,
    text,
    explanation: `Exp ${id}`,
    pointValue: 1,
    options: [
      makeOption(id * 10 + 1, 'Bonne', true),
      makeOption(id * 10 + 2, 'Mauvaise A', false),
      makeOption(id * 10 + 3, 'Mauvaise B', false),
      makeOption(id * 10 + 4, 'Mauvaise C', false),
    ],
  };
}

function makeQuiz(questions) {
  return { id: 1, title: 'Quiz Test', mode: 'standard', questions };
}

async function playAllQuestions(wrapper, quiz) {
  for (let i = 0; i < quiz.questions.length; i++) {
    const buttons = wrapper.findAll('button:not([disabled])');
    const answerBtn = buttons.find(b => b.text() === 'Bonne');
    if (answerBtn) await answerBtn.trigger('click');
    // Cliquer "Question Suivante" ou "Voir les résultats"
    await wrapper.vm.$nextTick();
    const nextBtn = wrapper.findAll('button').find(b =>
      b.text().includes('Suivante') || b.text().includes('résultats')
    );
    if (nextBtn) await nextBtn.trigger('click');
    await wrapper.vm.$nextTick();
  }
}

describe('QuizGame — récapitulatif affiché en fin de quiz', () => {
  it('affiche "Récapitulatif de vos réponses" après toutes les questions', async () => {
    const quiz = makeQuiz([makeQuestion(1, 'Question une')]);
    const wrapper = mount(QuizGame, { props: { quiz } });
    await playAllQuestions(wrapper, quiz);
    expect(wrapper.text()).toContain('Récapitulatif de vos réponses');
  });

  it('affiche toutes les questions dans le récapitulatif', async () => {
    const quiz = makeQuiz([
      makeQuestion(1, 'Question une'),
      makeQuestion(2, 'Question deux'),
    ]);
    const wrapper = mount(QuizGame, { props: { quiz } });
    await playAllQuestions(wrapper, quiz);
    expect(wrapper.text()).toContain('Question une');
    expect(wrapper.text()).toContain('Question deux');
  });

  it('affiche une textarea par question pour les commentaires', async () => {
    const quiz = makeQuiz([makeQuestion(1, 'Q1'), makeQuestion(2, 'Q2')]);
    const wrapper = mount(QuizGame, { props: { quiz } });
    await playAllQuestions(wrapper, quiz);
    const textareas = wrapper.findAll('textarea');
    expect(textareas.length).toBe(2);
  });

  it("le bouton d'export n'est pas visible si aucun commentaire", async () => {
    const quiz = makeQuiz([makeQuestion(1, 'Q1')]);
    const wrapper = mount(QuizGame, { props: { quiz } });
    await playAllQuestions(wrapper, quiz);
    expect(wrapper.text()).not.toContain('Exporter le corrigé personnalisé');
  });

  it("le bouton d'export apparaît quand un commentaire est saisi", async () => {
    const quiz = makeQuiz([makeQuestion(1, 'Q1')]);
    const wrapper = mount(QuizGame, { props: { quiz } });
    await playAllQuestions(wrapper, quiz);
    const textarea = wrapper.find('textarea');
    await textarea.setValue('Mon commentaire !');
    expect(wrapper.text()).toContain('Exporter le corrigé personnalisé');
  });

  it('la textarea est liée au bon questionId', async () => {
    const quiz = makeQuiz([makeQuestion(42, 'Q42')]);
    const wrapper = mount(QuizGame, { props: { quiz } });
    await playAllQuestions(wrapper, quiz);
    const textarea = wrapper.find('textarea');
    await textarea.setValue('Note pour Q42');
    const gameInstance = wrapper.vm;
    const commentEntry = gameInstance.userComments.find(c => c.questionId === 42);
    expect(commentEntry).toBeDefined();
    expect(commentEntry.comment).toBe('Note pour Q42');
  });
});
