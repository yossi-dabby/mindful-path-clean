import { DEFAULT_APP_LOCALE, normalizeAppLocale } from '../i18n/appLocale.js';

export const GOAL_TEMPLATE_IDS = Object.freeze([
  'daily_exercise',
  'sleep_quality',
  'social_anxiety',
  'daily_gratitude',
  'study_habits',
  'friendships',
  'procrastination',
  'anger_management'
]);

const TITLE_TO_ID = Object.freeze({
  'Build a Daily Exercise Habit': 'daily_exercise',
  'Improve Sleep Quality': 'sleep_quality',
  'Reduce Social Anxiety': 'social_anxiety',
  'Practice Daily Gratitude': 'daily_gratitude',
  'Develop Better Study Habits': 'study_habits',
  'Build Stronger Friendships': 'friendships',
  'Overcome Procrastination': 'procrastination',
  'Learn to Manage Anger': 'anger_management'
});

const entry = (title, description, motivation, smart, milestones) => ({
  title,
  description,
  motivation,
  smart_criteria: {
    specific: smart[0],
    measurable: smart[1],
    achievable: smart[2],
    relevant: smart[3],
    time_bound: smart[4]
  },
  milestones: milestones.map(([milestoneTitle, milestoneDescription]) => ({
    title: milestoneTitle,
    description: milestoneDescription
  }))
});

