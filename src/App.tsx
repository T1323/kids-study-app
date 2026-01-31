import { IdiomSearchView } from "./features/idiom-search/IdiomSearchView";

export const App = () => {
  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-title-block">
          <h1>成語小小學堂</h1>
        </div>
      </header>
      <main className="app-main">
        <IdiomSearchView />
      </main>
      <footer className="app-footer">
        <span>未連線版本：目前說明由範例資料產生，之後可接上 LLM API。</span>
      </footer>
    </div>
  );
};

