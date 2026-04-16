const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { PROVIDER_CONFIG, VALID_PROVIDERS, AUTO_DETECT_PROVIDERS, QUIZ_MIN_QUESTIONS, QUIZ_MAX_QUESTIONS } = require('../config/constants');

// --- RÉSOLUTION DU FOURNISSEUR IA ---
function resolveProvider() {
    const requested = process.env.AI_PROVIDER?.toLowerCase();

    if (requested) {
        if (!VALID_PROVIDERS.includes(requested))
            throw new Error(`[aiService] AI_PROVIDER="${requested}" invalide. Valeurs acceptées : ${VALID_PROVIDERS.join(', ')}`);

        if (requested === 'custom') {
            if (!process.env.AI_API_KEY)  throw new Error('[aiService] AI_PROVIDER=custom mais AI_API_KEY est absent du .env');
            if (!process.env.AI_BASE_URL) throw new Error('[aiService] AI_PROVIDER=custom mais AI_BASE_URL est absent du .env');
            if (!process.env.AI_MODEL)    throw new Error('[aiService] AI_PROVIDER=custom mais AI_MODEL est absent du .env');
            return 'custom';
        }

        const cfg = PROVIDER_CONFIG[requested];
        if (!process.env[cfg.envKey])
            throw new Error(`[aiService] AI_PROVIDER="${requested}" mais ${cfg.envKey} est absent du fichier .env`);
        return requested;
    }

    // Auto-détection : première clé présente parmi les providers standards
    for (const name of AUTO_DETECT_PROVIDERS) {
        if (process.env[PROVIDER_CONFIG[name].envKey]) {
            console.log(`[aiService] AI_PROVIDER non défini — fournisseur auto-détecté : ${name}`);
            return name;
        }
    }

    throw new Error('[aiService] Aucun fournisseur IA configuré. Définir AI_PROVIDER et la clé correspondante dans .env');
}

// --- CONSTRUCTION DU CLIENT (une seule fois au chargement du module) ---
const PROVIDER_NAME = resolveProvider();
const cfg = PROVIDER_CONFIG[PROVIDER_NAME];

// Résolution du modèle selon le provider
let AI_MODEL;
if (PROVIDER_NAME === 'custom') {
    AI_MODEL = process.env.AI_MODEL;
} else if (PROVIDER_NAME === 'openrouter' && process.env.OPENROUTER_MODEL) {
    AI_MODEL = process.env.OPENROUTER_MODEL;
} else {
    AI_MODEL = cfg.defaultModel;
}

// Construction du client selon le provider
let client, anthropicClient;
if (PROVIDER_NAME === 'anthropic') {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} else {
    const clientOptions = { apiKey: process.env[cfg.envKey] };
    if (PROVIDER_NAME === 'custom') {
        clientOptions.baseURL = process.env.AI_BASE_URL;
    } else if (cfg.baseURL) {
        clientOptions.baseURL = cfg.baseURL;
    }
    client = new OpenAI(clientOptions);
}
console.log(`[aiService] Fournisseur actif : ${PROVIDER_NAME} | modèle : ${AI_MODEL}`);

// --- ABSTRACTION DE L'APPEL IA ---
// Gère la différence entre le SDK Anthropic et le SDK OpenAI
async function callAI(messages) {
    if (PROVIDER_NAME === 'anthropic') {
        const systemMsg = messages.find(m => m.role === 'system')?.content;
        const userMessages = messages.filter(m => m.role !== 'system');
        const response = await anthropicClient.messages.create({
            model: AI_MODEL,
            max_tokens: 4096,
            ...(systemMsg && { system: systemMsg }),
            messages: userMessages,
        });
        return response.content[0].text;
    }
    const completion = await client.chat.completions.create({ model: AI_MODEL, messages });
    return completion.choices[0].message.content;
}


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

const EXPERT_SYSTEM_PROMPT = `
Tu es un expert pédagogique chargé de générer des quiz interactifs de niveau expert.
Ton objectif est de générer un nombre spécifique de questions à choix multiples (QCM) sur un sujet donné.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT avec un tableau JSON valide contenant le nombre exact de questions demandées.
2. Pas de Markdown (pas de \`\`\`json), pas de texte avant ou après.
3. La langue doit être le Français.
4. Chaque question doit avoir entre 4 et 7 options.
5. De 0 à N options peuvent être correctes (isCorrect: true). Les cas extrêmes sont autorisés : aucune bonne réponse, ou toutes bonnes.
6. Au moins 50 % des questions doivent avoir plusieurs bonnes réponses OU aucune bonne réponse.
7. Ajoute une explication pédagogique claire pour la correction.

FORMAT JSON ATTENDU :
[
  {
    "text": "L'énoncé de la question ?",
    "explanation": "L'explication détaillée de la réponse...",
    "options": [
      { "text": "Option A", "isCorrect": false },
      { "text": "Option B", "isCorrect": true },
      { "text": "Option C", "isCorrect": true },
      { "text": "Option D", "isCorrect": false },
      { "text": "Option E", "isCorrect": false }
    ]
  }
]
`;

