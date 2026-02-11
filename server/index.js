import "dotenv/config";
import cors from "cors";
import express from "express";
import { getProviders, detectProvider, postExplain } from "./routes/idiom.js";
import { postGenerateQuiz } from "./routes/quiz.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/api/providers", getProviders);
app.get("/api/providers/detect", detectProvider);
app.post("/api/idiom/explain", postExplain);
app.post("/api/quiz/generate", postGenerateQuiz);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`後端已啟動：http://localhost:${PORT}`);
  });
}

export default app;
