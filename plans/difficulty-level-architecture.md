# Difficulty Level Architecture and Customization

## Overview
This document outlines the architecture for handling difficulty levels in the Kids Study App, specifically focusing on the backend LLM service updates to support detailed personas and custom user-defined levels.

## Objectives
1.  **Refine Level Descriptions:** Move from simple adjectives to detailed personas to guide the LLM better.
2.  **Support Custom Levels:** Allow the frontend to pass arbitrary strings for the "level" parameter, which the backend will treat as a direct instruction if it doesn't match a predefined key.

## Data Structures

### `LEVEL_DESC` (server/services/llmService.js)
The `LEVEL_DESC` constant maps a level key (e.g., 'preschool', 'elementary_low') to a rich text description of the target audience and expected output style.

**Proposed Structure:**
```javascript
const LEVEL_DESC = {
  junior: '目標對象：國小低中年級（約 7-9 歲）。風格：用詞簡單、句子短促、語氣親切活潑。避免使用生難字詞，多用具體的生活例子。解釋成語時，請像對小朋友說故事一樣，生動有趣。解釋英文單字時，請提供最基礎、最常見的字義，例句使用簡單的主詞+動詞結構。',
  senior: '目標對象：國小高年級（約 10-12 歲）。風格：用詞稍有難度，句子結構較完整。可以引用簡單的歷史典故，但解釋仍需淺顯易懂。重點在於成語的正確用法與情境。解釋英文單字時，可包含常用片語，例句可加入形容詞或副詞修飾。',
  "junior-high": '目標對象：國中生（約 13-15 歲）。風格：用詞精準，可探討成語的深層含義與典故由來。解釋可以包含更多文化背景，並比較相近成語的異同。解釋英文單字時，請包含詞性變化、同義詞比較，例句使用複合句。',
  university: '目標對象：高中生與大學生（約 16-20 歲）。風格：學術且專業。深入探討成語的文學價值、歷史演變及現代應用。適合進階學習者。解釋英文單字時，請涵蓋多重詞義、抽象概念及學術用法，例句應具備新聞或文學深度。'
};
```

## Logic Changes

### Prompt Builders
Functions like `buildPrompt` (Idioms), `buildQuizPrompt`, and `buildEnglishPrompt` currently look up the level description using `LEVEL_DESC[level]`.

**New Logic:**
1.  Check if `level` exists in `LEVEL_DESC`.
2.  If yes, use `LEVEL_DESC[level]`.
3.  If no, treat the `level` string itself as the custom description/instruction.

**Example Code:**
```javascript
const levelDesc = LEVEL_DESC[level] || `Custom Level: ${level}. Style: Adapt the content to match this specific difficulty requirement.`;
```

## Future Frontend Considerations
- The `MainLayout` or specific search/quiz components will need an input field (text area or input) to capture the "Custom" level string when a "Custom" option is selected from the dropdown.
- This string will be passed to the backend API instead of the standard keys ('preschool', etc.).
