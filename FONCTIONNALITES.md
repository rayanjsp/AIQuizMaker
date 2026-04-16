# Nouvelles fonctionnalités — AIQuizMaker (BTS SIO SLAM)

> Document de présentation technique des évolutions proposées pour le projet AIQuizMaker.  
> Stack : Vue 3 · Node.js/Express · MySQL/Prisma · PDFKit · Jest · Vitest

---

## Fonctionnalité 1 — Contrôle et élimination des doublons

### Problème
L'IA peut générer des questions similaires ou identiques dans un même quiz.

### Impact sur la base de données
**Aucune modification du schéma.** Le dédoublonnage est entièrement géré en mémoire, entre la réception de la réponse IA et la persistance en base.

### Approche backend — `server/src/services/aiService.js`

**Normalisation du texte**

Avant toute comparaison, chaque texte de question est normalisé :
- Mise en minuscules
- Suppression des accents et diacritiques
- Suppression de la ponctuation
- Suppression des espaces multiples

Exemple : `"C'est quoi HTML ?"` → `"cest quoi html"`

**Dédoublonnage intra-quiz**

Après réception du JSON de l'IA, et avant toute écriture en base :
1. Construire un `Set` des textes normalisés des questions déjà acceptées
2. Pour chaque nouvelle question, comparer son texte normalisé avec le `Set`
3. Si doublon exact → éliminer la question
4. Si le quota n'est pas atteint après filtrage → relancer une génération partielle, en transmettant les questions déjà acceptées dans le prompt pour éviter de nouvelles collisions

### Approche frontend — `client/src/components/QuizEditModal.vue`

Lors de l'édition manuelle d'un quiz :
- À chaque modification d'un champ "texte de question", comparer la valeur normalisée avec celles des autres questions du formulaire
- Afficher un message d'erreur inline en cas de doublon détecté
- Désactiver le bouton "Enregistrer" tant que des doublons existent

### Tests associés

| Fichier | Cas testés |
|---|---|
| `server/tests/deduplication.test.js` | Normalisation, 3 doublons sur 10 → 7 retournées, 0 doublon, tous doublons |
| `client/src/components/__tests__/QuizEditModal.dedup.test.js` | Warning visible sur doublon, disparaît à la correction, save désactivé |

---

## Fonctionnalité 2 — Niveau expert

### Problème
Le mode actuel ne propose qu'une seule bonne réponse par question (radio buttons). Le niveau expert doit permettre de 0 à N bonnes réponses, avec entre 4 et 7 options par question, et un système de score paramétrable.

### Modifications de la base de données

**Table `Quiz` — 2 nouveaux champs**

| Champ | Type | Valeur par défaut | Rôle |
|---|---|---|---|
| `mode` | `String` | `"standard"` | `"standard"` ou `"expert"` |
| `scoreConfig` | `Json` (nullable) | `null` | Configuration des points : `{ pointsUnique: 1, pointsMulti: 2 }` |

**Table `Question` — 1 nouveau champ**

| Champ | Type | Valeur par défaut | Rôle |
|---|---|---|---|
| `pointValue` | `Int` | `1` | Nombre de points attribués à cette question, calculé à la génération |

**Table `Option` — aucun changement**

Le champ `isCorrect Boolean` existe déjà. En mode expert, plusieurs options d'une même question peuvent avoir `isCorrect: true`, voire aucune (toutes à `false`).

**Migration Prisma**

```
prisma migrate dev --name add_expert_mode
```

Les données existantes ne sont pas impactées : `mode` a une valeur par défaut, `pointValue` aussi, et `scoreConfig` est nullable.

### Approche backend — `server/src/services/aiService.js`

**Nouveau prompt expert**
- Demander à l'IA entre 4 et 7 options par question
- Préciser que de 0 à N options peuvent être correctes (cas extrêmes inclus : aucune bonne, toutes bonnes)
- Imposer qu'au moins 50 % des questions aient plusieurs bonnes réponses ou aucune

**Validation post-génération**
- Vérifier que chaque question a bien entre 4 et 7 options
- Vérifier que le quota de 50 % multi-réponses est respecté
- En cas d'échec : relancer la génération

