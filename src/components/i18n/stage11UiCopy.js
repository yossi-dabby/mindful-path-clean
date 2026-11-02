import { DEFAULT_APP_LOCALE, normalizeAppLocale } from './appLocale.js';

const COPY = {
  en: {
    languageName: 'English',
    goals: {
      introTitle: 'AI goal suggestions',
      introText: 'AI will review your recent journal and mood patterns and suggest a few clear, practical SMART goals.',
      generate: 'Generate suggestions',
      cancel: 'Cancel',
      loading: 'Reviewing your patterns and preparing suggestions…',
      resultsTitle: 'Suggested SMART goals',
      close: 'Close',
      why: 'Why this goal',
      smart: 'Clear goal plan',
      specific: 'What to do',
      measurable: 'How to track it',
      achievable: 'Why it is realistic',
      relevant: 'Why it matters',
      timeBound: 'Suggested timeframe',
      firstSteps: 'First steps',
      step: 'Step',
      newGoal: 'New goal',
      create: 'Create this goal',
      noSuggestions: 'No goal suggestions were generated. Add a journal entry or mood check-in and try again.',
      error: 'Could not generate goal suggestions. Please try again.'
    },
    starter: {
      restart: 'Start again',
      remove: 'Delete path',
      restartConfirm: 'Restart the seven-day path? Your completed days will be cleared.',
      removeConfirm: 'Delete your seven-day path? Your path progress will be removed.',
      actionError: 'The path could not be updated. Please try again.'
    },
    journey: {
      restart: 'Start again',
      remove: 'Remove from my journeys',
      restartConfirm: 'Restart this journey? Its completed steps and reflections will be cleared.',
      removeConfirm: 'Remove this journey from your journeys? The journey itself will remain available.',
      actionError: 'The journey could not be updated. Please try again.'
    },
    home: { checkinMode: 'Structured daily check-in', coachMode: 'Open conversation' }
  },
  he: {
    languageName: 'עברית',
    goals: {
      introTitle: 'הצעות AI למטרות',
      introText: 'ה-AI יבחן את דפוסי היומן ומצב הרוח האחרונים ויציע כמה מטרות SMART ברורות ומעשיות.',
      generate: 'יצירת הצעות',
      cancel: 'ביטול',
      loading: 'בודק את הדפוסים ומכין הצעות…',
      resultsTitle: 'מטרות SMART מוצעות',
      close: 'סגירה',
      why: 'למה המטרה מתאימה',
      smart: 'תוכנית מטרה ברורה',
      specific: 'מה עושים',
      measurable: 'כיצד מודדים התקדמות',
      achievable: 'למה זה מציאותי',
      relevant: 'למה זה חשוב',
      timeBound: 'מסגרת זמן מוצעת',
      firstSteps: 'צעדים ראשונים',
      step: 'צעד',
      newGoal: 'מטרה חדשה',
      create: 'יצירת המטרה',
      noSuggestions: 'לא נוצרו הצעות. מומלץ להוסיף רשומת יומן או בדיקת מצב רוח ולנסות שוב.',
      error: 'לא ניתן היה ליצור הצעות למטרות. נסו שוב.'
    },
    starter: {
      restart: 'התחלה מחדש',
      remove: 'מחיקת המסלול',
      restartConfirm: 'להתחיל מחדש את המסלול לשבעה ימים? הימים שהושלמו יימחקו.',
      removeConfirm: 'למחוק את המסלול לשבעה ימים? התקדמות המסלול תימחק.',
      actionError: 'לא ניתן היה לעדכן את המסלול. נסו שוב.'
    },
    journey: {
      restart: 'התחלה מחדש',
      remove: 'הסרה מהמסעות שלי',
      restartConfirm: 'להתחיל את המסע מחדש? הצעדים והרפלקציות שהושלמו יימחקו.',
      removeConfirm: 'להסיר את המסע מהמסעות שלך? המסע עצמו יישאר זמין.',
      actionError: 'לא ניתן היה לעדכן את המסע. נסו שוב.'
    },
    home: { checkinMode: 'בדיקה יומית מובנית', coachMode: 'שיחה פתוחה' }
  },
  es: {
    languageName: 'español',
    goals: {
      introTitle: 'Sugerencias de objetivos con IA',
      introText: 'La IA revisará tus registros recientes y propondrá objetivos SMART claros y prácticos.',
      generate: 'Generar sugerencias', cancel: 'Cancelar', loading: 'Revisando tus patrones y preparando sugerencias…',
      resultsTitle: 'Objetivos SMART sugeridos', close: 'Cerrar', why: 'Por qué este objetivo', smart: 'Plan claro del objetivo',
      specific: 'Qué hacer', measurable: 'Cómo medirlo', achievable: 'Por qué es realista', relevant: 'Por qué importa',
      timeBound: 'Plazo sugerido', firstSteps: 'Primeros pasos', step: 'Paso', newGoal: 'Nuevo objetivo',
      create: 'Crear este objetivo', noSuggestions: 'No se generaron sugerencias. Añade una entrada o un registro de ánimo e inténtalo de nuevo.',
      error: 'No se pudieron generar sugerencias. Inténtalo de nuevo.'
    },
    starter: { restart: 'Empezar de nuevo', remove: 'Eliminar recorrido', restartConfirm: '¿Reiniciar el recorrido de siete días? Se borrarán los días completados.', removeConfirm: '¿Eliminar tu recorrido de siete días? Se borrará su progreso.', actionError: 'No se pudo actualizar el recorrido. Inténtalo de nuevo.' },
    journey: { restart: 'Empezar de nuevo', remove: 'Quitar de mis recorridos', restartConfirm: '¿Reiniciar este recorrido? Se borrarán los pasos y reflexiones completados.', removeConfirm: '¿Quitar este recorrido? El contenido seguirá disponible.', actionError: 'No se pudo actualizar el recorrido. Inténtalo de nuevo.' },
    home: { checkinMode: 'Revisión diaria guiada', coachMode: 'Conversación abierta' }
  },
  fr: {
    languageName: 'français',
    goals: {
      introTitle: 'Suggestions d’objectifs par IA', introText: 'L’IA examinera vos notes récentes et proposera des objectifs SMART clairs et concrets.',
      generate: 'Générer des suggestions', cancel: 'Annuler', loading: 'Analyse de vos tendances et préparation des suggestions…',
      resultsTitle: 'Objectifs SMART suggérés', close: 'Fermer', why: 'Pourquoi cet objectif', smart: 'Plan d’objectif clair',
      specific: 'Action à mener', measurable: 'Comment la mesurer', achievable: 'Pourquoi elle est réaliste', relevant: 'Pourquoi elle compte', timeBound: 'Délai proposé', firstSteps: 'Premières étapes', step: 'Étape', newGoal: 'Nouvel objectif',
      create: 'Créer cet objectif', noSuggestions: 'Aucune suggestion générée. Ajoutez une note ou un suivi d’humeur, puis réessayez.',
      error: 'Impossible de générer des suggestions. Réessayez.'
    },
    starter: { restart: 'Recommencer', remove: 'Supprimer le parcours', restartConfirm: 'Recommencer le parcours de sept jours ? Les jours terminés seront effacés.', removeConfirm: 'Supprimer votre parcours de sept jours ? Sa progression sera effacée.', actionError: 'Impossible de mettre à jour le parcours. Réessayez.' },
    journey: { restart: 'Recommencer', remove: 'Retirer de mes parcours', restartConfirm: 'Recommencer ce parcours ? Les étapes et réflexions terminées seront effacées.', removeConfirm: 'Retirer ce parcours ? Son contenu restera disponible.', actionError: 'Impossible de mettre à jour le parcours. Réessayez.' },
    home: { checkinMode: 'Bilan quotidien guidé', coachMode: 'Conversation ouverte' }
  },
  de: {
    languageName: 'Deutsch',
    goals: {
      introTitle: 'KI-Zielvorschläge', introText: 'Die KI prüft Ihre letzten Einträge und schlägt klare, praktische SMART-Ziele vor.',
      generate: 'Vorschläge erstellen', cancel: 'Abbrechen', loading: 'Muster werden geprüft und Vorschläge vorbereitet…',
      resultsTitle: 'Vorgeschlagene SMART-Ziele', close: 'Schließen', why: 'Warum dieses Ziel', smart: 'Klarer Zielplan',
      specific: 'Was zu tun ist', measurable: 'Wie es gemessen wird', achievable: 'Warum es realistisch ist', relevant: 'Warum es wichtig ist',
      timeBound: 'Vorgeschlagener Zeitraum', firstSteps: 'Erste Schritte', step: 'Schritt', newGoal: 'Neues Ziel',
      create: 'Dieses Ziel erstellen', noSuggestions: 'Keine Vorschläge erstellt. Fügen Sie einen Eintrag oder Stimmungscheck hinzu und versuchen Sie es erneut.',
      error: 'Zielvorschläge konnten nicht erstellt werden. Bitte versuchen Sie es erneut.'
    },
    starter: { restart: 'Neu beginnen', remove: 'Pfad löschen', restartConfirm: 'Den Sieben-Tage-Pfad neu beginnen? Abgeschlossene Tage werden gelöscht.', removeConfirm: 'Ihren Sieben-Tage-Pfad löschen? Der Fortschritt wird entfernt.', actionError: 'Der Pfad konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.' },
    journey: { restart: 'Neu beginnen', remove: 'Aus meinen Reisen entfernen', restartConfirm: 'Diese Reise neu beginnen? Abgeschlossene Schritte und Reflexionen werden gelöscht.', removeConfirm: 'Diese Reise entfernen? Ihr Inhalt bleibt verfügbar.', actionError: 'Die Reise konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.' },
    home: { checkinMode: 'Geführter täglicher Check-in', coachMode: 'Offenes Gespräch' }
  },
  it: {
    languageName: 'italiano',
    goals: {
      introTitle: 'Suggerimenti di obiettivi con IA', introText: 'L’IA esaminerà le tue note recenti e proporrà obiettivi SMART chiari e pratici.',
      generate: 'Genera suggerimenti', cancel: 'Annulla', loading: 'Analisi dei tuoi schemi e preparazione dei suggerimenti…',
      resultsTitle: 'Obiettivi SMART suggeriti', close: 'Chiudi', why: 'Perché questo obiettivo', smart: 'Piano chiaro',
      specific: 'Cosa fare', measurable: 'Come misurarlo', achievable: 'Perché è realistico', relevant: 'Perché conta',
      timeBound: 'Tempo suggerito', firstSteps: 'Primi passi', step: 'Passo', newGoal: 'Nuovo obiettivo',
      create: 'Crea questo obiettivo', noSuggestions: 'Nessun suggerimento generato. Aggiungi una nota o un check-in dell’umore e riprova.',
      error: 'Impossibile generare suggerimenti. Riprova.'
    },
    starter: { restart: 'Ricomincia', remove: 'Elimina percorso', restartConfirm: 'Ricominciare il percorso di sette giorni? I giorni completati saranno cancellati.', removeConfirm: 'Eliminare il percorso di sette giorni? I progressi saranno rimossi.', actionError: 'Impossibile aggiornare il percorso. Riprova.' },
    journey: { restart: 'Ricomincia', remove: 'Rimuovi dai miei percorsi', restartConfirm: 'Ricominciare questo percorso? Passi e riflessioni completati saranno cancellati.', removeConfirm: 'Rimuovere questo percorso? Il contenuto resterà disponibile.', actionError: 'Impossibile aggiornare il percorso. Riprova.' },
    home: { checkinMode: 'Check-in quotidiano guidato', coachMode: 'Conversazione aperta' }
  },
  pt: {
    languageName: 'português',
    goals: {
      introTitle: 'Sugestões de objetivos por IA', introText: 'A IA analisará os seus registos recentes e sugerirá objetivos SMART claros e práticos.',
      generate: 'Gerar sugestões', cancel: 'Cancelar', loading: 'A analisar os seus padrões e a preparar sugestões…',
      resultsTitle: 'Objetivos SMART sugeridos', close: 'Fechar', why: 'Porquê este objetivo', smart: 'Plano de objetivo claro',
      specific: 'O que fazer', measurable: 'Como medir', achievable: 'Porque é realista', relevant: 'Porque importa',
      timeBound: 'Prazo sugerido', firstSteps: 'Primeiros passos', step: 'Passo', newGoal: 'Novo objetivo',
      create: 'Criar este objetivo', noSuggestions: 'Não foram geradas sugestões. Adicione um registo ou check-in de humor e tente novamente.',
      error: 'Não foi possível gerar sugestões. Tente novamente.'
    },
    starter: { restart: 'Recomeçar', remove: 'Eliminar percurso', restartConfirm: 'Recomeçar o percurso de sete dias? Os dias concluídos serão apagados.', removeConfirm: 'Eliminar o percurso de sete dias? O progresso será removido.', actionError: 'Não foi possível atualizar o percurso. Tente novamente.' },
    journey: { restart: 'Recomeçar', remove: 'Remover dos meus percursos', restartConfirm: 'Recomeçar este percurso? Os passos e reflexões concluídos serão apagados.', removeConfirm: 'Remover este percurso? O conteúdo continuará disponível.', actionError: 'Não foi possível atualizar o percurso. Tente novamente.' },
    home: { checkinMode: 'Check-in diário guiado', coachMode: 'Conversa aberta' }
  }
};

export function getStage11Copy(locale) {
  const normalized = normalizeAppLocale(locale, DEFAULT_APP_LOCALE);
  return COPY[normalized] || COPY.en;
}
