const OpenAI = require('openai');

// Configuration du client pour DeepSeek
const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com'
});

const SYSTEM_PROMPT = `
Tu es un expert pédagogique chargé de générer des quiz interactifs.
Ton objectif est de générer 5 questions à choix multiples (QCM) sur un sujet donné.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT avec un tableau JSON valide.
2. Pas de Markdown (pas de \`\`\`json), pas de texte avant ou après.
3. La langue doit être le Français.
4. Chaque question doit avoir 4 options, dont une seule est vraie.
5. Ajoute une explication pédagogique claire pour la correction.

FORMAT JSON ATTENDU :
[
  {
    "text": "L'énoncé de la question ?",
    "explanation": "L'explication détaillée de la réponse...",
    "options": [
      { "text": "Mauvaise réponse A", "isCorrect": false },
      { "text": "Bonne réponse B", "isCorrect": true },
      { "text": "Mauvaise réponse C", "isCorrect": false },
      { "text": "Mauvaise réponse D", "isCorrect": false }
    ]
  }
]
`;

// J'ai ajouté 'async' ici car l'IA prend du temps à répondre
async function generateQuiz(topic, difficulty) {
    try {
        console.log(`🤖 Envoi à DeepSeek : ${topic} (${difficulty})`);

        // J'ai ajouté 'await' pour attendre la réponse
        const completion = await client.chat.completions.create({
            model: 'deepseek-chat', // Il fallait des guillemets autour du nom du modèle
            messages: [
                { role: 'system', content: SYSTEM_PROMPT }, // Structure correcte { role, content }
                { role: 'user', content: `Génère un quiz sur le sujet : ${topic} (Niveau : ${difficulty})` } // Backticks ` pour les variables
            ]
        });

        // On récupère le vrai texte (qui est caché dans l'objet réponse)
        const rawContent = completion.choices[0].message.content;

        // Ton nettoyage (J'ai harmonisé les noms de variables)
        const start = rawContent.indexOf('[');
        const end = rawContent.lastIndexOf(']');

        if (start === -1 || end === -1) {
            throw new Error("Aucun JSON valide trouvé dans la réponse de l'IA");
        }

        const cleanJson = rawContent.substring(start, end + 1);

        // Transformation en objet JavaScript
        const quizData = JSON.parse(cleanJson);

        return quizData;

    } catch (error) {
        console.error("❌ Erreur IA :", error);
        throw error; // On renvoie l'erreur pour que le contrôleur la gère
    }
}

// IMPORTANT : On exporte la fonction pour l'utiliser dans le contrôleur
module.exports = { generateQuiz };