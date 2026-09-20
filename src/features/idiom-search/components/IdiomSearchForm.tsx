import { FormEvent, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResultEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface Props {
  onSearch: (idiom: string) => void;
  loading: boolean;
  initialValue?: string;
}

export const IdiomSearchForm = ({ onSearch, loading, initialValue = "" }: Props) => {
  const [value, setValue] = useState(initialValue);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    setIsSpeechSupported(true);
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-TW";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      setValue(event.results[0][0].transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const toggleSpeechRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition || loading) return;

    if (isListening) {
      recognition.stop();
      return;
    }

    setIsListening(true);
    recognition.start();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSearch(trimmed);
  };

  return (
    <form className="idiom-form" onSubmit={handleSubmit}>
      <label className="idiom-label" htmlFor="idiom-input">
        成語關鍵字
      </label>
      <div className="idiom-input-row">
        <input
          id="idiom-input"
          className="idiom-input"
          type="text"
          placeholder="例如：畫蛇添足、三心二意"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="輸入想查詢的成語"
        />
        {isSpeechSupported && (
          <button
            className={`voice-btn${isListening ? " listening" : ""}`}
            type="button"
            onClick={toggleSpeechRecognition}
            disabled={loading}
            aria-label={isListening ? "停止語音輸入" : "開始語音輸入"}
            title={isListening ? "停止語音輸入" : "語音輸入"}
          >
            {isListening ? "■" : "🎤"}
          </button>
        )}
        <button
          className="primary-btn"
          type="submit"
          disabled={loading || !value.trim()}
        >
          {loading ? "查詢中..." : "查成語"}
        </button>
      </div>
      <p className="helper-text">
        小提醒：不必輸入得很完整，打一點關鍵字也可以試試看唷！
      </p>
    </form>
  );
};

