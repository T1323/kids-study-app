# Writing Guidance Refinement Plan

## 1. Input Box Improvement
- Location: `src/features/writing/WritingView.tsx`
- Change `<input type="text">` to `<textarea>`.
- Set `rows={3}`, `style={{ resize: 'none', overflowY: 'auto' }}` to keep it fixed at 3 lines tall and let it scroll vertically when text wraps beyond 3 lines.
- Implement `onKeyDown` to handle "Enter" for submit and "Shift+Enter" for a new line.

## 2. Topic Configuration
- Location: Top area of `src/features/writing/WritingView.tsx`.
- Create a new input field `關於：_____` (topic). 
- When the user confirms the topic, send an initial, invisible prompt or system-like prompt to the LLM (e.g., "我想寫一篇關於【{topic}】的作文，請引導我"). 
- Keep the topic in state `const [topic, setTopic] = useState('')`.

## 3. Multiple Correction Results & UI
- Location: `src/features/writing/WritingView.tsx` & `src/features/writing/components/WritingDiffModal.tsx`
- Change `const [gradingResult, setGradingResult] = useState<WritingGradingResult | null>(null)` to `const [gradingResults, setGradingResults] = useState<GradingRecord[]>([])`.
  - A `GradingRecord` should include `id` (timestamp), `result` (the actual grading result).
- Add a button "查看歷史批改" in the middle panel (📝 我的作文).
- Update the Modal (or create a new `WritingGradingHistoryModal.tsx`) to display the array of `gradingResults` from newest to oldest.
- Add a delete button to each item to remove it from the array.

## 4. Google Drive Sync Integration
- Location: `src/features/sync/services/googleDrive.ts` and `src/features/writing/WritingView.tsx`.
- Define a JSON schema for a "Writing Session":
  ```typescript
  interface WritingSessionRecord {
    id: string; // timestamp
    topic: string;
    content: string; // The draft
    materials: string[];
    chatHistory: ChatMessage[];
    gradingResults: GradingRecord[];
    lastModified: number;
  }
  ```
- Store this on Google Drive, possibly as `writing_sessions.json` or individual files in a "KidsStudyApp" folder.
- Add UI at the bottom of the `WritingView` to fetch and list these records.
- Allow clicking on a record to load the state back into the `WritingView`.
