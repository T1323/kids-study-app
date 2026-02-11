# Idiom Quiz Implementation Plan

This plan details the steps to implement the "Idiom Fill-in-the-Blank Quiz" feature.

## Phase 1: Backend Implementation

### 1.1 Update LLM Service (`server/services/llmService.js`)
- **Goal**: Add function `generateQuizWithLLM` to generate quiz questions using LLM.
- **Input**: `idioms` (string[]), `level` ("junior" | "senior"), `options` (provider config).
- **Prompt Logic**:
  - Context: "You are a teacher creating a fill-in-the-blank quiz."
  - Constraint: JSON output only. 5 questions.
  - Structure per question:
    - `question`: Sentence with "_____" placeholder.
    - `options`: Array of 4 strings (1 correct + 3 distractors).
    - `answer`: The correct idiom string.
    - `explanation`: Brief explanation of why it fits.

### 1.2 Create Quiz Route (`server/routes/quiz.js`)
- **Goal**: Expose `/api/quiz/generate` endpoint.
- **Handler**: `postGenerateQuiz`
  - Validates input (idiom list length, level).
  - Calls `generateQuizWithLLM`.
  - Handles errors (LLM failure, parsing error).

### 1.3 Register Route (`server/index.js`)
- **Goal**: Mount the new route.
- **Action**: `app.use('/api/quiz', quizRouter);`

## Phase 2: Frontend Implementation

### 2.1 Define Types (`src/features/quiz/types.ts`)
- **Interfaces**:
  - `QuizQuestion`: id, question, options, answer, explanation.
  - `QuizResult`: score, correctCount, totalCount.
  - `QuizMode`: "latest" | "weakest".

### 2.2 Create Service (`src/features/quiz/services/quizService.ts`)
- **Goal**: Communicate with backend.
- **Function**: `fetchQuiz(idioms: string[], level: string): Promise<QuizQuestion[]>`

### 2.3 Create Components

#### A. `QuizSetup.tsx`
- **Goal**: Allow user to start a quiz.
- **Props**:
  - `history`: `UserProgressData` (to pick idioms from).
  - `onStart`: `(questions: QuizQuestion[]) => void`.
- **Logic**:
  - Button 1: "Latest Review" -> Sort by `queryTime`, take top 20, pick 5 random.
  - Button 2: "Weakest Challenge" -> Sort by `proficiency` (asc), take top 20, pick 5 random.
  - Call `quizService.fetchQuiz`.
  - Show loading state.

#### B. `QuizGame.tsx`
- **Goal**: Interactive quiz interface.
- **Props**:
  - `questions`: `QuizQuestion[]`.
  - `onComplete`: `(results: { questionId: string, isCorrect: boolean }[]) => void`.
- **State**: `currentIndex`, `selectedOption`, `showFeedback`.
- **UI**:
  - Progress bar (e.g., "Question 1/5").
  - Question card.
  - 4 Option buttons.
  - "Next" button (appears after answering).

#### C. `QuizResult.tsx`
- **Goal**: Show summary and update progress.
- **Props**:
  - `results`: User's answers.
  - `questions`: Original questions.
  - `onClose`: `() => void`.
- **UI**:
  - Score (e.g., "80分！").
  - List of questions with correct/wrong indicators.
  - "Finish" button.

#### D. `QuizView.tsx` (Main Container)
- **Goal**: Manage the overall flow.
- **State**:
  - `phase`: "setup" | "playing" | "result".
  - `questions`: `QuizQuestion[]`.
  - `userAnswers`: `Record<string, boolean>`.
- **Logic**:
  - Coordinates `QuizSetup` -> `QuizGame` -> `QuizResult`.
  - Handles **Proficiency Update**:
    - On complete, calculate new proficiency for each idiom.
    - Update `UserProgressData`.
    - Trigger `saveProgress` (sync to Google Drive).

### 2.4 Integration (`src/App.tsx`)
- **Goal**: Add access point.
- **UI**: Add a tab/button in the header or main nav to switch to `QuizView`.

## Phase 3: Testing & Polish

### 3.1 Testing
- **Backend**: Test `/api/quiz/generate` with Postman/curl.
- **Frontend**:
  - Test flow: Setup -> Game -> Result -> Back.
  - Test "Latest" vs "Weakest" logic.
  - Verify proficiency updates in `LearningHistory`.

### 3.2 Polish
- **Styling**: Make it kid-friendly (large fonts, clear buttons).
- **Feedback**: Add loading spinners and error messages.
