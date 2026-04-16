jest.mock('../src/services/aiService');
jest.mock('../src/services/pdfService');

const { prismaMock } = require('./setup');
const { generateQuiz, aiAssist } = require('../src/services/aiService');
const { buildPDF } = require('../src/services/pdfService');
const { 
    createQuiz, 
    getAllQuizzes, 
    deleteQuiz, 
    updateQuiz, 
    askAiAssist, 
    togglePublic, 
    getPublicQuiz, 
    submitPublicScore, 
    getQuizResults 
} = require('../src/controllers/quizController');

describe('quizController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: { userId: 1 }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('getAllQuizzes', () => {
        it('should return all quizzes for the user', async () => {
            const mockQuizzes = [{ id: 1, title: 'Quiz 1' }];
            prismaMock.quiz.findMany.mockResolvedValue(mockQuizzes);

            await getAllQuizzes(req, res);

            expect(prismaMock.quiz.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId: 1 }
            }));
            expect(res.json).toHaveBeenCalledWith(mockQuizzes);
        });
    });

    describe('createQuiz', () => {
        it('should create a quiz with AI generated data', async () => {
            req.body = { topic: 'Math', difficulty: 'Easy', nbQuestions: 5 };
            const mockQuizData = [{ text: '1+1?', options: [{ text: '2', isCorrect: true }] }];
            generateQuiz.mockResolvedValue(mockQuizData);
            prismaMock.quiz.create.mockResolvedValue({ id: 1, title: 'Quiz sur Math' });

            await createQuiz(req, res);

            // Signature : (topic, difficulty, nb, mode, scoreConfig)
            expect(generateQuiz).toHaveBeenCalledWith('Math', 'Easy', 5, 'standard', null);
            expect(prismaMock.quiz.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('deleteQuiz', () => {
        it('should delete a quiz if it belongs to the user', async () => {
            // requireQuizOwner met req.quiz en place — on le simule ici
            req.quiz = { id: 1, userId: 1 };
            prismaMock.quiz.delete.mockResolvedValue({ id: 1 });

            await deleteQuiz(req, res);

            expect(prismaMock.quiz.delete).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(res.json).toHaveBeenCalledWith({ message: "Quiz supprimé" });
        });

        it('should return 500 if delete fails', async () => {
            req.quiz = { id: 1, userId: 1 };
            prismaMock.quiz.delete.mockRejectedValue(new Error('DB error'));

            await deleteQuiz(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('updateQuiz', () => {
        it('should update a quiz using a transaction', async () => {
            req.quiz = { id: 1, userId: 1 };
            req.body = { title: 'New Title', questions: [] };
            prismaMock.$transaction.mockResolvedValue([]);

            await updateQuiz(req, res);

            expect(prismaMock.$transaction).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ message: "Quiz sauvegardé !" });
        });
    });

    describe('askAiAssist', () => {
        it('should call aiAssist service', async () => {
            req.body = { type: 'question', context: 'Math' };
            aiAssist.mockResolvedValue({ text: 'AI Question' });

            await askAiAssist(req, res);

            expect(aiAssist).toHaveBeenCalledWith('question', 'Math', undefined, undefined, undefined);
            expect(res.json).toHaveBeenCalledWith({ text: 'AI Question' });
        });
    });

    describe('togglePublic', () => {
        it('should toggle isPublic status', async () => {
            req.quiz = { id: 1, userId: 1, isPublic: false };
            prismaMock.quiz.update.mockResolvedValue({ isPublic: true, publicId: 'uuid-abc' });

            await togglePublic(req, res);

            expect(prismaMock.quiz.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { isPublic: true }
            }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true }));
        });
    });

    describe('getPublicQuiz', () => {
        it('should return a public quiz by UUID', async () => {
            req.params.uuid = 'uuid-123';
            prismaMock.quiz.findUnique.mockResolvedValue({ id: 1, isPublic: true });

            await getPublicQuiz(req, res);

            expect(prismaMock.quiz.findUnique).toHaveBeenCalledWith(expect.objectContaining({
                where: { publicId: 'uuid-123' }
            }));
            expect(res.json).toHaveBeenCalled();
        });

        it('should return 404 if quiz is not public or not found', async () => {
            req.params.uuid = 'uuid-123';
            prismaMock.quiz.findUnique.mockResolvedValue(null);

            await getPublicQuiz(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
