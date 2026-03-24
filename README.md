# AIQuizMaker

Application web full-stack de génération de quiz par IA. L'utilisateur saisit un sujet, l'IA génère un QCM complet, exportable en PDF et partageable publiquement via un lien unique.

**Projet BTS SIO SLAM — 2025/2026**

---

## Fonctionnalités

- **Génération automatique de quiz** via l'IA de ton choix (sujet, difficulté, nombre de questions)
- **Édition manuelle** des questions et options, avec assistance IA
- **Jeu interactif** : quiz jouable en ligne avec score immédiat
- **Partage public** via un lien UUID (joueurs anonymes avec pseudo)
- **Export PDF** : feuille de test vierge ou corrigée avec explications
- **Historique des résultats** : scores des utilisateurs connectés et des invités
- **Tableau de bord** : gestion des quiz avec recherche en temps réel

---

## Fournisseurs IA compatibles

Le projet supporte plusieurs fournisseurs IA interchangeables. Il suffit de définir la clé correspondante dans `server/.env` — le fournisseur est **détecté automatiquement**, ou sélectionné via `AI_PROVIDER`.

| Fournisseur | `AI_PROVIDER` | Clé requise | Modèle par défaut | Gratuit ? |
|---|---|---|---|---|
| **DeepSeek** | `deepseek` | `DEEPSEEK_API_KEY` | `deepseek-chat` | Très peu cher |
| **OpenAI** | `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` | Payant |
| **OpenRouter** | `openrouter` | `OPENROUTER_API_KEY` | `meta-llama/llama-3.3-8b-instruct:free` | **Oui (modèles gratuits)** |
| **Groq** | `groq` | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | **Oui (free tier)** |
| **Mistral AI** | `mistral` | `MISTRAL_API_KEY` | `mistral-small-latest` | Peu cher |
| **Together AI** | `together` | `TOGETHER_API_KEY` | `meta-llama/Llama-3-8b-chat-hf` | Crédits offerts |
| **Custom** | `custom` | `AI_API_KEY` | via `AI_MODEL` | Selon provider |

> **Custom** permet d'utiliser n'importe quel provider compatible OpenAI (LM Studio, Ollama, Mistral local…) en définissant `AI_BASE_URL`, `AI_API_KEY` et `AI_MODEL` dans le `.env`.

**Ordre d'auto-détection** (si `AI_PROVIDER` non défini) : DeepSeek → OpenAI → OpenRouter → Groq → Mistral → Together

---

## Architecture globale

```mermaid
graph LR
    subgraph Client["Frontend — Vue 3 (port 5173)"]
        FE[Interface utilisateur]
    end

    subgraph Server["Backend — Express (port 3000)"]
        MW[Middleware JWT] --> CT[Controllers]
        CT --> SV[Services]
    end

    subgraph Data["Données"]
        DB[(MySQL)]
        AI["API IA (DeepSeek / OpenAI / OpenRouter)"]
    end

    FE -->|"HTTP /api"| MW
    SV -->|Prisma ORM| DB
    SV -->|OpenAI SDK| AI
```

---

## Flux utilisateur

### Utilisateur connecté (propriétaire de quiz)

```mermaid
flowchart TD
    A([Accueil /]) --> B{Connecté ?}
    B -->|Non| C[Login /login]
    B -->|Oui| D[Dashboard /dashboard]
    C --> E[Inscription /register]
    E -->|Auto-login| D
    C -->|Succès| D

    D --> F[Créer un quiz]
    F --> G[Saisir sujet + difficulté + nb questions]
    G --> H[IA génère le QCM]
    H --> D

    D --> I[Modifier un quiz]
    I --> J{Action}
    J --> J1[Édition manuelle]
    J --> J2[Assistance IA]
    J1 & J2 --> D

    D --> K[Consulter les résultats]
    K --> K1[Voir scores utilisateurs et invités]

    D --> L[Exporter PDF]
    L --> L1[PDF vierge]
    L --> L2[PDF corrigé + explications]

    D --> M[Activer partage public]
    M --> N[Lien /play/:uuid généré]
```

### Joueur anonyme (quiz public)

