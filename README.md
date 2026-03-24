# AIQuizMaker

Application web full-stack de génération de quiz par IA. L'utilisateur saisit un sujet, l'IA (DeepSeek) génère un QCM complet, exportable en PDF et partageable publiquement via un lien unique.

**Projet BTS SIO SLAM — 2025/2026**

---

## Fonctionnalités

- **Génération automatique de quiz** via l'IA DeepSeek (sujet, difficulté, nombre de questions)
- **Édition manuelle** des questions et options, avec assistance IA
- **Jeu interactif** : quiz jouable en ligne avec score immédiat
- **Partage public** via un lien UUID (joueurs anonymes avec pseudo)
- **Export PDF** : feuille de test vierge ou corrigée avec explications
- **Historique des résultats** : scores des utilisateurs connectés et des invités
- **Tableau de bord** : gestion des quiz avec recherche en temps réel

---

## Architecture globale

```mermaid
graph LR
    subgraph Client["Frontend — Vue 3 (port 5173)"]
        R[Router] --> V[Views]
        V --> CO[Components]
        CO --> ST[Pinia Store]
        ST --> UA[useApi / useAuth]
    end

    subgraph Server["Backend — Express (port 3000)"]
        MW[Middleware JWT] --> CT[Controllers]
        CT --> SV[Services]
    end

    subgraph Data["Données"]
        DB[(MySQL)]
        AI[DeepSeek API]
    end

    UA -->|"HTTP /api (proxy Vite)"| MW
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
| **IA** | DeepSeek Chat (via SDK OpenAI) | deepseek-chat |
| **Auth** | JWT (jsonwebtoken) | 9.0 |
| **PDF** | PDFKit | 0.17 |
| **Tests** | Jest (backend) + Vitest (frontend) | 30 / 4.1 |

---

## Prérequis

- **Node.js** v20.19.0 ou ≥ 22.12.0
- **MySQL** 5.7+ (local ou distant)
- **Clé API DeepSeek** — obtenir sur [platform.deepseek.com](https://platform.deepseek.com)

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

Créer le fichier `server/.env` :

```env
# Serveur
PORT=3000

# Base de données MySQL
DATABASE_URL="mysql://root:motdepasse@localhost:3306/aiquizmaker"

# Intelligence Artificielle
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Sécurité JWT
JWT_SECRET=une_phrase_secrete_aleatoire_longue

# CORS — URL du frontend
FRONTEND_URL=http://localhost:5173
```

> La variable `OPENROUTER_API_KEY` est optionnelle (backup IA non utilisé en production).

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
    participant AI as DeepSeek API
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

### DeepSeek Chat API
Le SDK OpenAI est utilisé en pointant sur l'endpoint DeepSeek :

```js
// server/src/services/aiService.js
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});
```

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
| `DEEPSEEK_API_KEY` | **Oui** | `sk-xxxx` | Clé API DeepSeek pour la génération IA |
| `JWT_SECRET` | **Oui** | `une_phrase_secrete` | Secret pour signer les tokens JWT |
| `FRONTEND_URL` | **Oui** | `http://localhost:5173` | URL du frontend (utilisé pour CORS) |
| `OPENROUTER_API_KEY` | Non | `sk-or-xxxx` | Clé API OpenRouter (backup IA, non utilisé) |

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
