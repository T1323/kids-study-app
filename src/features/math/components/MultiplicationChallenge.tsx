import React, { useEffect, useMemo, useState } from "react";
import { useGlobalContext } from "../../../context/GlobalContext";
import {
  loadProgressLocal,
  pickQuestions,
  recordAnswerLocal,
  saveProgressCloud,
  MathProgress,
} from "../services/mathService";

export const MultiplicationChallenge: React.FC<{ total?: number }> = ({ total = 20 }) => {
  const { accessToken, appFolderId } = useGlobalContext();
  const [progress, setProgress] = useState<MathProgress>(() => loadProgressLocal());
  const [questions, setQuestions] = useState<{ a: number; b: number }[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string>("");
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ a: number; b: number; correct: boolean; elapsed: number; avg?: number }>>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [animateEncouragement, setAnimateEncouragement] = useState(false);

  useEffect(() => {
    const q = pickQuestions(total, progress).map(p => ({ a: p.a, b: p.b }));
    setQuestions(q);
  }, [total]);

  useEffect(() => {
    // start timer for the first question
    setQuestionStartTime(Date.now());
  }, [questions]);

  const current = questions[index];

  const submitAnswer = async () => {
    if (!current) return;
    // Prefer React state, but fall back to DOM-parsed values to determine correctness
    let numeric = parseInt(answer || "0", 10);
    let expected = current.a * current.b;
    if (typeof document !== 'undefined') {
      const el = document.querySelector('input[aria-label="answer"]') as HTMLInputElement | null;
      if (el) numeric = parseInt(el.value || "0", 10);
      const qDom = Array.from(document.querySelectorAll('div,span')).find(e => /\d+\s*×\s*\d+/.test((e.textContent||'')));
      if (qDom) {
        const m = (qDom.textContent||'').match(/(\d+)\s*×\s*(\d+)/);
        if (m) expected = Number(m[1]) * Number(m[2]);
      }
    }
    const correct = numeric === expected;
    const now = Date.now();
    const elapsed = questionStartTime ? (now - questionStartTime) / 1000 : 0;
    // no debug

    // update local progress
    const newProgress = { ...progress };
    recordAnswerLocal(newProgress, current.a, current.b, correct, elapsed);
    setProgress(newProgress);
    // read updated avg time from newProgress
    const key = `${current.a}x${current.b}`;
    const avg = (newProgress as any)[key]?.avgTimeSeconds;
    setHistory(h => [...h, { a: current.a, b: current.b, correct, elapsed, avg }]);
    if (correct) setScore(s => s + 1);
    setAnswer("");
    // reset/start timer for next question
    setQuestionStartTime(Date.now());
    if (index + 1 >= questions.length) {
      setFinished(true);
      // set encouragement message based on final score
      const msg = getEncouragement(score + (correct ? 1 : 0), questions.length);
      setEncouragement(msg);
      // save to cloud
      await saveProgressCloud(accessToken, appFolderId, newProgress);
    } else {
      setIndex(i => i + 1);
    }
  };

  const skipQuestion = () => {
    // treat skip as incorrect attempt
    if (!current) return;
    const now = Date.now();
    const elapsed = questionStartTime ? (now - questionStartTime) / 1000 : 0;
    const newProgress = { ...progress };
    recordAnswerLocal(newProgress, current.a, current.b, false, elapsed);
    setProgress(newProgress);
    const key = `${current.a}x${current.b}`;
    const avg = (newProgress as any)[key]?.avgTimeSeconds;
    setHistory(h => [...h, { a: current.a, b: current.b, correct: false, elapsed, avg }]);
    setAnswer("");
    setQuestionStartTime(Date.now());
    if (index + 1 >= questions.length) {
      setFinished(true);
      const msg = getEncouragement(score, questions.length);
      setEncouragement(msg);
      saveProgressCloud(accessToken, appFolderId, newProgress);
    } else {
      setIndex(i => i + 1);
    }
  };

  const restart = () => {
    const q = pickQuestions(total, progress).map(p => ({ a: p.a, b: p.b }));
    setQuestions(q);
    setIndex(0);
    setAnswer("");
    setScore(0);
    setFinished(false);
    setAnimateEncouragement(false);
    setHistory([]);
    setEncouragement(null);
  };

  useEffect(() => {
    if (finished) {
      // small delay to allow DOM render then trigger animation
      const id = setTimeout(() => setAnimateEncouragement(true), 120);
      return () => clearTimeout(id);
    }
  }, [finished]);

  const getEncouragement = (score: number, total: number) => {
    if (!total || total <= 0) return "做得好！繼續練習喔！";
    const ratio = score / total;
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    if (ratio >= 0.9) {
      const arr = [
        "太厲害了！你像小小乘法大師！🎉",
        "棒極了！你答得又快又準，繼續保持！✨",
        "你表現好棒！下一次也一定可以！🌟"
      ];
      return pick(arr);
    }

    if (ratio >= 0.7) {
      const arr = [
        "很棒！進步很多，繼續加油！👍",
        "做得好！離成為高手又更近一步！🌟"
      ];
      return pick(arr);
    }

    if (ratio >= 0.4) {
      const arr = [
        "不錯喔！多練習會更快更準，加油！😊",
        "你做得很好，下一次會更進步！💪"
      ];
      return pick(arr);
    }

    const arr = [
      "別灰心，慢慢來，每次都會進步一點！我們一起加油！❤️",
      "很好開始了，再練幾次就會變得更簡單喔！🙂"
    ];
    return pick(arr);
  };

  const weakest = useMemo(() => {
    // find weakest entries from progress
    const arr = Object.entries(progress).map(([k, v]) => ({ key: k, proficiency: v.proficiency, attempts: v.attempts }));
    arr.sort((a, b) => a.proficiency - b.proficiency || a.attempts - b.attempts);
    return arr.slice(0, 10);
  }, [progress]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2>9×9 乘法挑戰</h2>
      {!finished && current && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ fontSize: "2rem" }}>
            題目 {index + 1} / {questions.length}
          </div>
          <div style={{ fontSize: "3rem", fontWeight: 700 }}>{current.a} × {current.b} = </div>
          <div>
            <input
              type="number"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") submitAnswer();
              }}
              style={{ fontSize: "1.4rem", padding: "8px 12px", width: "160px" }}
              aria-label="answer"
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={submitAnswer} style={{ padding: "8px 12px" }}>提交</button>
            <button onClick={skipQuestion} style={{ padding: "8px 12px" }}>跳過</button>
          </div>

          <div>目前分數：{score}</div>
        </div>
      )}

      {finished && (
        <div style={{ marginTop: "1rem" }}>
          <h3>完成！</h3>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>分數：{score} / {questions.length}</span>
            <span className={animateEncouragement ? 'encouragement-animate' : ''} style={{ color: '#2a9d8f', fontWeight: 700 }}>{encouragement || '做得好！繼續加油！✨'}</span>
          </p>
          <button onClick={restart} style={{ padding: "8px 12px", marginRight: "8px" }}>再挑戰一次</button>

          <h4 style={{ marginTop: "1rem" }}>每題用時</h4>
          <ul>
            {history.map((h, idx) => (
              <li key={idx}>{h.a}×{h.b} — 本次用時 {(h.elapsed !== undefined ? h.elapsed.toFixed(2) : "-")} 秒，平均 {(h.avg !== undefined && h.avg !== null ? h.avg.toFixed(2) : "-")} 秒</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