```mermaid
flowchart TD
    A([Reçoit un lien /play/:uuid]) --> B[Chargement du quiz]
    B --> C{Quiz existe et public ?}
    C -->|Non| ERR[Erreur - Quiz introuvable]
    C -->|Oui| D[Saisir un pseudo]
    D --> E[Répondre aux questions QCM]
    E --> F[Score calculé côté client]
    F --> G[POST /public/:uuid/submit]
    G --> H[Score enregistré en base]
    H --> I([Résultat affiché])
```

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Frontend** | Vue 3 + Pinia + Vue Router | 3.5 / 3.0 / 4.6 |
| **CSS** | Tailwind CSS | 3.4 |
| **Build** | Vite | 7.1 |
| **Backend** | Node.js + Express | ^20.19 / 5.1 |
| **ORM** | Prisma | 5.19 |
| **BDD** | MySQL | 5.7+ |
| **IA** | DeepSeek / OpenAI / OpenRouter (via SDK OpenAI) | deepseek-chat / gpt-4o-mini / llama-3.3 |
| **Auth** | JWT (jsonwebtoken) | 9.0 |
| **PDF** | PDFKit | 0.17 |
| **Tests** | Jest (backend) + Vitest (frontend) | 30 / 4.1 |

---

## Prérequis

- **Node.js** v20.19.0 ou ≥ 22.12.0
- **MySQL** 5.7+ (local ou distant)
- **Clé API IA** — au choix parmi les providers listés ci-dessus (voir section **Fournisseurs IA compatibles**)

---

## Installation

### 1. Cloner et installer les dépendances

```bash
git clone <url-du-repo>
cd AIQuizMaker

# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configurer les variables d'environnement

Copier le fichier d'exemple et remplir les valeurs :

```bash
cp server/.env.example server/.env
```

Le fichier `server/.env.example` contient toutes les variables documentées. Au minimum, définir :
- `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`
- Une clé IA parmi `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` ou `OPENROUTER_API_KEY`

> Voir la section **Variables d'environnement** pour le détail de la configuration IA.

### 3. Initialiser la base de données

```bash
cd server
npx prisma migrate dev --name init
```

Cette commande crée la base de données et applique toutes les migrations.

---

## Démarrage

### Développement (2 terminaux)

```bash
# Terminal 1 — Backend (port 3000)
cd server
npm start

# Terminal 2 — Frontend (port 5173)
cd client
npm run dev
```

L'application est accessible sur **http://localhost:5173**

Le frontend proxifie automatiquement les requêtes `/api` vers `http://localhost:3000` (configuré dans `vite.config.js`).

### Production

```bash
# Build du frontend
cd client
npm run build
# Les fichiers sont générés dans client/dist/

# Le backend ne nécessite pas de build
# Déployer server/ avec les variables d'environnement configurées
node server/app.js
```

---

## Architecture du projet

```
AIQuizMaker/
├── README.md
├── client/                          # Frontend Vue 3
│   ├── index.html                   # Point d'entrée HTML
│   ├── vite.config.js               # Config Vite + proxy API
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── main.js                  # Init Vue (Pinia + Toast)
│       ├── App.vue                  # Composant racine
│       ├── router/
│       │   └── index.js             # Routes (5 pages)
│       ├── views/
│       │   ├── HomeView.vue         # Page d'accueil
│       │   ├── LoginView.vue        # Connexion
│       │   ├── RegisterView.vue     # Inscription
│       │   ├── DashboardView.vue    # Tableau de bord (protégé)
│       │   └── PublicQuizView.vue   # Jeu de quiz public
│       ├── components/
│       │   ├── QuizCard.vue         # Carte quiz dans la liste
│       │   ├── QuizCreateModal.vue  # Formulaire de génération IA
│       │   ├── QuizEditModal.vue    # Édition avec assistance IA
│       │   ├── QuizDetailModal.vue  # Résultats + PDF + partage
│       │   └── QuizGame.vue         # Moteur de jeu interactif
│       ├── stores/
│       │   └── quizStore.js         # Store Pinia (état global des quiz)
│       ├── composables/
│       │   ├── useAuth.js           # Login / logout / session localStorage
│       │   ├── useApi.js            # authFetch (requêtes avec header JWT)
│       │   └── useQuizGame.js       # Logique du jeu
│       └── utils/
│           └── difficultyHelpers.js # Labels et couleurs de difficulté
│
└── server/                          # Backend Node.js / Express
    ├── app.js                       # Serveur Express (middleware + routes)
    ├── jest.config.js
    ├── package.json
    ├── prisma/
    │   ├── schema.prisma            # Schéma BDD (5 modèles)
    │   └── migrations/              # Historique des migrations SQL
    ├── src/
    │   ├── config/
    │   │   ├── constants.js         # Constantes (JWT, limites, modèle IA)
    │   │   └── prisma.js            # Client Prisma (singleton)
    │   ├── middleware/
    │   │   └── authMiddleware.js    # Vérification JWT
    │   ├── routes/
    │   │   ├── authRoutes.js        # Routes /api/auth
    │   │   └── quizRoutes.js        # Routes /api/quiz
    │   ├── controllers/
    │   │   ├── authController.js    # Inscription / connexion
    │   │   └── quizController.js    # CRUD quiz + PDF + public + résultats
    │   └── services/
    │       ├── aiService.js         # Appel DeepSeek + mélange Fisher-Yates
    │       └── pdfService.js        # Génération PDF (PDFKit)
    ├── uploads/                     # Dossier de stockage des fichiers uploadés
    └── tests/
        ├── setup.js
        ├── simple.test.js
        ├── aiService.test.js
        ├── authController.test.js
        ├── authMiddleware.test.js
        ├── pdfService.test.js
        └── quizController.test.js
```

