const express = require('express');
const quizController = require('../controllers/quizController');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireQuizOwner } = require('../controllers/quizController');

router.post('/generate', authMiddleware, quizController.createQuiz);
router.get('/mine', authMiddleware, quizController.getAllQuizzes);
router.post('/assist', authMiddleware, quizController.askAiAssist);

// Routes publiques (pas d'authMiddleware)
router.get('/public/:uuid', quizController.getPublicQuiz);
router.post('/public/:uuid/submit', quizController.submitPublicScore);

// Routes nécessitant la propriété du quiz
router.patch('/:id/toggle-public', authMiddleware, requireQuizOwner, quizController.togglePublic);
router.get('/:id/results', authMiddleware, requireQuizOwner, quizController.getQuizResults);
router.delete('/:id', authMiddleware, requireQuizOwner, quizController.deleteQuiz);
router.put('/:id', authMiddleware, requireQuizOwner, quizController.updateQuiz);
router.get('/:id/pdf', authMiddleware, requireQuizOwner, quizController.downloadPdf);
router.get('/:id/pdf-correction', authMiddleware, requireQuizOwner, quizController.downloadPdf);

module.exports = router;