**Attribution du `pointValue`**
- Après parsing de la réponse IA, compter les options `isCorrect: true` par question
- Exactement 1 bonne réponse → `pointValue = scoreConfig.pointsUnique`
- 0 ou plusieurs bonnes réponses → `pointValue = scoreConfig.pointsMulti`

**`server/src/controllers/quizController.js`**
- Recevoir `mode` et `scoreConfig` dans le body de la requête de création
- Les persister avec le quiz via Prisma

### Approche frontend

**`client/src/components/QuizCreateModal.vue`**
- Toggle "Mode expert"
- Si activé : deux champs numériques pour configurer les points par type de question

**`client/src/composables/useQuizGame.js` + `client/src/components/QuizGame.vue`**
- Détecter le nombre de réponses correctes par question
- 0 ou plusieurs `isCorrect: true` → afficher des **checkboxes** (sélection multiple)
- Exactement 1 `isCorrect: true` → comportement actuel (**radio buttons**)
- Calcul du score : si la sélection du joueur correspond exactement aux options `isCorrect: true` → ajouter `question.pointValue` au score total, sinon 0 pour cette question

### Tests associés

| Fichier | Cas testés |
|---|---|
| `server/tests/expertMode.test.js` | Contraintes prompt, validation 3/8 options → erreur, score exact/partiel, attribution `pointValue` |
| `client/src/composables/__tests__/useQuizGame.expert.test.js` | `isMultiAnswer`, calcul score cumulé |
| `client/src/components/__tests__/QuizGame.expert.test.js` | Rendu checkbox/radio selon type de question |

---

## Fonctionnalité 3 — Récapitulatif des réponses avec commentaires et export PDF personnalisé

### Problème
L'utilisateur ne voit que sa note finale. Il n'a pas de récapitulatif de ses réponses, ni de moyen d'annoter le corrigé pour se souvenir de ses erreurs.

### Modifications de la base de données

**Nouvelle table `ResultComment`**

| Champ | Type | Rôle |
|---|---|---|
| `id` | `Int @id @autoincrement()` | Clé primaire |
| `comment` | `String @db.Text` | Texte libre de l'utilisateur |
| `questionId` | `Int` | Clé étrangère vers `Question` |
| `resultId` | `Int` | Clé étrangère vers `Result` |

Les deux clés étrangères sont configurées avec `onDelete: Cascade` : si une question ou un résultat est supprimé, ses commentaires le sont aussi automatiquement.

**Table `Result` — 1 nouvelle relation**

```
comments  ResultComment[]
```

**Table `Question` — 1 nouvelle relation**

```
resultComments  ResultComment[]
```

**Migration Prisma**

```
prisma migrate dev --name add_result_comments
```

### Approche frontend

**`client/src/composables/useQuizGame.js`**
- Ajouter un tableau réactif `userAnswers` : `[{ questionId, selectedOptionIds: [], wasCorrect: boolean }]` — une entrée poussée à chaque réponse
- Ajouter un tableau `userComments` : `[{ questionId, comment: '' }]` — initialisé à vide pour chaque question au démarrage du quiz

**`client/src/components/QuizGame.vue` — écran de fin**
- Conserver l'affichage de la note en haut
- Ajouter une section "Récapitulatif de vos réponses" :
  - Pour chaque question : texte, réponse(s) choisie(s) colorée(s) (rouge/vert), bonne(s) réponse(s), explication
  - Sous chaque bloc : `<textarea>` lié à `userComments` pour saisir une note personnelle
- Bouton "Exporter le corrigé personnalisé" — visible seulement si au moins un commentaire a été saisi

### Approche backend

**`server/src/controllers/quizController.js`**
- Accepter un champ optionnel `comments: [{ questionId, comment }]` dans le body de soumission
- Après création du `Result` → créer les `ResultComment` via `prisma.resultComment.createMany()` (un seul appel base de données)
- Si aucun commentaire fourni → ne rien créer, aucune erreur

**Nouveau endpoint**

```
GET /api/quiz/:id/pdf-personnalise?resultId=XXX
```

- Vérifier que le `Result` appartient à l'utilisateur connecté
- Récupérer le `Result` avec ses `ResultComment` via `prisma include`
- Appeler `pdfService.buildPersonnalisedPDF(quiz, comments)`

