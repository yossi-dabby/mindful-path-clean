import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_1 } from './exerciseContentTranslationsBatch1.js';
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A } from './exerciseContentTranslationsBatch3A.js';

const LOCALES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

const retitle = (source, titles) => Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    {
      ...source[locale],
      title: titles[locale]
    }
  ])
);

const makeContent = (title, description, tags, steps, benefits, tips) => ({
  title,
  description,
  tags,
  steps: steps.map(([stepTitle, stepDescription]) => ({
    title: stepTitle,
    description: stepDescription
  })),
  benefits,
  tips
});

const CALM_CENTER_TRANSLATIONS = {
  en: makeContent(
    'Calm & Center',
    'Use a gentle 4–6 breathing rhythm to settle your body, reduce tension, and return attention to the present moment.',
    ['breathing', 'calm', 'stress relief', 'grounding'],
    [['Settle', 'Sit or lie comfortably and let your shoulders soften.'], ['Inhale', 'Breathe in slowly through your nose for 4 seconds without forcing the breath.'], ['Exhale', 'Breathe out gently for 6 seconds, allowing the exhale to stay smooth and relaxed.'], ['Continue', 'Repeat for the selected time and return to natural breathing if you feel uncomfortable.']],
    ['Supports a calmer nervous-system response', 'Reduces physical tension', 'Helps restore present-moment focus'],
    ['Keep the breath comfortable rather than deep.', 'Stop and breathe normally if you feel dizzy, short of breath, or uncomfortable.']
  ),
  he: makeContent(
    'רוגע ומיקוד',
    'השתמשו בקצב נשימה עדין של 4–6 כדי להרגיע את הגוף, להפחית מתח ולהחזיר את הקשב לרגע הנוכחי.',
    ['נשימה', 'רוגע', 'הפחתת מתח', 'קרקוע'],
    [['התמקמות', 'שבו או שכבו בנוחות ואפשרו לכתפיים להתרכך.'], ['שאיפה', 'שאפו לאט דרך האף במשך 4 שניות, בלי לאלץ את הנשימה.'], ['נשיפה', 'נשפו בעדינות במשך 6 שניות ושמרו על נשיפה חלקה ורגועה.'], ['המשך', 'חזרו על הקצב במשך הזמן שבחרתם וחזרו לנשימה טבעית אם מתעוררת אי־נוחות.']],
    ['תומך בתגובת רגיעה של מערכת העצבים', 'מפחית מתח גופני', 'מסייע להחזיר מיקוד לרגע הנוכחי'],
    ['שמרו על נשימה נוחה ולא עמוקה מדי.', 'אם מופיעים סחרחורת, קוצר נשימה או אי־נוחות, הפסיקו וחזרו לנשימה רגילה.']
  ),
  es: makeContent(
    'Calma y céntrate',
    'Utiliza un ritmo respiratorio suave de 4–6 para calmar el cuerpo, reducir la tensión y volver al momento presente.',
    ['respiración', 'calma', 'alivio del estrés', 'anclaje'],
    [['Prepárate', 'Siéntate o túmbate cómodamente y relaja los hombros.'], ['Inhala', 'Inhala lentamente por la nariz durante 4 segundos, sin forzar.'], ['Exhala', 'Exhala suavemente durante 6 segundos, de forma fluida y relajada.'], ['Continúa', 'Repite durante el tiempo elegido y vuelve a respirar con naturalidad si notas molestias.']],
    ['Favorece una respuesta de calma', 'Reduce la tensión física', 'Ayuda a recuperar la atención presente'],
    ['Mantén una respiración cómoda, no demasiado profunda.', 'Detente y respira con normalidad si sientes mareo, falta de aire o malestar.']
  ),
  fr: makeContent(
    'Calme et recentrage',
    'Adoptez un rythme respiratoire doux de 4–6 pour apaiser le corps, réduire la tension et revenir au moment présent.',
    ['respiration', 'calme', 'réduction du stress', 'ancrage'],
    [['S’installer', 'Asseyez-vous ou allongez-vous confortablement et relâchez les épaules.'], ['Inspirer', 'Inspirez lentement par le nez pendant 4 secondes, sans forcer.'], ['Expirer', 'Expirez doucement pendant 6 secondes, de façon fluide et détendue.'], ['Continuer', 'Répétez pendant la durée choisie et reprenez une respiration naturelle en cas d’inconfort.']],
    ['Favorise une réponse d’apaisement', 'Réduit la tension physique', 'Aide à retrouver l’attention au présent'],
    ['Gardez une respiration confortable plutôt que trop profonde.', 'Arrêtez et respirez normalement en cas de vertige, d’essoufflement ou d’inconfort.']
  ),
  de: makeContent(
    'Ruhe und Zentrierung',
    'Nutze einen sanften 4–6-Atemrhythmus, um den Körper zu beruhigen, Anspannung zu lösen und in den gegenwärtigen Moment zurückzukehren.',
    ['Atmung', 'Ruhe', 'Stressabbau', 'Erdung'],
    [['Ankommen', 'Setze oder lege dich bequem hin und lasse die Schultern locker.'], ['Einatmen', 'Atme 4 Sekunden langsam durch die Nase ein, ohne den Atem zu erzwingen.'], ['Ausatmen', 'Atme 6 Sekunden sanft, gleichmäßig und entspannt aus.'], ['Fortsetzen', 'Wiederhole den Rhythmus für die gewählte Zeit und kehre bei Unwohlsein zur natürlichen Atmung zurück.']],
    ['Unterstützt eine ruhige Körperreaktion', 'Verringert körperliche Anspannung', 'Hilft, die Aufmerksamkeit ins Hier und Jetzt zurückzubringen'],
    ['Atme bequem und nicht übermäßig tief.', 'Beende die Übung und atme normal, wenn Schwindel, Atemnot oder Unwohlsein auftreten.']
  ),
  it: makeContent(
    'Calma e centratura',
    'Usa un ritmo respiratorio delicato di 4–6 per calmare il corpo, ridurre la tensione e riportare l’attenzione al momento presente.',
    ['respirazione', 'calma', 'riduzione dello stress', 'radicamento'],
    [['Sistemarsi', 'Siediti o sdraiati comodamente e lascia rilassare le spalle.'], ['Inspirare', 'Inspira lentamente dal naso per 4 secondi, senza forzare.'], ['Espirare', 'Espira delicatamente per 6 secondi, in modo fluido e rilassato.'], ['Continuare', 'Ripeti per il tempo scelto e torna alla respirazione naturale se avverti disagio.']],
    ['Favorisce una risposta di calma', 'Riduce la tensione fisica', 'Aiuta a ritrovare l’attenzione al presente'],
    ['Mantieni il respiro comodo, senza renderlo troppo profondo.', 'Interrompi e respira normalmente se avverti vertigini, affanno o disagio.']
  ),
  pt: makeContent(
    'Calma e centramento',
    'Use um ritmo respiratório suave de 4–6 para acalmar o corpo, reduzir a tensão e voltar a atenção ao momento presente.',
    ['respiração', 'calma', 'redução do estresse', 'ancoragem'],
    [['Acomodar-se', 'Sente-se ou deite-se confortavelmente e relaxe os ombros.'], ['Inspirar', 'Inspire lentamente pelo nariz por 4 segundos, sem forçar.'], ['Expirar', 'Expire suavemente por 6 segundos, de modo contínuo e relaxado.'], ['Continuar', 'Repita pelo tempo escolhido e volte à respiração natural se sentir desconforto.']],
    ['Favorece uma resposta de calma', 'Reduz a tensão física', 'Ajuda a recuperar a atenção no presente'],
    ['Mantenha a respiração confortável, sem aprofundá-la demais.', 'Pare e respire normalmente se sentir tontura, falta de ar ou desconforto.']
  )
};

export const EXERCISE_LEGACY_TITLE_TRANSLATIONS = {
  'legacy-calm-center': CALM_CENTER_TRANSLATIONS,
  'legacy-sleep-body-scan': retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_1['local-grounding-body-scan'],
    {
      en: 'Sleep Body Scan',
      he: 'סריקת גוף לשינה',
      es: 'Escaneo corporal para dormir',
      fr: 'Balayage corporel pour le sommeil',
      de: 'Körperscan für den Schlaf',
      it: 'Scansione corporea per il sonno',
      pt: 'Escaneamento corporal para o sono'
    }
  ),
  'legacy-behavioral-activation-scheduling': retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A['local-behavioral-activity-scheduling'],
    {
      en: 'Behavioral Activation Scheduling',
      he: 'תכנון הפעלה התנהגותית',
      es: 'Planificación de activación conductual',
      fr: 'Planification de l’activation comportementale',
      de: 'Planung der Verhaltensaktivierung',
      it: 'Pianificazione dell’attivazione comportamentale',
      pt: 'Planejamento da ativação comportamental'
    }
  )
};

export const EXERCISE_LEGACY_TITLE_IDS = Object.freeze(
  Object.keys(EXERCISE_LEGACY_TITLE_TRANSLATIONS)
);
