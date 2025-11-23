const { PrismaClient } = require('@prisma/client');
const { generateQuiz, aiAssist } = require('../services/aiService');
const prisma = new PrismaClient();
const { buildPDF } = require('../services/pdfService');
const { extractTextFromPDF } = require('../services/pdfExtractor');

exports.createQuiz = async (req, res) => {
    try {
        const { topic, difficulty } = req.body;
        // On récupère l'ID de l'utilisateur connecté (mis dans req.user par le middleware d'auth plus tard)
        // Pour l'instant, on peut simuler un ID, ou attendre d'avoir fait le middleware.
        const userId = req.user.userId;

        // 1. Appeler l'IA (C'est ce que tu viens de tester)
        const quizData = await generateQuiz(topic, difficulty);

        // 2. Sauvegarder tout dans la BDD avec Prisma
        // C'est ici le challenge !
        const newQuiz = await prisma.quiz.create({
            data: {
                title: `Quiz sur ${topic}`,
                topic: topic,
                difficulty: difficulty,
                userId: userId,

                // LA MAGIE PRISMA : Créer les enfants (Questions) en même temps
                questions: {
                    create: quizData.map((q) => ({
                        text: q.text,
                        explanation: q.explanation,

                        // LA MAGIE PRISMA (Niveau 2) : Créer les petits-enfants (Options)
                        options: {
                            create: q.options.map((o) => ({
                                text: o.text,
                                isCorrect: o.isCorrect
                            }))
                        }
                    }))
                }
            },
            // On demande à Prisma de nous renvoyer l'objet créé AVEC ses relations
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
// ... (après getAllQuizzes)

// Supprimer un quiz
exports.deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;

        // On vérifie que le quiz appartient bien à l'user avant de supprimer !
        const count = await prisma.quiz.count({
            where: { id: parseInt(id), userId: req.user.userId }
        });

        if (count === 0) {
            return res.status(403).json({ error: "Accès refusé ou quiz introuvable" });
        }

        await prisma.quiz.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Quiz supprimé" });

    } catch (error) {
        res.status(500).json({ error: "Erreur suppression" });
    }
};

exports.updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, questions } = req.body;

        const count = await prisma.quiz.count({ where: { id: parseInt(id), userId: req.user.userId } });
        if (count === 0) return res.status(403).json({ error: "Interdit" });

        await prisma.$transaction([
            //Supprimer les questions existantes (les options partiront avec grâce au cascade)
            prisma.question.deleteMany({ where: { quizId: parseInt(id) } }),

            // MAJ titre
            prisma.quiz.update({ where: { id: parseInt(id) }, data: { title } }),

            // Recréer questions
            prisma.question.createMany({
                data: questions.map(q => ({
                    quizId: parseInt(id), // Important : on relie au quiz
                    text: q.text,
                    explanation: q.explanation // On garde l'explication si elle existe
                }))
            })
        ]);

        await prisma.quiz.update({ where: { id: parseInt(id) }, data: { title } });
        await prisma.question.deleteMany({ where: { quizId: parseInt(id) } });
        for (const q of questions) {
            await prisma.question.create({
                data: {
                    quizId: parseInt(id),
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
// Générer PDF Vierge
exports.downloadPdf = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await prisma.quiz.findUnique({
            where: { id: parseInt(id) },
            include: { questions: { include: { options: true } } }
        });

        if (!quiz || quiz.userId !== req.user.userId) {
            return res.status(403).json({ error: "Accès refusé" });
        }

        // On appelle le service qui va écrire directement dans 'res'
        buildPDF(quiz, res, false);

    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur génération PDF");
    }
};

// Générer PDF Correction
exports.downloadPdfCorrection = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await prisma.quiz.findUnique({
            where: { id: parseInt(id) },
            include: { questions: { include: { options: true } } }
        });

        if (!quiz || quiz.userId !== req.user.userId) {
            return res.status(403).json({ error: "Accès refusé" });
        }

        // True = Mode correction
        buildPDF(quiz, res, true);

    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur génération PDF");
    }
};

exports.createQuizFromPDF = async (req, res) => {
    try {
        // Multer a mis le fichier dans req.file
        if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé" });

        const { topic, difficulty } = req.body; // On reçoit aussi le titre donné par l'user

        // 1. Extraire le texte du fichier
        const pdfText = await extractTextFromPDF(req.file.path);

        console.log("📄 Texte extrait (aperçu) :", pdfText.substring(0, 100) + "...");

        // 2. Appeler l'IA avec ce texte
        const quizData = await generateQuiz(topic, difficulty, pdfText);

        // 3. Sauvegarder (Comme avant)
        const newQuiz = await prisma.quiz.create({
            data: {
                title: topic, // On utilise le sujet comme titre
                topic: "Basé sur PDF",
                difficulty: difficulty,
                userId: req.user.userId,
                questions: {
                    create: quizData.map((q) => ({
                        text: q.text,
                        explanation: q.explanation,
                        options: {
                            create: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
                        }
                    }))
                }
            },
            include: { questions: { include: { options: true } } }
        });

        res.status(201).json({ message: "Quiz PDF généré !", quiz: newQuiz });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur analyse PDF" });
    }
};