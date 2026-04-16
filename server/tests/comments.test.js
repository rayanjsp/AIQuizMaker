// Mock PDFKit avant tout require
const mockDoc = {
    font: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    fillColor: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    lineWidth: jest.fn().mockReturnThis(),
    strokeColor: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    switchToPage: jest.fn().mockReturnThis(),
    bufferedPageRange: jest.fn().mockReturnValue({ start: 0, count: 1 }),
    on: jest.fn(),
    end: jest.fn(),
    page: { height: 841, margins: { bottom: 30 } },
    y: 100,
};

jest.mock('pdfkit', () => jest.fn().mockImplementation(() => {
    // Déclenche 'end' pour résoudre la Promise buildPersonnalisedPDF
    mockDoc.on.mockImplementation((event, cb) => {
        if (event === 'end') setTimeout(cb, 0);
    });
    return mockDoc;
}));

const { buildPersonnalisedPDF } = require('../src/services/pdfService');

const makeQuiz = (questions) => ({ id: 1, title: 'Quiz Test', questions });
const makeQuestion = (id, text) => ({
    id,
    text,
    explanation: `Explication pour ${text}`,
    options: [
        { id: id * 10 + 1, text: 'Bonne', isCorrect: true },
        { id: id * 10 + 2, text: 'Mauvaise', isCorrect: false },
    ]
});

describe('buildPersonnalisedPDF', () => {
    beforeEach(() => jest.clearAllMocks());

    it('retourne une Promise qui résout avec un Buffer', async () => {
        const quiz = makeQuiz([makeQuestion(1, 'Q1')]);
        const result = await buildPersonnalisedPDF(quiz, []);
        expect(result).toBeInstanceOf(Buffer);
    });

    it('insère "Note personnelle" pour un commentaire fourni', async () => {
        const quiz = makeQuiz([makeQuestion(1, 'Q1')]);
        const comments = [{ questionId: 1, comment: 'Mon commentaire perso' }];
        await buildPersonnalisedPDF(quiz, comments);
        const textCalls = mockDoc.text.mock.calls.map(args => args[0]);
        const hasNotePersonnelle = textCalls.some(t => typeof t === 'string' && t.includes('Note personnelle'));
        expect(hasNotePersonnelle).toBe(true);
    });

    it("n'insère pas de note si aucun commentaire", async () => {
        const quiz = makeQuiz([makeQuestion(1, 'Q1')]);
        await buildPersonnalisedPDF(quiz, []);
        const textCalls = mockDoc.text.mock.calls.map(args => args[0]);
        const hasNotePersonnelle = textCalls.some(t => typeof t === 'string' && t.includes('Note personnelle'));
        expect(hasNotePersonnelle).toBe(false);
    });

    it("ignore les commentaires vides ou avec espaces seulement", async () => {
        const quiz = makeQuiz([makeQuestion(1, 'Q1'), makeQuestion(2, 'Q2')]);
        const comments = [
            { questionId: 1, comment: '   ' },
            { questionId: 2, comment: '' },
        ];
        await buildPersonnalisedPDF(quiz, comments);
        const textCalls = mockDoc.text.mock.calls.map(args => args[0]);
        const hasNotePersonnelle = textCalls.some(t => typeof t === 'string' && t.includes('Note personnelle'));
        expect(hasNotePersonnelle).toBe(false);
    });

    it('affiche le titre du quiz dans le PDF', async () => {
        const quiz = makeQuiz([makeQuestion(1, 'Q1')]);
        await buildPersonnalisedPDF(quiz, []);
        const textCalls = mockDoc.text.mock.calls.map(args => args[0]);
        const hasTitle = textCalls.some(t => typeof t === 'string' && t.includes('Quiz Test'));
        expect(hasTitle).toBe(true);
    });

    it('insère le texte de chaque question', async () => {
        const quiz = makeQuiz([makeQuestion(1, 'Première question'), makeQuestion(2, 'Deuxième question')]);
        await buildPersonnalisedPDF(quiz, []);
        const textCalls = mockDoc.text.mock.calls.map(args => args[0]).filter(t => typeof t === 'string');
        expect(textCalls.some(t => t.includes('Première question'))).toBe(true);
        expect(textCalls.some(t => t.includes('Deuxième question'))).toBe(true);
    });
});
