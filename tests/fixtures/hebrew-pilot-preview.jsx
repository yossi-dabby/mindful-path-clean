import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/index.css';
import '@/globals.css';
import i18n from '@/components/i18n/i18nConfig';
import { AuthProvider } from '@/lib/AuthContext';
import TherapeuticForms from '@/pages/TherapeuticForms';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';

await i18n.changeLanguage(new URLSearchParams(location.search).get('language') || 'he');
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter><AuthProvider>
    <main id="app-scroll-container" className="mx-auto h-dvh max-w-5xl overflow-y-auto overflow-x-clip p-4">
      <Routes>
        <Route path="/Tools" element={<Link to="/tests/fixtures/hebrew-pilot-preview.html">פתיחת ספריית הטפסים</Link>} />
        <Route path="/tests/fixtures/hebrew-pilot-preview.html" element={<TherapeuticForms />} />
      </Routes>
    </main>
  </AuthProvider></BrowserRouter>
);
