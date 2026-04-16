process.env.AI_PROVIDER = 'deepseek';
process.env.DEEPSEEK_API_KEY = 'test-key';

jest.mock('openai', () => jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } }
})));

const { validateExpertQuestions, assignPointValues } = require('../src/services/aiService');

const makeQ = (options) => ({ text: 'Q?', explanation: 'Exp', options });
const opt = (isCorrect) => ({ text: 'O', isCorrect });

describe('Mode expert — validateExpertQuestions', () => {
    it('valide quand au moins 50% ont multi/aucune bonne réponse', () => {
        const questions = [
            makeQ([opt(true), opt(false), opt(true), opt(false)]),   // multi
            makeQ([opt(false), opt(false), opt(false), opt(false)]), // aucune
            makeQ([opt(true), opt(false), opt(false), opt(false)]),  // unique → compte pas
            makeQ([opt(true), opt(true), opt(false), opt(false)]),   // multi
        ];
        expect(validateExpertQuestions(questions)).toBe(true);
    });

    it('invalide si moins de 50% ont multi/aucune bonne réponse', () => {
        const questions = [
            makeQ([opt(true), opt(false), opt(false), opt(false)]), // unique
            makeQ([opt(true), opt(false), opt(false), opt(false)]), // unique
            makeQ([opt(true), opt(false), opt(false), opt(false)]), // unique
            makeQ([opt(true), opt(true), opt(false), opt(false)]),  // multi
        ];
        // 1/4 = 25% < 50%
        expect(validateExpertQuestions(questions)).toBe(false);
    });

    it('invalide si une question a moins de 4 options', () => {
        const questions = [
            makeQ([opt(true), opt(false), opt(false)]), // 3 options → invalide
        ];
        expect(validateExpertQuestions(questions)).toBe(false);
    });

    it('invalide si une question a plus de 7 options', () => {
        const questions = [
            makeQ([opt(true), opt(false), opt(false), opt(false), opt(false), opt(false), opt(false), opt(false)]), // 8 options
        ];
        expect(validateExpertQuestions(questions)).toBe(false);
    });

    it('valide avec exactement 4 options par question et 50% multi', () => {
        const questions = [
            makeQ([opt(true), opt(true), opt(false), opt(false)]), // multi
            makeQ([opt(true), opt(false), opt(false), opt(false)]), // unique
        ];
        expect(validateExpertQuestions(questions)).toBe(true);
    });
});

describe('Mode expert — assignPointValues', () => {
    const config = { pointsUnique: 1, pointsMulti: 2 };

    it('attribue pointsUnique si exactement 1 bonne réponse', () => {
        const questions = [makeQ([opt(true), opt(false), opt(false), opt(false)])];
        const result = assignPointValues(questions, config);
        expect(result[0].pointValue).toBe(1);
    });

    it('attribue pointsMulti si plusieurs bonnes réponses', () => {
        const questions = [makeQ([opt(true), opt(true), opt(false), opt(false)])];
        const result = assignPointValues(questions, config);
        expect(result[0].pointValue).toBe(2);
    });

    it('attribue pointsMulti si aucune bonne réponse', () => {
        const questions = [makeQ([opt(false), opt(false), opt(false), opt(false)])];
        const result = assignPointValues(questions, config);
        expect(result[0].pointValue).toBe(2);
    });

    it('utilise config personnalisée', () => {
        const custom = { pointsUnique: 3, pointsMulti: 5 };
        const questions = [
            makeQ([opt(true), opt(false), opt(false), opt(false)]),  // unique → 3
            makeQ([opt(true), opt(true), opt(false), opt(false)]),   // multi → 5
        ];
        const result = assignPointValues(questions, custom);
        expect(result[0].pointValue).toBe(3);
        expect(result[1].pointValue).toBe(5);
    });

    it('score cumulé exact', () => {
        const questions = [
            makeQ([opt(true), opt(false), opt(false), opt(false)]),  // 1
            makeQ([opt(true), opt(true), opt(false), opt(false)]),   // 2
            makeQ([opt(false), opt(false), opt(false), opt(false)]), // 2
        ];
        const result = assignPointValues(questions, config);
        const total = result.reduce((s, q) => s + q.pointValue, 0);
        expect(total).toBe(5);
    });
});
