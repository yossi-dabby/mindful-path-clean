const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

const rows = [
  ['loading', 'Loading your mood history…', 'טוען את היסטוריית מצב הרוח…', 'Cargando tu historial de ánimo…', 'Chargement de votre historique d’humeur…', 'Stimmungsverlauf wird geladen…', 'Caricamento dello storico dell’umore…', 'A carregar o histórico de humor…'],
  ['load_error', 'We could not load your mood history.', 'לא הצלחנו לטעון את היסטוריית מצב הרוח.', 'No pudimos cargar tu historial de ánimo.', 'Impossible de charger votre historique d’humeur.', 'Ihr Stimmungsverlauf konnte nicht geladen werden.', 'Non è stato possibile caricare lo storico dell’umore.', 'Não foi possível carregar o histórico de humor.'],
  ['retry', 'Try again', 'נסו שוב', 'Intentar de nuevo', 'Réessayer', 'Erneut versuchen', 'Riprova', 'Tentar novamente'],
  ['tabs_aria', 'Mood tracker sections', 'חלקי מעקב מצב הרוח', 'Secciones del seguimiento del ánimo', 'Sections du suivi de l’humeur', 'Bereiche der Stimmungsverfolgung', 'Sezioni del monitoraggio dell’umore', 'Secções do registo de humor'],

  ['calendar.title', 'Mood calendar', 'לוח מצב הרוח', 'Calendario del ánimo', 'Calendrier de l’humeur', 'Stimmungskalender', 'Calendario dell’umore', 'Calendário do humor'],
  ['calendar.previous_month', 'Previous month', 'החודש הקודם', 'Mes anterior', 'Mois précédent', 'Vorheriger Monat', 'Mese precedente', 'Mês anterior'],
  ['calendar.next_month', 'Next month', 'החודש הבא', 'Mes siguiente', 'Mois suivant', 'Nächster Monat', 'Mese successivo', 'Mês seguinte'],
  ['calendar.open_day', 'Edit mood entry for {{date}}', 'עריכת רישום מצב רוח לתאריך {{date}}', 'Editar el registro de ánimo del {{date}}', 'Modifier le suivi d’humeur du {{date}}', 'Stimmungseintrag für {{date}} bearbeiten', 'Modifica la registrazione dell’umore del {{date}}', 'Editar o registo de humor de {{date}}'],
  ['calendar.no_entry_day', 'No mood entry for {{date}}', 'אין רישום מצב רוח לתאריך {{date}}', 'Sin registro de ánimo para el {{date}}', 'Aucun suivi d’humeur pour le {{date}}', 'Kein Stimmungseintrag für {{date}}', 'Nessuna registrazione dell’umore per il {{date}}', 'Sem registo de humor para {{date}}'],
  ['calendar.today', 'Today', 'היום', 'Hoy', 'Aujourd’hui', 'Heute', 'Oggi', 'Hoje'],
  ['calendar.total_entries', 'Total entries', 'סך הכול רישומים', 'Registros totales', 'Suivis au total', 'Einträge insgesamt', 'Registrazioni totali', 'Total de registos'],
  ['calendar.good_days', 'Good days', 'ימים טובים', 'Días buenos', 'Bons jours', 'Gute Tage', 'Giornate positive', 'Dias bons'],
  ['calendar.okay_days', 'Okay days', 'ימים סבירים', 'Días regulares', 'Jours moyens', 'Durchschnittliche Tage', 'Giornate discrete', 'Dias razoáveis'],
  ['calendar.difficult_days', 'Difficult days', 'ימים מאתגרים', 'Días difíciles', 'Jours difficiles', 'Schwierige Tage', 'Giornate difficili', 'Dias difíceis'],

  ['form.value_out_of_ten', '{{label}}: {{value}} out of 10', '{{label}}: {{value}} מתוך 10', '{{label}}: {{value}} de 10', '{{label}} : {{value}} sur 10', '{{label}}: {{value}} von 10', '{{label}}: {{value}} su 10', '{{label}}: {{value}} em 10'],
  ['form.selected_aria', '{{label}}, selected', '{{label}}, נבחר', '{{label}}, seleccionado', '{{label}}, sélectionné', '{{label}}, ausgewählt', '{{label}}, selezionato', '{{label}}, selecionado'],
  ['form.dialog_description', 'Record how you feel, what influenced you and what helped today.', 'תעדו כיצד אתם מרגישים, מה השפיע עליכם ומה עזר היום.', 'Registra cómo te sientes, qué influyó y qué te ayudó hoy.', 'Notez comment vous vous sentez, ce qui vous a influencé et ce qui vous a aidé aujourd’hui.', 'Halten Sie fest, wie Sie sich fühlen, was Sie beeinflusst und was heute geholfen hat.', 'Registra come ti senti, cosa ti ha influenzato e cosa ti ha aiutato oggi.', 'Registe como se sente, o que o influenciou e o que ajudou hoje.'],

  ['insights.not_enough_title', 'A few more check-ins will unlock insights', 'עוד כמה רישומים יפתחו את התובנות', 'Unos registros más desbloquearán las perspectivas', 'Quelques suivis supplémentaires débloqueront les analyses', 'Einige weitere Einträge schalten Einblicke frei', 'Ancora qualche registrazione sbloccherà gli approfondimenti', 'Mais alguns registos irão desbloquear as perspetivas'],
  ['insights.not_enough_description', 'Track your mood on at least 5 days to receive AI insights about your emotional patterns.', 'תעדו את מצב הרוח לפחות בחמישה ימים כדי לקבל תובנות AI על הדפוסים הרגשיים שלכם.', 'Registra tu ánimo durante al menos 5 días para recibir perspectivas de IA sobre tus patrones emocionales.', 'Suivez votre humeur pendant au moins 5 jours pour recevoir des analyses IA sur vos schémas émotionnels.', 'Erfassen Sie Ihre Stimmung an mindestens 5 Tagen, um KI-Einblicke in emotionale Muster zu erhalten.', 'Registra l’umore per almeno 5 giorni per ricevere approfondimenti IA sui tuoi schemi emotivi.', 'Registe o humor durante pelo menos 5 dias para receber perspetivas de IA sobre os seus padrões emocionais.'],
  ['insights.title', 'AI mood insights', 'תובנות AI על מצב הרוח', 'Perspectivas de ánimo con IA', 'Analyses IA de l’humeur', 'KI-Stimmungseinblicke', 'Approfondimenti IA sull’umore', 'Perspetivas de humor com IA'],
  ['insights.description', 'Review patterns across {{count}} mood entries and receive practical, personalised suggestions.', 'נתחו דפוסים מתוך {{count}} רישומי מצב רוח וקבלו הצעות מעשיות ומותאמות אישית.', 'Analiza patrones de {{count}} registros de ánimo y recibe sugerencias prácticas y personalizadas.', 'Analysez {{count}} suivis d’humeur et recevez des suggestions pratiques et personnalisées.', 'Analysieren Sie Muster aus {{count}} Stimmungseinträgen und erhalten Sie praktische, persönliche Vorschläge.', 'Analizza {{count}} registrazioni dell’umore e ricevi suggerimenti pratici e personalizzati.', 'Analise padrões de {{count}} registos de humor e receba sugestões práticas e personalizadas.'],
  ['insights.generate', 'Generate insights', 'יצירת תובנות', 'Generar perspectivas', 'Générer les analyses', 'Einblicke erstellen', 'Genera approfondimenti', 'Gerar perspetivas'],
  ['insights.analyzing', 'Analyzing your patterns…', 'מנתח את הדפוסים שלכם…', 'Analizando tus patrones…', 'Analyse de vos schémas…', 'Ihre Muster werden analysiert…', 'Analisi dei tuoi schemi…', 'A analisar os seus padrões…'],
  ['insights.regenerate', 'Refresh insights', 'רענון התובנות', 'Actualizar perspectivas', 'Actualiser les analyses', 'Einblicke aktualisieren', 'Aggiorna approfondimenti', 'Atualizar perspetivas'],
  ['insights.error', 'Insights could not be generated. Please try again.', 'לא ניתן היה ליצור תובנות. נסו שוב.', 'No se pudieron generar las perspectivas. Inténtalo de nuevo.', 'Impossible de générer les analyses. Réessayez.', 'Die Einblicke konnten nicht erstellt werden. Bitte versuchen Sie es erneut.', 'Non è stato possibile generare gli approfondimenti. Riprova.', 'Não foi possível gerar as perspetivas. Tente novamente.'],
  ['insights.summary', 'Overall picture', 'התמונה הכללית', 'Panorama general', 'Vue d’ensemble', 'Gesamtbild', 'Quadro generale', 'Visão geral'],
  ['insights.trends', 'Patterns worth noticing', 'דפוסים שכדאי לשים לב אליהם', 'Patrones a tener en cuenta', 'Tendances à remarquer', 'Bemerkenswerte Muster', 'Schemi da notare', 'Padrões a observar'],
  ['insights.key_triggers', 'Key mood triggers', 'גורמים מרכזיים המשפיעים על מצב הרוח', 'Factores clave del ánimo', 'Principaux déclencheurs de l’humeur', 'Wichtige Stimmungsauslöser', 'Fattori chiave dell’umore', 'Principais fatores do humor'],
  ['insights.boosters', 'Your mood boosters', 'מה משפר את מצב הרוח שלכם', 'Lo que mejora tu ánimo', 'Ce qui améliore votre humeur', 'Ihre Stimmungsaufheller', 'Ciò che migliora il tuo umore', 'O que melhora o seu humor'],
  ['insights.recommendations', 'Personalised next steps', 'צעדים אישיים להמשך', 'Próximos pasos personalizados', 'Prochaines étapes personnalisées', 'Persönliche nächste Schritte', 'Prossimi passi personalizzati', 'Próximos passos personalizados'],
  ['insights.progress', 'Positive progress', 'התקדמות חיובית', 'Progreso positivo', 'Progrès positifs', 'Positive Fortschritte', 'Progressi positivi', 'Progresso positivo'],
  ['insights.concerns', 'Patterns that deserve attention', 'דפוסים שראויים לתשומת לב', 'Patrones que merecen atención', 'Schémas qui méritent attention', 'Muster, die Aufmerksamkeit verdienen', 'Schemi che meritano attenzione', 'Padrões que merecem atenção'],
  ['insights.professional_note', 'If these patterns persist or worsen, consider contacting a qualified mental health professional.', 'אם הדפוסים האלה נמשכים או מחמירים, מומלץ לשקול פנייה לאיש או אשת מקצוע מוסמכים בתחום בריאות הנפש.', 'Si estos patrones persisten o empeoran, considera contactar con un profesional de salud mental cualificado.', 'Si ces schémas persistent ou s’aggravent, envisagez de contacter un professionnel qualifié de la santé mentale.', 'Wenn diese Muster anhalten oder sich verschlimmern, wenden Sie sich bitte an eine qualifizierte psychologische Fachkraft.', 'Se questi schemi persistono o peggiorano, valuta di contattare un professionista qualificato della salute mentale.', 'Se estes padrões persistirem ou piorarem, considere contactar um profissional de saúde mental qualificado.'],
  ['insights.suggestion_label', 'A helpful next step', 'צעד שעשוי לעזור', 'Un próximo paso útil', 'Une prochaine étape utile', 'Ein hilfreicher nächster Schritt', 'Un prossimo passo utile', 'Um próximo passo útil'],
  ['insights.type.positive', 'Positive', 'חיובי', 'Positivo', 'Positif', 'Positiv', 'Positivo', 'Positivo'],
  ['insights.type.negative', 'Challenging', 'מאתגר', 'Desafiante', 'Difficile', 'Herausfordernd', 'Impegnativo', 'Desafiante'],
  ['insights.type.neutral', 'Neutral', 'ניטרלי', 'Neutral', 'Neutre', 'Neutral', 'Neutro', 'Neutro'],
  ['insights.language_name', 'English', 'Hebrew', 'Spanish', 'French', 'German', 'Italian', 'Portuguese'],

  ['taxonomy.emotions.happy', 'Happy', 'שמח/ה', 'Feliz', 'Heureux·se', 'Glücklich', 'Felice', 'Feliz'],
  ['taxonomy.emotions.sad', 'Sad', 'עצוב/ה', 'Triste', 'Triste', 'Traurig', 'Triste', 'Triste'],
  ['taxonomy.emotions.anxious', 'Anxious', 'חרד/ה', 'Ansioso/a', 'Anxieux·se', 'Ängstlich', 'Ansioso/a', 'Ansioso/a'],
  ['taxonomy.emotions.calm', 'Calm', 'רגוע/ה', 'En calma', 'Calme', 'Ruhig', 'Calmo/a', 'Calmo/a'],
  ['taxonomy.emotions.angry', 'Angry', 'כועס/ת', 'Enfadado/a', 'En colère', 'Wütend', 'Arrabbiato/a', 'Zangado/a'],
  ['taxonomy.emotions.frustrated', 'Frustrated', 'מתוסכל/ת', 'Frustrado/a', 'Frustré·e', 'Frustriert', 'Frustrato/a', 'Frustrado/a'],
  ['taxonomy.emotions.excited', 'Excited', 'נרגש/ת', 'Entusiasmado/a', 'Enthousiaste', 'Aufgeregt', 'Entusiasta', 'Entusiasmado/a'],
  ['taxonomy.emotions.grateful', 'Grateful', 'אסיר/ת תודה', 'Agradecido/a', 'Reconnaissant·e', 'Dankbar', 'Grato/a', 'Grato/a'],
  ['taxonomy.emotions.lonely', 'Lonely', 'בודד/ה', 'Solo/a', 'Seul·e', 'Einsam', 'Solo/a', 'Só'],
  ['taxonomy.emotions.hopeful', 'Hopeful', 'מלא/ת תקווה', 'Esperanzado/a', 'Plein·e d’espoir', 'Hoffnungsvoll', 'Fiducioso/a', 'Esperançoso/a'],
  ['taxonomy.emotions.overwhelmed', 'Overwhelmed', 'מוצף/ת', 'Abrumado/a', 'Débordé·e', 'Überfordert', 'Sopraffatto/a', 'Sobrecarregado/a'],
  ['taxonomy.emotions.peaceful', 'Peaceful', 'שלו/ה', 'En paz', 'Paisible', 'Friedlich', 'Sereno/a', 'Sereno/a'],
  ['taxonomy.emotions.stressed', 'Stressed', 'לחוץ/ה', 'Estresado/a', 'Stressé·e', 'Gestresst', 'Stressato/a', 'Stressado/a'],
  ['taxonomy.emotions.content', 'Content', 'מסופק/ת', 'Satisfecho/a', 'Satisfait·e', 'Zufrieden', 'Soddisfatto/a', 'Satisfeito/a'],
  ['taxonomy.emotions.worried', 'Worried', 'מודאג/ת', 'Preocupado/a', 'Inquiet·ète', 'Besorgt', 'Preoccupato/a', 'Preocupado/a'],

  ['taxonomy.triggers.work', 'Work', 'עבודה', 'Trabajo', 'Travail', 'Arbeit', 'Lavoro', 'Trabalho'],
  ['taxonomy.triggers.relationships', 'Relationships', 'מערכות יחסים', 'Relaciones', 'Relations', 'Beziehungen', 'Relazioni', 'Relações'],
  ['taxonomy.triggers.health', 'Health', 'בריאות', 'Salud', 'Santé', 'Gesundheit', 'Salute', 'Saúde'],
  ['taxonomy.triggers.finances', 'Finances', 'כספים', 'Finanzas', 'Finances', 'Finanzen', 'Finanze', 'Finanças'],
  ['taxonomy.triggers.sleep', 'Sleep', 'שינה', 'Sueño', 'Sommeil', 'Schlaf', 'Sonno', 'Sono'],
  ['taxonomy.triggers.family', 'Family', 'משפחה', 'Familia', 'Famille', 'Familie', 'Famiglia', 'Família'],
  ['taxonomy.triggers.social_media', 'Social media', 'רשתות חברתיות', 'Redes sociales', 'Réseaux sociaux', 'Soziale Medien', 'Social media', 'Redes sociais'],
  ['taxonomy.triggers.news', 'News', 'חדשות', 'Noticias', 'Actualités', 'Nachrichten', 'Notizie', 'Notícias'],
  ['taxonomy.triggers.weather', 'Weather', 'מזג אוויר', 'Clima', 'Météo', 'Wetter', 'Meteo', 'Tempo'],
  ['taxonomy.triggers.exercise', 'Exercise', 'פעילות גופנית', 'Ejercicio', 'Exercice', 'Bewegung', 'Esercizio fisico', 'Exercício'],
  ['taxonomy.triggers.diet', 'Food and nutrition', 'תזונה', 'Alimentación', 'Alimentation', 'Ernährung', 'Alimentazione', 'Alimentação'],
  ['taxonomy.triggers.isolation', 'Isolation', 'בידוד', 'Aislamiento', 'Isolement', 'Isolation', 'Isolamento', 'Isolamento'],

  ['taxonomy.activities.exercise', 'Exercise', 'פעילות גופנית', 'Ejercicio', 'Exercice', 'Bewegung', 'Esercizio fisico', 'Exercício'],
  ['taxonomy.activities.meditation', 'Meditation', 'מדיטציה', 'Meditación', 'Méditation', 'Meditation', 'Meditazione', 'Meditação'],
  ['taxonomy.activities.socializing', 'Time with others', 'בילוי עם אחרים', 'Tiempo con otras personas', 'Temps avec les autres', 'Zeit mit anderen', 'Tempo con altre persone', 'Tempo com outras pessoas'],
  ['taxonomy.activities.work', 'Work', 'עבודה', 'Trabajo', 'Travail', 'Arbeit', 'Lavoro', 'Trabalho'],
  ['taxonomy.activities.hobbies', 'Hobbies', 'תחביבים', 'Aficiones', 'Loisirs', 'Hobbys', 'Hobby', 'Passatempos'],
  ['taxonomy.activities.reading', 'Reading', 'קריאה', 'Lectura', 'Lecture', 'Lesen', 'Lettura', 'Leitura'],
  ['taxonomy.activities.watching_tv', 'Watching TV', 'צפייה בטלוויזיה', 'Ver televisión', 'Regarder la télévision', 'Fernsehen', 'Guardare la TV', 'Ver televisão'],
  ['taxonomy.activities.gaming', 'Gaming', 'משחקים', 'Videojuegos', 'Jeux vidéo', 'Gaming', 'Videogiochi', 'Videojogos'],
  ['taxonomy.activities.cooking', 'Cooking', 'בישול', 'Cocinar', 'Cuisine', 'Kochen', 'Cucinare', 'Cozinhar'],
  ['taxonomy.activities.outdoor_activities', 'Outdoor activities', 'פעילות בחוץ', 'Actividades al aire libre', 'Activités en plein air', 'Aktivitäten im Freien', 'Attività all’aperto', 'Atividades ao ar livre'],
  ['taxonomy.activities.therapy', 'Therapy', 'טיפול', 'Terapia', 'Thérapie', 'Therapie', 'Terapia', 'Terapia'],
  ['taxonomy.activities.journaling', 'Journaling', 'כתיבה ביומן', 'Escribir un diario', 'Écriture dans le journal', 'Tagebuchschreiben', 'Scrittura nel diario', 'Escrita no diário']
];

function setNested(target, path, value) {
  const parts = path.split('.');
  let node = target;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) node[part] = value;
    else node = node[part] ||= {};
  });
}

export function applyMoodUiTranslations(translations) {
  languages.forEach((language, languageIndex) => {
    const mood = {};
    rows.forEach((row) => setNested(mood, row[0], row[languageIndex + 1]));
    translations[language].translation.mood_tracker = {
      ...(translations[language]?.translation?.mood_tracker || {}),
      ...mood,
      form: {
        ...(translations[language]?.translation?.mood_tracker?.form || {}),
        ...(mood.form || {})
      },
      analytics: {
        ...(translations[language]?.translation?.mood_tracker?.analytics || {}),
        ...(mood.analytics || {})
      }
    };
  });
  return translations;
}
