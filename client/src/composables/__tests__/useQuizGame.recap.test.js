import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useQuizGame } from '../useQuizGame.js';

function makeQuiz(questions) {
  return ref({ id: 1, mode: 'standard', questions });
}

function makeQuestion(id, optCount = 4) {
  return {
    id,
    text: `Question ${id}`,
    explanation: `Exp ${id}`,
    pointValue: 1,
    options: Array.from({ length: optCount }, (_, i) => ({
      id: id * 10 + i,
      text: `Option ${i + 1}`,
      isCorrect: i === 0,
    })),
  };
}

describe('useQuizGame — userComments initialisé', () => {
  it('initialise un commentaire vide par question au démarrage', () => {
    const q1 = makeQuestion(1);
    const q2 = makeQuestion(2);
    const quizRef = makeQuiz([q1, q2]);
    const { userComments } = useQuizGame(quizRef);
    expect(userComments.value).toHaveLength(2);
    expect(userComments.value[0]).toEqual({ questionId: q1.id, comment: '' });
    expect(userComments.value[1]).toEqual({ questionId: q2.id, comment: '' });
  });

  it('réinitialise les commentaires au resetGame', () => {
    const q1 = makeQuestion(1);
    const quizRef = makeQuiz([q1]);
    const { userComments, resetGame } = useQuizGame(quizRef);
    userComments.value[0].comment = 'Mon commentaire';
    resetGame();
    expect(userComments.value[0].comment).toBe('');
  });
});

describe('useQuizGame — userAnswers rempli', () => {
  it('pousse une entrée dans userAnswers à chaque réponse', () => {
    const q1 = makeQuestion(1);
    const quizRef = makeQuiz([q1]);
    const { handleAnswer, userAnswers } = useQuizGame(quizRef);
    handleAnswer(q1.options[0]);
    expect(userAnswers.value).toHaveLength(1);
    expect(userAnswers.value[0].questionId).toBe(q1.id);
  });

  it('enregistre wasCorrect = true si bonne réponse', () => {
    const q1 = makeQuestion(1);
    const quizRef = makeQuiz([q1]);
    const { handleAnswer, userAnswers } = useQuizGame(quizRef);
    handleAnswer(q1.options[0]); // options[0].isCorrect = true
    expect(userAnswers.value[0].wasCorrect).toBe(true);
  });

  it('enregistre wasCorrect = false si mauvaise réponse', () => {
    const q1 = makeQuestion(1);
    const quizRef = makeQuiz([q1]);
    const { handleAnswer, userAnswers } = useQuizGame(quizRef);
    handleAnswer(q1.options[1]); // options[1].isCorrect = false
    expect(userAnswers.value[0].wasCorrect).toBe(false);
  });

  it('enregistre les ids sélectionnés', () => {
    const q1 = makeQuestion(1);
    const quizRef = makeQuiz([q1]);
    const { handleAnswer, userAnswers } = useQuizGame(quizRef);
    handleAnswer(q1.options[2]);
    expect(userAnswers.value[0].selectedOptionIds).toContain(q1.options[2].id);
  });
});

describe('useQuizGame — hasAnyComment', () => {
  it('retourne false si aucun commentaire saisi', () => {
    const q1 = makeQuestion(1);
    const quizRef = makeQuiz([q1]);
    const { hasAnyComment } = useQuizGame(quizRef);
    expect(hasAnyComment.value).toBe(false);
  });

  it('retourne true si au moins un commentaire est saisi', () => {
    const q1 = makeQuestion(1);
    const quizRef = makeQuiz([q1]);
    const { userComments, hasAnyComment } = useQuizGame(quizRef);
    userComments.value[0].comment = 'Intéressant !';
    expect(hasAnyComment.value).toBe(true);
  });

  it('retourne false si commentaires seulement avec espaces', () => {
    const q1 = makeQuestion(1);
    const quizRef = makeQuiz([q1]);
    const { userComments, hasAnyComment } = useQuizGame(quizRef);
    userComments.value[0].comment = '   ';
    expect(hasAnyComment.value).toBe(false);
  });
});
