# Idiom Matching Quiz Implementation Plan

## Overview
Implement a new "Idiom Matching" quiz mode where users match idioms to fill-in-the-blank sentences. The system will support up to 10 pairs. If fewer than 10 idioms are available in the user's history, it will generate sentences for all available idioms.

## Backend Changes

### 1. `server/services/llmService.js`

- **New Function**: `buildMatchingQuizPrompt(targets, level)`
  - **Input**: `targets` (array of idioms), `level` (difficulty).
  - **Prompt**:
    - Request a JSON array of objects.
    - Each object: `{ "id": string, "idiom": string, "sentence": string }`.
    - `sentence`: A sentence using the idiom, but with the idiom replaced by `_____` (5 underscores).
    - Ensure sentences are appropriate for the `level`.
    - Handle cases where `targets` length < 10 (generate for all provided targets).

- **Update**: `generateQuizWithLLM(targets, level, options, type)`
  - Add logic to handle `type === 'idiom-matching'`.
  - If `type` is matching, call `buildMatchingQuizPrompt`.
  - Return the parsed array directly.

### 2. `server/routes/quiz.js`

- **Update**: `postGenerateQuiz`
  - Accept `type: 'idiom-matching'` from the request body.
  - Pass this type to `generateQuizWithLLM`.
  - Ensure `targets` or `idioms` list is passed correctly.

## Frontend Changes

### 1. `src/features/quiz/types.ts`

- **New Interface**:
  ```typescript
  export interface MatchingPair {
    id: string;
    idiom: string;
    sentence: string;
  }
  
  export interface MatchingQuizResult {
      pairs: MatchingPair[];
      score: number;
      total: number;
  }
  ```

### 2. `src/features/quiz/services/quizService.ts`

- **Update**: `GenerateQuizRequest` interface
  - Update `type` to allow `'idiom-matching'`.

- **Update**: `generateQuiz` function
  - Pass the `type` parameter to the backend.

### 3. `src/features/quiz/components/QuizMatchingGame.tsx` (New Component)

- **Props**:
  - `pairs: MatchingPair[]`
  - `onComplete: (score: number) => void`

- **State**:
  - `selectedSentence: string | null` (ID of selected sentence)
  - `selectedIdiom: string | null` (ID of selected idiom)
  - `matches: Record<string, string>` (Map of sentence ID -> matched idiom ID)
  - `completed: boolean`
  - `results: { [sentenceId: string]: boolean }` (Correct/Incorrect status for feedback)

- **UI Layout**:
  - **Left Column**: List of Sentences (with `_____`).
    - Clickable. Highlight when selected.
    - If matched, show the idiom filled in (or distinct style).
  - **Right Column**: List of Idioms (Draggable or Clickable).
    - Clickable. Highlight when selected.
    - Hide or disable if already matched.
  - **Interaction**:
    - Tap Sentence -> Tap Idiom -> Attempt Match.
    - Auto-check or "Submit" button? -> **Auto-check upon pairing** is friendlier for this game type.
    - Or: **Submit All at Once**?
      - *Decision*: **Submit All at Once** is better for a quiz context. Users can change their minds.
      - Add a "Check Answers" button at the bottom.

- **Feedback Mode**:
  - After "Check Answers":
    - Color code correct matches (Green).
    - Color code incorrect matches (Red).
    - Show score.
    - "Finish" button.

### 4. `src/features/quiz/QuizSetup.tsx`

- **Update**: `handleStart`
  - If mode is `'idiom-matching'`:
    - Select **up to 10** items (instead of 5).
    - Call `generateQuiz` with `type: 'idiom-matching'`.
  - Add a new card in `mode-selection` (or a toggle/tab) for "Matching Game".
    - Maybe replace the "Latest/Weakest" split with "Multiple Choice / Matching" first, then "Latest/Weakest"?
    - *Better*: Keep "Latest/Weakest" cards, but add a `QuizTypeSelector` above them (Radio buttons: "Multiple Choice", "Matching").

### 5. `src/features/quiz/QuizView.tsx` (Main Container)

- **State**:
  - `quizType: 'multiple-choice' | 'matching'`
- **Render**:
  - If `quizType === 'matching'`, render `QuizMatchingGame` instead of `QuizGame`.

## Step-by-Step Implementation

1.  **Backend**: Implement `buildMatchingQuizPrompt` and update `generateQuizWithLLM`.
2.  **Backend**: Update route handling in `server/routes/quiz.js`.
3.  **Frontend**: Add types in `types.ts`.
4.  **Frontend**: Update `quizService.ts`.
5.  **Frontend**: Create `QuizMatchingGame.tsx` with basic UI and interaction logic.
6.  **Frontend**: Update `QuizSetup.tsx` to include the matching mode option and logic to fetch 10 items.
7.  **Frontend**: Integrate `QuizMatchingGame` into `QuizView.tsx`.
