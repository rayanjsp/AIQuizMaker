const express = require('express');
const quizController = require('../controllers/quizController');
const router = express.Router();
const authMiddleware = require('../controllers/authMiddleware');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Dossier temporaire


router.post('/generate', authMiddleware, quizController.createQuiz);
router.get('/mine', authMiddleware, quizController.getAllQuizzes);

// Partage de quiz :
router.patch('/:id/toggle-public', authMiddleware, quizController.togglePublic);
router.get('/:id/results', authMiddleware, quizController.getQuizResults);

// ROUTES PUBLIQUES (Pas de authMiddleware)
router.get('/public/:uuid', quizController.getPublicQuiz);
router.post('/public/:uuid/submit', quizController.submitPublicScore);


router.delete('/:id', authMiddleware, quizController.deleteQuiz);
router.put('/:id', authMiddleware, quizController.updateQuiz);
router.post('/assist', authMiddleware, quizController.askAiAssist);
// PDF
router.get('/:id/pdf', authMiddleware, quizController.downloadPdf);
router.get('/:id/pdf-correction', authMiddleware, quizController.downloadPdfCorrection);

router.post('/generate-from-pdf', authMiddleware, upload.single('pdf'), quizController.createQuizFromPDF);




module.exports = router;