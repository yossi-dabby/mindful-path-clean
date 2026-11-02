/**
 * Wave 3 exercise content localization — batch 3A.
 * Five behavioral activation exercises in all seven supported languages.
 */

const makeContent = (title, description, tags, steps, benefits, tips) => ({
  title,
  description,
  tags,
  steps: steps.map(([stepTitle, stepDescription]) => ({ title: stepTitle, description: stepDescription })),
  benefits,
  tips
});

export const EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A = {
  'local-behavioral-activity-scheduling': {
    en: makeContent(
      'Activity Scheduling',
      'Plan specific enjoyable and meaningful activities into your week to interrupt low mood, withdrawal, and loss of routine.',
      ['behavioral activation', 'mood', 'motivation', 'planning'],
      [
        ['Identify activities', 'List five activities that have brought pleasure or a sense of accomplishment in the past.'],
        ['Rate them', 'Rate each activity for expected Pleasure and Mastery from 0–10.'],
        ['Schedule', 'Choose two or three activities and assign each a specific day and time this week.'],
        ['Track', 'After each activity, record your actual Pleasure and Mastery ratings rather than your prediction.'],
        ['Review', 'At the end of the week, compare predictions with results and decide what to repeat.']
      ],
      ['Counters withdrawal and inactivity', 'Restores routine and momentum', 'Builds evidence that action can influence mood'],
      ['Start with an activity small enough to complete even on a difficult day.', 'Treat the schedule as a supportive experiment, not a test of willpower.']
    ),
    he: makeContent(
      'תכנון פעילויות',
      'תכננו פעילויות מהנות ובעלות משמעות בזמנים מוגדרים במהלך השבוע כדי לקטוע מצב רוח ירוד, הסתגרות ואובדן שגרה.',
      ['הפעלה התנהגותית', 'מצב רוח', 'מוטיבציה', 'תכנון'],
      [
        ['זיהוי פעילויות', 'רשמו חמש פעילויות שבעבר העניקו לכם הנאה או תחושת הישג.'],
        ['דירוג הפעילויות', 'דרגו כל פעילות לפי הנאה צפויה ותחושת הישג צפויה בין 0 ל־10.'],
        ['קביעת מועד', 'בחרו שתיים או שלוש פעילויות וקבעו לכל אחת יום ושעה מסוימים השבוע.'],
        ['מעקב', 'לאחר כל פעילות רשמו את דירוגי ההנאה וההישג בפועל, ולא את מה שחזיתם.'],
        ['סקירה', 'בסוף השבוע השוו בין התחזיות לתוצאות והחליטו אילו פעילויות כדאי לחזור עליהן.']
      ],
      ['מפחית הסתגרות וחוסר פעילות', 'מחזיר שגרה ותנופה', 'בונה ראיות לכך שפעולה יכולה להשפיע על מצב הרוח'],
      ['התחילו בפעילות קטנה שאפשר להשלים גם ביום קשה.', 'התייחסו ללוח הזמנים כניסוי תומך ולא כמבחן של כוח רצון.']
    ),
    es: makeContent(
      'Programación de actividades',
      'Planifica actividades agradables y significativas en momentos concretos de la semana para interrumpir el bajo ánimo, el aislamiento y la pérdida de rutina.',
      ['activación conductual', 'estado de ánimo', 'motivación', 'planificación'],
      [
        ['Identificar actividades', 'Anota cinco actividades que antes te hayan dado placer o sensación de logro.'],
        ['Valorarlas', 'Valora el Placer y el Dominio esperados de cada actividad de 0 a 10.'],
        ['Programarlas', 'Elige dos o tres actividades y asigna a cada una un día y una hora específicos esta semana.'],
        ['Registrar', 'Después de cada actividad, registra el Placer y el Dominio reales en vez de tu predicción.'],
        ['Revisar', 'Al final de la semana, compara predicciones y resultados y decide qué repetir.']
      ],
      ['Contrarresta el aislamiento y la inactividad', 'Recupera rutina e impulso', 'Aporta pruebas de que actuar puede influir en el ánimo'],
      ['Empieza con una actividad lo bastante pequeña para completarla incluso en un día difícil.', 'Trata el horario como un experimento de apoyo, no como una prueba de fuerza de voluntad.']
    ),
    fr: makeContent(
      'Planification des activités',
      'Planifiez des activités agréables et porteuses de sens à des moments précis de la semaine afin d’interrompre la baisse d’humeur, le retrait et la perte de routine.',
      ['activation comportementale', 'humeur', 'motivation', 'planification'],
      [
        ['Repérer des activités', 'Notez cinq activités qui vous ont déjà procuré du plaisir ou un sentiment d’accomplissement.'],
        ['Les évaluer', 'Évaluez pour chacune le Plaisir et la Maîtrise attendus de 0 à 10.'],
        ['Planifier', 'Choisissez deux ou trois activités et fixez pour chacune un jour et une heure cette semaine.'],
        ['Observer', 'Après chaque activité, notez le Plaisir et la Maîtrise réellement ressentis plutôt que votre prévision.'],
        ['Faire le bilan', 'En fin de semaine, comparez prévisions et résultats puis choisissez ce que vous souhaitez répéter.']
      ],
      ['Réduit le retrait et l’inactivité', 'Rétablit routine et élan', 'Montre par l’expérience que l’action peut influencer l’humeur'],
      ['Commencez par une activité assez petite pour être réalisable même lors d’une journée difficile.', 'Considérez le planning comme une expérience bienveillante, pas comme un test de volonté.']
    ),
    de: makeContent(
      'Aktivitäten planen',
      'Plane angenehme und sinnvolle Aktivitäten zu festen Zeiten in deiner Woche, um gedrückte Stimmung, Rückzug und fehlende Routine zu unterbrechen.',
      ['Verhaltensaktivierung', 'Stimmung', 'Motivation', 'Planung'],
      [
        ['Aktivitäten finden', 'Notiere fünf Aktivitäten, die dir früher Freude oder ein Erfolgserlebnis gegeben haben.'],
        ['Bewerten', 'Bewerte erwartete Freude und Bewältigung für jede Aktivität von 0 bis 10.'],
        ['Einplanen', 'Wähle zwei oder drei Aktivitäten und lege für jede einen konkreten Tag und eine Uhrzeit fest.'],
        ['Beobachten', 'Notiere danach die tatsächlich erlebte Freude und Bewältigung statt deiner Vorhersage.'],
        ['Auswerten', 'Vergleiche am Wochenende Vorhersagen und Ergebnisse und entscheide, was du wiederholen möchtest.']
      ],
      ['Wirkt Rückzug und Untätigkeit entgegen', 'Stellt Routine und Schwung wieder her', 'Zeigt erfahrungsbasiert, dass Handeln die Stimmung beeinflussen kann'],
      ['Beginne mit einer Aktivität, die selbst an einem schwierigen Tag machbar ist.', 'Betrachte den Plan als unterstützendes Experiment und nicht als Willenskrafttest.']
    ),
    it: makeContent(
      'Programmazione delle attività',
      'Pianifica attività piacevoli e significative in momenti precisi della settimana per interrompere umore basso, ritiro e perdita della routine.',
      ['attivazione comportamentale', 'umore', 'motivazione', 'pianificazione'],
      [
        ['Individuare le attività', 'Elenca cinque attività che in passato ti hanno dato piacere o senso di riuscita.'],
        ['Valutarle', 'Valuta Piacere e Padronanza attesi per ogni attività da 0 a 10.'],
        ['Programmare', 'Scegli due o tre attività e assegna a ciascuna un giorno e un orario precisi.'],
        ['Monitorare', 'Dopo ogni attività registra Piacere e Padronanza reali, non la previsione.'],
        ['Rivedere', 'A fine settimana confronta previsioni e risultati e decidi cosa ripetere.']
      ],
      ['Contrasta ritiro e inattività', 'Ripristina routine e slancio', 'Crea prove che l’azione può influenzare l’umore'],
      ['Inizia con un’attività abbastanza piccola da poter essere completata anche in una giornata difficile.', 'Considera il programma un esperimento di sostegno, non una prova di forza di volontà.']
    ),
    pt: makeContent(
      'Planejamento de atividades',
      'Planeje atividades agradáveis e significativas em horários específicos da semana para interromper o humor deprimido, o isolamento e a perda de rotina.',
      ['ativação comportamental', 'humor', 'motivação', 'planejamento'],
      [
        ['Identificar atividades', 'Liste cinco atividades que já trouxeram prazer ou sensação de realização.'],
        ['Avaliar', 'Avalie o Prazer e o Domínio esperados de cada atividade de 0 a 10.'],
        ['Agendar', 'Escolha duas ou três atividades e defina para cada uma um dia e horário específicos.'],
        ['Acompanhar', 'Depois de cada atividade, registre o Prazer e o Domínio reais em vez da previsão.'],
        ['Revisar', 'No fim da semana, compare previsões e resultados e decida o que repetir.']
      ],
      ['Combate isolamento e inatividade', 'Recupera rotina e impulso', 'Produz evidências de que agir pode influenciar o humor'],
      ['Comece com uma atividade pequena o suficiente para ser concluída mesmo em um dia difícil.', 'Trate o planejamento como um experimento de apoio, não como um teste de força de vontade.']
    )
  },

  'local-behavioral-experiment': {
    en: makeContent(
      'Behavioral Experiment',
      'Design and carry out a safe real-world experiment to test a fear-based belief against observable evidence.',
      ['CBT', 'behavioral experiment', 'beliefs', 'evidence'],
      [
        ['Identify the belief', 'Write the belief you want to test in one clear sentence.'],
        ['Make a prediction', 'State exactly what you expect to happen and rate its likelihood from 0–100%.'],
        ['Design the experiment', 'Choose a safe, specific, and manageable action that can test the prediction.'],
        ['Carry it out', 'Complete the action while observing what actually happens, without adding assumptions.'],
        ['Record the results', 'Describe the observable outcome and compare it with your prediction.'],
        ['Update the belief', 'Write what the evidence suggests and re-rate how strongly you believe the original prediction.']
      ],
      ['Tests unhelpful beliefs directly', 'Builds experiential evidence', 'Supports flexible and realistic thinking'],
      ['Choose a challenge that stretches you without overwhelming you.', 'Do not use experiments that could endanger you or another person.']
    ),
    he: makeContent(
      'ניסוי התנהגותי',
      'תכננו ובצעו ניסוי בטוח בעולם האמיתי כדי לבדוק אמונה המבוססת על פחד מול ראיות שאפשר לצפות בהן.',
      ['CBT', 'ניסוי התנהגותי', 'אמונות', 'ראיות'],
      [
        ['זיהוי האמונה', 'כתבו במשפט ברור את האמונה שברצונכם לבדוק.'],
        ['ניסוח תחזית', 'ציינו בדיוק מה לדעתכם יקרה ודרגו את הסבירות בין 0 ל־100 אחוז.'],
        ['תכנון הניסוי', 'בחרו פעולה בטוחה, מסוימת וניתנת לביצוע שתוכל לבדוק את התחזית.'],
        ['ביצוע הניסוי', 'בצעו את הפעולה והתבוננו במה שקורה בפועל בלי להוסיף הנחות.'],
        ['רישום התוצאות', 'תארו את התוצאה הנצפית והשוו אותה לתחזית שלכם.'],
        ['עדכון האמונה', 'כתבו מה הראיות מלמדות ודרגו מחדש עד כמה אתם מאמינים בתחזית המקורית.']
      ],
      ['בודק אמונות לא מועילות באופן ישיר', 'בונה ראיות מתוך ניסיון', 'תומך בחשיבה גמישה ומציאותית'],
      ['בחרו אתגר שמותח מעט את אזור הנוחות בלי להציף אתכם.', 'אל תבצעו ניסוי שעלול לסכן אתכם או אדם אחר.']
    ),
    es: makeContent(
      'Experimento conductual',
      'Diseña y realiza un experimento seguro en la vida real para contrastar una creencia basada en el miedo con pruebas observables.',
      ['TCC', 'experimento conductual', 'creencias', 'pruebas'],
      [
        ['Identificar la creencia', 'Escribe en una frase clara la creencia que quieres poner a prueba.'],
        ['Hacer una predicción', 'Indica exactamente qué esperas que ocurra y valora su probabilidad de 0 a 100%.'],
        ['Diseñar el experimento', 'Elige una acción segura, específica y manejable que pueda poner a prueba la predicción.'],
        ['Realizarlo', 'Completa la acción observando lo que sucede realmente, sin añadir suposiciones.'],
        ['Registrar los resultados', 'Describe el resultado observable y compáralo con tu predicción.'],
        ['Actualizar la creencia', 'Escribe qué indican las pruebas y vuelve a valorar cuánto crees la predicción original.']
      ],
      ['Pone a prueba directamente creencias poco útiles', 'Genera evidencia basada en la experiencia', 'Favorece un pensamiento flexible y realista'],
      ['Elige un reto que te exija sin abrumarte.', 'No realices experimentos que puedan ponerte en peligro a ti o a otra persona.']
    ),
    fr: makeContent(
      'Expérience comportementale',
      'Concevez et réalisez une expérience sûre dans la vie réelle afin de confronter une croyance fondée sur la peur à des faits observables.',
      ['TCC', 'expérience comportementale', 'croyances', 'preuves'],
      [
        ['Identifier la croyance', 'Écrivez en une phrase claire la croyance que vous souhaitez tester.'],
        ['Formuler une prédiction', 'Précisez ce que vous pensez qu’il va se passer et estimez sa probabilité de 0 à 100 %.'],
        ['Concevoir l’expérience', 'Choisissez une action sûre, précise et réalisable qui permette de tester la prédiction.'],
        ['La réaliser', 'Effectuez l’action en observant ce qui se passe réellement, sans ajouter d’hypothèses.'],
        ['Noter les résultats', 'Décrivez le résultat observable et comparez-le à votre prédiction.'],
        ['Actualiser la croyance', 'Écrivez ce que montrent les faits et réévaluez votre adhésion à la prédiction initiale.']
      ],
      ['Teste directement les croyances peu aidantes', 'Produit des preuves issues de l’expérience', 'Favorise une pensée souple et réaliste'],
      ['Choisissez un défi stimulant sans être accablant.', 'N’utilisez pas une expérience susceptible de vous mettre en danger ou de mettre autrui en danger.']
    ),
    de: makeContent(
      'Verhaltensexperiment',
      'Plane und erprobe ein sicheres Alltagsexperiment, um eine angstgeleitete Annahme anhand beobachtbarer Fakten zu prüfen.',
      ['KVT', 'Verhaltensexperiment', 'Überzeugungen', 'Fakten'],
      [
        ['Annahme benennen', 'Formuliere die Annahme, die du prüfen möchtest, in einem klaren Satz.'],
        ['Vorhersage treffen', 'Beschreibe genau, was du erwartest, und schätze die Wahrscheinlichkeit von 0 bis 100 Prozent.'],
        ['Experiment planen', 'Wähle eine sichere, konkrete und machbare Handlung, mit der sich die Vorhersage prüfen lässt.'],
        ['Durchführen', 'Führe die Handlung aus und beobachte, was tatsächlich geschieht, ohne Vermutungen hinzuzufügen.'],
        ['Ergebnisse festhalten', 'Beschreibe das beobachtbare Ergebnis und vergleiche es mit deiner Vorhersage.'],
        ['Annahme aktualisieren', 'Notiere, was die Fakten nahelegen, und bewerte die ursprüngliche Vorhersage erneut.']
      ],
      ['Prüft wenig hilfreiche Annahmen direkt', 'Schafft erfahrungsbasierte Belege', 'Fördert flexibles und realistisches Denken'],
      ['Wähle eine Herausforderung, die dich fordert, aber nicht überfordert.', 'Verwende kein Experiment, das dich oder andere gefährden könnte.']
    ),
    it: makeContent(
      'Esperimento comportamentale',
      'Progetta e realizza un esperimento sicuro nella vita reale per confrontare una convinzione basata sulla paura con prove osservabili.',
      ['TCC', 'esperimento comportamentale', 'convinzioni', 'prove'],
      [
        ['Individuare la convinzione', 'Scrivi in una frase chiara la convinzione che vuoi verificare.'],
        ['Fare una previsione', 'Indica esattamente cosa ti aspetti e valuta la probabilità da 0 a 100%.'],
        ['Progettare l’esperimento', 'Scegli un’azione sicura, specifica e gestibile che possa verificare la previsione.'],
        ['Realizzarlo', 'Completa l’azione osservando ciò che accade davvero, senza aggiungere supposizioni.'],
        ['Registrare i risultati', 'Descrivi il risultato osservabile e confrontalo con la previsione.'],
        ['Aggiornare la convinzione', 'Scrivi cosa suggeriscono le prove e rivaluta quanto credi alla previsione iniziale.']
      ],
      ['Verifica direttamente convinzioni poco utili', 'Crea prove basate sull’esperienza', 'Favorisce un pensiero flessibile e realistico'],
      ['Scegli una sfida che ti stimoli senza sopraffarti.', 'Non usare esperimenti che possano mettere in pericolo te o altre persone.']
    ),
    pt: makeContent(
      'Experimento comportamental',
      'Planeje e realize um experimento seguro na vida real para comparar uma crença baseada no medo com evidências observáveis.',
      ['TCC', 'experimento comportamental', 'crenças', 'evidências'],
      [
        ['Identificar a crença', 'Escreva em uma frase clara a crença que deseja testar.'],
        ['Fazer uma previsão', 'Diga exatamente o que espera que aconteça e avalie a probabilidade de 0 a 100%.'],
        ['Planejar o experimento', 'Escolha uma ação segura, específica e viável que possa testar a previsão.'],
        ['Realizar', 'Complete a ação observando o que realmente acontece, sem acrescentar suposições.'],
        ['Registrar os resultados', 'Descreva o resultado observável e compare-o com sua previsão.'],
        ['Atualizar a crença', 'Escreva o que as evidências sugerem e reavalie quanto acredita na previsão original.']
      ],
      ['Testa diretamente crenças pouco úteis', 'Produz evidências pela experiência', 'Apoia um pensamento flexível e realista'],
      ['Escolha um desafio que amplie seus limites sem sobrecarregá-lo.', 'Não realize experimentos que possam colocar você ou outra pessoa em perigo.']
    )
  },

  'local-behavioral-opposite-action': {
    en: makeContent(
      'Opposite Action',
      'When an emotion urges an unhelpful response, check the facts and deliberately choose a safe action that moves in the opposite direction.',
      ['DBT', 'emotion regulation', 'urges', 'behavior'],
      [
        ['Name the emotion', 'Identify the emotion and rate its intensity from 0–10.'],
        ['Identify the urge', 'Describe what the emotion is urging you to do, such as withdraw, avoid, or attack.'],
        ['Check the facts', 'Ask whether the emotion and its intensity fit the facts of the current situation.'],
        ['Choose the opposite', 'Identify a safe behavior that moves opposite to the unhelpful urge.'],
        ['Act fully', 'Do the opposite action with your posture, words, attention, and behavior.'],
        ['Re-rate', 'Afterward, rate the emotion again and record what changed.']
      ],
      ['Reduces unjustified emotional intensity', 'Interrupts automatic behavior cycles', 'Strengthens a core DBT emotion-regulation skill'],
      ['Use opposite action only when the urge is unhelpful or the emotion does not fit the facts.', 'If the facts indicate danger, choose protection and support rather than the opposite action.']
    ),
    he: makeContent(
      'פעולה הפוכה',
      'כאשר רגש דוחף לתגובה שאינה מועילה, בדקו את העובדות ובחרו במכוון פעולה בטוחה שנעה בכיוון ההפוך.',
      ['DBT', 'ויסות רגשי', 'דחפים', 'התנהגות'],
      [
        ['מתן שם לרגש', 'זהו את הרגש ודרגו את עוצמתו בין 0 ל־10.'],
        ['זיהוי הדחף', 'תארו מה הרגש דוחף אתכם לעשות, למשל להסתגר, להימנע או לתקוף.'],
        ['בדיקת העובדות', 'שאלו אם הרגש ועוצמתו מתאימים לעובדות של המצב הנוכחי.'],
        ['בחירת ההפך', 'זהו התנהגות בטוחה שנעה בכיוון ההפוך לדחף שאינו מועיל.'],
        ['פעולה מלאה', 'בצעו את הפעולה ההפוכה באמצעות היציבה, המילים, הקשב וההתנהגות שלכם.'],
        ['דירוג מחדש', 'לאחר מכן דרגו שוב את הרגש ורשמו מה השתנה.']
      ],
      ['מפחית עוצמת רגש שאינה תואמת את העובדות', 'קוטע מעגלי התנהגות אוטומטיים', 'מחזק מיומנות מרכזית של DBT לוויסות רגשי'],
      ['השתמשו בפעולה הפוכה רק כאשר הדחף אינו מועיל או כשהרגש אינו מתאים לעובדות.', 'אם העובדות מצביעות על סכנה, בחרו בהגנה ובקבלת עזרה ולא בפעולה הפוכה.']
    ),
    es: makeContent(
      'Acción opuesta',
      'Cuando una emoción impulsa una respuesta poco útil, comprueba los hechos y elige deliberadamente una acción segura en la dirección opuesta.',
      ['DBT', 'regulación emocional', 'impulsos', 'conducta'],
      [
        ['Nombrar la emoción', 'Identifica la emoción y valora su intensidad de 0 a 10.'],
        ['Identificar el impulso', 'Describe qué te impulsa a hacer la emoción, como aislarte, evitar o atacar.'],
        ['Comprobar los hechos', 'Pregunta si la emoción y su intensidad encajan con los hechos de la situación actual.'],
        ['Elegir lo opuesto', 'Identifica una conducta segura que vaya en dirección opuesta al impulso poco útil.'],
        ['Actuar plenamente', 'Realiza la acción opuesta con tu postura, palabras, atención y conducta.'],
        ['Volver a valorar', 'Después, valora de nuevo la emoción y registra qué cambió.']
      ],
      ['Reduce la intensidad emocional no justificada', 'Interrumpe ciclos automáticos de conducta', 'Fortalece una habilidad central de regulación emocional de la DBT'],
      ['Usa la acción opuesta solo cuando el impulso no ayuda o la emoción no se ajusta a los hechos.', 'Si los hechos indican peligro, elige protección y apoyo en lugar de la acción opuesta.']
    ),
    fr: makeContent(
      'Action opposée',
      'Lorsqu’une émotion pousse à une réaction peu aidante, vérifiez les faits et choisissez délibérément une action sûre allant dans la direction opposée.',
      ['TCD', 'régulation émotionnelle', 'impulsions', 'comportement'],
      [
        ['Nommer l’émotion', 'Identifiez l’émotion et évaluez son intensité de 0 à 10.'],
        ['Identifier l’impulsion', 'Décrivez ce que l’émotion vous pousse à faire, par exemple vous retirer, éviter ou attaquer.'],
        ['Vérifier les faits', 'Demandez-vous si l’émotion et son intensité correspondent aux faits de la situation actuelle.'],
        ['Choisir l’opposé', 'Repérez un comportement sûr allant à l’opposé de l’impulsion peu aidante.'],
        ['Agir pleinement', 'Réalisez l’action opposée avec votre posture, vos paroles, votre attention et votre comportement.'],
        ['Réévaluer', 'Ensuite, réévaluez l’émotion et notez ce qui a changé.']
      ],
      ['Réduit une intensité émotionnelle non justifiée', 'Interrompt les automatismes comportementaux', 'Renforce une compétence centrale de régulation émotionnelle en TCD'],
      ['Utilisez l’action opposée seulement si l’impulsion est peu aidante ou si l’émotion ne correspond pas aux faits.', 'Si les faits signalent un danger, privilégiez la protection et le soutien.']
    ),
    de: makeContent(
      'Entgegengesetztes Handeln',
      'Wenn ein Gefühl zu einer wenig hilfreichen Reaktion drängt, prüfe die Fakten und wähle bewusst eine sichere Handlung in die entgegengesetzte Richtung.',
      ['DBT', 'Emotionsregulation', 'Handlungsimpulse', 'Verhalten'],
      [
        ['Gefühl benennen', 'Benenne das Gefühl und bewerte seine Intensität von 0 bis 10.'],
        ['Impuls erkennen', 'Beschreibe, wozu dich das Gefühl drängt, etwa Rückzug, Vermeidung oder Angriff.'],
        ['Fakten prüfen', 'Frage, ob das Gefühl und seine Stärke zu den Fakten der aktuellen Situation passen.'],
        ['Gegenteil wählen', 'Finde ein sicheres Verhalten, das dem wenig hilfreichen Impuls entgegenwirkt.'],
        ['Ganz handeln', 'Führe die entgegengesetzte Handlung mit Körperhaltung, Worten, Aufmerksamkeit und Verhalten aus.'],
        ['Neu bewerten', 'Bewerte das Gefühl danach erneut und notiere, was sich verändert hat.']
      ],
      ['Verringert nicht gerechtfertigte Gefühlsintensität', 'Unterbricht automatische Verhaltenskreisläufe', 'Stärkt eine zentrale DBT-Fertigkeit zur Emotionsregulation'],
      ['Nutze entgegengesetztes Handeln nur, wenn der Impuls wenig hilfreich ist oder das Gefühl nicht zu den Fakten passt.', 'Wenn die Fakten Gefahr anzeigen, wähle Schutz und Unterstützung.']
    ),
    it: makeContent(
      'Azione opposta',
      'Quando un’emozione spinge verso una risposta poco utile, verifica i fatti e scegli deliberatamente un’azione sicura nella direzione opposta.',
      ['DBT', 'regolazione emotiva', 'impulsi', 'comportamento'],
      [
        ['Nominare l’emozione', 'Individua l’emozione e valutane l’intensità da 0 a 10.'],
        ['Individuare l’impulso', 'Descrivi cosa l’emozione ti spinge a fare, per esempio ritirarti, evitare o attaccare.'],
        ['Verificare i fatti', 'Chiediti se l’emozione e la sua intensità corrispondono ai fatti della situazione attuale.'],
        ['Scegliere l’opposto', 'Individua un comportamento sicuro che vada in direzione opposta all’impulso poco utile.'],
        ['Agire pienamente', 'Esegui l’azione opposta con postura, parole, attenzione e comportamento.'],
        ['Rivalutare', 'Dopo, valuta di nuovo l’emozione e annota cosa è cambiato.']
      ],
      ['Riduce un’intensità emotiva non giustificata', 'Interrompe cicli comportamentali automatici', 'Rafforza una capacità centrale DBT di regolazione emotiva'],
      ['Usa l’azione opposta solo quando l’impulso non è utile o l’emozione non corrisponde ai fatti.', 'Se i fatti indicano pericolo, scegli protezione e sostegno.']
    ),
    pt: makeContent(
      'Ação oposta',
      'Quando uma emoção impulsiona uma resposta pouco útil, verifique os fatos e escolha deliberadamente uma ação segura na direção oposta.',
      ['DBT', 'regulação emocional', 'impulsos', 'comportamento'],
      [
        ['Nomear a emoção', 'Identifique a emoção e avalie sua intensidade de 0 a 10.'],
        ['Identificar o impulso', 'Descreva o que a emoção o impulsiona a fazer, como se isolar, evitar ou atacar.'],
        ['Verificar os fatos', 'Pergunte se a emoção e sua intensidade correspondem aos fatos da situação atual.'],
        ['Escolher o oposto', 'Identifique um comportamento seguro que siga na direção oposta ao impulso pouco útil.'],
        ['Agir por inteiro', 'Realize a ação oposta com postura, palavras, atenção e comportamento.'],
        ['Reavaliar', 'Depois, avalie novamente a emoção e registre o que mudou.']
      ],
      ['Reduz intensidade emocional injustificada', 'Interrompe ciclos automáticos de comportamento', 'Fortalece uma habilidade central de regulação emocional da DBT'],
      ['Use a ação oposta somente quando o impulso não ajuda ou a emoção não corresponde aos fatos.', 'Se os fatos indicarem perigo, escolha proteção e apoio.']
    )
  },

  'local-behavioral-values-action': {
    en: makeContent(
      'Values-Aligned Action',
      'Choose one core value and take a small, concrete action that expresses it today, even when difficult thoughts or feelings are present.',
      ['ACT', 'values', 'committed action', 'meaning'],
      [
        ['Choose a value', 'Select one value that matters to you, such as care, honesty, learning, health, or community.'],
        ['Check alignment', 'Rate from 0–10 how closely your recent actions have reflected this value.'],
        ['Notice the barrier', 'Name the thought, feeling, urge, or practical obstacle that has been getting in the way.'],
        ['Choose one action', 'Define one small and specific action you can complete within the next 24 hours.'],
        ['Act and reflect', 'Take the action and note what it was like to move toward what matters.']
      ],
      ['Builds intrinsic motivation', 'Reduces avoidance', 'Connects daily behavior with personal meaning'],
      ['Choose an action that is specific and under your control.', 'Success means taking the step, not controlling how you feel afterward.']
    ),
    he: makeContent(
      'פעולה בהתאם לערכים',
      'בחרו ערך מרכזי אחד ובצעו היום פעולה קטנה ומעשית שמבטאת אותו, גם כשמחשבות או רגשות קשים נוכחים.',
      ['ACT', 'ערכים', 'פעולה מחויבת', 'משמעות'],
      [
        ['בחירת ערך', 'בחרו ערך שחשוב לכם, כגון אכפתיות, יושר, למידה, בריאות או קהילה.'],
        ['בדיקת התאמה', 'דרגו בין 0 ל־10 עד כמה הפעולות האחרונות שלכם ביטאו את הערך הזה.'],
        ['זיהוי המחסום', 'תנו שם למחשבה, לרגש, לדחף או למכשול המעשי שהפריע לכם.'],
        ['בחירת פעולה אחת', 'הגדירו פעולה קטנה ומסוימת שתוכלו להשלים בתוך 24 השעות הקרובות.'],
        ['פעולה והתבוננות', 'בצעו את הפעולה ושימו לב כיצד היה לנוע לעבר מה שחשוב לכם.']
      ],
      ['מחזק מוטיבציה פנימית', 'מפחית הימנעות', 'מחבר התנהגות יומיומית למשמעות אישית'],
      ['בחרו פעולה מסוימת שנמצאת בשליטתכם.', 'הצלחה פירושה לבצע את הצעד, לא לשלוט בהרגשה שתופיע לאחריו.']
    ),
    es: makeContent(
      'Acción guiada por valores',
      'Elige un valor central y realiza hoy una acción pequeña y concreta que lo exprese, incluso con pensamientos o emociones difíciles presentes.',
      ['ACT', 'valores', 'acción comprometida', 'sentido'],
      [
        ['Elegir un valor', 'Selecciona un valor importante para ti, como cuidado, honestidad, aprendizaje, salud o comunidad.'],
        ['Comprobar la alineación', 'Valora de 0 a 10 cuánto han reflejado ese valor tus acciones recientes.'],
        ['Observar la barrera', 'Nombra el pensamiento, emoción, impulso u obstáculo práctico que se ha interpuesto.'],
        ['Elegir una acción', 'Define una acción pequeña y específica que puedas completar en las próximas 24 horas.'],
        ['Actuar y reflexionar', 'Realiza la acción y observa cómo fue avanzar hacia lo que importa.']
      ],
      ['Refuerza la motivación interna', 'Reduce la evitación', 'Conecta la conducta diaria con el sentido personal'],
      ['Elige una acción específica y bajo tu control.', 'El éxito consiste en dar el paso, no en controlar cómo te sientes después.']
    ),
    fr: makeContent(
      'Action guidée par les valeurs',
      'Choisissez une valeur essentielle et accomplissez aujourd’hui une petite action concrète qui l’exprime, même en présence de pensées ou d’émotions difficiles.',
      ['ACT', 'valeurs', 'action engagée', 'sens'],
      [
        ['Choisir une valeur', 'Sélectionnez une valeur importante pour vous, comme l’attention, l’honnêteté, l’apprentissage, la santé ou la communauté.'],
        ['Vérifier l’alignement', 'Évaluez de 0 à 10 dans quelle mesure vos actions récentes ont reflété cette valeur.'],
        ['Repérer l’obstacle', 'Nommez la pensée, l’émotion, l’impulsion ou l’obstacle pratique qui vous a freiné.'],
        ['Choisir une action', 'Définissez une action petite et précise que vous pouvez réaliser dans les prochaines 24 heures.'],
        ['Agir et observer', 'Réalisez l’action et notez ce que cela fait d’avancer vers ce qui compte.']
      ],
      ['Renforce la motivation intrinsèque', 'Réduit l’évitement', 'Relie les comportements quotidiens au sens personnel'],
      ['Choisissez une action précise qui dépend de vous.', 'Réussir signifie faire le pas, et non contrôler votre ressenti ensuite.']
    ),
    de: makeContent(
      'Werteorientiertes Handeln',
      'Wähle einen zentralen Wert und setze heute eine kleine konkrete Handlung um, die ihn ausdrückt, auch wenn schwierige Gedanken oder Gefühle da sind.',
      ['ACT', 'Werte', 'engagiertes Handeln', 'Sinn'],
      [
        ['Wert wählen', 'Wähle einen Wert, der dir wichtig ist, etwa Fürsorge, Ehrlichkeit, Lernen, Gesundheit oder Gemeinschaft.'],
        ['Ausrichtung prüfen', 'Bewerte von 0 bis 10, wie sehr deine letzten Handlungen diesen Wert widergespiegelt haben.'],
        ['Hindernis bemerken', 'Benenne den Gedanken, das Gefühl, den Impuls oder das praktische Hindernis, das im Weg stand.'],
        ['Eine Handlung wählen', 'Lege eine kleine konkrete Handlung fest, die du in den nächsten 24 Stunden umsetzen kannst.'],
        ['Handeln und reflektieren', 'Führe die Handlung aus und beobachte, wie es war, dich dem Wichtigen zuzuwenden.']
      ],
      ['Stärkt innere Motivation', 'Verringert Vermeidung', 'Verbindet Alltagshandeln mit persönlichem Sinn'],
      ['Wähle eine konkrete Handlung, die in deinem Einflussbereich liegt.', 'Erfolg bedeutet, den Schritt zu tun, nicht das Gefühl danach zu kontrollieren.']
    ),
    it: makeContent(
      'Azione in linea con i valori',
      'Scegli un valore fondamentale e compi oggi una piccola azione concreta che lo esprima, anche in presenza di pensieri o emozioni difficili.',
      ['ACT', 'valori', 'azione impegnata', 'significato'],
      [
        ['Scegliere un valore', 'Seleziona un valore importante, come cura, onestà, apprendimento, salute o comunità.'],
        ['Verificare la coerenza', 'Valuta da 0 a 10 quanto le tue azioni recenti hanno rispecchiato questo valore.'],
        ['Notare l’ostacolo', 'Dai un nome al pensiero, all’emozione, all’impulso o all’ostacolo pratico che ti ha bloccato.'],
        ['Scegliere un’azione', 'Definisci una piccola azione specifica che puoi completare nelle prossime 24 ore.'],
        ['Agire e riflettere', 'Compi l’azione e osserva com’è stato muoverti verso ciò che conta.']
      ],
      ['Rafforza la motivazione intrinseca', 'Riduce l’evitamento', 'Collega il comportamento quotidiano al significato personale'],
      ['Scegli un’azione specifica e sotto il tuo controllo.', 'Il successo consiste nel compiere il passo, non nel controllare come ti senti dopo.']
    ),
    pt: makeContent(
      'Ação alinhada aos valores',
      'Escolha um valor central e realize hoje uma ação pequena e concreta que o expresse, mesmo com pensamentos ou emoções difíceis presentes.',
      ['ACT', 'valores', 'ação comprometida', 'sentido'],
      [
        ['Escolher um valor', 'Selecione um valor importante para você, como cuidado, honestidade, aprendizado, saúde ou comunidade.'],
        ['Verificar o alinhamento', 'Avalie de 0 a 10 quanto suas ações recentes refletiram esse valor.'],
        ['Perceber a barreira', 'Nomeie o pensamento, a emoção, o impulso ou o obstáculo prático que esteve no caminho.'],
        ['Escolher uma ação', 'Defina uma ação pequena e específica que possa concluir nas próximas 24 horas.'],
        ['Agir e refletir', 'Realize a ação e observe como foi se mover em direção ao que importa.']
      ],
      ['Fortalece a motivação interna', 'Reduz a evitação', 'Conecta o comportamento diário ao sentido pessoal'],
      ['Escolha uma ação específica e sob seu controle.', 'Sucesso significa dar o passo, não controlar como você se sente depois.']
    )
  },

  'local-behavioral-pleasure-mastery': {
    en: makeContent(
      'Pleasure & Mastery Tracking',
      'Rate everyday activities for pleasure and accomplishment to discover which actions support mood, confidence, and healthy momentum.',
      ['behavioral activation', 'mood tracking', 'pleasure', 'mastery'],
      [
        ['List activities', 'Write down five to ten things you did today, including small everyday actions.'],
        ['Rate pleasure', 'For each activity, rate the pleasure you actually experienced from 0–10.'],
        ['Rate mastery', 'For each activity, rate your actual sense of accomplishment or capability from 0–10.'],
        ['Find patterns', 'Notice which activities scored highest and any results that surprised you.'],
        ['Plan one step', 'Schedule at least one helpful or promising activity for tomorrow.']
      ],
      ['Identifies personal mood-supporting activities', 'Challenges the belief that nothing helps', 'Builds a practical activity bank'],
      ['Rate what you experienced, not what you think you should have experienced.', 'Small actions such as showering or making tea can count as mastery.']
    ),
    he: makeContent(
      'מעקב הנאה ותחושת הישג',
      'דרגו פעילויות יומיומיות לפי הנאה ותחושת הישג כדי לגלות אילו פעולות תומכות במצב הרוח, בביטחון ובתנופה בריאה.',
      ['הפעלה התנהגותית', 'מעקב מצב רוח', 'הנאה', 'תחושת הישג'],
      [
        ['רישום פעילויות', 'רשמו חמש עד עשר פעולות שביצעתם היום, כולל פעולות יומיומיות קטנות.'],
        ['דירוג הנאה', 'לכל פעילות דרגו בין 0 ל־10 את ההנאה שחוויתם בפועל.'],
        ['דירוג תחושת הישג', 'לכל פעילות דרגו בין 0 ל־10 את תחושת ההישג או המסוגלות בפועל.'],
        ['זיהוי דפוסים', 'שימו לב אילו פעילויות קיבלו את הדירוג הגבוה ביותר ואילו תוצאות הפתיעו אתכם.'],
        ['תכנון צעד אחד', 'קבעו למחר לפחות פעילות מועילה או מבטיחה אחת.']
      ],
      ['מזהה פעילויות אישיות שתומכות במצב הרוח', 'מאתגר את האמונה ששום דבר אינו עוזר', 'בונה מאגר פעילויות מעשי'],
      ['דרגו את מה שחוויתם ולא את מה שלדעתכם הייתם אמורים לחוות.', 'גם פעולות קטנות כמו מקלחת או הכנת תה יכולות להיחשב כהישג.']
    ),
    es: makeContent(
      'Registro de placer y dominio',
      'Valora las actividades cotidianas por placer y logro para descubrir qué acciones apoyan el ánimo, la confianza y un impulso saludable.',
      ['activación conductual', 'registro del ánimo', 'placer', 'dominio'],
      [
        ['Anotar actividades', 'Escribe entre cinco y diez cosas que hiciste hoy, incluidas acciones cotidianas pequeñas.'],
        ['Valorar el placer', 'Para cada actividad, valora de 0 a 10 el placer que realmente experimentaste.'],
        ['Valorar el dominio', 'Para cada actividad, valora de 0 a 10 tu sensación real de logro o capacidad.'],
        ['Buscar patrones', 'Observa qué actividades obtuvieron mayor puntuación y qué resultados te sorprendieron.'],
        ['Planear un paso', 'Programa para mañana al menos una actividad útil o prometedora.']
      ],
      ['Identifica actividades personales que apoyan el ánimo', 'Cuestiona la creencia de que nada ayuda', 'Crea un banco práctico de actividades'],
      ['Valora lo que experimentaste, no lo que crees que deberías haber sentido.', 'Acciones pequeñas como ducharte o preparar té también pueden contar como dominio.']
    ),
    fr: makeContent(
      'Suivi du plaisir et de la maîtrise',
      'Évaluez les activités quotidiennes selon le plaisir et l’accomplissement afin de découvrir les actions qui soutiennent l’humeur, la confiance et un élan positif.',
      ['activation comportementale', 'suivi de l’humeur', 'plaisir', 'maîtrise'],
      [
        ['Lister les activités', 'Notez cinq à dix choses faites aujourd’hui, y compris de petites actions ordinaires.'],
        ['Évaluer le plaisir', 'Pour chaque activité, évaluez de 0 à 10 le plaisir réellement ressenti.'],
        ['Évaluer la maîtrise', 'Pour chaque activité, évaluez de 0 à 10 le sentiment réel d’accomplissement ou de capacité.'],
        ['Repérer les tendances', 'Observez les activités les mieux notées et les résultats qui vous ont surpris.'],
        ['Planifier un pas', 'Programmez pour demain au moins une activité utile ou prometteuse.']
      ],
      ['Repère les activités personnelles qui soutiennent l’humeur', 'Remet en question l’idée que rien n’aide', 'Constitue une banque d’activités concrètes'],
      ['Évaluez votre expérience réelle, pas ce que vous pensez devoir ressentir.', 'De petites actions, comme se doucher ou préparer du thé, peuvent aussi compter comme maîtrise.']
    ),
    de: makeContent(
      'Freude- und Bewältigungsprotokoll',
      'Bewerte Alltagsaktivitäten nach Freude und Bewältigung, um herauszufinden, welche Handlungen Stimmung, Zuversicht und gesunden Schwung fördern.',
      ['Verhaltensaktivierung', 'Stimmungsprotokoll', 'Freude', 'Bewältigung'],
      [
        ['Aktivitäten notieren', 'Schreibe fünf bis zehn Dinge auf, die du heute getan hast, auch kleine Alltagshandlungen.'],
        ['Freude bewerten', 'Bewerte für jede Aktivität die tatsächlich erlebte Freude von 0 bis 10.'],
        ['Bewältigung bewerten', 'Bewerte für jede Aktivität dein tatsächliches Erfolgs- oder Kompetenzgefühl von 0 bis 10.'],
        ['Muster erkennen', 'Achte darauf, welche Aktivitäten am höchsten bewertet wurden und was dich überrascht hat.'],
        ['Einen Schritt planen', 'Plane für morgen mindestens eine hilfreiche oder vielversprechende Aktivität.']
      ],
      ['Erkennt persönliche stimmungsfördernde Aktivitäten', 'Hinterfragt die Annahme, dass nichts hilft', 'Baut eine praktische Aktivitätensammlung auf'],
      ['Bewerte deine tatsächliche Erfahrung und nicht, was du deiner Meinung nach fühlen solltest.', 'Auch kleine Handlungen wie Duschen oder Tee kochen können als Bewältigung zählen.']
    ),
    it: makeContent(
      'Monitoraggio di piacere e padronanza',
      'Valuta le attività quotidiane per piacere e senso di riuscita, così da scoprire quali azioni sostengono umore, fiducia e slancio positivo.',
      ['attivazione comportamentale', 'monitoraggio dell’umore', 'piacere', 'padronanza'],
      [
        ['Elencare le attività', 'Scrivi da cinque a dieci cose fatte oggi, comprese piccole azioni quotidiane.'],
        ['Valutare il piacere', 'Per ogni attività valuta da 0 a 10 il piacere realmente provato.'],
        ['Valutare la padronanza', 'Per ogni attività valuta da 0 a 10 il reale senso di riuscita o capacità.'],
        ['Individuare gli schemi', 'Nota quali attività hanno ottenuto i punteggi più alti e quali risultati ti hanno sorpreso.'],
        ['Pianificare un passo', 'Programma per domani almeno un’attività utile o promettente.']
      ],
      ['Individua attività personali che sostengono l’umore', 'Mette in discussione l’idea che nulla aiuti', 'Costruisce una raccolta pratica di attività'],
      ['Valuta ciò che hai vissuto, non ciò che pensi avresti dovuto provare.', 'Anche piccole azioni come fare una doccia o preparare il tè possono contare come padronanza.']
    ),
    pt: makeContent(
      'Registro de prazer e domínio',
      'Avalie atividades cotidianas por prazer e realização para descobrir quais ações apoiam o humor, a confiança e um impulso saudável.',
      ['ativação comportamental', 'registro de humor', 'prazer', 'domínio'],
      [
        ['Listar atividades', 'Escreva de cinco a dez coisas que fez hoje, incluindo pequenas ações cotidianas.'],
        ['Avaliar o prazer', 'Para cada atividade, avalie de 0 a 10 o prazer realmente vivenciado.'],
        ['Avaliar o domínio', 'Para cada atividade, avalie de 0 a 10 a sensação real de realização ou capacidade.'],
        ['Encontrar padrões', 'Observe quais atividades tiveram as maiores notas e quais resultados surpreenderam você.'],
        ['Planejar um passo', 'Agende para amanhã pelo menos uma atividade útil ou promissora.']
      ],
      ['Identifica atividades pessoais que apoiam o humor', 'Questiona a crença de que nada ajuda', 'Constrói um banco prático de atividades'],
      ['Avalie o que realmente vivenciou, não o que acha que deveria ter sentido.', 'Pequenas ações, como tomar banho ou fazer chá, também podem contar como domínio.']
    )
  }
};

export const EXERCISE_CONTENT_BATCH_3A_IDS = Object.freeze(
  Object.keys(EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A)
);
