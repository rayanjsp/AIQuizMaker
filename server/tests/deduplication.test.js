process.env.AI_PROVIDER = 'deepseek';
process.env.DEEPSEEK_API_KEY = 'test-key';

jest.mock('openai', () => jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } }
})));

const { normalizeText, deduplicateQuestions } = require('../src/services/aiService');

describe('Dédoublonnage — normalizeText', () => {
    it('met en minuscules', () => {
        expect(normalizeText('BONJOUR')).toBe('bonjour');
    });

    it('supprime les accents', () => {
        expect(normalizeText('C\'est quoi HTML ?')).toBe('c est quoi html');
    });

    it('supprime la ponctuation', () => {
        expect(normalizeText('Qu\'est-ce que CSS ?')).toBe('qu est ce que css');
    });

    it('supprime les espaces multiples', () => {
        expect(normalizeText('trop    d espaces')).toBe('trop d espaces');
    });

    it('texte vide retourne chaîne vide', () => {
        expect(normalizeText('')).toBe('');
        expect(normalizeText(undefined)).toBe('');
    });
});

describe('Dédoublonnage — deduplicateQuestions', () => {
    const makeQ = (text) => ({ text, options: [] });

    it('retourne toutes les questions si aucun doublon', () => {
        const questions = [makeQ('Question A'), makeQ('Question B'), makeQ('Question C')];
        expect(deduplicateQuestions(questions)).toHaveLength(3);
    });

    it('supprime 3 doublons sur 10 → retourne 7', () => {
        const questions = [
            makeQ('Question A'),
            makeQ('Question B'),
            makeQ('Question A'),  // doublon
            makeQ('Question C'),
            makeQ('Question D'),
            makeQ('Question B'),  // doublon
            makeQ('Question E'),
            makeQ('Question F'),
            makeQ('Question G'),
            makeQ('Question A'),  // doublon
        ];
        const result = deduplicateQuestions(questions);
        expect(result).toHaveLength(7);
    });

    it('retourne tableau vide si tout est doublon', () => {
        const questions = [makeQ('Même question'), makeQ('Même question'), makeQ('Même question')];
        expect(deduplicateQuestions(questions)).toHaveLength(1);
    });

    it('0 doublon → retourne tous', () => {
        const questions = [makeQ('Q1'), makeQ('Q2')];
        expect(deduplicateQuestions(questions)).toHaveLength(2);
    });

    it('respecte les questions déjà acceptées (alreadyAccepted)', () => {
        const questions = [makeQ('Question A'), makeQ('Question B')];
        const alreadyAccepted = [normalizeText('Question A')];
        const result = deduplicateQuestions(questions, alreadyAccepted);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Question B');
    });

    it('compare sans tenir compte des accents et casse', () => {
        const questions = [makeQ('C\'est quoi HTML ?'), makeQ('c est quoi html')];
        expect(deduplicateQuestions(questions)).toHaveLength(1);
    });
});
