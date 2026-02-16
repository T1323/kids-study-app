# Cloud Sync Improvement Plan

## Objective
Ensure cloud learning history is merged/loaded immediately when:
1. User logs in *after* entering the learning view (Idiom/English).
2. User enters the learning view *after* logging in.

## Analysis
The current implementation uses `useEffect` dependent on `accessToken` to trigger data loading. This is generally correct for React, but we need to ensure:
1. **Loading Indicators**: The user should see that data is syncing/loading when they log in.
2. **State Reset**: When `accessToken` becomes available, we should explicitly reset the "loaded" state to false to trigger a re-render or show a loading spinner.
3. **English Module**: The `EnglishSearchView` lacks the `LearningHistory` component entirely, so the user can't see the history even if it loads.

## Proposed Changes

### 1. `src/features/idiom-search/IdiomSearchView.tsx`
- **Modify `useEffect`**: When `accessToken` becomes valid, explicitly set `setSettingsLoaded(false)` before starting the async load. This ensures the UI can react (e.g., show a skeleton or loading text).
- **UI Feedback**: Add a visual indicator (e.g., "正在同步雲端紀錄...") when `accessToken` is present but `settingsLoaded` is false.

### 2. `src/features/english/EnglishSearchView.tsx`
- **Modify `useEffect`**: Similar to Idiom view, reset `setProgressLoaded(false)` when `accessToken` changes.
- **Add `LearningHistory`**: Import and add the `LearningHistory` component to display the loaded data.
    - Needs to support "English" type history items.
- **UI Feedback**: Add visual loading indicator.

### 3. `src/features/idiom-search/components/LearningHistory.tsx`
- **Enhance Component**: Update `LearningHistory` to handle both `IdiomProgress` (which has `queryCount`) and `EnglishHistoryItem` (which currently might not, or structure differs).
    - Add `type` prop: `'idiom' | 'english'`.
    - Adapt rendering logic based on type.

## Execution Steps

1.  **Update `LearningHistory.tsx`**:
    -   Modify props to accept `type`.
    -   Add logic to parse and display English history items (timestamp, word).

2.  **Update `IdiomSearchView.tsx`**:
    -   Refactor `useEffect` to manage `settingsLoaded` state better during token transitions.
    -   Add loading UI.

3.  **Update `EnglishSearchView.tsx`**:
    -   Refactor `useEffect` for `progressLoaded`.
    -   Add loading UI.
    -   Integrate `LearningHistory` component.

4.  **Verification**:
    -   Test Scenario A: Login first -> Go to Idiom/English.
    -   Test Scenario B: Go to Idiom/English -> Login.
