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
    y: 100
};

jest.mock('pdfkit', () => {
    return jest.fn().mockImplementation(() => {
        mockDoc.on.mockImplementation((event, cb) => {
            if (event === 'end') setTimeout(cb, 0);
        });
        return mockDoc;
    });
});

const { buildPDF } = require('../src/services/pdfService');

describe('pdfService — buildPDF', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDoc.on.mockImplementation((event, cb) => {
            if (event === 'end') setTimeout(cb, 0);
        });
    });

    it('génère un PDF et retourne un Buffer', async () => {
        const mockQuiz = {
            title: 'Test Quiz',
            questions: [
                { text: 'Q1', options: [{ text: 'O1', isCorrect: true }] }
            ]
        };

        const result = await buildPDF(mockQuiz, false);

        expect(result).toBeInstanceOf(Buffer);
        expect(mockDoc.text).toHaveBeenCalledWith('Test Quiz', expect.anything());
        expect(mockDoc.end).toHaveBeenCalled();
    });

    it('affiche les bonnes réponses si withAnswers = true', async () => {
        const mockQuiz = {
            title: 'Test Quiz',
            questions: [
                {
                    text: 'Q1',
                    options: [{ text: 'Réponse correcte', isCorrect: true }],
                    explanation: 'Explication'
                }
            ]
        };

        await buildPDF(mockQuiz, true);

        const allTextCalls = mockDoc.text.mock.calls.map(args => args[0]).filter(t => typeof t === 'string');
        expect(allTextCalls.some(t => t.includes('Note : Explication'))).toBe(true);
    });
});
