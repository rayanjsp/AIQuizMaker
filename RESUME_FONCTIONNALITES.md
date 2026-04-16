# Résumé des fonctionnalités implémentées — AIQuizMaker

> Projet BTS SIO SLAM · Stack : Vue 3 · Node.js/Express · MySQL/Prisma · PDFKit · Jest · Vitest

---

## Commande pour lancer tous les tests

```bash
# Backend (depuis la racine du projet)
cd server && npx jest --no-coverage

# Frontend
cd client && npx vitest run
```

**Résultat attendu : 53 tests backend + 42 tests frontend = 95 tests, tous verts.**

---

## Fonctionnalité 1 — Contrôle et élimination des doublons

### Objectif
Éviter que l'IA génère des questions similaires ou identiques dans un même quiz, et alerter l'utilisateur lors de l'édition manuelle.

### Fichiers modifiés

#### `server/src/services/aiService.js`

**Deux nouvelles fonctions exportées :**

- **`normalizeText(text)`** — Normalise un texte pour la comparaison : minuscules, suppression des accents (NFD), remplacement de la ponctuation par des espaces, fusion des espaces multiples.
  ```
  "C'est quoi HTML ?" → "c est quoi html"
  ```

- **`deduplicateQuestions(questions, alreadyAccepted)`** — Filtre un tableau de questions IA en supprimant les doublons. Accepte un tableau optionnel de textes normalisés déjà acceptés pour éviter les collisions avec des questions précédentes.

**Intégration dans `generateQuiz`** : `deduplicateQuestions` est appelé automatiquement après chaque réponse de l'IA, avant toute écriture en base de données.

#### `client/src/components/QuizEditModal.vue`

- **`normalizeText()`** — Même logique de normalisation côté client (dupliquée pour éviter un appel réseau).
- **`duplicateIndexes`** (computed) — Détecte en temps réel les index de questions en doublon dans le formulaire d'édition.
- **`hasDuplicates`** (computed) — Booléen utilisé pour désactiver le bouton "Sauvegarder".
- **Template** : bordure rouge + message d'erreur inline sous chaque question en doublon. Le bouton "Sauvegarder" est désactivé tant que des doublons existent.

### Tests

| Fichier | Cas couverts |
|---|---|
| `server/tests/deduplication.test.js` | Normalisation (minuscules, accents, ponctuation, espaces), 3 doublons/10 → 7 retournées, 0 doublon, tous doublons, `alreadyAccepted`, comparaison accentuée |
| `client/src/components/__tests__/QuizEditModal.dedup.test.js` | Pas de warning sans doublon, warning visible sur doublon, warning disparaît à la correction, save désactivé, save réactivé après correction |

---

## Fonctionnalité 2 — Mode expert

### Objectif
Permettre des questions avec 0 à N bonnes réponses (vs une seule en mode standard), avec un système de score paramétrable par type de question.

### Modifications de la base de données

Migration à appliquer : `npx prisma migrate dev --name add_expert_mode`

| Table | Champ ajouté | Type | Défaut |
|---|---|---|---|
| `Quiz` | `mode` | `String` | `"standard"` |
| `Quiz` | `scoreConfig` | `Json?` | `null` |
| `Question` | `pointValue` | `Int` | `1` |

Les données existantes ne sont pas impactées (valeurs par défaut pour tous les nouveaux champs).

### Fichiers modifiés

#### `server/src/services/aiService.js`

- **`EXPERT_SYSTEM_PROMPT`** — Prompt dédié au mode expert : 4 à 7 options par question, de 0 à N correctes, au moins 50 % des questions avec plusieurs ou aucune bonne réponse.
- **`validateExpertQuestions(questions)`** — Vérifie que chaque question a entre 4 et 7 options et que le quota de 50 % multi-réponses est respecté.
- **`assignPointValues(questions, scoreConfig)`** — Attribue un `pointValue` à chaque question : `pointsUnique` si exactement 1 bonne réponse, `pointsMulti` sinon (0 ou plusieurs).
- **`generateQuiz(topic, difficulty, nb, mode, scoreConfig)`** — Paramètres `mode` et `scoreConfig` ajoutés. En mode expert, utilise le prompt dédié et appelle `assignPointValues` avant de retourner les questions.