---

## Base de données

Provider : **MySQL** via Prisma ORM.

### Modèles

#### `User`
| Champ | Type | Description |
|-------|------|-------------|
| `id` | Int (PK) | Auto-incrémenté |
| `email` | String (unique) | Adresse email |
| `password` | String | Hash HMAC-SHA512 |
| `salt` | String | Sel aléatoire 16 octets (hex) |
| `username` | String? | Nom d'utilisateur optionnel |
| `createdAt` | DateTime | Date de création |

#### `Quiz`
| Champ | Type | Description |
|-------|------|-------------|
| `id` | Int (PK) | Auto-incrémenté |
| `title` | String | Titre du quiz |
| `topic` | String | Sujet saisi par l'utilisateur |
| `difficulty` | String | `"Facile"` / `"Moyen"` / `"Difficile"` |
| `publicId` | String (unique) | UUID pour le lien de partage public |
| `isPublic` | Boolean | Partage activé ou non |
| `createdAt` | DateTime | Date de création |
| `userId` | Int (FK) | Propriétaire du quiz |

#### `Question`
| Champ | Type | Description |
|-------|------|-------------|
| `id` | Int (PK) | Auto-incrémenté |
| `text` | String (longtext) | Énoncé de la question |
| `explanation` | String? (longtext) | Explication affichée dans le PDF corrigé |
| `quizId` | Int (FK, CASCADE) | Quiz parent |

#### `Option`
| Champ | Type | Description |
|-------|------|-------------|
| `id` | Int (PK) | Auto-incrémenté |
| `text` | String (longtext) | Texte de l'option |
| `isCorrect` | Boolean | Vraie réponse ou non |
| `questionId` | Int (FK, CASCADE) | Question parente |

#### `Result`
| Champ | Type | Description |
|-------|------|-------------|
| `id` | Int (PK) | Auto-incrémenté |
| `score` | Int | Nombre de bonnes réponses |
| `totalQuestions` | Int | Total de questions |
| `completedAt` | DateTime | Date de complétion |
| `userId` | Int? (FK) | `null` si joueur anonyme |
| `guestName` | String? | Pseudo du joueur anonyme |
| `quizId` | Int (FK, CASCADE) | Quiz joué |

> Les suppressions en cascade sont activées sur Question → Option et Quiz → Result.

### Diagramme entité-relation

```mermaid
erDiagram
    User ||--o{ Quiz : "possède"
    User ||--o{ Result : "soumet"
    Quiz ||--|{ Question : "contient"
    Quiz ||--o{ Result : "reçoit"
    Question ||--|{ Option : "propose"

    User {
        int id PK
        string email
        string password
        string salt
        string username
        datetime createdAt
    }
    Quiz {
        int id PK
        string title
        string topic
        string difficulty
        string publicId
        boolean isPublic
        datetime createdAt
        int userId FK
    }
    Question {
        int id PK
        string text
        string explanation
        int quizId FK
    }
    Option {
        int id PK
        string text
        boolean isCorrect
        int questionId FK
    }
    Result {
        int id PK
        int score
        int totalQuestions
        datetime completedAt
        int userId FK
        string guestName
        int quizId FK
    }
```

---

## API REST

Base URL : `/api`

### Authentification — `/api/auth`

