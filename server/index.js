import "dotenv/config";
import cors from "cors";
import express from "express";
import { getProviders, detectProvider, postExplain } from "./routes/idiom.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/api/providers", getProviders);
app.get("/api/providers/detect", detectProvider);
app.post("/api/idiom/explain", postExplain);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`後端已啟動：http://localhost:${PORT}`);
  if (!process.env.LLM_API_KEY) {
    console.warn("提醒：未設定 LLM_API_KEY，成語說明 API 會失敗。請在 server/.env 設定。");
  }
});
