const mockDoc = {
    pipe: jest.fn(),
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
    end: jest.fn(),
    page: { height: 841, margins: { bottom: 30 } },
    y: 100
};

jest.mock('pdfkit', () => {
    return jest.fn().mockImplementation(() => mockDoc);
});

const { buildPDF } = require('../src/services/pdfService');

describe('pdfService', () => {
    let res;

    beforeEach(() => {
        res = {
            setHeader: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        jest.clearAllMocks();
    });

    it('should generate a PDF and pipe it to response', () => {
        const mockQuiz = {
            title: 'Test Quiz',
            questions: [
                {
                    text: 'Q1',
                    options: [{ text: 'O1', isCorrect: true }]
                }
            ]
        };

        buildPDF(mockQuiz, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-type', 'application/pdf');
        expect(mockDoc.pipe).toHaveBeenCalledWith(res);
        expect(mockDoc.text).toHaveBeenCalledWith('Test Quiz', expect.anything());
        expect(mockDoc.end).toHaveBeenCalled();
    });

     it('should generate a PDF with answers', () => {
        const mockQuiz = {
            title: 'Test Quiz',
            questions: [
                {
                    text: 'Q1',
                    options: [{ text: 'O1', isCorrect: true }],
                    explanation: 'Exp'
                }
            ]
        };

        buildPDF(mockQuiz, res, true);

        // Text might be called multiple times, we check if one call contains the expected text
        expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('Q1'), expect.anything());
        expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('Note : Exp'), expect.anything(), expect.anything(), expect.anything());
    });
});