| Méthode | Route | Auth | Corps | Réponse |
|---------|-------|------|-------|---------|
| POST | `/register` | Non | `{email, password, username}` | `{message, token, username}` |
| POST | `/login` | Non | `{email, password}` | `{message, token, username}` |

**Rate limit auth :** 10 requêtes / 15 minutes.

### Quiz — `/api/quiz`

Toutes les routes protégées nécessitent : `Authorization: Bearer <token>`

| Méthode | Route | Auth | Corps / Params | Description |
|---------|-------|------|----------------|-------------|
| POST | `/generate` | Oui | `{topic, difficulty, nbQuestions}` | Génère un quiz via IA |
| GET | `/mine` | Oui | — | Liste les quiz de l'utilisateur connecté |
| PUT | `/:id` | Oui | `{title, questions[]}` | Met à jour le quiz (transaction atomique) |
| DELETE | `/:id` | Oui | — | Supprime le quiz et ses données en cascade |
| POST | `/assist` | Oui | `{type, context, difficulty?, existingQuestions?, globalTopic?}` | Assistance IA pour l'édition |
| GET | `/:id/pdf` | Oui | — | Télécharge le PDF vierge |
| GET | `/:id/pdf-correction` | Oui | — | Télécharge le PDF corrigé avec explications |
| PATCH | `/:id/toggle-public` | Oui | — | Active / désactive le partage public |
| GET | `/:id/results` | Oui | — | Récupère tous les scores d'un quiz |
| GET | `/public/:uuid` | Non | — | Récupère un quiz public (sans les bonnes réponses) |
| POST | `/public/:uuid/submit` | Non | `{score, total, pseudo}` | Enregistre le score d'un invité |

**Rate limit génération IA :** 20 requêtes / heure.

---

## Sécurité

### Flux d'authentification

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant B as Backend
    participant DB as MySQL

    U->>F: Saisit email + mot de passe
    F->>B: POST /api/auth/login
    B->>DB: SELECT user WHERE email = ?
    DB-->>B: User (avec hash + salt)
    B->>B: HMAC-SHA512(password + salt, salt)
    B->>B: Comparaison hash
    alt Hash valide
        B-->>F: JWT signé (24h) + username
        F->>F: Stockage localStorage
        F-->>U: Redirection /dashboard
    else Hash invalide
        B-->>F: 401 Unauthorized
        F-->>U: Message d'erreur
    end
```

### Hachage des mots de passe
Algorithme **HMAC-SHA512** avec sel aléatoire par utilisateur (16 octets en hex, généré via `crypto.randomBytes`). Pas de bcrypt — implémentation native Node.js.

```
password_hashed = HMAC-SHA512(password + salt, salt)
```

### JWT
- Expiration : **24 heures**
- Stockage côté client : `localStorage`
- Envoyé dans le header : `Authorization: Bearer <token>`

### Rate Limiting (`express-rate-limit`)
- Auth : 10 req / 15 min
- Génération IA : 20 req / 1 heure

### CORS
Configuré pour n'accepter que `FRONTEND_URL` (variable d'environnement).

---

## Intégration IA

### Séquence de génération d'un quiz

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend (Vue)
    participant B as Backend (Express)
    participant AI as Fournisseur IA (DeepSeek / OpenAI / OpenRouter)
    participant DB as MySQL

    U->>F: Soumet topic + difficulté + nbQuestions
    F->>B: POST /api/quiz/generate + JWT
    B->>B: Vérification JWT (middleware)
    B->>AI: Prompt système + paramètres utilisateur
    AI-->>B: Réponse JSON (avec ou sans balises Markdown)
    B->>B: Nettoyage JSON + mélange Fisher-Yates
    B->>DB: INSERT Quiz + Questions + Options (transaction)
    DB-->>B: IDs créés
    B-->>F: Quiz complet (201)
    F-->>U: Quiz affiché dans le dashboard
```

### Fournisseur IA

Voir la section **[Fournisseurs IA compatibles](#fournisseurs-ia-compatibles)** en tête de document pour le tableau complet des providers et leurs clés.

Tous les fournisseurs utilisent le SDK OpenAI (compatible OpenAI) — seuls `baseURL` et `apiKey` varient. La configuration est validée au démarrage du serveur avec des messages d'erreur explicites.

### Prompt système
Le modèle est forcé à répondre en **JSON strict** avec le format :
```json
{
  "title": "...",
  "questions": [
    {
      "text": "...",
      "explanation": "...",
      "options": [
        { "text": "...", "isCorrect": true },
        { "text": "...", "isCorrect": false }
      ]
    }
  ]
}
```

### Mélange Fisher-Yates
Après génération, les options de chaque question sont mélangées côté serveur via l'algorithme Fisher-Yates pour éviter que la bonne réponse soit toujours en première position (biais de l'IA).