export const GOAL_TEMPLATE_CATALOG = Object.freeze({
  en: {
    daily_exercise: entry(
      'Build a Daily Exercise Habit',
      'Establish a consistent workout routine to improve physical health and energy levels',
      'Regular exercise can support mood, reduce stress, and improve overall wellbeing',
      ['Exercise for 30 minutes, 4 times per week', 'Track completed workouts', 'Start gently and increase gradually', 'Supports physical health, clarity, and stress management', 'Practise consistently for 8 weeks'],
      [['Complete the first workout', 'Begin with a 20-minute walk or gentle activity'], ['Exercise twice in week one', 'Build momentum with two sessions'], ['Complete four workouts in a week', 'Reach the target frequency'], ['Try a new activity', 'Explore yoga, swimming, cycling, or another suitable activity']]
    ),
    sleep_quality: entry(
      'Improve Sleep Quality',
      'Develop healthy sleep habits to feel more rested and energised',
      'Better sleep can support mood, focus, and overall mental wellbeing',
      ['Choose a consistent bedtime and waking time', 'Track sleep duration and perceived quality', 'Create a calming wind-down routine', 'Supports energy, concentration, and emotional regulation', 'Establish the routine within 6 weeks'],
      [['Set a consistent bedtime', 'Choose a realistic time and keep it'], ['Create a bedtime routine', 'Build a 30-minute wind-down routine'], ['Reduce screens before bed', 'Stop using devices one hour before sleep'], ['Reach a steady sleep duration', 'Keep the target sleep duration for one week']]
    ),
    social_anxiety: entry(
      'Reduce Social Anxiety',
      'Build confidence in social situations through gradual practice and CBT skills',
      'Feeling more comfortable socially can support connection and life satisfaction',
      ['Practise a graded social step twice per week', 'Rate distress before and after each step', 'Begin with lower-pressure situations', 'Supports social connection and reduces avoidance', 'Follow the gradual plan for 12 weeks'],
      [['Make brief small talk', 'Begin with a short, low-pressure interaction'], ['Attend a social event', 'Stay for at least 30 minutes'], ['Start a conversation', 'Open a conversation with someone new'], ['Share an opinion in a group', 'Speak once in a meeting or group setting']]
    ),
    daily_gratitude: entry(
      'Practice Daily Gratitude',
      'Build appreciation through a short daily gratitude reflection',
      'A gratitude habit can help notice supportive and meaningful moments',
      ['Write three things you appreciate each morning', 'Record one entry per day', 'Keep the practice to five minutes', 'Supports attention to positive and meaningful experiences', 'Practise for 4 weeks'],
      [['Complete the first week', 'Write an entry for seven days'], ['Notice varied moments', 'Include different details rather than repeating automatically'], ['Express appreciation', 'Thank a friend or family member'], ['Reflect on the practice', 'Notice any changes in perspective']]
    ),
    study_habits: entry(
      'Develop Better Study Habits',
      'Create a practical study routine that supports learning and reduces pressure',
      'A steady study routine can reduce last-minute stress and support progress',
      ['Study in planned, focused blocks', 'Track sessions and learning checks', 'Use manageable 25-minute blocks', 'Supports learning and reduces exam pressure', 'Practise through the current study period'],
      [['Prepare a study space', 'Choose a dedicated area with fewer distractions'], ['Complete the first week', 'Follow the planned routine for seven days'], ['Try active recall', 'Test yourself instead of only rereading'], ['Review progress', 'Compare learning checks and adjust the routine']]
    ),
    friendships: entry(
      'Build Stronger Friendships',
      'Invest regular time and attention in supportive friendships',
      'Supportive friendships can strengthen connection, enjoyment, and wellbeing',
      ['Contact two friends each week', 'Note the interactions and sense of connection', 'Schedule realistic check-ins or activities', 'Supports connection and reduces loneliness', 'Strengthen the routine over 12 weeks'],
      [['Reconnect with a friend', 'Contact someone you have not spoken with recently'], ['Plan a shared activity', 'Arrange a meal, game, walk, or outing'], ['Have a meaningful conversation', 'Share or ask about something important'], ['Offer support', 'Be present when a friend needs help']]
    ),
    procrastination: entry(
      'Overcome Procrastination',
      'Break delayed tasks into clear, manageable actions',
      'Reducing avoidance can lower pressure and support a sense of progress',
      ['Begin the priority task within a planned time block', 'Track tasks started and completed', 'Use small steps and realistic time blocks', 'Supports progress and reduces last-minute pressure', 'Practise the routine for 8 weeks'],
      [['Identify avoidance triggers', 'Notice when and why starting becomes difficult'], ['Use the two-minute start', 'Begin with a very small action'], ['Break down one large task', 'Turn an overwhelming task into manageable steps'], ['Finish before the deadline', 'Complete one task earlier than usual']]
    ),
    anger_management: entry(
      'Learn to Manage Anger',
      'Develop safer ways to notice, regulate, and express anger',
      'Managing anger constructively can support relationships and reduce regret',
      ['Practise one anger-regulation skill three times per week', 'Rate intensity and note which skill helped', 'Use brief CBT and time-out skills', 'Supports safer communication and emotional regulation', 'Review progress after 10 weeks'],
      [['Recognise early signs', 'Notice cues such as tension, heat, or faster breathing'], ['Use a time-out', 'Step away safely before reacting'], ['Communicate a need calmly', 'Express frustration without shouting or threats'], ['Resolve a disagreement safely', 'Use a calm conversation after intensity falls']]
    )
  },
  he: {
    daily_exercise: entry(
      'בניית הרגל של פעילות גופנית יומית',
      'יצירת שגרת פעילות עקבית לשיפור הבריאות הגופנית ורמת האנרגיה',
      'פעילות קבועה יכולה לתמוך במצב הרוח, להפחית לחץ ולשפר את הרווחה הכללית',
      ['פעילות של 30 דקות, ארבע פעמים בשבוע', 'מעקב אחר הפעילויות שהושלמו', 'התחלה מתונה והתקדמות הדרגתית', 'תמיכה בבריאות, בבהירות ובהתמודדות עם לחץ', 'תרגול עקבי במשך שמונה שבועות'],
      [['השלמת הפעילות הראשונה', 'התחלה בהליכה של 20 דקות או בפעילות מתונה'], ['שתי פעילויות בשבוע הראשון', 'בניית תנופה באמצעות שני מפגשים'], ['ארבע פעילויות בשבוע', 'הגעה לתדירות שנבחרה'], ['ניסיון בפעילות חדשה', 'בחירת יוגה, שחייה, רכיבה או פעילות מתאימה אחרת']]
    ),
    sleep_quality: entry(
      'שיפור איכות השינה',
      'פיתוח הרגלי שינה בריאים כדי להרגיש ערניים ורעננים יותר',
      'שינה טובה יותר יכולה לתמוך במצב הרוח, בריכוז וברווחה הנפשית',
      ['בחירת שעת שינה וקימה קבועות', 'מעקב אחר משך השינה ואיכותה כפי שהורגשה', 'יצירת שגרת הרגעה לפני השינה', 'תמיכה באנרגיה, בריכוז ובוויסות רגשי', 'ביסוס השגרה בתוך שישה שבועות'],
      [['קביעת שעת שינה', 'בחירת שעה מציאותית ושמירה עליה'], ['יצירת שגרת ערב', 'בניית שגרת הרגעה של 30 דקות'], ['הפחתת מסכים לפני השינה', 'הפסקת השימוש במכשירים שעה לפני השינה'], ['שמירה על משך שינה יציב', 'עמידה במשך השינה שנבחר במשך שבוע']]
    ),
    social_anxiety: entry(
      'הפחתת חרדה חברתית',
      'בניית ביטחון במצבים חברתיים באמצעות תרגול הדרגתי ומיומנויות CBT',
      'תחושת נוחות רבה יותר בחברה יכולה לתמוך בקשרים ובשביעות הרצון מהחיים',
      ['תרגול צעד חברתי מדורג פעמיים בשבוע', 'דירוג המצוקה לפני כל צעד ואחריו', 'התחלה במצבים בעלי לחץ נמוך יותר', 'תמיכה בקשר חברתי והפחתת הימנעות', 'עבודה לפי התוכנית ההדרגתית במשך 12 שבועות'],
      [['שיחת חולין קצרה', 'התחלה באינטראקציה קצרה ובלחץ נמוך'], ['השתתפות באירוע חברתי', 'שהייה של 30 דקות לפחות'], ['פתיחת שיחה', 'התחלת שיחה עם אדם חדש'], ['הבעת דעה בקבוצה', 'אמירת דבר אחד בישיבה או במפגש קבוצתי']]
    ),
    daily_gratitude: entry(
      'תרגול יומי של הכרת תודה',
      'טיפוח תשומת לב לדברים טובים באמצעות התבוננות יומית קצרה',
      'הרגל של הכרת תודה יכול לעזור להבחין ברגעים תומכים ובעלי משמעות',
      ['כתיבת שלושה דברים מוערכים בכל בוקר', 'שמירת רשומה אחת ביום', 'הקדשת חמש דקות בלבד לתרגול', 'תמיכה בתשומת לב לחוויות חיוביות ומשמעותיות', 'תרגול במשך ארבעה שבועות'],
      [['השלמת השבוע הראשון', 'כתיבת רשומה במשך שבעה ימים'], ['הבחנה ברגעים מגוונים', 'הוספת פרטים שונים במקום חזרה אוטומטית'], ['הבעת הערכה', 'הודיה לחבר או לבן משפחה'], ['התבוננות בתרגול', 'בדיקת שינויים אפשריים בנקודת המבט']]
    ),
    study_habits: entry(
      'פיתוח הרגלי למידה טובים יותר',
      'יצירת שגרת למידה מעשית שתומכת בלמידה ומפחיתה לחץ',
      'שגרה יציבה יכולה להפחית לחץ של הרגע האחרון ולתמוך בהתקדמות',
      ['למידה במקטעים מתוכננים וממוקדים', 'מעקב אחר מפגשי למידה ובדיקות הבנה', 'שימוש במקטעים אפשריים של 25 דקות', 'תמיכה בלמידה והפחתת לחץ מבחינות', 'תרגול לאורך תקופת הלימודים הנוכחית'],
      [['הכנת מקום ללמידה', 'בחירת אזור קבוע עם פחות הסחות'], ['השלמת השבוע הראשון', 'עבודה לפי השגרה במשך שבעה ימים'], ['ניסיון בשליפה פעילה', 'בחינה עצמית במקום קריאה חוזרת בלבד'], ['בדיקת ההתקדמות', 'השוואת בדיקות ההבנה והתאמת השגרה']]
    ),
    friendships: entry(
      'חיזוק קשרי חברות',
      'השקעת זמן ותשומת לב קבועים בחברויות תומכות',
      'חברויות תומכות יכולות לחזק קשר, הנאה ורווחה נפשית',
      ['יצירת קשר עם שני חברים בכל שבוע', 'תיעוד המפגשים ותחושת הקשר', 'תכנון שיחות או פעילויות מציאותיות', 'תמיכה בקשר והפחתת בדידות', 'חיזוק השגרה במשך 12 שבועות'],
      [['חידוש קשר עם חבר', 'פנייה למישהו שלא שוחחתם איתו לאחרונה'], ['תכנון פעילות משותפת', 'ארגון ארוחה, משחק, הליכה או יציאה'], ['שיחה בעלת משמעות', 'שיתוף או שאלה על דבר חשוב'], ['הצעת תמיכה', 'נוכחות כאשר חבר זקוק לעזרה']]
    ),
    procrastination: entry(
      'התמודדות עם דחיינות',
      'פירוק משימות שנדחו לפעולות ברורות ואפשריות',
      'הפחתת הימנעות יכולה לצמצם לחץ ולחזק את תחושת ההתקדמות',
      ['התחלת המשימה החשובה בחלון זמן מתוכנן', 'מעקב אחר משימות שהתחילו והושלמו', 'שימוש בצעדים קטנים ובחלונות זמן מציאותיים', 'תמיכה בהתקדמות והפחתת לחץ של הרגע האחרון', 'תרגול השגרה במשך שמונה שבועות'],
      [['זיהוי גורמי הדחיינות', 'הבחנה מתי ומדוע קשה להתחיל'], ['התחלה של שתי דקות', 'פתיחה בפעולה קטנה מאוד'], ['פירוק משימה גדולה', 'הפיכת משימה מכבידה לצעדים אפשריים'], ['סיום לפני המועד', 'השלמת משימה אחת מוקדם מהרגיל']]
    ),
    anger_management: entry(
      'למידה כיצד לנהל כעס',
      'פיתוח דרכים בטוחות לזיהוי הכעס, לוויסותו ולהבעתו',
      'ניהול בונה של כעס יכול לתמוך במערכות יחסים ולהפחית חרטה',
      ['תרגול מיומנות לוויסות כעס שלוש פעמים בשבוע', 'דירוג העוצמה ותיעוד המיומנות שעזרה', 'שימוש במיומנויות CBT קצרות ובפסק זמן', 'תמיכה בתקשורת בטוחה ובוויסות רגשי', 'בדיקת ההתקדמות לאחר עשרה שבועות'],
      [['זיהוי סימנים מוקדמים', 'הבחנה במתח, בחום או בנשימה מהירה'], ['שימוש בפסק זמן', 'התרחקות בטוחה לפני תגובה'], ['הבעת צורך ברוגע', 'הבעת תסכול ללא צעקות או איומים'], ['פתרון מחלוקת בבטחה', 'שיחה רגועה לאחר ירידת העוצמה']]
    )
  },
  es: {
    daily_exercise: entry(
      'Crear un hábito diario de ejercicio',
      'Establecer una rutina constante para mejorar la salud física y la energía',
      'El ejercicio regular puede favorecer el ánimo, reducir el estrés y mejorar el bienestar',
      ['Hacer 30 minutos de ejercicio cuatro veces por semana', 'Registrar los entrenamientos completados', 'Empezar suavemente y avanzar poco a poco', 'Favorece la salud, la claridad y el manejo del estrés', 'Practicar con constancia durante ocho semanas'],
      [['Completar el primer entrenamiento', 'Empezar con una caminata de 20 minutos o actividad suave'], ['Hacer ejercicio dos veces la primera semana', 'Tomar impulso con dos sesiones'], ['Completar cuatro sesiones en una semana', 'Alcanzar la frecuencia elegida'], ['Probar una actividad nueva', 'Explorar yoga, natación, ciclismo u otra actividad adecuada']]
    ),
    sleep_quality: entry(
      'Mejorar la calidad del sueño',
      'Desarrollar hábitos de sueño saludables para sentirse con más descanso y energía',
      'Dormir mejor puede favorecer el ánimo, la concentración y el bienestar mental',
      ['Elegir horarios regulares para dormir y despertar', 'Registrar duración y calidad percibida del sueño', 'Crear una rutina relajante antes de dormir', 'Favorece la energía, la concentración y la regulación emocional', 'Establecer la rutina en seis semanas'],
      [['Fijar una hora para dormir', 'Elegir una hora realista y mantenerla'], ['Crear una rutina nocturna', 'Preparar 30 minutos de relajación'], ['Reducir pantallas antes de dormir', 'Dejar los dispositivos una hora antes'], ['Mantener una duración estable', 'Cumplir el objetivo de sueño durante una semana']]
    ),
    social_anxiety: entry(
      'Reducir la ansiedad social',
      'Ganar confianza en situaciones sociales mediante práctica gradual y habilidades de TCC',
      'Sentirse más cómodo socialmente puede favorecer la conexión y la satisfacción vital',
      ['Practicar un paso social gradual dos veces por semana', 'Valorar el malestar antes y después', 'Empezar por situaciones de menor presión', 'Favorece la conexión social y reduce la evitación', 'Seguir el plan gradual durante 12 semanas'],
      [['Mantener una conversación breve', 'Empezar con una interacción corta y sencilla'], ['Asistir a un evento social', 'Permanecer al menos 30 minutos'], ['Iniciar una conversación', 'Hablar con una persona nueva'], ['Compartir una opinión en grupo', 'Intervenir una vez en una reunión o grupo']]
    ),
    daily_gratitude: entry(
      'Practicar gratitud cada día',
      'Cultivar el aprecio mediante una breve reflexión diaria',
      'La gratitud puede ayudar a reconocer momentos de apoyo y significado',
      ['Escribir cada mañana tres cosas que valoras', 'Registrar una entrada diaria', 'Dedicar solo cinco minutos', 'Favorece la atención a experiencias positivas y significativas', 'Practicar durante cuatro semanas'],
      [['Completar la primera semana', 'Escribir durante siete días'], ['Observar momentos variados', 'Añadir detalles distintos sin repetir automáticamente'], ['Expresar agradecimiento', 'Dar las gracias a un amigo o familiar'], ['Reflexionar sobre la práctica', 'Observar posibles cambios de perspectiva']]
    ),
    study_habits: entry(
      'Desarrollar mejores hábitos de estudio',
      'Crear una rutina práctica que favorezca el aprendizaje y reduzca la presión',
      'Una rutina estable puede reducir el estrés de última hora y apoyar el progreso',
      ['Estudiar en bloques planificados y enfocados', 'Registrar sesiones y comprobaciones de aprendizaje', 'Usar bloques manejables de 25 minutos', 'Favorece el aprendizaje y reduce la presión de los exámenes', 'Practicar durante el periodo de estudio actual'],
      [['Preparar un espacio de estudio', 'Elegir una zona fija con menos distracciones'], ['Completar la primera semana', 'Seguir la rutina durante siete días'], ['Probar el recuerdo activo', 'Ponerte a prueba en vez de solo releer'], ['Revisar el progreso', 'Comparar resultados y ajustar la rutina']]
    ),
    friendships: entry(
      'Fortalecer las amistades',
      'Dedicar tiempo y atención regular a amistades que brindan apoyo',
      'Las amistades de apoyo pueden aumentar la conexión, el disfrute y el bienestar',
      ['Contactar con dos amigos cada semana', 'Anotar las interacciones y la sensación de conexión', 'Programar encuentros o actividades realistas', 'Favorece la conexión y reduce la soledad', 'Fortalecer la rutina durante 12 semanas'],
      [['Retomar contacto con un amigo', 'Escribir a alguien con quien no hablas hace tiempo'], ['Planear una actividad compartida', 'Organizar una comida, juego, paseo o salida'], ['Tener una conversación significativa', 'Compartir o preguntar algo importante'], ['Ofrecer apoyo', 'Estar presente cuando un amigo necesita ayuda']]
    ),
    procrastination: entry(
      'Superar la procrastinación',
      'Dividir las tareas aplazadas en acciones claras y manejables',
      'Reducir la evitación puede bajar la presión y fortalecer la sensación de progreso',
      ['Empezar la tarea prioritaria en un bloque previsto', 'Registrar tareas iniciadas y terminadas', 'Usar pasos pequeños y tiempos realistas', 'Favorece el progreso y reduce la presión de última hora', 'Practicar la rutina durante ocho semanas'],
      [['Identificar los desencadenantes', 'Observar cuándo y por qué cuesta empezar'], ['Usar un inicio de dos minutos', 'Comenzar con una acción muy pequeña'], ['Dividir una tarea grande', 'Convertirla en pasos manejables'], ['Terminar antes del plazo', 'Completar una tarea antes de lo habitual']]
    ),
    anger_management: entry(
      'Aprender a manejar la ira',
      'Desarrollar formas seguras de reconocer, regular y expresar la ira',
      'Manejar la ira de forma constructiva puede mejorar las relaciones y reducir el arrepentimiento',
      ['Practicar una habilidad de regulación tres veces por semana', 'Valorar la intensidad y anotar qué ayudó', 'Usar habilidades breves de TCC y pausas', 'Favorece la comunicación segura y la regulación emocional', 'Revisar el progreso después de diez semanas'],
      [['Reconocer señales tempranas', 'Notar tensión, calor o respiración rápida'], ['Usar una pausa', 'Alejarse con seguridad antes de reaccionar'], ['Comunicar una necesidad con calma', 'Expresar frustración sin gritos ni amenazas'], ['Resolver un desacuerdo con seguridad', 'Hablar con calma cuando baje la intensidad']]
    )
  },
  fr: {
    daily_exercise: entry(
      'Créer une habitude quotidienne d’exercice',
      'Mettre en place une routine régulière pour soutenir la santé physique et l’énergie',
      'Une activité régulière peut soutenir l’humeur, réduire le stress et améliorer le bien-être',
      ['Faire 30 minutes d’activité quatre fois par semaine', 'Noter les séances réalisées', 'Commencer doucement et progresser graduellement', 'Soutient la santé, la clarté et la gestion du stress', 'Pratiquer régulièrement pendant huit semaines'],
      [['Réaliser la première séance', 'Commencer par 20 minutes de marche ou une activité douce'], ['Faire deux séances la première semaine', 'Créer un élan avec deux séances'], ['Réaliser quatre séances en une semaine', 'Atteindre la fréquence choisie'], ['Essayer une nouvelle activité', 'Explorer le yoga, la natation, le vélo ou une autre activité adaptée']]
    ),
    sleep_quality: entry(
      'Améliorer la qualité du sommeil',
      'Développer des habitudes de sommeil saines pour se sentir plus reposé et énergique',
      'Un meilleur sommeil peut soutenir l’humeur, l’attention et le bien-être mental',
      ['Choisir des heures régulières de coucher et de lever', 'Noter la durée et la qualité ressentie', 'Créer une routine apaisante avant le coucher', 'Soutient l’énergie, l’attention et la régulation émotionnelle', 'Installer la routine en six semaines'],
      [['Fixer une heure de coucher', 'Choisir une heure réaliste et la respecter'], ['Créer une routine du soir', 'Prévoir 30 minutes pour ralentir'], ['Réduire les écrans avant le coucher', 'Arrêter les appareils une heure avant'], ['Stabiliser la durée du sommeil', 'Tenir la durée visée pendant une semaine']]
    ),
    social_anxiety: entry(
      'Réduire l’anxiété sociale',
      'Développer la confiance en situation sociale par une pratique graduelle et des outils TCC',
      'Se sentir plus à l’aise socialement peut soutenir les liens et la satisfaction de vie',
      ['Pratiquer une étape sociale graduée deux fois par semaine', 'Évaluer la détresse avant et après', 'Commencer par des situations moins exigeantes', 'Soutient les liens sociaux et réduit l’évitement', 'Suivre le plan graduel pendant 12 semaines'],
      [['Échanger quelques mots', 'Commencer par une interaction courte et simple'], ['Participer à un événement', 'Rester au moins 30 minutes'], ['Commencer une conversation', 'Parler avec une nouvelle personne'], ['Donner son avis en groupe', 'Intervenir une fois lors d’une réunion']]
    ),
    daily_gratitude: entry(
      'Pratiquer la gratitude chaque jour',
      'Cultiver l’appréciation par une courte réflexion quotidienne',
      'La gratitude peut aider à remarquer les moments de soutien et de sens',
      ['Écrire chaque matin trois choses appréciées', 'Noter une entrée par jour', 'Limiter la pratique à cinq minutes', 'Soutient l’attention aux expériences positives et significatives', 'Pratiquer pendant quatre semaines'],
      [['Terminer la première semaine', 'Écrire pendant sept jours'], ['Remarquer des moments variés', 'Ajouter des détails différents sans répétition automatique'], ['Exprimer sa reconnaissance', 'Remercier un ami ou un proche'], ['Réfléchir à la pratique', 'Observer les changements éventuels de perspective']]
    ),
    study_habits: entry(
      'Développer de meilleures habitudes d’étude',
      'Créer une routine pratique qui soutient l’apprentissage et réduit la pression',
      'Une routine stable peut réduire le stress de dernière minute et soutenir les progrès',
      ['Étudier par blocs planifiés et concentrés', 'Noter les séances et les vérifications des acquis', 'Utiliser des blocs gérables de 25 minutes', 'Soutient l’apprentissage et réduit la pression des examens', 'Pratiquer pendant la période d’étude actuelle'],
      [['Préparer un espace d’étude', 'Choisir un endroit fixe avec moins de distractions'], ['Terminer la première semaine', 'Suivre la routine pendant sept jours'], ['Essayer le rappel actif', 'Se tester plutôt que seulement relire'], ['Examiner les progrès', 'Comparer les résultats et adapter la routine']]
    ),
    friendships: entry(
      'Renforcer les amitiés',
      'Consacrer régulièrement du temps et de l’attention aux amitiés qui soutiennent',
      'Des amitiés soutenantes peuvent renforcer les liens, le plaisir et le bien-être',
      ['Contacter deux amis chaque semaine', 'Noter les échanges et le sentiment de lien', 'Planifier des échanges ou activités réalistes', 'Soutient les liens et réduit la solitude', 'Renforcer la routine pendant 12 semaines'],
      [['Reprendre contact', 'Écrire à une personne peu contactée récemment'], ['Planifier une activité partagée', 'Organiser un repas, un jeu, une marche ou une sortie'], ['Avoir une conversation importante', 'Partager ou demander quelque chose qui compte'], ['Offrir son soutien', 'Être présent lorsqu’un ami a besoin d’aide']]
    ),
    procrastination: entry(
      'Surmonter la procrastination',
      'Transformer les tâches reportées en actions claires et réalisables',
      'Réduire l’évitement peut diminuer la pression et renforcer le sentiment d’avancer',
      ['Commencer la tâche prioritaire dans un créneau prévu', 'Noter les tâches commencées et terminées', 'Utiliser de petites étapes et des créneaux réalistes', 'Soutient les progrès et réduit la pression de dernière minute', 'Pratiquer la routine pendant huit semaines'],
      [['Identifier les déclencheurs', 'Observer quand et pourquoi il est difficile de commencer'], ['Commencer pendant deux minutes', 'Débuter par une très petite action'], ['Découper une grande tâche', 'La transformer en étapes gérables'], ['Terminer avant l’échéance', 'Achever une tâche plus tôt que d’habitude']]
    ),
    anger_management: entry(
      'Apprendre à gérer la colère',
      'Développer des moyens sûrs de reconnaître, réguler et exprimer la colère',
      'Gérer la colère de façon constructive peut soutenir les relations et réduire les regrets',
      ['Pratiquer une compétence de régulation trois fois par semaine', 'Évaluer l’intensité et noter ce qui aide', 'Utiliser des outils TCC brefs et des pauses', 'Soutient une communication sûre et la régulation émotionnelle', 'Examiner les progrès après dix semaines'],
      [['Reconnaître les premiers signes', 'Remarquer tension, chaleur ou respiration rapide'], ['Faire une pause', 'S’éloigner en sécurité avant de réagir'], ['Exprimer calmement un besoin', 'Dire sa frustration sans cris ni menaces'], ['Résoudre un désaccord en sécurité', 'Parler calmement après la baisse de l’intensité']]
    )
  },
  de: {
    daily_exercise: entry(
      'Eine tägliche Bewegungsgewohnheit aufbauen',
      'Eine beständige Routine für körperliche Gesundheit und mehr Energie entwickeln',
      'Regelmäßige Bewegung kann Stimmung, Stressabbau und Wohlbefinden unterstützen',
      ['Viermal pro Woche 30 Minuten bewegen', 'Abgeschlossene Einheiten festhalten', 'Sanft beginnen und schrittweise steigern', 'Unterstützt Gesundheit, Klarheit und Stressbewältigung', 'Acht Wochen regelmäßig üben'],
      [['Die erste Einheit abschließen', 'Mit 20 Minuten Gehen oder sanfter Bewegung beginnen'], ['In Woche eins zweimal bewegen', 'Mit zwei Einheiten Schwung aufbauen'], ['Vier Einheiten in einer Woche', 'Die gewählte Häufigkeit erreichen'], ['Eine neue Aktivität ausprobieren', 'Yoga, Schwimmen, Radfahren oder etwas Passendes testen']]
    ),
    sleep_quality: entry(
      'Die Schlafqualität verbessern',
      'Gesunde Schlafgewohnheiten für mehr Erholung und Energie entwickeln',
      'Besserer Schlaf kann Stimmung, Konzentration und seelisches Wohlbefinden unterstützen',
      ['Regelmäßige Schlaf- und Aufstehzeiten wählen', 'Dauer und empfundene Qualität festhalten', 'Eine beruhigende Abendroutine schaffen', 'Unterstützt Energie, Konzentration und Emotionsregulation', 'Die Routine innerhalb von sechs Wochen etablieren'],
      [['Eine Schlafenszeit festlegen', 'Eine realistische Zeit wählen und einhalten'], ['Eine Abendroutine schaffen', '30 Minuten zum Herunterfahren einplanen'], ['Bildschirme vor dem Schlafen reduzieren', 'Geräte eine Stunde vorher beenden'], ['Eine stabile Schlafdauer erreichen', 'Die Zieldauer eine Woche halten']]
    ),
    social_anxiety: entry(
      'Soziale Angst verringern',
      'Durch schrittweise Übung und KVT-Fertigkeiten mehr Sicherheit in sozialen Situationen gewinnen',
      'Mehr soziale Sicherheit kann Verbindung und Lebenszufriedenheit unterstützen',
      ['Zweimal pro Woche einen abgestuften sozialen Schritt üben', 'Belastung vorher und nachher bewerten', 'Mit weniger belastenden Situationen beginnen', 'Unterstützt soziale Verbindung und reduziert Vermeidung', 'Den Stufenplan zwölf Wochen verfolgen'],
      [['Ein kurzes Gespräch führen', 'Mit einer kurzen, einfachen Begegnung beginnen'], ['Eine soziale Veranstaltung besuchen', 'Mindestens 30 Minuten bleiben'], ['Ein Gespräch beginnen', 'Mit einer neuen Person sprechen'], ['In einer Gruppe eine Meinung äußern', 'In einem Treffen einmal etwas sagen']]
    ),
    daily_gratitude: entry(
      'Täglich Dankbarkeit üben',
      'Wertschätzung durch eine kurze tägliche Reflexion fördern',
      'Dankbarkeit kann helfen, unterstützende und bedeutsame Momente wahrzunehmen',
      ['Jeden Morgen drei geschätzte Dinge notieren', 'Täglich einen Eintrag festhalten', 'Die Übung auf fünf Minuten begrenzen', 'Unterstützt Aufmerksamkeit für positive und bedeutsame Erfahrungen', 'Vier Wochen üben'],
      [['Die erste Woche abschließen', 'Sieben Tage lang schreiben'], ['Unterschiedliche Momente bemerken', 'Verschiedene Details statt automatischer Wiederholung ergänzen'], ['Wertschätzung ausdrücken', 'Einem Freund oder Angehörigen danken'], ['Die Übung reflektieren', 'Mögliche Veränderungen der Sichtweise bemerken']]
    ),
    study_habits: entry(
      'Bessere Lerngewohnheiten entwickeln',
      'Eine praktische Lernroutine schaffen, die Lernen unterstützt und Druck verringert',
      'Eine stabile Routine kann kurzfristigen Stress mindern und Fortschritt fördern',
      ['In geplanten, konzentrierten Blöcken lernen', 'Lerneinheiten und Wissenschecks festhalten', 'Überschaubare 25-Minuten-Blöcke nutzen', 'Unterstützt Lernen und verringert Prüfungsdruck', 'Während der aktuellen Lernphase üben'],
      [['Einen Lernplatz vorbereiten', 'Einen festen Ort mit weniger Ablenkung wählen'], ['Die erste Woche abschließen', 'Sieben Tage der Routine folgen'], ['Aktives Abrufen probieren', 'Sich selbst testen statt nur erneut zu lesen'], ['Fortschritt prüfen', 'Ergebnisse vergleichen und Routine anpassen']]
    ),
    friendships: entry(
      'Freundschaften stärken',
      'Regelmäßig Zeit und Aufmerksamkeit in unterstützende Freundschaften investieren',
      'Unterstützende Freundschaften können Verbindung, Freude und Wohlbefinden stärken',
      ['Jede Woche zwei Freunde kontaktieren', 'Kontakte und Verbundenheit festhalten', 'Realistische Treffen oder Aktivitäten planen', 'Unterstützt Verbindung und verringert Einsamkeit', 'Die Routine zwölf Wochen stärken'],
      [['Wieder Kontakt aufnehmen', 'Jemanden anschreiben, mit dem länger kein Kontakt bestand'], ['Eine gemeinsame Aktivität planen', 'Essen, Spiel, Spaziergang oder Ausflug organisieren'], ['Ein bedeutsames Gespräch führen', 'Etwas Wichtiges teilen oder danach fragen'], ['Unterstützung anbieten', 'Da sein, wenn ein Freund Hilfe braucht']]
    ),
    procrastination: entry(
      'Aufschieben überwinden',
      'Aufgeschobene Aufgaben in klare und machbare Schritte teilen',
      'Weniger Vermeidung kann Druck senken und das Gefühl von Fortschritt stärken',
      ['Die wichtigste Aufgabe im geplanten Zeitfenster beginnen', 'Begonnene und erledigte Aufgaben festhalten', 'Kleine Schritte und realistische Zeitblöcke nutzen', 'Unterstützt Fortschritt und reduziert Last-Minute-Druck', 'Die Routine acht Wochen üben'],
      [['Auslöser erkennen', 'Beobachten, wann und warum der Anfang schwerfällt'], ['Zwei Minuten beginnen', 'Mit einer sehr kleinen Handlung starten'], ['Eine große Aufgabe zerlegen', 'Sie in machbare Schritte verwandeln'], ['Vor der Frist fertig werden', 'Eine Aufgabe früher als üblich abschließen']]
    ),
    anger_management: entry(
      'Mit Ärger umgehen lernen',
      'Sichere Wege entwickeln, Ärger wahrzunehmen, zu regulieren und auszudrücken',
      'Konstruktiver Umgang mit Ärger kann Beziehungen unterstützen und Reue verringern',
      ['Dreimal pro Woche eine Regulationsfertigkeit üben', 'Intensität bewerten und hilfreiche Fertigkeit notieren', 'Kurze KVT- und Auszeit-Fertigkeiten nutzen', 'Unterstützt sichere Kommunikation und Emotionsregulation', 'Fortschritt nach zehn Wochen prüfen'],
      [['Frühe Anzeichen erkennen', 'Anspannung, Hitze oder schnelle Atmung bemerken'], ['Eine Auszeit nutzen', 'Sich vor einer Reaktion sicher entfernen'], ['Ein Bedürfnis ruhig äußern', 'Frust ohne Schreien oder Drohen ausdrücken'], ['Einen Konflikt sicher klären', 'Nach sinkender Intensität ruhig sprechen']]
    )
  },
  it: {
    daily_exercise: entry(
      'Creare un’abitudine quotidiana di movimento',
      'Stabilire una routine costante per sostenere salute fisica ed energia',
      'L’attività regolare può sostenere l’umore, ridurre lo stress e migliorare il benessere',
      ['Fare 30 minuti di attività quattro volte a settimana', 'Registrare le sessioni completate', 'Iniziare con gradualità e aumentare lentamente', 'Sostiene salute, lucidità e gestione dello stress', 'Praticare con costanza per otto settimane'],
      [['Completare la prima sessione', 'Iniziare con 20 minuti di cammino o attività leggera'], ['Fare due sessioni nella prima settimana', 'Creare slancio con due sessioni'], ['Completare quattro sessioni in una settimana', 'Raggiungere la frequenza scelta'], ['Provare una nuova attività', 'Esplorare yoga, nuoto, ciclismo o altro movimento adatto']]
    ),
    sleep_quality: entry(
      'Migliorare la qualità del sonno',
      'Sviluppare abitudini sane per sentirsi più riposati ed energici',
      'Un sonno migliore può sostenere umore, concentrazione e benessere mentale',
      ['Scegliere orari regolari per dormire e svegliarsi', 'Registrare durata e qualità percepita', 'Creare una routine serale rilassante', 'Sostiene energia, concentrazione e regolazione emotiva', 'Stabilire la routine entro sei settimane'],
      [['Fissare l’orario per dormire', 'Scegliere un orario realistico e mantenerlo'], ['Creare una routine serale', 'Preparare 30 minuti per rilassarsi'], ['Ridurre gli schermi prima di dormire', 'Smettere un’ora prima'], ['Mantenere una durata stabile', 'Raggiungere l’obiettivo per una settimana']]
    ),
    social_anxiety: entry(
      'Ridurre l’ansia sociale',
      'Costruire sicurezza nelle situazioni sociali con pratica graduale e abilità CBT',
      'Sentirsi più a proprio agio può sostenere relazioni e soddisfazione personale',
      ['Praticare un passo sociale graduale due volte a settimana', 'Valutare il disagio prima e dopo', 'Iniziare da situazioni meno impegnative', 'Sostiene la connessione sociale e riduce l’evitamento', 'Seguire il piano graduale per 12 settimane'],
      [['Fare una breve conversazione', 'Iniziare con uno scambio breve e semplice'], ['Partecipare a un evento sociale', 'Restare almeno 30 minuti'], ['Iniziare una conversazione', 'Parlare con una persona nuova'], ['Esprimere un’opinione in gruppo', 'Intervenire una volta in una riunione']]
    ),
    daily_gratitude: entry(
      'Praticare la gratitudine ogni giorno',
      'Coltivare apprezzamento con una breve riflessione quotidiana',
      'La gratitudine può aiutare a notare momenti di sostegno e significato',
      ['Scrivere ogni mattina tre cose apprezzate', 'Registrare una voce al giorno', 'Dedicare solo cinque minuti', 'Sostiene l’attenzione verso esperienze positive e significative', 'Praticare per quattro settimane'],
      [['Completare la prima settimana', 'Scrivere per sette giorni'], ['Notare momenti diversi', 'Aggiungere dettagli vari senza ripetere automaticamente'], ['Esprimere apprezzamento', 'Ringraziare un amico o un familiare'], ['Riflettere sulla pratica', 'Notare possibili cambiamenti di prospettiva']]
    ),
    study_habits: entry(
      'Sviluppare abitudini di studio migliori',
      'Creare una routine pratica che sostenga l’apprendimento e riduca la pressione',
      'Una routine stabile può ridurre lo stress dell’ultimo momento e sostenere i progressi',
      ['Studiare in blocchi pianificati e concentrati', 'Registrare sessioni e verifiche di apprendimento', 'Usare blocchi gestibili di 25 minuti', 'Sostiene l’apprendimento e riduce la pressione degli esami', 'Praticare durante il periodo di studio attuale'],
      [['Preparare uno spazio di studio', 'Scegliere un luogo fisso con meno distrazioni'], ['Completare la prima settimana', 'Seguire la routine per sette giorni'], ['Provare il richiamo attivo', 'Mettersi alla prova invece di rileggere soltanto'], ['Rivedere i progressi', 'Confrontare i risultati e adattare la routine']]
    ),
    friendships: entry(
      'Rafforzare le amicizie',
      'Dedicare regolarmente tempo e attenzione alle amicizie di sostegno',
      'Le amicizie positive possono rafforzare connessione, piacere e benessere',
      ['Contattare due amici ogni settimana', 'Annotare interazioni e senso di connessione', 'Pianificare incontri o attività realistici', 'Sostiene la connessione e riduce la solitudine', 'Rafforzare la routine per 12 settimane'],
      [['Riprendere i contatti', 'Scrivere a una persona sentita poco di recente'], ['Pianificare un’attività insieme', 'Organizzare un pasto, gioco, passeggiata o uscita'], ['Avere una conversazione significativa', 'Condividere o chiedere qualcosa di importante'], ['Offrire sostegno', 'Essere presenti quando un amico ha bisogno']]
    ),
    procrastination: entry(
      'Superare la procrastinazione',
      'Trasformare i compiti rimandati in azioni chiare e gestibili',
      'Ridurre l’evitamento può diminuire la pressione e sostenere il senso di progresso',
      ['Iniziare il compito prioritario nel tempo pianificato', 'Registrare i compiti iniziati e completati', 'Usare piccoli passi e tempi realistici', 'Sostiene il progresso e riduce la pressione dell’ultimo minuto', 'Praticare la routine per otto settimane'],
      [['Riconoscere i fattori scatenanti', 'Notare quando e perché è difficile iniziare'], ['Iniziare per due minuti', 'Partire da un’azione molto piccola'], ['Suddividere un compito grande', 'Trasformarlo in passi gestibili'], ['Finire prima della scadenza', 'Completare un compito prima del solito']]
    ),
    anger_management: entry(
      'Imparare a gestire la rabbia',
      'Sviluppare modi sicuri per riconoscere, regolare ed esprimere la rabbia',
      'Gestire la rabbia in modo costruttivo può sostenere le relazioni e ridurre i rimpianti',
      ['Praticare un’abilità di regolazione tre volte a settimana', 'Valutare l’intensità e annotare cosa aiuta', 'Usare brevi abilità CBT e pause', 'Sostiene comunicazione sicura e regolazione emotiva', 'Rivedere i progressi dopo dieci settimane'],
      [['Riconoscere i primi segnali', 'Notare tensione, calore o respiro rapido'], ['Prendersi una pausa', 'Allontanarsi in sicurezza prima di reagire'], ['Comunicare un bisogno con calma', 'Esprimere frustrazione senza urla o minacce'], ['Risolvere un disaccordo in sicurezza', 'Parlare con calma quando l’intensità diminuisce']]
    )
  },
  pt: {
    daily_exercise: entry(
      'Criar um hábito diário de exercício',
      'Estabelecer uma rotina consistente para apoiar a saúde física e a energia',
      'A atividade regular pode apoiar o humor, reduzir o stress e melhorar o bem-estar',
      ['Fazer 30 minutos de atividade quatro vezes por semana', 'Registar as sessões concluídas', 'Começar suavemente e aumentar de forma gradual', 'Apoia a saúde, a clareza e a gestão do stress', 'Praticar com consistência durante oito semanas'],
      [['Concluir a primeira sessão', 'Começar com 20 minutos de caminhada ou atividade suave'], ['Fazer duas sessões na primeira semana', 'Ganhar ritmo com duas sessões'], ['Concluir quatro sessões numa semana', 'Atingir a frequência escolhida'], ['Experimentar uma nova atividade', 'Explorar ioga, natação, ciclismo ou outra atividade adequada']]
    ),
    sleep_quality: entry(
      'Melhorar a qualidade do sono',
      'Desenvolver hábitos de sono saudáveis para sentir mais descanso e energia',
      'Dormir melhor pode apoiar o humor, a concentração e o bem-estar mental',
      ['Escolher horários regulares para dormir e acordar', 'Registar duração e qualidade sentida', 'Criar uma rotina relaxante antes de dormir', 'Apoia energia, concentração e regulação emocional', 'Estabelecer a rotina em seis semanas'],
      [['Definir uma hora para dormir', 'Escolher uma hora realista e mantê-la'], ['Criar uma rotina noturna', 'Reservar 30 minutos para relaxar'], ['Reduzir ecrãs antes de dormir', 'Parar os dispositivos uma hora antes'], ['Manter uma duração estável', 'Cumprir o objetivo de sono durante uma semana']]
    ),
    social_anxiety: entry(
      'Reduzir a ansiedade social',
      'Desenvolver confiança em situações sociais com prática gradual e competências de TCC',
      'Sentir maior conforto social pode apoiar as relações e a satisfação com a vida',
      ['Praticar um passo social gradual duas vezes por semana', 'Avaliar o desconforto antes e depois', 'Começar por situações de menor pressão', 'Apoia a ligação social e reduz o evitamento', 'Seguir o plano gradual durante 12 semanas'],
      [['Ter uma conversa breve', 'Começar com uma interação curta e simples'], ['Participar num evento social', 'Ficar pelo menos 30 minutos'], ['Iniciar uma conversa', 'Falar com uma pessoa nova'], ['Partilhar uma opinião em grupo', 'Intervir uma vez numa reunião ou grupo']]
    ),
    daily_gratitude: entry(
      'Praticar gratidão diariamente',
      'Cultivar apreço através de uma breve reflexão diária',
      'A gratidão pode ajudar a notar momentos de apoio e significado',
      ['Escrever todas as manhãs três coisas apreciadas', 'Registar uma entrada por dia', 'Dedicar apenas cinco minutos', 'Apoia a atenção a experiências positivas e significativas', 'Praticar durante quatro semanas'],
      [['Concluir a primeira semana', 'Escrever durante sete dias'], ['Notar momentos variados', 'Adicionar detalhes diferentes sem repetir automaticamente'], ['Expressar apreço', 'Agradecer a um amigo ou familiar'], ['Refletir sobre a prática', 'Notar possíveis mudanças de perspetiva']]
    ),
    study_habits: entry(
      'Desenvolver melhores hábitos de estudo',
      'Criar uma rotina prática que apoie a aprendizagem e reduza a pressão',
      'Uma rotina estável pode reduzir o stress de última hora e apoiar o progresso',
      ['Estudar em blocos planeados e focados', 'Registar sessões e verificações de aprendizagem', 'Usar blocos geríveis de 25 minutos', 'Apoia a aprendizagem e reduz a pressão dos exames', 'Praticar durante o período de estudo atual'],
      [['Preparar um espaço de estudo', 'Escolher uma área fixa com menos distrações'], ['Concluir a primeira semana', 'Seguir a rotina durante sete dias'], ['Experimentar recordação ativa', 'Testar-se em vez de apenas reler'], ['Rever o progresso', 'Comparar resultados e ajustar a rotina']]
    ),
    friendships: entry(
      'Fortalecer as amizades',
      'Dedicar regularmente tempo e atenção a amizades de apoio',
      'Amizades positivas podem fortalecer a ligação, a alegria e o bem-estar',
      ['Contactar dois amigos por semana', 'Anotar interações e sensação de ligação', 'Planear encontros ou atividades realistas', 'Apoia a ligação e reduz a solidão', 'Fortalecer a rotina durante 12 semanas'],
      [['Retomar o contacto', 'Escrever a alguém com quem não fala há algum tempo'], ['Planear uma atividade partilhada', 'Organizar uma refeição, jogo, caminhada ou saída'], ['Ter uma conversa significativa', 'Partilhar ou perguntar algo importante'], ['Oferecer apoio', 'Estar presente quando um amigo precisa']]
    ),
    procrastination: entry(
      'Superar a procrastinação',
      'Transformar tarefas adiadas em ações claras e geríveis',
      'Reduzir o evitamento pode diminuir a pressão e apoiar a sensação de progresso',
      ['Iniciar a tarefa prioritária no período planeado', 'Registar tarefas iniciadas e concluídas', 'Usar passos pequenos e períodos realistas', 'Apoia o progresso e reduz a pressão de última hora', 'Praticar a rotina durante oito semanas'],
      [['Identificar os gatilhos', 'Notar quando e por que razão é difícil começar'], ['Começar durante dois minutos', 'Iniciar com uma ação muito pequena'], ['Dividir uma tarefa grande', 'Transformá-la em passos geríveis'], ['Terminar antes do prazo', 'Concluir uma tarefa mais cedo do que o habitual']]
    ),
    anger_management: entry(
      'Aprender a gerir a raiva',
      'Desenvolver formas seguras de reconhecer, regular e expressar a raiva',
      'Gerir a raiva de forma construtiva pode apoiar relações e reduzir arrependimentos',
      ['Praticar uma competência de regulação três vezes por semana', 'Avaliar a intensidade e anotar o que ajudou', 'Usar competências breves de TCC e pausas', 'Apoia comunicação segura e regulação emocional', 'Rever o progresso após dez semanas'],
      [['Reconhecer os primeiros sinais', 'Notar tensão, calor ou respiração rápida'], ['Fazer uma pausa', 'Afastar-se em segurança antes de reagir'], ['Comunicar uma necessidade com calma', 'Expressar frustração sem gritos ou ameaças'], ['Resolver um desacordo em segurança', 'Conversar com calma quando a intensidade baixar']]
    )
  }
});

