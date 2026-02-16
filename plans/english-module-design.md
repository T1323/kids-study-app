# English Vocabulary Module & Architecture Refactor Design

## 1. Overview
This document outlines the design for adding an English Vocabulary module to the Kids Study App and refactoring the shared architecture to support multiple subjects (Idioms, English).

## 2. Architecture Changes

### 2.1 Routing & Layout
Currently, `App.tsx` directly renders the Idiom view. We will introduce React Router to manage navigation between modules.

**New Structure:**
- **Layout (`MainLayout`):** Handles the common header (Title, Auth Status, Navigation Menu).
- **Pages:**
    - `Dashboard`: Landing page with cards to select "Idioms" or "English".
    - `IdiomSearchView`: Existing idiom module.
    - `EnglishSearchView`: New English module.

**Routes:**
- `/`: Dashboard
- `/idioms`: Idiom Learning
- `/english`: English Vocabulary

### 2.2 Global State Management
To avoid prop drilling (especially `accessToken` and `modelSettings`), we will introduce a Context API.

**`GlobalContext`:**
- **State:**
    - `accessToken`: Google Drive access token.
    - `modelSettings`: LLM provider settings (API Key, Provider, Model).
- **Actions:**
    - `login()`: Trigger Google login.
    - `logout()`: Trigger Google logout.
    - `updateModelSettings()`: Update LLM settings.

### 2.3 Shared Components
- **`ModelSettings`:** Currently in idiom-search, should be moved to a shared location or kept if specific, but the *state* is global. We will likely keep the component but feed it from GlobalContext.

## 3. English Module Design

### 3.1 Data Types (`src/features/english/types.ts`)

```typescript
export type StudyLevel = "junior" | "senior"; // Same as idioms

export interface EnglishExample {
  en: string; // English sentence
  zh: string; // Chinese translation
}

export interface EnglishWordExplain {
  word: string;          // The queried word
  kk_phonetic?: string;  // KK Phonetic symbol (e.g., [bʊk])
  part_of_speech?: string; // e.g., noun, verb
  meaning_en: string;    // Simple English definition
  meaning_zh: string;    // Chinese definition
  examples: EnglishExample[];
  synonyms?: string[];   // Synonyms
  antonyms?: string[];   // Antonyms
  tips?: string;         // Usage tips or mnemonic
  level: StudyLevel;
}

export interface EnglishHistoryItem extends EnglishWordExplain {
  timestamp: number;
}
```

### 3.2 API Contract

**Endpoint:** `POST /api/english/explain`

**Request Body:**
```json
{
  "word": "apple",
  "level": "junior", // or "senior"
  "apiKey": "...",   // Optional
  "provider": "...", // Optional
  "model": "..."     // Optional
}
```

**Response Body (JSON):**
```json
{
  "word": "apple",
  "kk_phonetic": "[ˈæpəl]",
  "part_of_speech": "noun",
  "meaning_en": "A round fruit with red, yellow, or green skin and firm white flesh.",
  "meaning_zh": "蘋果",
  "examples": [
    { "en": "I eat an apple every day.", "zh": "我每天吃一顆蘋果。" }
  ],
  "synonyms": [],
  "tips": "An apple a day keeps the doctor away."
}
```

### 3.3 Backend Implementation (`server/services/llmService.js`)
We will add `explainEnglishWithLLM`.
**Prompt Strategy:**
- Role: English teacher for kids.
- Output: Strict JSON.
- Content:
    - Junior: Simple words, pictures (if possible, maybe later), very basic sentences.
    - Senior: slightly more complex usage, maybe grammar points.

## 4. Execution Plan
1. **Refactor:** Setup Router, Context, and Layout.
2. **Backend:** Implement `llmService` extension and new API route.
3. **Frontend:** Implement English feature components.
4. **Integration:** Connect Frontend to Backend and Google Drive.
