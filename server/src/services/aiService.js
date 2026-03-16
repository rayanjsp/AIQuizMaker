const OpenAI = require('openai');
const { pdfToPng } = require('pdf-to-png-converter');

// Configuration du client pour DeepSeek (quiz sans PDF)
const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com'
});

// Configuration du client pour OpenRouter (vision PDF)
const openrouterClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1'
});

const SYSTEM_PROMPT = `
Tu es un expert pédagogique chargé de générer des quiz interactifs.
Ton objectif est de générer un nombre spécifique de questions à choix multiples (QCM) sur un sujet donné.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT avec un tableau JSON valide contenant le nombre exact de questions demandées.
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
async function generateQuiz(topic, difficulty, pdfContent = null,nbQuestions = 5) {
    try {
        console.log(`🤖 Envoi à DeepSeek : ${topic} (${difficulty}) - ${nbQuestions} questions`);

        let userMessage = "";
        const qCount = Math.max(5, Math.min(30, nbQuestions)); // Sécurité : borné entre 5 et 30

        // On met à jour le prompt pour inclure le nombre
        const instruction = `Génère un quiz de ${qCount} questions (Niveau ${difficulty})`;

        if (pdfContent) {
            const safeContent = pdfContent.substring(0, 15000);
            userMessage = `
                Voici le contenu d'un cours : """${safeContent}"""
                TÂCHE : ${instruction} basé UNIQUEMENT sur ce texte.
            `;
        } else {
            userMessage = `${instruction} sur le sujet : ${topic}`;
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

// 2. GÉNÉRER UN QUIZ À PARTIR D'UN PDF (VISION)
async function generateQuizFromPDF(pdfBuffer, difficulty, nbQuestions = 5) {
    try {
        const qCount = Math.max(5, Math.min(30, nbQuestions));

        console.log(`🤖 Conversion PDF en images...`);

        // Convertir les pages PDF en images PNG
        const pngPages = await pdfToPng(pdfBuffer, {
            disableFontFace: false,
            useSystemFonts: false,
            viewportScale: 2.0, // Haute résolution pour une meilleure lisibilité
        });

        // Limiter à 10 pages max (context window)
        const pagesToSend = pngPages.slice(0, 10);
        console.log(`📄 ${pagesToSend.length} page(s) converties en images (sur ${pngPages.length} totales)`);

        // Construire les content parts : chaque page = une image
        const imageContentParts = pagesToSend.map((page, index) => ({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${page.content.toString('base64')}`,
                detail: 'high'
            }
        }));

        const userContent = [
            ...imageContentParts,
            {
                type: 'text',
                text: `Voici les pages d'un document PDF (cours/support pédagogique).
Analyse TOUT le contenu visible : texte, images, schémas, tableaux, formules, graphiques.

TÂCHE : Génère un quiz de ${qCount} questions QCM (Niveau ${difficulty}) basé UNIQUEMENT sur le contenu de ce document.

${SYSTEM_PROMPT}`
            }
        ];

        console.log(`🤖 Envoi à OpenRouter (qwen/qwen2.5-vl-72b-instruct:free)...`);

        const completion = await openrouterClient.chat.completions.create({
            model: 'google/gemma-3-12b-it:free',
            messages: [
                { role: 'user', content: userContent }
            ],
            max_tokens: 4096
        });

        console.log("🤖 Réponse brute d'OpenRouter :", JSON.stringify(completion, null, 2));

        if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
            throw new Error(`Réponse OpenRouter invalide: ${JSON.stringify(completion)}`);
        }

        const rawContent = completion.choices[0].message.content;
        console.log("🤖 Réponse reçue, parsing JSON...");

        const start = rawContent.indexOf('[');
        const end = rawContent.lastIndexOf(']');
        if (start === -1 || end === -1) throw new Error("Aucun JSON valide dans la réponse");
        const cleanJson = rawContent.substring(start, end + 1);
        const quizData = JSON.parse(cleanJson);

        if (Array.isArray(quizData)) {
            quizData.forEach(q => q.options && (q.options = shuffleArray(q.options)));
        }

        console.log(`✅ Quiz PDF généré : ${quizData.length} questions`);
        return quizData;

    } catch (error) {
        console.error("❌ Erreur IA Vision PDF :", error);
        throw error;
    }
}

// 3. L'ASSISTANT (Question seule ou Options seules)
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

module.exports = { generateQuiz, generateQuizFromPDF, aiAssist };