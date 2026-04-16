import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useQuizGame } from '../useQuizGame.js';

function makeQuiz(questions) {
  return ref({
    mode: 'expert',
    questions,
  });
}

function makeQuestion({ correctIndexes = [0], pointValue = 1, optCount = 4 } = {}) {
  return {
    id: Math.random(),
    text: 'Question ?',
    explanation: 'Explication',
    pointValue,
    options: Array.from({ length: optCount }, (_, i) => ({
      id: i + 1,
      text: `Option ${i + 1}`,
      isCorrect: correctIndexes.includes(i),
    })),
  };
}

describe('useQuizGame — isMultiAnswer', () => {
  it('retourne false si exactement 1 bonne réponse', () => {
    const q = makeQuestion({ correctIndexes: [0] });
    const quizRef = makeQuiz([q]);
    const { isMultiAnswer } = useQuizGame(quizRef);
    expect(isMultiAnswer(q)).toBe(false);
  });

  it('retourne true si 2 bonnes réponses', () => {
    const q = makeQuestion({ correctIndexes: [0, 1] });
    const quizRef = makeQuiz([q]);
    const { isMultiAnswer } = useQuizGame(quizRef);
    expect(isMultiAnswer(q)).toBe(true);
  });

  it('retourne true si aucune bonne réponse', () => {
    const q = makeQuestion({ correctIndexes: [] });
    const quizRef = makeQuiz([q]);
    const { isMultiAnswer } = useQuizGame(quizRef);
    expect(isMultiAnswer(q)).toBe(true);
  });
});

describe('useQuizGame — score expert (pointValue)', () => {
  it('ajoute pointValue au score si réponse unique correcte', () => {
    const q = makeQuestion({ correctIndexes: [0], pointValue: 3 });
    const quizRef = makeQuiz([q]);
    const { handleAnswer, score } = useQuizGame(quizRef);
    handleAnswer(q.options[0]); // correcte
    expect(score.value).toBe(3);
  });

  it("n'ajoute rien si réponse unique incorrecte", () => {
    const q = makeQuestion({ correctIndexes: [0], pointValue: 3 });
    const quizRef = makeQuiz([q]);
    const { handleAnswer, score } = useQuizGame(quizRef);
    handleAnswer(q.options[1]); // incorrecte
    expect(score.value).toBe(0);
  });

  it('ajoute pointValue si sélection multi exacte', () => {
    const q = makeQuestion({ correctIndexes: [0, 1], pointValue: 2 });
    const quizRef = makeQuiz([q]);
    const { toggleOption, validateMultiAnswer, score } = useQuizGame(quizRef);
    toggleOption(q.options[0]);
    toggleOption(q.options[1]);
    validateMultiAnswer();
    expect(score.value).toBe(2);
  });

  it("n'ajoute rien si sélection multi partielle", () => {
    const q = makeQuestion({ correctIndexes: [0, 1], pointValue: 2 });
    const quizRef = makeQuiz([q]);
    const { toggleOption, validateMultiAnswer, score } = useQuizGame(quizRef);
    toggleOption(q.options[0]); // seulement 1 des 2 correctes
    validateMultiAnswer();
    expect(score.value).toBe(0);
  });

  it("n'ajoute rien si sélection inclut une mauvaise option", () => {
    const q = makeQuestion({ correctIndexes: [0, 1], pointValue: 2 });
    const quizRef = makeQuiz([q]);
    const { toggleOption, validateMultiAnswer, score } = useQuizGame(quizRef);
    toggleOption(q.options[0]);
    toggleOption(q.options[1]);
    toggleOption(q.options[2]); // mauvaise en plus
    validateMultiAnswer();
    expect(score.value).toBe(0);
  });

  it('calcule le score cumulé sur plusieurs questions', () => {
    const q1 = makeQuestion({ correctIndexes: [0], pointValue: 1 });
    const q2 = makeQuestion({ correctIndexes: [0, 1], pointValue: 2 });
    const quizRef = makeQuiz([q1, q2]);
    const { handleAnswer, toggleOption, validateMultiAnswer, nextQuestion, score } = useQuizGame(quizRef);

    handleAnswer(q1.options[0]); // +1
    nextQuestion();
    toggleOption(q2.options[0]);
    toggleOption(q2.options[1]);
    validateMultiAnswer(); // +2
    expect(score.value).toBe(3);
  });

  it('maxScore = somme de tous les pointValues', () => {
    const q1 = makeQuestion({ correctIndexes: [0], pointValue: 1 });
    const q2 = makeQuestion({ correctIndexes: [0, 1], pointValue: 2 });
    const quizRef = makeQuiz([q1, q2]);
    const { maxScore } = useQuizGame(quizRef);
    expect(maxScore.value).toBe(3);
  });
});
