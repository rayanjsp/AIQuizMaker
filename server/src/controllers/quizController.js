const prisma = require('../config/prisma');
const { generateQuiz, aiAssist } = require('../services/aiService');
const { buildPDF } = require('../services/pdfService');
const { QUIZ_MIN_QUESTIONS, QUIZ_MAX_QUESTIONS } = require('../config/constants');

// --- HELPER : parse et valider un ID entier depuis les params ---
function parseId(param) {
    const id = parseInt(param);
    if (isNaN(id)) return null;
    return id;
}

// --- MIDDLEWARE : vérifier que le quiz appartient à l'utilisateur connecté ---
async function requireQuizOwner(req, res, next) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID invalide' });
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) return res.status(404).json({ error: 'Quiz introuvable' });
    if (quiz.userId !== req.user.userId) return res.status(403).json({ error: 'Accès refusé' });
    req.quiz = quiz;
    next();
}

exports.requireQuizOwner = requireQuizOwner;

exports.createQuiz = async (req, res) => {
    try {
        const { topic, difficulty, nbQuestions } = req.body;
        const userId = req.user.userId;

        // Validation des inputs
        if (!topic || !topic.trim()) {
            return res.status(400).json({ error: 'Le sujet (topic) est obligatoire' });
        }

        const nb = parseInt(nbQuestions);
        if (isNaN(nb) || nb < QUIZ_MIN_QUESTIONS || nb > QUIZ_MAX_QUESTIONS) {
            return res.status(400).json({
                error: `Le nombre de questions doit être entre ${QUIZ_MIN_QUESTIONS} et ${QUIZ_MAX_QUESTIONS}`
            });
        }

        // 1. Appeler l'IA
        const quizData = await generateQuiz(topic, difficulty, nb);

        // 2. Sauvegarder dans la BDD
        const newQuiz = await prisma.quiz.create({
            data: {
                title: `Quiz sur ${topic}`,
                topic: topic,
                difficulty: difficulty,
                userId: userId,
                questions: {
                    create: quizData.map((q) => ({
                        text: q.text,
                        explanation: q.explanation,
                        options: {
                            create: q.options.map((o) => ({
                                text: o.text,
                                isCorrect: o.isCorrect
                            }))
                        }
                    }))
                }
            },
            include: {
                questions: {
                    include: { options: true }
                }
            }
        });

        res.status(201).json({ message: "Quiz généré !", quiz: newQuiz });

    } catch (error) {
        console.error("Erreur contrôleur quiz :", error);
        res.status(500).json({ error: "Impossible de générer le quiz" });
    }
};

// Récupérer tous les quiz de l'utilisateur connecté
exports.getAllQuizzes = async (req, res) => {
    try {
        const quizzes = await prisma.quiz.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
            include: {
                questions: {
                    include: { options: true }
                }
            }
        });
        res.json(quizzes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Impossible de récupérer les quiz" });
    }
};

// Supprimer un quiz
exports.deleteQuiz = async (req, res) => {
    try {
        // requireQuizOwner a déjà validé l'ID et chargé req.quiz
        await prisma.quiz.delete({ where: { id: req.quiz.id } });
        res.json({ message: "Quiz supprimé" });
    } catch (error) {
        res.status(500).json({ error: "Erreur suppression" });
    }
};

exports.updateQuiz = async (req, res) => {
    try {
        // requireQuizOwner a déjà validé l'ID et chargé req.quiz
        const { title, questions } = req.body;
        const id = req.quiz.id;

        await prisma.$transaction(async (tx) => {
            await tx.quiz.update({ where: { id }, data: { title } });
            await tx.question.deleteMany({ where: { quizId: id } });
            for (const q of questions) {
                await tx.question.create({
                    data: {
                        quizId: id,
                        text: q.text,
                        explanation: q.explanation,
                        options: {
                            create: q.options.map(o => ({
                                text: o.text,
                                isCorrect: o.isCorrect
                            }))
                        }
                    }
                });
            }
        });

        res.json({ message: "Quiz sauvegardé !" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur sauvegarde" });
    }
};

exports.askAiAssist = async (req, res) => {
    try {
        const { type, context, difficulty, existingQuestions, globalTopic } = req.body;
        const result = await aiAssist(type, context, difficulty, existingQuestions, globalTopic);

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "L'IA n'a pas pu répondre" });
    }
};

// Télécharger le PDF (vierge ou correction selon la route)
exports.downloadPdf = async (req, res) => {
    try {
        // requireQuizOwner a déjà chargé req.quiz (sans les questions/options)
        // On recharge avec les relations nécessaires pour le PDF
        const quiz = await prisma.quiz.findUnique({
            where: { id: req.quiz.id },
            include: { questions: { include: { options: true } } }
        });

        const withAnswers = req.path.includes('correction');

        const buffer = await buildPDF(quiz, withAnswers);
        const filename = `quiz_${quiz.id}${withAnswers ? '_correction' : ''}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur génération PDF");
    }
};

exports.togglePublic = async (req, res) => {
    try {
        // requireQuizOwner a déjà chargé req.quiz
        const updatedQuiz = await prisma.quiz.update({
            where: { id: req.quiz.id },
            data: { isPublic: !req.quiz.isPublic }
        });

        res.json({ isPublic: updatedQuiz.isPublic, publicId: updatedQuiz.publicId });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
};

exports.getPublicQuiz = async (req, res) => {
    try {
        const { uuid } = req.params;

        const quiz = await prisma.quiz.findUnique({
            where: { publicId: uuid },
            include: { questions: { include: { options: true } } }
        });

        if (!quiz || !quiz.isPublic) {
            return res.status(404).json({ error: "Ce quiz n'existe pas ou n'est plus accessible." });
        }

        quiz.questions = quiz.questions.map(q => ({
            ...q,
            options: q.options.map(({ isCorrect, ...o }) => o)
        }));
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ error: "Erreur chargement quiz" });
    }
};

exports.submitPublicScore = async (req, res) => {
    try {
        const { uuid } = req.params;
        const { score, total, pseudo } = req.body;

        // Validation des inputs
        if (!pseudo || !pseudo.trim()) {
            return res.status(400).json({ error: 'Le pseudo est obligatoire' });
        }
        if (pseudo.trim().length > 50) {
            return res.status(400).json({ error: 'Le pseudo ne doit pas dépasser 50 caractères' });
        }
        if (typeof score !== 'number' || typeof total !== 'number') {
            return res.status(400).json({ error: 'score et total doivent être des nombres' });
        }
        if (total <= 0) {
            return res.status(400).json({ error: 'total doit être supérieur à 0' });
        }
        if (score < 0 || score > total) {
            return res.status(400).json({ error: 'score invalide (doit être entre 0 et total)' });
        }

        const quiz = await prisma.quiz.findUnique({ where: { publicId: uuid } });

        if (!quiz) return res.status(404).json({ error: "Quiz introuvable" });

        await prisma.result.create({
            data: {
                quizId: quiz.id,
                score: score,
                totalQuestions: total,
                guestName: pseudo.trim() || "Anonyme",
                userId: null
            }
        });

        res.json({ message: "Score enregistré !" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur sauvegarde score" });
    }
};

exports.getQuizResults = async (req, res) => {
    try {
        // requireQuizOwner a déjà chargé req.quiz
        const results = await prisma.result.findMany({
            where: { quizId: req.quiz.id },
            orderBy: { score: 'desc' },
            select: {
                id: true,
                guestName: true,
                score: true,
                totalQuestions: true,
                completedAt: true
            }
        });

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Erreur récupération résultats" });
    }
};
