# Idiom Matching Quiz Refinement Plan

This plan outlines the specific refinements for the Idiom Matching Quiz to improve User Experience (UX), Error Handling, and Extensibility.

## 1. UX Improvements (`src/features/quiz/components/QuizMatchingGame.tsx`)

### A. Visual Feedback & Interaction
- **Dynamic Blank Filling**: Instead of keeping `_____` when matched, the blank should be replaced by the matched idiom text in a distinct color (e.g., blue or underlined).
  - *Current Implementation*: Already has logic `{matchedIdiomText || '_____'}`. We will enhance the CSS to make the filled state more obvious (e.g., bold, different color, maybe a subtle background highlight).
- **Selection Visibility**: enhance the `.selected` state.
  - *Change*: Increase border thickness or change background color to be more distinct from the hover state.
- **Match Confirmation**:
  - *Add*: A subtle animation or sound effect (optional) when a match is formed.
  - *Add*: A "Clear Selection" option or easy way to unmatch. (Currently clicking the idiom again unmatches, but it's not explicit). We will add a tooltip or instruction "Click matched idiom to remove".
- **Progress Indicator**:
  - *Add*: A simple "Matched: X / Total" counter at the top.

### B. Mobile Responsiveness
- **Layout**:
  - *Current*: Stacks sentences then idioms.
  - *Problem*: User has to scroll up and down to match.
  - *Solution*: 
    - Keep Sentences on top.
    - Make the **Idioms List sticky** at the bottom of the viewport or use a "floating drawer" style if possible.
    - Alternatively, for simplicity: Ensure the "Idioms" section has a max-height and is scrollable, or stick to the bottom of the screen so it's always visible while scrolling sentences.
    - *Decision*: We will try to make the Idioms column `position: sticky; bottom: 0;` on mobile, or at least ensure it doesn't get pushed too far down.

## 2. Setup & State Management (`src/features/quiz/components/QuizSetup.tsx`)

### A. Item Count Handling
- **Problem**: If user has < 10 history items, the game might be too short.
- **Refinement**: 
  - Check `candidates.length`. 
  - If `< 5`, warn the user: "You need at least 5 idioms in history to play matching game." (Or just let them play with fewer).
  - *Decision*: Minimum 5 items required for Matching Game. If < 5, disable the "Matching Game" radio button with a tooltip.

### B. Extensibility
- **Quiz Type Selector**:
  - Move the radio buttons to a separate `QuizTypeSelector` component for cleaner code.
  - Add a "description" or "icon" for each type to make it more engaging.

## 3. Backend / LLM Service (`server/services/llmService.js`)

### A. Prompt Engineering
- **Distractors (Optional)**: For "Senior" or higher levels, we could ask LLM to generate 2 extra "distractor" idioms that don't match any sentence.
  - *Implementation*: Add to `buildMatchingQuizPrompt`: "If level is senior or higher, generate 2 extra idioms that do not match any sentence."
  - *Frontend Update*: Need to handle `pairs` where some idioms don't have a matching sentence. 
  - *Decision*: **Postpone** distractors for now to keep the MVP stable. Focus on the core matching mechanics first.

## 4. Error Handling
- **Empty/Invalid Response**:
  - Add better error message in `QuizView` if `generateQuiz` returns empty array.
  - Handle `JSON.parse` errors more gracefully (already mostly done, but verify).

## Execution Steps

1.  **Modify `QuizSetup.tsx`**:
    - Add validation for minimum items (5).
    - Improve UI for Game Type selection.
2.  **Modify `QuizMatchingGame.tsx`**:
    - Update CSS for better "Filled Blank" visualization.
    - Implement "Sticky Idioms" for mobile.
    - Add "Progress Counter".
3.  **Test**:
    - Verify mobile layout.
    - Verify matching/unmatching flow.
