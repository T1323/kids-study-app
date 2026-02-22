# Custom Challenge Implementation Plan

## 1. Backend Changes

### `server/services/llmService.js`
- Create `generateCustomQuizWithLLM(description, level, options)`
- **Prompt Strategy**:
  - Role: English teacher.
  - Input: User's natural language description (e.g., "ordering food", "at the airport").
  - Task: Generate 10 multiple-choice questions related to the topic.
  - Output: JSON Array of question objects (same format as existing quiz).
  - Schema:
    ```json
    [
      {
        "id": "1",
        "target": "menu", // The focus word of the question
        "type": "meaning", // or "usage", "dialogue"
        "question": "In a restaurant, the server brings you a ____ to see the food options.",
        "options": ["table", "menu", "chair", "fork"],
        "answer": "menu",
        "explanation": "Menu 菜單，是用來看餐點選項的。"
      }
    ]
    ```

### `server/routes/quiz.js`
- Update `postGenerateQuiz` to handle `description` parameter.
- Logic:
  - If `description` is present, call `generateCustomQuizWithLLM`.
  - Else if `targets` (or `idioms`) is present, call `generateQuizWithLLM`.

## 2. Frontend Changes

### `src/features/english/EnglishSearchView.tsx`
- Add a new tab: "Custom Challenge" (e.g., "自訂挑戰").
- State: `activeTab` can be 'search', 'quiz', 'custom'.

### `src/features/english/components/CustomChallengeSetup.tsx` (New Component)
- **UI**:
  - Textarea for user description (e.g., "I want to learn words about..." or "我想練習...").
  - "Generate Quiz" button.
  - History list of previous custom challenges.
- **Action**:
  - Call API with description.
  - On success, switch to `QuizView` (or a variation) with the generated questions.

### `src/features/quiz/services/quizService.ts`
- Update `generateQuiz` to accept `description` in the payload.

## 3. Data Storage
- Need to store history of custom challenges.
- Use `UserProgressData` in `src/features/sync/services/googleDrive.ts`.
- Add `custom_challenges` field to `english` part or a new top-level key.
- Structure:
  ```typescript
  interface CustomChallengeHistory {
    id: string;
    description: string;
    timestamp: number;
    // Optional: store the generated questions to re-play without cost? 
    // For now, maybe just description is enough to re-generate (but results may vary).
    // Better to store the questions if possible, but might be large.
    // Let's store just description for now to keep it simple, or maybe the first few words as title.
  }
  ```
- **Decision**: Store `customHistory` in `UserProgressData['english']` or similar.
- Existing `UserProgressData` has `english: { [word: string]: EnglishWordProgress }`.
- We might need to expand `UserProgressData` or `EnglishProgress`.
- Let's add `customHistory: CustomChallengeRecord[]` to `UserProgressData`.

## 4. Execution Steps
1.  **Backend**: Implement `generateCustomQuizWithLLM` in `llmService.js`.
2.  **Backend**: Update `quiz.js` route.
3.  **Frontend**: Update `types.ts` and `quizService.ts`.
4.  **Frontend**: Create `CustomChallengeSetup` component.
5.  **Frontend**: Integrate into `EnglishSearchView`.
6.  **Frontend**: Implement history saving/loading in `EnglishSearchView` (or `CustomChallengeSetup`).
