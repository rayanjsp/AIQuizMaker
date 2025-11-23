// server/app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./src/routes/authRoutes');
const quizRoutes = require('./src/routes/quizRoutes');

// Charger les variables d'environnement
dotenv.config();

// Initialiser Express et Prisma
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware (Sécurité et format JSON)
app.use(cors()); // Autorise le frontend à parler au backend
app.use(express.json()); // Permet de lire le JSON envoyé par le client


// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);

// --- ROUTES DE TEST ---

// 1. Route simple pour voir si le serveur tourne
app.get('/', (req, res) => {
    res.send('🚀 Serveur AI Quiz Maker en ligne !');
});

// 2. Route pour tester la connexion BDD (Affiche les utilisateurs)
app.get('/api/test-db', async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json({ status: "Succès", message: "Connexion BDD OK", data: users });
    } catch (error) {
        res.status(500).json({ status: "Erreur", error: error.message });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`\n✅ Serveur démarré sur http://localhost:${PORT}`);
    console.log(`🗄️  Base de données connectée via Prisma`);
});