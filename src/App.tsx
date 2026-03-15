import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GlobalProvider } from "./context/GlobalContext";
import { MainLayout } from "./layouts/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { IdiomSearchView } from "./features/idiom-search/IdiomSearchView";
import { EnglishSearchView } from "./features/english/EnglishSearchView";
import { WritingView } from "./features/writing/WritingView";

export const App = () => {
  return (
    <GlobalProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="idioms" element={<IdiomSearchView />} />
            <Route path="english" element={<EnglishSearchView />} />
            <Route path="writing" element={<WritingView />} />
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GlobalProvider>
  );
};
