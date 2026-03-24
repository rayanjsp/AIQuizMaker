// server/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_AUTH, RATE_LIMIT_GENERATE } = require('./src/config/constants');
const authRoutes = require('./src/routes/authRoutes');
const quizRoutes = require('./src/routes/quizRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware (Sécurité et format JSON)
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Rate limiting
app.use('/api/auth', rateLimit(RATE_LIMIT_AUTH));
app.use('/api/quiz/generate', rateLimit(RATE_LIMIT_GENERATE));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);

// Route de santé
app.get('/', (req, res) => {
    res.send('Serveur AI Quiz Maker en ligne !');
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`\nServeur démarré sur http://localhost:${PORT}`);
    console.log(`Base de données connectée via Prisma`);
});
