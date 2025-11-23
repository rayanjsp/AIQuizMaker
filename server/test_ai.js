// server/test_ai.js
require('dotenv').config(); // Pour charger la clé API
const { generateQuiz } = require('./src/services/aiService');

async function test() {
    try {
        console.log("⏳ Test en cours...");
        const quiz = await generateQuiz("Les Capitales d'Europe", "Difficile");
        console.log("✅ SUCCÈS ! Voici le JSON reçu :");
        console.log(JSON.stringify(quiz, null, 2));
    } catch (error) {
        console.error("❌ Échec :", error.message);
    }
}

test();