export const GOAL_TEMPLATE_UI_COPY = Object.freeze({
  en: { title: 'Goal Template Library', subtitle: 'Choose a template to get started and customise it for yourself', close: 'Close', all: 'All templates', lifestyle: 'Health & habits', cognitive: 'Study & work', emotional: 'Emotional growth', social: 'Relationships', behavioral: 'Behaviour change', popular: 'Popular templates', loading: 'Loading templates…', empty: 'No templates found in this category', weeks: '{{count}} weeks', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', popularChoice: 'Popular choice', select: 'Use {{title}} template' },
  he: { title: 'ספריית תבניות למטרות', subtitle: 'בחרו תבנית להתחלה והתאימו אותה לעצמכם', close: 'סגירה', all: 'כל התבניות', lifestyle: 'בריאות והרגלים', cognitive: 'לימודים ועבודה', emotional: 'צמיחה רגשית', social: 'מערכות יחסים', behavioral: 'שינוי התנהגותי', popular: 'תבניות פופולריות', loading: 'התבניות נטענות…', empty: 'לא נמצאו תבניות בקטגוריה הזאת', weeks: '{{count}} שבועות', beginner: 'למתחילים', intermediate: 'רמת ביניים', advanced: 'מתקדמים', popularChoice: 'בחירה פופולרית', select: 'שימוש בתבנית {{title}}' },
  es: { title: 'Biblioteca de plantillas de objetivos', subtitle: 'Elige una plantilla para empezar y adaptarla a ti', close: 'Cerrar', all: 'Todas las plantillas', lifestyle: 'Salud y hábitos', cognitive: 'Estudio y trabajo', emotional: 'Crecimiento emocional', social: 'Relaciones', behavioral: 'Cambio de conducta', popular: 'Plantillas populares', loading: 'Cargando plantillas…', empty: 'No hay plantillas en esta categoría', weeks: '{{count}} semanas', beginner: 'Inicial', intermediate: 'Intermedio', advanced: 'Avanzado', popularChoice: 'Opción popular', select: 'Usar la plantilla {{title}}' },
  fr: { title: 'Bibliothèque de modèles d’objectifs', subtitle: 'Choisissez un modèle pour commencer et adaptez-le à vos besoins', close: 'Fermer', all: 'Tous les modèles', lifestyle: 'Santé et habitudes', cognitive: 'Études et travail', emotional: 'Évolution émotionnelle', social: 'Relations', behavioral: 'Changement de comportement', popular: 'Modèles populaires', loading: 'Chargement des modèles…', empty: 'Aucun modèle dans cette catégorie', weeks: '{{count}} semaines', beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', popularChoice: 'Choix populaire', select: 'Utiliser le modèle {{title}}' },
  de: { title: 'Bibliothek für Zielvorlagen', subtitle: 'Wählen Sie eine Vorlage und passen Sie sie an Ihre Bedürfnisse an', close: 'Schließen', all: 'Alle Vorlagen', lifestyle: 'Gesundheit und Gewohnheiten', cognitive: 'Lernen und Arbeit', emotional: 'Emotionale Entwicklung', social: 'Beziehungen', behavioral: 'Verhaltensänderung', popular: 'Beliebte Vorlagen', loading: 'Vorlagen werden geladen…', empty: 'Keine Vorlagen in dieser Kategorie gefunden', weeks: '{{count}} Wochen', beginner: 'Anfänger', intermediate: 'Mittel', advanced: 'Fortgeschritten', popularChoice: 'Beliebte Wahl', select: 'Vorlage {{title}} verwenden' },
  it: { title: 'Raccolta di modelli per obiettivi', subtitle: 'Scegli un modello per iniziare e adattalo alle tue esigenze', close: 'Chiudi', all: 'Tutti i modelli', lifestyle: 'Salute e abitudini', cognitive: 'Studio e lavoro', emotional: 'Crescita emotiva', social: 'Relazioni', behavioral: 'Cambiamento comportamentale', popular: 'Modelli popolari', loading: 'Caricamento dei modelli…', empty: 'Nessun modello in questa categoria', weeks: '{{count}} settimane', beginner: 'Iniziale', intermediate: 'Intermedio', advanced: 'Avanzato', popularChoice: 'Scelta popolare', select: 'Usa il modello {{title}}' },
  pt: { title: 'Biblioteca de modelos de objetivos', subtitle: 'Escolha um modelo para começar e adapte-o às suas necessidades', close: 'Fechar', all: 'Todos os modelos', lifestyle: 'Saúde e hábitos', cognitive: 'Estudo e trabalho', emotional: 'Crescimento emocional', social: 'Relações', behavioral: 'Mudança de comportamento', popular: 'Modelos populares', loading: 'A carregar modelos…', empty: 'Não foram encontrados modelos nesta categoria', weeks: '{{count}} semanas', beginner: 'Iniciante', intermediate: 'Intermédio', advanced: 'Avançado', popularChoice: 'Escolha popular', select: 'Usar o modelo {{title}}' }
});

export function resolveGoalTemplateId(template) {
  return template?.translation_key || TITLE_TO_ID[template?.title] || null;
}

export function getGoalTemplateUiCopy(locale) {
  const normalized = normalizeAppLocale(locale, DEFAULT_APP_LOCALE);
  return GOAL_TEMPLATE_UI_COPY[normalized] || GOAL_TEMPLATE_UI_COPY.en;
}

export function formatGoalTemplateUi(copy, key, values = {}) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
    copy[key] || ''
  );
}

