import { DEFAULT_APP_LOCALE, normalizeAppLocale } from '../components/i18n/appLocale.js';

export const WELLBEING_OUTCOME_VERSION = '2026-09-06.1';
export const WELLBEING_OUTCOME_STORAGE_KEY = 'mindful_path_wellbeing_outcomes_v1';

export const PROGRESS_DATA_COPY = Object.freeze({
  en: {
    outcomeTitle: 'Personal wellbeing check-in',
    outcomeDescription: 'A voluntary, non-diagnostic reflection. Your answers stay only on this device and are not sent to Mindful Path.',
    wellbeing: 'Overall wellbeing',
    distress: 'Emotional distress',
    functioning: 'Daily functioning',
    low: 'Low',
    high: 'High',
    saveCheckIn: 'Save check-in on this device',
    saved: 'Check-in saved locally.',
    saveFailed: 'This device could not save the check-in.',
    history: 'Local check-ins',
    firstToLatest: 'Change from first to latest',
    noTrend: 'Save at least two check-ins to see change over time.',
    improved: 'improved',
    decreased: 'decreased',
    increased: 'increased',
    unchanged: 'unchanged',
    deleteHistory: 'Delete local check-ins',
    deleteConfirm: 'Delete all wellbeing check-ins stored on this device?',
    deleted: 'Local check-ins deleted.',
    outcomeDisclaimer: 'These scores do not diagnose, screen for, or prove treatment effectiveness. Discuss important changes with a qualified professional.',
    exportTitle: 'Export or share progress',
    exportDescription: 'Create a local JSON file from the progress data currently loaded on this page. It contains no account identifier.',
    exportConsent: 'I understand that the file may contain sensitive wellbeing information and I choose to create it on this device.',
    includeNarrative: 'Include selected journal narrative fields',
    includeNarrativeHint: 'Off by default. If enabled, the export may include situations, thoughts, reflections, and learning you entered.',
    download: 'Download file',
    share: 'Share file',
    exportReady: 'The progress file was created on this device.',
    exportFailed: 'The progress file could not be created.',
    shareUnavailable: 'Sharing is not supported on this device; you can download the file instead.',
    privacyNote: 'Only the displayed user can initiate this action. Consent is required again for every file.',
    summaryOnly: 'Summary by default',
    count: 'check-ins',
    latest: 'Latest',
    notDiagnostic: 'Non-diagnostic self-report'
  },
  he: {
    outcomeTitle: 'בדיקת רווחה אישית',
    outcomeDescription: 'התבוננות מרצון שאינה כלי אבחוני. התשובות נשמרות רק במכשיר הזה ואינן נשלחות ל‑Mindful Path.',
    wellbeing: 'רווחה כללית',
    distress: 'מצוקה רגשית',
    functioning: 'תפקוד יומיומי',
    low: 'נמוך',
    high: 'גבוה',
    saveCheckIn: 'שמירת הבדיקה במכשיר',
    saved: 'הבדיקה נשמרה מקומית.',
    saveFailed: 'לא ניתן היה לשמור את הבדיקה במכשיר.',
    history: 'בדיקות מקומיות',
    firstToLatest: 'שינוי מהבדיקה הראשונה לאחרונה',
    noTrend: 'יש לשמור לפחות שתי בדיקות כדי לראות שינוי לאורך זמן.',
    improved: 'השתפר',
    decreased: 'פחת',
    increased: 'עלה',
    unchanged: 'ללא שינוי',
    deleteHistory: 'מחיקת הבדיקות המקומיות',
    deleteConfirm: 'למחוק את כל בדיקות הרווחה שנשמרו במכשיר הזה?',
    deleted: 'הבדיקות המקומיות נמחקו.',
    outcomeDisclaimer: 'הציונים אינם מאבחנים, אינם בדיקת סקר ואינם מוכיחים יעילות טיפול. בשינוי משמעותי כדאי להתייעץ עם איש מקצוע מוסמך.',
    exportTitle: 'ייצוא או שיתוף התקדמות',
    exportDescription: 'יצירת קובץ JSON מקומי מנתוני ההתקדמות שנטענו כעת במסך. הקובץ אינו כולל מזהה חשבון.',
    exportConsent: 'ברור לי שהקובץ עשוי לכלול מידע רגיש על רווחתי, ואני בוחר/ת ליצור אותו במכשיר הזה.',
    includeNarrative: 'לכלול שדות סיפוריים נבחרים מהיומן',
    includeNarrativeHint: 'כבוי כברירת מחדל. בהפעלה עשויים להיכלל מצבים, מחשבות, הרהורים ולמידה שהוזנו.',
    download: 'הורדת קובץ',
    share: 'שיתוף קובץ',
    exportReady: 'קובץ ההתקדמות נוצר במכשיר.',
    exportFailed: 'לא ניתן היה ליצור את קובץ ההתקדמות.',
    shareUnavailable: 'שיתוף אינו נתמך במכשיר זה; אפשר להוריד את הקובץ.',
    privacyNote: 'רק המשתמש המוצג יכול להפעיל את הפעולה. נדרשת הסכמה מחדש לכל קובץ.',
    summaryOnly: 'סיכום כברירת מחדל',
    count: 'בדיקות',
    latest: 'אחרונה',
    notDiagnostic: 'דיווח עצמי לא־אבחוני'
  },
  es: {
    outcomeTitle: 'Control personal de bienestar',
    outcomeDescription: 'Una reflexión voluntaria y no diagnóstica. Tus respuestas permanecen solo en este dispositivo y no se envían a Mindful Path.',
    wellbeing: 'Bienestar general',
    distress: 'Malestar emocional',
    functioning: 'Funcionamiento diario',
    low: 'Bajo', high: 'Alto',
    saveCheckIn: 'Guardar control en este dispositivo',
    saved: 'Control guardado localmente.',
    saveFailed: 'No se pudo guardar el control en este dispositivo.',
    history: 'Controles locales',
    firstToLatest: 'Cambio del primero al último',
    noTrend: 'Guarda al menos dos controles para ver cambios.',
    improved: 'mejoró', decreased: 'disminuyó', increased: 'aumentó', unchanged: 'sin cambios',
    deleteHistory: 'Eliminar controles locales',
    deleteConfirm: '¿Eliminar todos los controles de bienestar guardados en este dispositivo?',
    deleted: 'Controles locales eliminados.',
    outcomeDisclaimer: 'Estas puntuaciones no diagnostican, no son una prueba clínica ni demuestran eficacia. Consulta cambios importantes con un profesional cualificado.',
    exportTitle: 'Exportar o compartir progreso',
    exportDescription: 'Crea un archivo JSON local con los datos de progreso cargados en esta página. No contiene identificadores de cuenta.',
    exportConsent: 'Entiendo que el archivo puede contener información sensible y elijo crearlo en este dispositivo.',
    includeNarrative: 'Incluir campos narrativos seleccionados del diario',
    includeNarrativeHint: 'Desactivado por defecto. Puede incluir situaciones, pensamientos, reflexiones y aprendizajes introducidos.',
    download: 'Descargar archivo', share: 'Compartir archivo',
    exportReady: 'El archivo de progreso se creó en este dispositivo.',
    exportFailed: 'No se pudo crear el archivo de progreso.',
    shareUnavailable: 'Este dispositivo no permite compartir; puedes descargar el archivo.',
    privacyNote: 'Solo el usuario puede iniciar la acción. Se requiere consentimiento para cada archivo.',
    summaryOnly: 'Resumen por defecto', count: 'controles', latest: 'Último', notDiagnostic: 'Autoinforme no diagnóstico'
  },
  fr: {
    outcomeTitle: 'Point personnel de bien-être',
    outcomeDescription: 'Une réflexion volontaire et non diagnostique. Vos réponses restent uniquement sur cet appareil et ne sont pas envoyées à Mindful Path.',
    wellbeing: 'Bien-être général', distress: 'Détresse émotionnelle', functioning: 'Fonctionnement quotidien',
    low: 'Faible', high: 'Élevé',
    saveCheckIn: 'Enregistrer sur cet appareil',
    saved: 'Point enregistré localement.', saveFailed: 'Impossible d’enregistrer sur cet appareil.',
    history: 'Points locaux', firstToLatest: 'Évolution du premier au dernier',
    noTrend: 'Enregistrez au moins deux points pour voir une évolution.',
    improved: 'amélioré', decreased: 'diminué', increased: 'augmenté', unchanged: 'inchangé',
    deleteHistory: 'Supprimer les points locaux',
    deleteConfirm: 'Supprimer tous les points de bien-être stockés sur cet appareil ?',
    deleted: 'Points locaux supprimés.',
    outcomeDisclaimer: 'Ces scores ne posent aucun diagnostic, ne constituent pas un dépistage et ne prouvent pas l’efficacité d’un traitement. Discutez des changements importants avec un professionnel qualifié.',
    exportTitle: 'Exporter ou partager les progrès',
    exportDescription: 'Crée un fichier JSON local à partir des données chargées sur cette page, sans identifiant de compte.',
    exportConsent: 'Je comprends que le fichier peut contenir des informations sensibles et je choisis de le créer sur cet appareil.',
    includeNarrative: 'Inclure certains champs narratifs du journal',
    includeNarrativeHint: 'Désactivé par défaut. Peut inclure les situations, pensées, réflexions et apprentissages saisis.',
    download: 'Télécharger', share: 'Partager',
    exportReady: 'Le fichier de progrès a été créé sur cet appareil.', exportFailed: 'Impossible de créer le fichier.',
    shareUnavailable: 'Le partage n’est pas pris en charge ; vous pouvez télécharger le fichier.',
    privacyNote: 'Seul l’utilisateur peut lancer l’action. Un nouveau consentement est requis pour chaque fichier.',
    summaryOnly: 'Résumé par défaut', count: 'points', latest: 'Dernier', notDiagnostic: 'Auto-évaluation non diagnostique'
  },
  de: {
    outcomeTitle: 'Persönlicher Wohlbefindens-Check-in',
    outcomeDescription: 'Eine freiwillige, nicht diagnostische Reflexion. Antworten bleiben nur auf diesem Gerät und werden nicht an Mindful Path gesendet.',
    wellbeing: 'Allgemeines Wohlbefinden', distress: 'Emotionale Belastung', functioning: 'Alltagsfunktion',
    low: 'Niedrig', high: 'Hoch',
    saveCheckIn: 'Auf diesem Gerät speichern',
    saved: 'Check-in lokal gespeichert.', saveFailed: 'Der Check-in konnte nicht gespeichert werden.',
    history: 'Lokale Check-ins', firstToLatest: 'Änderung vom ersten zum letzten',
    noTrend: 'Speichere mindestens zwei Check-ins, um Veränderungen zu sehen.',
    improved: 'verbessert', decreased: 'gesunken', increased: 'gestiegen', unchanged: 'unverändert',
    deleteHistory: 'Lokale Check-ins löschen',
    deleteConfirm: 'Alle auf diesem Gerät gespeicherten Wohlbefindens-Check-ins löschen?',
    deleted: 'Lokale Check-ins gelöscht.',
    outcomeDisclaimer: 'Diese Werte stellen keine Diagnose oder klinische Untersuchung dar und belegen keine Wirksamkeit. Besprich wichtige Veränderungen mit einer qualifizierten Fachperson.',
    exportTitle: 'Fortschritt exportieren oder teilen',
    exportDescription: 'Erstellt lokal eine JSON-Datei aus den aktuell geladenen Fortschrittsdaten, ohne Konto-ID.',
    exportConsent: 'Ich verstehe, dass die Datei sensible Informationen enthalten kann, und möchte sie auf diesem Gerät erstellen.',
    includeNarrative: 'Ausgewählte Freitextfelder aus dem Journal einbeziehen',
    includeNarrativeHint: 'Standardmäßig aus. Kann eingegebene Situationen, Gedanken, Reflexionen und Lernerfahrungen enthalten.',
    download: 'Datei herunterladen', share: 'Datei teilen',
    exportReady: 'Die Fortschrittsdatei wurde auf diesem Gerät erstellt.', exportFailed: 'Die Fortschrittsdatei konnte nicht erstellt werden.',
    shareUnavailable: 'Teilen wird auf diesem Gerät nicht unterstützt; die Datei kann heruntergeladen werden.',
    privacyNote: 'Nur der Benutzer kann die Aktion starten. Für jede Datei ist eine neue Zustimmung erforderlich.',
    summaryOnly: 'Standardmäßig Zusammenfassung', count: 'Check-ins', latest: 'Neuester', notDiagnostic: 'Nicht diagnostische Selbstauskunft'
  },
  it: {
    outcomeTitle: 'Check-in personale sul benessere',
    outcomeDescription: 'Una riflessione volontaria e non diagnostica. Le risposte restano solo su questo dispositivo e non vengono inviate a Mindful Path.',
    wellbeing: 'Benessere generale', distress: 'Disagio emotivo', functioning: 'Funzionamento quotidiano',
    low: 'Basso', high: 'Alto',
    saveCheckIn: 'Salva su questo dispositivo',
    saved: 'Check-in salvato localmente.', saveFailed: 'Impossibile salvare il check-in.',
    history: 'Check-in locali', firstToLatest: 'Variazione dal primo all’ultimo',
    noTrend: 'Salva almeno due check-in per vedere le variazioni.',
    improved: 'migliorato', decreased: 'diminuito', increased: 'aumentato', unchanged: 'invariato',
    deleteHistory: 'Elimina check-in locali',
    deleteConfirm: 'Eliminare tutti i check-in di benessere salvati su questo dispositivo?',
    deleted: 'Check-in locali eliminati.',
    outcomeDisclaimer: 'Questi punteggi non diagnosticano, non sono uno screening clinico e non dimostrano efficacia. Parla dei cambiamenti importanti con un professionista qualificato.',
    exportTitle: 'Esporta o condividi i progressi',
    exportDescription: 'Crea un file JSON locale con i dati caricati in questa pagina, senza identificatori dell’account.',
    exportConsent: 'Comprendo che il file può contenere informazioni sensibili e scelgo di crearlo su questo dispositivo.',
    includeNarrative: 'Includi campi narrativi selezionati del diario',
    includeNarrativeHint: 'Disattivato per impostazione predefinita. Può includere situazioni, pensieri, riflessioni e apprendimenti inseriti.',
    download: 'Scarica file', share: 'Condividi file',
    exportReady: 'Il file dei progressi è stato creato sul dispositivo.', exportFailed: 'Impossibile creare il file dei progressi.',
    shareUnavailable: 'La condivisione non è supportata; puoi scaricare il file.',
    privacyNote: 'Solo l’utente può avviare l’azione. Il consenso è richiesto per ogni file.',
    summaryOnly: 'Riepilogo predefinito', count: 'check-in', latest: 'Ultimo', notDiagnostic: 'Autovalutazione non diagnostica'
  },
  pt: {
    outcomeTitle: 'Check-in pessoal de bem-estar',
    outcomeDescription: 'Uma reflexão voluntária e não diagnóstica. As respostas ficam apenas neste dispositivo e não são enviadas à Mindful Path.',
    wellbeing: 'Bem-estar geral', distress: 'Sofrimento emocional', functioning: 'Funcionamento diário',
    low: 'Baixo', high: 'Alto',
    saveCheckIn: 'Salvar neste dispositivo',
    saved: 'Check-in salvo localmente.', saveFailed: 'Não foi possível salvar o check-in.',
    history: 'Check-ins locais', firstToLatest: 'Mudança do primeiro ao mais recente',
    noTrend: 'Salve pelo menos dois check-ins para ver mudanças.',
    improved: 'melhorou', decreased: 'diminuiu', increased: 'aumentou', unchanged: 'sem alteração',
    deleteHistory: 'Excluir check-ins locais',
    deleteConfirm: 'Excluir todos os check-ins de bem-estar salvos neste dispositivo?',
    deleted: 'Check-ins locais excluídos.',
    outcomeDisclaimer: 'Essas pontuações não diagnosticam, não são uma triagem clínica e não comprovam eficácia. Converse sobre mudanças importantes com um profissional qualificado.',
    exportTitle: 'Exportar ou compartilhar progresso',
    exportDescription: 'Cria um arquivo JSON local com os dados carregados nesta página, sem identificador da conta.',
    exportConsent: 'Entendo que o arquivo pode conter informações sensíveis e escolho criá-lo neste dispositivo.',
    includeNarrative: 'Incluir campos narrativos selecionados do diário',
    includeNarrativeHint: 'Desativado por padrão. Pode incluir situações, pensamentos, reflexões e aprendizados inseridos.',
    download: 'Baixar arquivo', share: 'Compartilhar arquivo',
    exportReady: 'O arquivo de progresso foi criado neste dispositivo.', exportFailed: 'Não foi possível criar o arquivo.',
    shareUnavailable: 'O compartilhamento não é compatível; você pode baixar o arquivo.',
    privacyNote: 'Somente o usuário pode iniciar a ação. O consentimento é exigido novamente para cada arquivo.',
    summaryOnly: 'Resumo por padrão', count: 'check-ins', latest: 'Mais recente', notDiagnostic: 'Autorrelato não diagnóstico'
  }
});

