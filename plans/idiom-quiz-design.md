# Idiom Quiz Feature Design Plan

## 1. Backend Design (`server/`)

### API Endpoint
- **Path**: `POST /api/quiz/generate`
- **Request Body**:
  ```json
  {
    "idioms": ["idiom1", "idiom2", ...], // List of idioms to include (max 20)
    "level": "junior" | "senior",
    "apiKey": "...", // Optional
    "provider": "...", // Optional
    "model": "..." // Optional
  }
  ```
- **Response**:
  ```json
  {
    "questions": [
      {
        "id": "uuid",
        "question": "Sentence with _____.",
        "options": ["idiom1", "idiom2", "idiom3", "idiom4"], // 1 correct + 3 distractors
        "answer": "idiom1",
        "explanation": "Brief explanation of why it fits."
      }
    ]
  }
  ```

### LLM Service (`server/services/llmService.js`)
- **Function**: `generateQuizWithLLM(idioms, level, options)`
- **Prompt Strategy**:
  - Input: List of target idioms.
  - Task: Generate a fill-in-the-blank question for each idiom.
  - Constraint:
    - Context must strongly suggest the specific idiom.
    - Provide 3 plausible but incorrect distractors (can be other idioms from the list or similar sounding/meaning ones).
    - Format: JSON.

**Draft Prompt:**
```text
You are a Chinese idiom teacher. Create a quiz for primary school students ({level}).
Target Idioms: {idiom_list}

For each idiom, generate:
1. A sentence where the idiom is used, but replaced with "_____".
2. 3 distractor idioms (can be real or fake but plausible).
3. A simple explanation.

Output JSON format:
[
  {
    "target": "idiom_name",
    "question": "Sentence...",
    "options": ["distractor1", "distractor2", "distractor3", "target_idiom"] (shuffled),
    "answer": "target_idiom",
    "explanation": "..."
  }
]
```

## 2. Frontend Design (`src/features/quiz/`)

### Directory Structure
```
src/features/quiz/
├── QuizView.tsx           # Main container (Mode selection -> Loading -> Game -> Result)
├── components/
│   ├── QuizSetup.tsx      # Select mode (Latest vs Weakest)
│   ├── QuizGame.tsx       # Question display & interaction
│   └── QuizResult.tsx     # Score summary & review
├── services/
│   └── quizService.ts     # API calls
└── types.ts               # Quiz interfaces
```

### Component Flow
1.  **QuizSetup**:
    - User selects "Recent Review" or "Weakness Challenge".
    - Component filters `UserProgressData` to get the list of idioms.
    - Calls `quizService.generateQuiz(idioms)`.
2.  **QuizGame**:
    - Shows one question at a time.
    - UI: Question text, 4 radio buttons/buttons for options.
    - State: `currentQuestionIndex`, `answers` map.
    - On submit answer: Show immediate feedback (Correct/Wrong + Explanation) or wait until end? -> *User requirement implies immediate feedback or review at end. Let's go with immediate feedback for learning, or "Next" flow. Let's do: Select -> Confirm -> Show Result (Correct/Wrong) + Explanation -> Next.*
3.  **QuizResult**:
    - Summary score (e.g., 8/10).
    - List of questions with user answer vs correct answer.
    - "Back to Home" or "Retry".

### Data & State Management
- **Proficiency Update**:
  - Correct: +20% (capped at 100%).
  - Wrong: -10% (floored at 0%).
- **Sync**:
  - Updates are applied to the local `UserProgressData` object.
  - `saveProgress` is called to sync to Google Drive immediately after the quiz ends.

## 3. Implementation Steps

### Step 1: Backend API
1.  Modify `server/services/llmService.js`: Add `generateQuizWithLLM`.
2.  Create `server/routes/quiz.js`: Add `/generate` endpoint.
3.  Register route in `server/index.js`.

### Step 2: Frontend Services & Types
1.  Create `src/features/quiz/types.ts`.
2.  Create `src/features/quiz/services/quizService.ts`.

### Step 3: Frontend Components
1.  Create `QuizSetup.tsx`: Logic to filter `UserProgressData`.
2.  Create `QuizGame.tsx`: The actual gameplay.
3.  Create `QuizResult.tsx`: Display results and trigger save.
4.  Create `QuizView.tsx`: Orchestrator.

### Step 4: Integration
1.  Add "Quiz" tab/button in `App.tsx` navigation.
2.  Connect `QuizView` to the main layout.

## 4. Technical Considerations
- **LLM Cost**: Generating 20 questions at once might hit token limits or timeout.
  - *Mitigation*: Limit batch size to 5-10 questions per request? Or just limit the quiz to 5-10 questions per round for better UX (20 might be too long for kids). **Decision: Default to 5 questions per round for better UX and latency.**
- **Error Handling**: What if LLM fails?
  - Fallback: Mock questions for testing/offline.
- **Distractors**: LLM might hallucinate non-existent idioms.
  - Acceptable for distractors, but better if they are real. Prompt should encourage real idioms.

## 5. Refinement on "20 idioms" requirement
User asked for "Filter recent 20 or weakest 20".
- We will filter 20 candidates from the data.
- However, generating 20 questions in one LLM call is risky (timeout/json format issues).
- **Proposal**: We will pick random **5** from the top 20 candidates to generate a quiz. This keeps the session short and API calls fast.