export function localizeGoalTemplate(template, locale) {
  const normalized = normalizeAppLocale(locale, DEFAULT_APP_LOCALE);
  const templateId = resolveGoalTemplateId(template);
  const localized = templateId ? GOAL_TEMPLATE_CATALOG[normalized]?.[templateId] : null;
  if (!localized) return { ...template, localization_missing: normalized !== 'en', translation_key: templateId };

  return {
    ...template,
    ...localized,
    smart_criteria: { ...template?.smart_criteria, ...localized.smart_criteria },
    milestones: localized.milestones,
    tips: normalized === 'en' ? template?.tips : [],
    translation_key: templateId,
    localization_missing: false
  };
}

export function hasCompleteGoalTemplateTranslations() {
  const uiKeys = Object.keys(GOAL_TEMPLATE_UI_COPY.en).sort().join('|');
  return Object.keys(GOAL_TEMPLATE_CATALOG).every((locale) =>
    GOAL_TEMPLATE_IDS.every((id) => {
      const value = GOAL_TEMPLATE_CATALOG[locale]?.[id];
      return Boolean(
        value?.title && value?.description && value?.motivation
        && Object.values(value.smart_criteria || {}).every(Boolean)
        && value?.milestones?.length === 4
        && value.milestones.every((milestone) => milestone.title && milestone.description)
      );
    })
    && Object.keys(GOAL_TEMPLATE_UI_COPY[locale] || {}).sort().join('|') === uiKeys
  );
}
