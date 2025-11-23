const { PrismaClient } = require('@prisma/client');
const { generateQuiz } = require('../services/aiService'); // On importe ton service IA

const prisma = new PrismaClient();

exports.createQuiz = async (req, res) => {
    try {
        const { topic, difficulty } = req.body;
        // On récupère l'ID de l'utilisateur connecté (mis dans req.user par le middleware d'auth plus tard)
        // Pour l'instant, on peut simuler un ID, ou attendre d'avoir fait le middleware.
        const userId = req.user.userId;

        // 1. Appeler l'IA (C'est ce que tu viens de tester)
        const quizData = await generateQuiz(topic, difficulty);

        // quizData ressemble à : [ { text: "...", options: [...] }, ... ]

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
        const { title } = req.body;

        // Vérification de sécurité (Propriétaire)
        const count = await prisma.quiz.count({
            where: { id: parseInt(id), userId: req.user.userId }
        });

        if (count === 0) return res.status(403).json({ error: "Introuvable" });

        const updatedQuiz = await prisma.quiz.update({
            where: { id: parseInt(id) },
            data: { title }
        });

        res.json(updatedQuiz);
    } catch (error) {
        res.status(500).json({ error: "Erreur mise à jour" });
    }
};