#### `server/src/controllers/quizController.js`

- **`createQuiz`** — Accepte `mode` et `scoreConfig` dans le body. Persiste ces valeurs et le `pointValue` de chaque question.

#### `client/src/components/QuizCreateModal.vue`

- Toggle "Mode Expert" (switch visuel).
- Si activé : deux champs numériques pour configurer `pointsUnique` (1 bonne réponse) et `pointsMulti` (0 ou plusieurs bonnes réponses).
- Le bouton "Créer" devient violet en mode expert.

#### `client/src/composables/useQuizGame.js`

- **`selectedOptionIds`** — `ref(new Set())` remplace l'ancien `selectedOptionId` pour gérer la multi-sélection.
- **`isMultiAnswer(question)`** — Retourne `true` si la question a 0 ou 2+ bonnes réponses.
- **`isCurrentMultiAnswer`** (computed) — Computed basé sur la question courante.
- **`toggleOption(option)`** — Ajoute/retire une option de la sélection (mode checkbox).
- **`validateMultiAnswer()`** — Valide la sélection multi-réponses : score ajouté uniquement si la sélection correspond exactement aux bonnes réponses.
- **`maxScore`** (computed) — Somme de tous les `pointValue` du quiz.
- **`handleAnswer(option)`** — Mis à jour pour ajouter `question.pointValue` au lieu de 1 fixe.

#### `client/src/components/QuizGame.vue`

- Badge "EXPERT" dans le header en mode expert.
- Message "Plusieurs réponses possibles" affiché pour les questions multi-réponses.
- **Checkboxes** (avec icône SVG) + bouton "Valider mes réponses" pour les questions multi-réponses.
- **Radio buttons** (comportement actuel) pour les questions à réponse unique.
- Score final affiché sur `maxScore` en mode expert.

### Tests

| Fichier | Cas couverts |
|---|---|
| `server/tests/expertMode.test.js` | Validation 50% contrainte, questions < 4 options → invalide, > 7 → invalide, attribution pointValue unique/multi/aucune, config personnalisée, score cumulé |
| `client/src/composables/__tests__/useQuizGame.expert.test.js` | `isMultiAnswer` (1/2/0 bonnes), score exact, score partiel, mauvaise option en plus, score cumulé multi-questions, `maxScore` |
| `client/src/components/__tests__/QuizGame.expert.test.js` | Radio pour 1 réponse, checkbox pour multi, badge EXPERT, bouton Valider, radio en mode expert avec 1 réponse |

---

## Fonctionnalité 3 — Récapitulatif des réponses avec commentaires et export PDF personnalisé

### Objectif
Afficher un récapitulatif coloré des réponses en fin de quiz, permettre à l'utilisateur d'annoter chaque question, et exporter un PDF de correction incluant ces notes personnelles.

### Modifications de la base de données

Migration à appliquer : `npx prisma migrate dev --name add_result_comments`

**Nouvelle table `ResultComment`** :

| Champ | Type | Rôle |
|---|---|---|
| `id` | `Int @id @autoincrement()` | Clé primaire |
| `comment` | `String @db.Text` | Note personnelle de l'utilisateur |
| `questionId` | `Int` | Clé étrangère vers `Question` (cascade) |
| `resultId` | `Int` | Clé étrangère vers `Result` (cascade) |

Relations ajoutées : `Result.comments ResultComment[]` et `Question.resultComments ResultComment[]`.

### Fichiers modifiés

#### `server/src/services/pdfService.js`

- **`buildPersonnalisedPDF(quiz, comments)`** — Nouvelle fonction qui génère un PDF de correction (toutes les bonnes réponses et explications) en ajoutant les notes personnelles de l'utilisateur après chaque explication, en italique violet avec le préfixe "Note personnelle :". Les questions sans commentaire sont ignorées silencieusement.

