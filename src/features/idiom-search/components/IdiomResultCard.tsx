import { IdiomExplain } from "../types";

interface Props {
  result: IdiomExplain;
}

export const IdiomResultCard = ({ result }: Props) => {
  return (
    <article className="idiom-card">
      <header className="idiom-card-header">
        <h3 className="idiom-title">
          {result.idiom}
          {result.is_idiom === false && (
            <span
              style={{
                fontSize: "0.5em",
                marginLeft: "0.5em",
                color: "#666",
                backgroundColor: "#eee",
                padding: "0.2em 0.5em",
                borderRadius: "4px",
                verticalAlign: "middle",
                fontWeight: "normal",
              }}
            >
              非標準成語
            </span>
          )}
        </h3>
        {result.zhuyin && (
          <span className="idiom-zhuyin">{result.zhuyin}</span>
        )}
      </header>

      <section className="idiom-section">
        <h4>解釋</h4>
        <p>{result.meaning}</p>
      </section>

      {result.usage && (
        <section className="idiom-section">
          <h4>用法說明</h4>
          <p>{result.usage}</p>
        </section>
      )}

      {result.examples.length > 0 && (
        <section className="idiom-section">
          <h4>例句</h4>
          <ul className="example-list">
            {result.examples.map((ex, idx) => (
              <li key={idx} className="example-item">
                <p className="example-zh">{ex.zh}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.tips && (
        <section className="idiom-section tips-section">
          <h4>小提醒 / 延伸學習</h4>
          <p>{result.tips}</p>
        </section>
      )}
    </article>
  );
};