**`server/src/services/pdfService.js`**
- Nouvelle fonction `buildPersonnalisedPDF` qui reprend la logique du corrigé existant
- Après l'explication de chaque question, insère le commentaire de l'utilisateur en italique, préfixé de "Note personnelle :"
- Si aucun commentaire pour une question → rien d'affiché, le PDF reste identique au corrigé standard

### Tests associés

| Fichier | Cas testés |
|---|---|
| `server/tests/comments.test.js` | Création/association `resultId`/`questionId`, cascade suppression, présence "Note personnelle" dans le PDF mockée |
| `client/src/composables/__tests__/useQuizGame.recap.test.js` | `userAnswers` rempli question par question, `userComments` initialisé, mise à jour commentaire |
| `client/src/components/__tests__/QuizGame.recap.test.js` | Récapitulatif visible, réponses colorées, textarea lié au bon `questionId` |

---

## Fonctionnalité 4 — Tests unitaires et fonctionnels

### Stratégie

Le projet dispose déjà de **Jest** côté backend et **Vitest** côté frontend avec une suite de tests existante dans `server/tests/`. L'approche est d'étendre ces fichiers et d'en créer de nouveaux par fonctionnalité.

### Principes appliqués

- **Tests unitaires** pour toutes les fonctions pures : normalisation, calcul de score, validation, attribution `pointValue`
- **Tests de composants Vue** pour les comportements UI : rendu checkbox/radio, affichage récapitulatif, avertissement doublon
- **Mocks** pour l'IA (déjà en place dans `aiService.test.js`) et pour PDFKit — évite les appels réseau et les effets de bord
- **Couverture prioritaire** : fonctions de calcul et de validation à 100 %, composants sur les scénarios nominaux et cas limites

### Tableau récapitulatif des fichiers de tests

| Fichier | Type | Fonctionnalité |
|---|---|---|
| `server/tests/deduplication.test.js` | Unitaire | Dédoublonnage |
| `server/tests/expertMode.test.js` | Unitaire | Mode expert |
| `server/tests/comments.test.js` | Unitaire + intégration | Commentaires + PDF |
| `client/src/composables/__tests__/useQuizGame.expert.test.js` | Unitaire | Logique mode expert |
| `client/src/composables/__tests__/useQuizGame.recap.test.js` | Unitaire | Logique récapitulatif |
| `client/src/components/__tests__/QuizGame.expert.test.js` | Composant | Rendu mode expert |
| `client/src/components/__tests__/QuizGame.recap.test.js` | Composant | Rendu récapitulatif |
| `client/src/components/__tests__/QuizEditModal.dedup.test.js` | Composant | Dédoublonnage éditeur |

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
prisma migrate dev --name add_expert_mode
prisma migrate dev --name add_result_comments
```

Aucune donnée existante n'est perdue : tous les nouveaux champs ont des valeurs par défaut, et la nouvelle table est indépendante des données actuelles.

---

## Fichiers à créer ou modifier

| Fichier | Action |
|---|---|
| `server/prisma/schema.prisma` | Modifier |
| `server/src/services/aiService.js` | Modifier |
| `server/src/controllers/quizController.js` | Modifier |
| `server/src/services/pdfService.js` | Modifier |
| `client/src/composables/useQuizGame.js` | Modifier |
| `client/src/components/QuizGame.vue` | Modifier |
| `client/src/components/QuizCreateModal.vue` | Modifier |
| `client/src/components/QuizEditModal.vue` | Modifier |
| `server/tests/deduplication.test.js` | Créer |
| `server/tests/expertMode.test.js` | Créer |
| `server/tests/comments.test.js` | Créer |
| `client/src/composables/__tests__/useQuizGame.expert.test.js` | Créer |
| `client/src/composables/__tests__/useQuizGame.recap.test.js` | Créer |
| `client/src/components/__tests__/QuizGame.expert.test.js` | Créer |
| `client/src/components/__tests__/QuizGame.recap.test.js` | Créer |
| `client/src/components/__tests__/QuizEditModal.dedup.test.js` | Créer |