function resolveStorage(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch (_) { return null; }
}

const clampScore = (value) => Math.max(0, Math.min(10, Math.round(Number(value))));

export function getProgressDataCopy(locale) {
  return PROGRESS_DATA_COPY[normalizeAppLocale(locale, DEFAULT_APP_LOCALE)] || PROGRESS_DATA_COPY.en;
}

export function hasCompleteProgressDataTranslations() {
  const expected = Object.keys(PROGRESS_DATA_COPY.en).sort();
  return Object.keys(PROGRESS_DATA_COPY).every((locale) =>
    Object.keys(PROGRESS_DATA_COPY[locale]).sort().join('|') === expected.join('|')
    && expected.every((key) => String(PROGRESS_DATA_COPY[locale][key] || '').trim())
  );
}

export function createWellbeingOutcome({ wellbeing, distress, functioning, recordedAt = new Date().toISOString() }) {
  return {
    version: WELLBEING_OUTCOME_VERSION,
    recordedAt,
    wellbeing: clampScore(wellbeing),
    distress: clampScore(distress),
    functioning: clampScore(functioning)
  };
}

export function readWellbeingOutcomes(storage) {
  const target = resolveStorage(storage);
  try {
    const parsed = JSON.parse(target?.getItem(WELLBEING_OUTCOME_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item && !Number.isNaN(Date.parse(item.recordedAt))
      && ['wellbeing', 'distress', 'functioning'].every((key) => Number.isFinite(Number(item[key])))
    ).map((item) => createWellbeingOutcome(item)).sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  } catch (_) {
    return [];
  }
}

export function appendWellbeingOutcome(outcome, storage) {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    const next = [...readWellbeingOutcomes(target), createWellbeingOutcome(outcome)].slice(-365);
    target.setItem(WELLBEING_OUTCOME_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch (_) {
    return false;
  }
}

export function clearWellbeingOutcomes(storage) {
  const target = resolveStorage(storage);
  try {
    target?.removeItem(WELLBEING_OUTCOME_STORAGE_KEY);
    return true;
  } catch (_) {
    return false;
  }
}

export function summarizeWellbeingOutcomes(entries) {
  const safe = Array.isArray(entries) ? entries : [];
  if (safe.length < 2) return { count: safe.length, hasTrend: false };
  const first = safe[0];
  const latest = safe[safe.length - 1];
  return {
    count: safe.length,
    hasTrend: true,
    firstAt: first.recordedAt,
    latestAt: latest.recordedAt,
    wellbeingDelta: latest.wellbeing - first.wellbeing,
    distressDelta: latest.distress - first.distress,
    functioningDelta: latest.functioning - first.functioning
  };
}

const selectFields = (item, fields) => Object.fromEntries(
  fields.filter((field) => item?.[field] !== undefined).map((field) => [field, item[field]])
);

export function buildLocalProgressExport({
  locale,
  moodEntries = [],
  journalEntries = [],
  goals = [],
  exercises = [],
  outcomeEntries = [],
  includeNarrative = false,
  exportedAt = new Date().toISOString()
} = {}) {
  const normalizedLocale = normalizeAppLocale(locale, DEFAULT_APP_LOCALE);
  const safeArray = (value) => Array.isArray(value) ? value : [];
  const journalBaseFields = ['id', 'created_date', 'updated_date', 'entry_type', 'emotion_ratings', 'outcome_emotion_intensity', 'homework_tasks'];
  const narrativeFields = ['situation', 'automatic_thoughts', 'evidence_for', 'evidence_against', 'balanced_thought', 'reflection', 'notes'];
  const goalFields = ['id', 'title', 'status', 'progress', 'target_date', 'created_date', 'updated_date'];
  const exerciseFields = ['id', 'title', 'category', 'completed_count', 'last_completed', 'created_date', 'updated_date'];
  const moods = safeArray(moodEntries).map((item) => selectFields(item, ['id', 'date', 'mood', 'energy_level', 'intensity', 'created_date']));
  const journals = safeArray(journalEntries).map((item) => {
    const selected = selectFields(item, includeNarrative ? [...journalBaseFields, ...narrativeFields] : journalBaseFields);
    const experimentMetrics = selectFields(item?.custom_fields, ['experiment_type', 'belief_after', 'completed_at']);
    return Object.keys(experimentMetrics).length ? { ...selected, experimentMetrics } : selected;
  });
  const selectedGoals = safeArray(goals).map((item) => selectFields(item, goalFields));
  const selectedExercises = safeArray(exercises).map((item) => selectFields(item, exerciseFields));
  const outcomes = safeArray(outcomeEntries).map((item) => selectFields(item, ['version', 'recordedAt', 'wellbeing', 'distress', 'functioning']));

  return {
    schema: 'mindful-path-local-progress-export',
    schemaVersion: '1.0.0',
    exportedAt,
    locale: normalizedLocale,
    privacy: {
      accountIdentifierIncluded: false,
      narrativeIncluded: Boolean(includeNarrative),
      createdLocallyByUser: true
    },
    clinicalStatus: {
      diagnostic: false,
      validatedOutcomeInstrument: false,
      efficacyClaim: false
    },
    summary: {
      moodEntries: moods.length,
      journalEntries: journals.length,
      goals: selectedGoals.length,
      exercises: selectedExercises.length,
      wellbeingOutcomes: outcomes.length,
      outcomeTrend: summarizeWellbeingOutcomes(outcomes)
    },
    data: { moods, journals, goals: selectedGoals, exercises: selectedExercises, wellbeingOutcomes: outcomes }
  };
}