### Extraction JSON robuste
La réponse de l'IA peut contenir du Markdown (` ```json ... ``` `). Le service nettoie automatiquement ces balises avant de parser le JSON.

---

## Export PDF

Bibliothèque : **PDFKit** (génération côté serveur, streaming vers le client).

### PDF vierge (`GET /api/quiz/:id/pdf`)
- En-tête avec titre et difficulté
- Questions numérotées
- Cases à cocher vides pour chaque option

### PDF corrigé (`GET /api/quiz/:id/pdf-correction`)
- Même structure que le PDF vierge
- Bonne réponse marquée (✓)
- Explication affichée sous chaque question (si disponible)
- Numérotation des pages en pied de page

Les deux PDFs gèrent les sauts de page automatiques quand le contenu dépasse la hauteur de la page.

---

## Tests

### Backend (Jest)

```bash
cd server
npm test
```

Fichiers de test dans `server/tests/` :

| Fichier | Couverture |
|---------|-----------|
| `authController.test.js` | Inscription, connexion, hachage |
| `authMiddleware.test.js` | Vérification JWT |
| `quizController.test.js` | CRUD quiz, routes publiques |
| `aiService.test.js` | Appel DeepSeek, extraction JSON |
| `pdfService.test.js` | Génération PDF |
| `simple.test.js` | Tests de base / infrastructure |

### Frontend (Vitest)

```bash
cd client
npm run test
```

Fichiers de test dans `client/src/views/` :
- `LoginView.test.js`
- `RegisterView.test.js`
- `PublicQuizView.test.js`

---

## Variables d'environnement

Toutes les variables sont définies dans `server/.env`.

| Variable | Obligatoire | Exemple | Description |
|----------|-------------|---------|-------------|
| `PORT` | Non (défaut 3000) | `3000` | Port du serveur Express |
| `DATABASE_URL` | **Oui** | `mysql://root:@localhost:3306/aiquizmaker` | URL de connexion MySQL (format Prisma) |
| `JWT_SECRET` | **Oui** | `une_phrase_secrete` | Secret pour signer les tokens JWT |
| `FRONTEND_URL` | **Oui** | `http://localhost:5173` | URL du frontend (utilisé pour CORS) |
| `AI_PROVIDER` | Non | `groq` | Provider IA (`deepseek`, `openai`, `openrouter`, `groq`, `mistral`, `together`, `custom`). Auto-détecté si absent. |
| `DEEPSEEK_API_KEY` | Conditionnelle | `sk-xxxx` | Clé DeepSeek |
| `OPENAI_API_KEY` | Conditionnelle | `sk-xxxx` | Clé OpenAI |
| `OPENROUTER_API_KEY` | Conditionnelle | `sk-or-xxxx` | Clé OpenRouter |
| `GROQ_API_KEY` | Conditionnelle | `gsk_xxxx` | Clé Groq |
| `MISTRAL_API_KEY` | Conditionnelle | `xxxx` | Clé Mistral AI |
| `TOGETHER_API_KEY` | Conditionnelle | `xxxx` | Clé Together AI |
| `OPENROUTER_MODEL` | Non | `mistralai/mistral-7b-instruct` | Surcharge le modèle OpenRouter |
| `AI_API_KEY` | Si custom | `xxxx` | Clé API pour provider custom |
| `AI_BASE_URL` | Si custom | `http://localhost:11434/v1` | URL base du provider custom (ex: Ollama) |
| `AI_MODEL` | Si custom | `llama3` | Modèle pour provider custom |

---

## Routes frontend

| Path | Composant | Auth requise | Description |
|------|-----------|:---:|-------------|
| `/` | HomeView | Non | Page d'accueil |
| `/register` | RegisterView | Non | Inscription (connexion automatique) |
| `/login` | LoginView | Non | Connexion |
| `/dashboard` | DashboardView | **Oui** | Liste des quiz + recherche + création |
| `/play/:uuid` | PublicQuizView | Non | Jeu de quiz public (anonyme) |

La route `/dashboard` redirige automatiquement vers `/login` si l'utilisateur n'est pas authentifié.
