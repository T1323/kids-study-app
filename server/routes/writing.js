import { chatWithWritingTeacher, gradeWritingTeacher } from "../services/llmService.js";

export async function postWritingChat(req, res) {
  try {
    const { history, level, options, progressReports } = req.body;

    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: "Missing or invalid history array" });
    }

    if (!level) {
      return res.status(400).json({ error: "Missing level" });
    }

    const result = await chatWithWritingTeacher(history, level, options, progressReports);

    res.json({
      content: result.content,
      debug: result.debug,
    });
  } catch (error) {
    console.error("寫作指導對話發生錯誤:", error);
    res.status(500).json({
      error: error.message || "伺服器發生錯誤，請稍後再試",
    });
  }
}

export async function postGradeWriting(req, res) {
  try {
    const { content, materials, level, options } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Missing or invalid content string" });
    }

    if (!level) {
      return res.status(400).json({ error: "Missing level" });
    }

    const result = await gradeWritingTeacher(content, materials, level, options);

    res.json({
      data: result.data,
      debug: result.debug,
    });
  } catch (error) {
    console.error("寫作批改發生錯誤:", error);
    res.status(500).json({
      error: error.message || "伺服器發生錯誤，請稍後再試",
    });
  }
}
