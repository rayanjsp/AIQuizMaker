import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import QuizGame from '../QuizGame.vue';

function makeOption(id, text, isCorrect) {
  return { id, text, isCorrect };
}

function makeQuestion(options, pointValue = 1) {
  return { id: 1, text: 'Question ?', explanation: 'Exp', pointValue, options };
}

function makeQuiz(questions, mode = 'standard') {
  return { id: 1, title: 'Test', mode, questions };
}

describe('QuizGame — rendu mode standard (radio)', () => {
  it('affiche des boutons simples (pas de checkbox) pour question à 1 réponse', () => {
    const quiz = makeQuiz([
      makeQuestion([
        makeOption(1, 'A', true),
        makeOption(2, 'B', false),
        makeOption(3, 'C', false),
        makeOption(4, 'D', false),
      ]),
    ]);
    const wrapper = mount(QuizGame, { props: { quiz } });
    // Pas de case à cocher (svg de checkmark)
    expect(wrapper.findAll('svg').length).toBe(0);
  });
});

describe('QuizGame — rendu mode expert (checkbox)', () => {
  it('affiche des cases à cocher pour question multi-réponses', () => {
    const quiz = makeQuiz([
      makeQuestion([
        makeOption(1, 'A', true),
        makeOption(2, 'B', true),
        makeOption(3, 'C', false),
        makeOption(4, 'D', false),
      ], 2),
    ], 'expert');
    const wrapper = mount(QuizGame, { props: { quiz } });
    // Le message "Plusieurs réponses possibles" est visible
    expect(wrapper.text()).toContain('Plusieurs réponses possibles');
  });

  it('affiche le bouton Valider pour question multi-réponses', () => {
    const quiz = makeQuiz([
      makeQuestion([
        makeOption(1, 'A', true),
        makeOption(2, 'B', true),
        makeOption(3, 'C', false),
        makeOption(4, 'D', false),
      ], 2),
    ], 'expert');
    const wrapper = mount(QuizGame, { props: { quiz } });
    expect(wrapper.text()).toContain('Valider mes réponses');
  });

  it('affiche le badge EXPERT dans le header', () => {
    const quiz = makeQuiz([
      makeQuestion([makeOption(1, 'A', true), makeOption(2, 'B', false), makeOption(3, 'C', false), makeOption(4, 'D', false)]),
    ], 'expert');
    const wrapper = mount(QuizGame, { props: { quiz } });
    expect(wrapper.text()).toContain('EXPERT');
  });

  it('affiche radio (pas de checkbox) pour question à 1 réponse en mode expert', () => {
    const quiz = makeQuiz([
      makeQuestion([
        makeOption(1, 'A', true),
        makeOption(2, 'B', false),
        makeOption(3, 'C', false),
        makeOption(4, 'D', false),
      ], 1),
    ], 'expert');
    const wrapper = mount(QuizGame, { props: { quiz } });
    // Pas de message multi-réponses
    expect(wrapper.text()).not.toContain('Plusieurs réponses possibles');
    // Pas de bouton Valider
    expect(wrapper.text()).not.toContain('Valider mes réponses');
  });
});