#### `server/src/controllers/quizController.js`

- **`submitPrivateScore`** (`POST /api/quiz/:id/submit`) — Crée un `Result` lié à l'utilisateur connecté, sauvegarde les commentaires via `prisma.resultComment.createMany()`, retourne `{ resultId }`.
- **`submitPublicScore`** — Mis à jour pour accepter un champ optionnel `comments` et retourner `resultId` dans la réponse.
- **`downloadPersonalisedPdf`** (`GET /api/quiz/:id/pdf-personnalise?resultId=XXX`) — Vérifie que le résultat appartient au quiz, charge les commentaires associés, génère et retourne le PDF personnalisé.
- **`downloadPublicPersonalisedPdf`** (`GET /api/quiz/public/:uuid/pdf-personnalise?resultId=XXX`) — Variante publique sans authentification requise.

#### `server/src/routes/quizRoutes.js`

Nouvelles routes :
```
POST /api/quiz/:id/submit               → submitPrivateScore
GET  /api/quiz/:id/pdf-personnalise     → downloadPersonalisedPdf
GET  /api/quiz/public/:uuid/pdf-personnalise → downloadPublicPersonalisedPdf
```

#### `client/src/composables/useQuizGame.js`

- **`userAnswers`** — `ref([])` — une entrée `{ questionId, selectedOptionIds, wasCorrect }` poussée à chaque réponse (single ou multi).
- **`userComments`** — `ref([])` — initialisé au démarrage avec `{ questionId, comment: '' }` pour chaque question. Réinitialisé à `resetGame()`.
- **`hasAnyComment`** (computed) — `true` si au moins un commentaire non vide a été saisi.
- **`getRecapOptionClass(option, answer)`** — Retourne la classe CSS appropriée pour colorier une option dans le récapitulatif (vert sélectionné, vert non-sélectionné, rouge sélectionné, gris neutre).

#### `client/src/components/QuizGame.vue`

**Écran de fin restructuré :**
1. **Carte score** — note finale (sur `maxScore` en mode expert, sur `nbQuestions` en standard).
2. **Section récapitulatif** — pour chaque question : texte, options colorées (vert = bonne réponse, rouge = mauvaise réponse choisie), explication, `<textarea>` liée à `userComments`.
3. **Bouton "Exporter le corrigé personnalisé"** — visible uniquement si `hasAnyComment`. Au clic : soumet le score + commentaires via `POST /api/quiz/:id/submit`, récupère le `resultId`, télécharge le PDF via `GET /api/quiz/:id/pdf-personnalise?resultId=XXX`.

### Tests

| Fichier | Cas couverts |
|---|---|
| `server/tests/comments.test.js` | Retourne un Buffer, "Note personnelle" présente si commentaire fourni, absente si aucun commentaire, commentaires vides/espaces ignorés, titre présent, texte des questions présent |
| `client/src/composables/__tests__/useQuizGame.recap.test.js` | `userComments` initialisé au démarrage, réinitialisé après `resetGame`, `userAnswers` rempli à chaque réponse, `wasCorrect` correct, IDs sélectionnés enregistrés, `hasAnyComment` false/true/espaces |
| `client/src/components/__tests__/QuizGame.recap.test.js` | Récapitulatif visible en fin, toutes les questions présentes, une textarea par question, bouton export absent sans commentaire, bouton export visible après saisie, textarea liée au bon `questionId` |

---

## Fonctionnalité 4 — Tests unitaires et fonctionnels

### Stratégie appliquée

- **Tests unitaires backend (Jest)** pour toutes les fonctions pures : normalisation, dédoublonnage, validation expert, attribution `pointValue`, génération PDF.
- **Tests de composants Vue (Vitest + Vue Test Utils)** pour les comportements UI : checkbox/radio, récapitulatif coloré, warning doublon, bouton export.
- **Mocks** : IA mockée via `jest.mock('openai')`, PDFKit mocké avec `on('end', cb)` déclenché en `setTimeout`, Prisma mocké via `jest-mock-extended`.
- **Couverture prioritaire** : 100 % des fonctions de calcul et de validation, scénarios nominaux et cas limites sur les composants.

