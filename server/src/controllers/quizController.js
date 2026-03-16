const { PrismaClient } = require('@prisma/client');
const { generateQuiz, generateQuizFromPDF, aiAssist } = require('../services/aiService');
const prisma = new PrismaClient();
const { buildPDF } = require('../services/pdfService');
const fs = require('fs');

exports.createQuiz = async (req, res) => {
    try {
        const { topic, difficulty, nbQuestions } = req.body;
        // On récupère l'ID de l'utilisateur connecté (mis dans req.user par le middleware d'auth plus tard)
        // Pour l'instant, on peut simuler un ID, ou attendre d'avoir fait le middleware.
        const userId = req.user.userId;

        // 1. Appeler l'IA (C'est ce que tu viens de tester)
        const quizData = await generateQuiz(topic, difficulty, null, nbQuestions);

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

        const { topic, difficulty, nbQuestions } = req.body;

        // 1. Lire le fichier PDF en tant que buffer
        const pdfBuffer = fs.readFileSync(req.file.path);
        console.log(`📄 PDF lu : ${(pdfBuffer.length / 1024).toFixed(1)} Ko`);

        // 2. Envoyer directement au modèle vision (il VOIT les pages)
        const quizData = await generateQuizFromPDF(pdfBuffer, difficulty, nbQuestions);

        // 3. Sauvegarder (Comme avant)
        const newQuiz = await prisma.quiz.create({
            data: {
                title: topic || "Quiz basé sur PDF",
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

        // Nettoyage du fichier temporaire
        try { fs.unlinkSync(req.file.path); } catch (e) {}

        res.status(201).json({ message: "Quiz PDF généré !", quiz: newQuiz });

    } catch (error) {
        console.error(error);
        // Nettoyage du fichier temporaire en cas d'erreur
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        res.status(500).json({ error: "Erreur analyse PDF" });
    }
};

exports.togglePublic = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await prisma.quiz.findUnique({ where: { id: parseInt(id) } });

        if (!quiz || quiz.userId !== req.user.userId) {
            return res.status(403).json({ error: "Accès interdit" });
        }

        const updatedQuiz = await prisma.quiz.update({
            where: { id: parseInt(id) },
            data: { isPublic: !quiz.isPublic } // On inverse la valeur
        });

        res.json({ isPublic: updatedQuiz.isPublic, publicId: updatedQuiz.publicId });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
};

exports.getPublicQuiz = async (req, res) => {
    try {
        const { uuid } = req.params; // On cherche par UUID, pas par ID !

        const quiz = await prisma.quiz.findUnique({
            where: { publicId: uuid },
            include: { questions: { include: { options: true } } }
        });

        if (!quiz || !quiz.isPublic) {
            return res.status(404).json({ error: "Ce quiz n'existe pas ou n'est plus accessible." });
        }

        // Sécurité : On peut retirer les "isCorrect" ici si on veut que le front ne puisse pas tricher
        // Mais pour l'instant, on laisse simple.
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ error: "Erreur chargement quiz" });
    }
};

exports.submitPublicScore = async (req, res) => {
    try {
        const { uuid } = req.params;
        const { score, total, pseudo } = req.body;

        // On retrouve l'ID interne du quiz grâce à l'UUID
        const quiz = await prisma.quiz.findUnique({ where: { publicId: uuid } });

        if (!quiz) return res.status(404).json({ error: "Quiz introuvable" });

        await prisma.result.create({
            data: {
                quizId: quiz.id,
                score: score,
                totalQuestions: total,
                guestName: pseudo || "Anonyme",
                userId: null // C'est un invité
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
        const { id } = req.params;

        // Vérif sécurité
        const quiz = await prisma.quiz.findUnique({ where: { id: parseInt(id) } });
        if (!quiz || quiz.userId !== req.user.userId) return res.status(403).json({ error: "Accès refusé" });

        // On récupère les résultats triés par score décroissant
        const results = await prisma.result.findMany({
            where: { quizId: parseInt(id) },
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