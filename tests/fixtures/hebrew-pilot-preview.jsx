import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/index.css';
import '@/globals.css';
import i18n from '@/components/i18n/i18nConfig';
import { AuthProvider } from '@/lib/AuthContext';
import HebrewFormsPilot from '@/components/forms/HebrewFormsPilot';

await i18n.changeLanguage(new URLSearchParams(location.search).get('language') || 'he');
ReactDOM.createRoot(document.getElementById('root')).render(<AuthProvider><main className="mx-auto max-w-5xl p-4"><HebrewFormsPilot /></main></AuthProvider>);