### Bilan final des tests

| Suite | Fichier | Tests |
|---|---|---|
| **Backend** | `deduplication.test.js` | 11 ✅ |
| **Backend** | `expertMode.test.js` | 10 ✅ |
| **Backend** | `comments.test.js` | 6 ✅ |
| **Backend** | `quizController.test.js` | 9 ✅ |
| **Backend** | `pdfService.test.js` | 2 ✅ |
| **Backend** | `aiService.test.js` | 4 ✅ |
| **Backend** | `authController.test.js` | 4 ✅ |
| **Backend** | `authMiddleware.test.js` | 4 ✅ |
| **Backend** | `setup (prisma mock)` | 3 ✅ |
| **Frontend** | `useQuizGame.expert.test.js` | 10 ✅ |
| **Frontend** | `useQuizGame.recap.test.js` | 9 ✅ |
| **Frontend** | `QuizGame.expert.test.js` | 5 ✅ |
| **Frontend** | `QuizGame.recap.test.js` | 6 ✅ |
| **Frontend** | `QuizEditModal.dedup.test.js` | 5 ✅ |
| **Frontend** | `LoginView.test.js` | 2 ✅ |
| **Frontend** | `RegisterView.test.js` | 2 ✅ |
| **Frontend** | `PublicQuizView.test.js` | 3 ✅ |
| | **TOTAL** | **95 / 95** ✅ |

---

## Récapitulatif des modifications de la base de données

| Table | Modification | Détail |
|---|---|---|
| `Quiz` | +2 champs | `mode String @default("standard")` · `scoreConfig Json?` |
| `Question` | +1 champ | `pointValue Int @default(1)` |
| `ResultComment` | Nouvelle table | Commentaire utilisateur lié à un `Result` et une `Question` |
| `Result` | +1 relation | `comments ResultComment[]` |
| `Question` | +1 relation | `resultComments ResultComment[]` |

**Migrations à exécuter dans l'ordre :**

```bash
cd server
npx prisma migrate dev --name add_expert_mode
npx prisma migrate dev --name add_result_comments
```

---

## Récapitulatif des fichiers créés ou modifiés

| Fichier | Action | Fonctionnalité |
|---|---|---|
| `server/prisma/schema.prisma` | Modifié | F2, F3 |
| `server/src/services/aiService.js` | Modifié | F1, F2 |
| `server/src/controllers/quizController.js` | Modifié | F2, F3 |
| `server/src/services/pdfService.js` | Modifié | F3 |
| `server/src/routes/quizRoutes.js` | Modifié | F3 |
| `client/src/composables/useQuizGame.js` | Modifié | F2, F3 |
| `client/src/components/QuizGame.vue` | Modifié | F2, F3 |
| `client/src/components/QuizCreateModal.vue` | Modifié | F2 |
| `client/src/components/QuizEditModal.vue` | Modifié | F1 |
| `server/tests/setup.js` | Modifié | F4 (JWT_SECRET ajouté) |
| `server/tests/quizController.test.js` | Modifié | F4 (mis à jour signature + req.quiz) |
| `server/tests/pdfService.test.js` | Réécrit | F4 (mock corrigé) |
| `client/src/views/RegisterView.test.js` | Modifié | F4 (navigation /login corrigée) |
| `server/tests/deduplication.test.js` | Créé | F1 |
| `server/tests/expertMode.test.js` | Créé | F2 |
| `server/tests/comments.test.js` | Créé | F3 |
| `client/src/composables/__tests__/useQuizGame.expert.test.js` | Créé | F2 |
| `client/src/composables/__tests__/useQuizGame.recap.test.js` | Créé | F3 |
| `client/src/components/__tests__/QuizGame.expert.test.js` | Créé | F2 |
| `client/src/components/__tests__/QuizGame.recap.test.js` | Créé | F3 |
| `client/src/components/__tests__/QuizEditModal.dedup.test.js` | Créé | F1 |
