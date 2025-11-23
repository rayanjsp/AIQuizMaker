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

// --- FONCTION UTILITAIRE : MÉLANGE DE FISHER-YATES ---
// Permet de mélanger les réponses pour éviter le "Biais de Position" de l'IA
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 1. GÉNÉRER UN QUIZ COMPLET
async function generateQuiz(topic, difficulty, pdfContent = null) {
    try {
        console.log(`🤖 Envoi à DeepSeek : ${topic} (${difficulty})`);

        let userMessage = "";

        if (pdfContent) {
            // CAS 1 : On a un PDF. On limite la taille à ~15000 caractères pour ne pas exploser l'IA
            const safeContent = pdfContent.substring(0, 15000);

            userMessage = `
                Voici le contenu d'un cours :
                """${safeContent}"""
                
                TÂCHE : Génère un quiz de 5 questions (Niveau ${difficulty}) basé UNIQUEMENT sur ce texte.
                Si le texte ne suffit pas, utilise tes connaissances générales sur le sujet "${topic}".
            `;
        } else {
            // CAS 2 : Classique (Sujet uniquement)
            userMessage = `Génère un quiz sur le sujet : ${topic} (Niveau : ${difficulty})`;
        }

        const completion = await client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ]
        });

        // ... Le reste du code (nettoyage JSON, shuffle) reste IDENTIQUE ...
        const rawContent = completion.choices[0].message.content;
        const start = rawContent.indexOf('[');
        const end = rawContent.lastIndexOf(']');
        if (start === -1 || end === -1) throw new Error("Aucun JSON valide");
        const cleanJson = rawContent.substring(start, end + 1);
        const quizData = JSON.parse(cleanJson);
        if (Array.isArray(quizData)) {
            quizData.forEach(q => q.options && (q.options = shuffleArray(q.options)));
        }
        return quizData;

    } catch (error) {
        console.error("❌ Erreur IA :", error);
        throw error;
    }
}

// 2. L'ASSISTANT (Question seule ou Options seules)
async function aiAssist(type, context, difficulty = "Moyen", existingQuestions = [], globalTopic = "") {
    try {
        let prompt = "";

        if (type === 'question') {
            const avoid = existingQuestions.length > 0
                ? `Ne pose PAS ces questions qui existent déjà : ${existingQuestions.join(", ")}.`
                : "";

            prompt = `
                Génère UNE SEULE question QCM complète sur le sujet : "${context}".
                Niveau : ${difficulty}.
                ${avoid}
                
                RÈGLES :
                - Langue : Français.
                - 4 options (1 vraie, 3 fausses).
                - Une explication claire.
                
                FORMAT JSON STRICT (sans markdown) :
                {
                  "text": "L'énoncé de la question",
                  "explanation": "L'explication de la réponse",
                  "options": [
                    { "text": "Choix 1", "isCorrect": true },
                    { "text": "Choix 2", "isCorrect": false },
                    { "text": "Choix 3", "isCorrect": false },
                    { "text": "Choix 4", "isCorrect": false }
                  ]
                }
            `;
        }
        else if (type === 'options') {
            prompt = `
                Le sujet du quiz est : "${globalTopic}".
                La question est : "${context}".
                
                Génère 4 options pour cette question (1 vraie, 3 fausses) en respectant le sujet du quiz.
                
                Format JSON strict : [ 
                    { "text": "Mauvaise réponse", "isCorrect": false },
                    { "text": "Bonne réponse", "isCorrect": true },
                    { "text": "Mauvaise réponse", "isCorrect": false },
                    { "text": "Mauvaise réponse", "isCorrect": false }
                ]
            `;
        }

        const completion = await client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }]
        });

        const rawContent = completion.choices[0].message.content;
        console.log("🤖 Réponse IA Assist :", rawContent);

        // Nettoyage JSON
        const targetChar = type === 'options' ? '[' : '{';
        const start = rawContent.indexOf(targetChar);
        const endChar = type === 'options' ? ']' : '}';
        const end = rawContent.lastIndexOf(endChar);

        if (start === -1 || end === -1) throw new Error("Pas de JSON valide");

        let result = JSON.parse(rawContent.substring(start, end + 1));

        // --- MÉLANGE AUTOMATIQUE DES OPTIONS ---
        if (type === 'question' && result.options) {
            // Si on a généré une question complète, on mélange ses options
            result.options = shuffleArray(result.options);
        } else if (type === 'options' && Array.isArray(result)) {
            // Si on a généré juste un tableau d'options, on le mélange
            result = shuffleArray(result);
        }

        return result;

    } catch (error) {
        console.error("❌ Erreur IA Assist:", error);
        throw error;
    }
}

module.exports = { generateQuiz, aiAssist };