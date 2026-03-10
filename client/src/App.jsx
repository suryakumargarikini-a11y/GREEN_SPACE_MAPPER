import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import DetailsPage from './pages/DetailsPage';
import AddSpacePage from './pages/AddSpacePage';

export default function App() {
  // ── Dark mode (persisted) ───────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <BrowserRouter>
      <div className={`min-h-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
        <Navbar darkMode={darkMode} toggleDark={() => setDarkMode((p) => !p)} />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/add" element={<AddSpacePage />} />
            <Route path="/park/:id" element={<DetailsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