/**
 * Valide les contraintes du mode expert sur le tableau de questions.
 * Retourne true si valide, false sinon.
 */
function validateExpertQuestions(questions) {
    for (const q of questions) {
        if (!q.options || q.options.length < 4 || q.options.length > 7) return false;
    }
    const multiOrNone = questions.filter(q => {
        const correctCount = q.options.filter(o => o.isCorrect).length;
        return correctCount !== 1;
    });
    return multiOrNone.length >= Math.ceil(questions.length * 0.5);
}

/**
 * Attribue le pointValue à chaque question selon la config de score.
 * 1 bonne réponse exactement → pointsUnique, sinon → pointsMulti
 */
function assignPointValues(questions, scoreConfig) {
    const { pointsUnique = 1, pointsMulti = 2 } = scoreConfig || {};
    return questions.map(q => {
        const correctCount = q.options.filter(o => o.isCorrect).length;
        return { ...q, pointValue: correctCount === 1 ? pointsUnique : pointsMulti };
    });
}

// 1. GÉNÉRER UN QUIZ COMPLET
async function generateQuiz(topic, difficulty, nbQuestions = 5, mode = 'standard', scoreConfig = null) {
    try {
        const isExpert = mode === 'expert';
        console.log(`[aiService] Envoi à ${PROVIDER_NAME} (${AI_MODEL}) : ${topic} (${difficulty}) - ${nbQuestions} questions [mode: ${mode}]`);

        const qCount = Math.max(QUIZ_MIN_QUESTIONS, Math.min(QUIZ_MAX_QUESTIONS, nbQuestions));
        const systemPrompt = isExpert ? EXPERT_SYSTEM_PROMPT : SYSTEM_PROMPT;
        const userMessage = `Génère EXACTEMENT ${qCount} questions (ni plus, ni moins) de niveau ${difficulty} sur le sujet : ${topic}.\nTon tableau JSON doit contenir EXACTEMENT ${qCount} objets.`;

        const rawContent = await callAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ]);
        const start = rawContent.indexOf('[');
        const end = rawContent.lastIndexOf(']');
        if (start === -1 || end === -1) throw new Error("Aucun JSON valide");
        const cleanJson = rawContent.substring(start, end + 1);
        const quizData = JSON.parse(cleanJson);
        if (!Array.isArray(quizData)) throw new Error("La réponse IA n'est pas un tableau");
        if (quizData.length !== qCount) {
            console.warn(`⚠️ IA a retourné ${quizData.length} questions au lieu de ${qCount}`);
        }

        // Validation spécifique mode expert
        if (isExpert && !validateExpertQuestions(quizData)) {
            console.warn('⚠️ Mode expert : contraintes non respectées par l\'IA');
        }

        const deduplicated = deduplicateQuestions(quizData);
        if (deduplicated.length < quizData.length) {
            console.warn(`⚠️ Dédoublonnage : ${quizData.length - deduplicated.length} doublon(s) supprimé(s)`);
        }
        let finalData = deduplicated.slice(0, qCount);
        finalData.forEach(q => q.options && (q.options = shuffleArray(q.options)));

        // Attribution des pointValues en mode expert
        if (isExpert) {
            finalData = assignPointValues(finalData, scoreConfig);
        }

        return finalData;

    } catch (error) {
        console.error("❌ Erreur IA :", error);
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

        const rawContent = await callAI([{ role: 'user', content: prompt }]);
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

// --- FONCTIONNALITÉ 1 : DÉDOUBLONNAGE ---

/**
 * Normalise un texte de question pour la comparaison.
 * Minuscules + suppression accents/ponctuation/espaces multiples.
 */
function normalizeText(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // accents
        .replace(/[^a-z0-9\s]/g, ' ')                        // ponctuation → espace
        .replace(/\s+/g, ' ')                                 // espaces multiples
        .trim();
}

/**
 * Filtre les doublons d'un tableau de questions IA.
 * @param {Array} questions - questions générées par l'IA
 * @param {string[]} [alreadyAccepted=[]] - textes normalisés des questions déjà acceptées
 * @returns {Array} questions sans doublons
 */
function deduplicateQuestions(questions, alreadyAccepted = []) {
    const seen = new Set(alreadyAccepted);
    const result = [];
    for (const q of questions) {
        const norm = normalizeText(q.text || '');
        if (!seen.has(norm)) {
            seen.add(norm);
            result.push(q);
        }
    }
    return result;
}

module.exports = { generateQuiz, aiAssist, normalizeText, deduplicateQuestions, validateExpertQuestions, assignPointValues };