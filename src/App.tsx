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
    </div>
  );
};

