const express = require('express');
const quizController = require('../controllers/quizController');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');


router.post('/generate', authMiddleware, quizController.createQuiz);
router.get('/mine', authMiddleware, quizController.getAllQuizzes);

// SUPPRIMER
router.delete('/:id', authMiddleware, quizController.deleteQuiz);

// MODIFIER
router.put('/:id', authMiddleware, quizController.updateQuiz);
module.exports = router;