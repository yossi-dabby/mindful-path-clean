const SUPPORTED_JOURNEY_LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

const legacyJourneyContent = {
  '6982fef0720645ff50b6105e': {
    he: {
      title: 'אתגר בן 7 ימים להפחתת חרדה',
      description: 'בנו מיומנויות מעשיות להתמודדות עם חרדה באמצעות כלים מעולמות ה-CBT, ה-DBT וה-ACT.',
      outcomes: ['זיהוי ואתגור של דפוסי חשיבה חרדתיים', 'ויסות התסמינים הגופניים של החרדה', 'הפחתת התנהגויות הימנעות', 'חיזוק הביטחון בהתמודדות עם חוסר ודאות'],
      steps: [
        { title: 'זיהוי מלכודות החשיבה שלכם', description: 'למדו לזהות עיוותי חשיבה שמגבירים חרדה.', reflection_prompt: 'אילו מלכודות חשיבה אתם מזהים אצלכם לעיתים קרובות?' },
        { title: 'אתגור מחשבות חרדתיות', description: 'תרגלו ניסוח מחדש של חשיבה קטסטרופלית.', reflection_prompt: 'איך הרגיש לכם לאתגר את המחשבות האוטומטיות?' },
        { title: 'תרגול מיומנות STOP', description: 'למדו לעצור ולהגיב בתשומת לב כאשר החרדה מתגברת.', reflection_prompt: 'מתי תוכלו להשתמש ב-STOP בחיי היום־יום?' },
        { title: 'לרכוב על הגל', description: 'תרגלו גלישת דחפים כדי להתמודד עם חרדה בלי להימנע.', reflection_prompt: 'במה הבחנתם כשהדחף הגיע לשיאו ואז חלף?' },
        { title: 'יצירת מרחק מהדאגה', description: 'למדו להשתחרר מהאחיזה של מחשבות חרדתיות.', reflection_prompt: 'איזו טכניקה ליצירת מרחק מהמחשבה עזרה לכם ביותר?' },
        { title: 'TIPP לחרדה עזה', description: 'השתמשו בכלים גופניים כדי להפחית חרדה עזה.', reflection_prompt: 'איזו מיומנות TIPP עבדה עבורכם בצורה הטובה ביותר?' },
        { title: 'איזון הראיות', description: 'בחנו מחשבות חרדתיות בעזרת ראיות מאוזנות.', reflection_prompt: 'כיצד בחינת הראיות שינתה את נקודת המבט שלכם?' },
      ],
    },
    es: {
      title: 'Reto de 7 días para reducir la ansiedad',
      description: 'Desarrolla habilidades prácticas para manejar la ansiedad mediante técnicas de TCC, DBT y ACT.',
      outcomes: ['Reconocer y cuestionar patrones de pensamiento ansioso', 'Manejar los síntomas físicos de la ansiedad', 'Reducir las conductas de evitación', 'Aumentar la confianza ante la incertidumbre'],
      steps: [
        { title: 'Identifica tus trampas de pensamiento', description: 'Aprende a reconocer las distorsiones cognitivas que alimentan la ansiedad.', reflection_prompt: '¿Qué trampas de pensamiento notas con más frecuencia?' },
        { title: 'Cuestiona los pensamientos ansiosos', description: 'Practica cómo replantear el pensamiento catastrófico.', reflection_prompt: '¿Cómo te sentiste al cuestionar tus pensamientos automáticos?' },
        { title: 'Practica la habilidad STOP', description: 'Aprende a detenerte y responder con atención plena cuando aumenta la ansiedad.', reflection_prompt: '¿Cuándo podrías usar STOP en tu vida diaria?' },
        { title: 'Surfea la ola', description: 'Practica el surf de impulsos para manejar la ansiedad sin evitarla.', reflection_prompt: '¿Qué notaste cuando el impulso alcanzó su punto máximo y disminuyó?' },
        { title: 'Toma distancia de la preocupación', description: 'Aprende a desengancharte de los pensamientos ansiosos.', reflection_prompt: '¿Qué técnica de defusión te resultó más útil?' },
        { title: 'TIPP para la ansiedad intensa', description: 'Usa técnicas fisiológicas para reducir la ansiedad intensa.', reflection_prompt: '¿Qué habilidad TIPP te funcionó mejor?' },
        { title: 'Equilibra las evidencias', description: 'Evalúa los pensamientos ansiosos con evidencias equilibradas.', reflection_prompt: '¿Cómo cambió tu perspectiva al examinar las evidencias?' },
      ],
    },
    fr: {
      title: 'Défi de 7 jours pour réduire l’anxiété',
      description: 'Développez des compétences pratiques pour gérer l’anxiété grâce à des techniques de TCC, de TCD et d’ACT.',
      outcomes: ['Reconnaître et remettre en question les pensées anxieuses', 'Gérer les symptômes physiques de l’anxiété', 'Réduire les comportements d’évitement', 'Renforcer la confiance face à l’incertitude'],
      steps: [
        { title: 'Repérez vos pièges de pensée', description: 'Apprenez à reconnaître les distorsions cognitives qui alimentent l’anxiété.', reflection_prompt: 'Quels pièges de pensée remarquez-vous le plus souvent ?' },
        { title: 'Remettez en question les pensées anxieuses', description: 'Entraînez-vous à reformuler les pensées catastrophiques.', reflection_prompt: 'Qu’avez-vous ressenti en remettant en question vos pensées automatiques ?' },
        { title: 'Pratiquez la compétence STOP', description: 'Apprenez à faire une pause et à répondre en pleine conscience lorsque l’anxiété monte.', reflection_prompt: 'Quand pourriez-vous utiliser STOP au quotidien ?' },
        { title: 'Surfez sur la vague', description: 'Pratiquez le surf des envies pour gérer l’anxiété sans évitement.', reflection_prompt: 'Qu’avez-vous remarqué lorsque l’envie a atteint son pic puis diminué ?' },
        { title: 'Prenez du recul face aux inquiétudes', description: 'Apprenez à vous décrocher des pensées anxieuses.', reflection_prompt: 'Quelle technique de défusion vous a le plus aidé ?' },
        { title: 'TIPP pour une anxiété intense', description: 'Utilisez des techniques physiologiques pour réduire une anxiété intense.', reflection_prompt: 'Quelle compétence TIPP a le mieux fonctionné pour vous ?' },
        { title: 'Équilibrez les preuves', description: 'Évaluez les pensées anxieuses à partir de preuves équilibrées.', reflection_prompt: 'Comment l’examen des preuves a-t-il changé votre point de vue ?' },
      ],
    },
    de: {
      title: '7-Tage-Challenge zur Verringerung von Angst',
      description: 'Entwickle praktische Fähigkeiten zum Umgang mit Angst mithilfe von KVT-, DBT- und ACT-Techniken.',
      outcomes: ['Ängstliche Denkmuster erkennen und hinterfragen', 'Körperliche Angstsymptome bewältigen', 'Vermeidungsverhalten reduzieren', 'Sicherheit im Umgang mit Ungewissheit stärken'],
      steps: [
        { title: 'Erkenne deine Denkfallen', description: 'Lerne kognitive Verzerrungen zu erkennen, die Angst verstärken.', reflection_prompt: 'Welche Denkfallen bemerkst du am häufigsten?' },
        { title: 'Hinterfrage ängstliche Gedanken', description: 'Übe, katastrophisierende Gedanken neu zu bewerten.', reflection_prompt: 'Wie hat es sich angefühlt, deine automatischen Gedanken zu hinterfragen?' },
        { title: 'Übe die STOP-Fertigkeit', description: 'Lerne innezuhalten und achtsam zu reagieren, wenn die Angst ansteigt.', reflection_prompt: 'Wann könntest du STOP in deinem Alltag einsetzen?' },
        { title: 'Reite auf der Welle', description: 'Übe Urge Surfing, um mit Angst ohne Vermeidung umzugehen.', reflection_prompt: 'Was hast du bemerkt, als der Drang seinen Höhepunkt erreichte und abklang?' },
        { title: 'Löse dich von Sorgen', description: 'Lerne, dich von ängstlichen Gedanken zu lösen.', reflection_prompt: 'Welche Defusionstechnik war für dich am hilfreichsten?' },
        { title: 'TIPP bei starker Angst', description: 'Nutze körperorientierte Techniken, um starke Angst zu verringern.', reflection_prompt: 'Welche TIPP-Fertigkeit hat für dich am besten funktioniert?' },
        { title: 'Bringe die Belege ins Gleichgewicht', description: 'Prüfe ängstliche Gedanken anhand ausgewogener Belege.', reflection_prompt: 'Wie hat die Prüfung der Belege deine Sichtweise verändert?' },
      ],
    },
    it: {
      title: 'Sfida di 7 giorni per ridurre l’ansia',
      description: 'Sviluppa abilità pratiche per gestire l’ansia con tecniche CBT, DBT e ACT.',
      outcomes: ['Riconoscere e mettere in discussione i pensieri ansiosi', 'Gestire i sintomi fisici dell’ansia', 'Ridurre i comportamenti di evitamento', 'Aumentare la fiducia nell’affrontare l’incertezza'],
      steps: [
        { title: 'Riconosci le tue trappole mentali', description: 'Impara a riconoscere le distorsioni cognitive che alimentano l’ansia.', reflection_prompt: 'Quali trappole mentali noti più spesso?' },
        { title: 'Metti in discussione i pensieri ansiosi', description: 'Esercitati a riformulare il pensiero catastrofico.', reflection_prompt: 'Come ti sei sentito nel mettere in discussione i pensieri automatici?' },
        { title: 'Pratica l’abilità STOP', description: 'Impara a fermarti e rispondere con consapevolezza quando l’ansia aumenta.', reflection_prompt: 'Quando potresti usare STOP nella vita quotidiana?' },
        { title: 'Cavalca l’onda', description: 'Pratica il surf dell’impulso per gestire l’ansia senza evitamento.', reflection_prompt: 'Che cosa hai notato quando l’impulso ha raggiunto il picco ed è diminuito?' },
        { title: 'Prendi le distanze dalla preoccupazione', description: 'Impara a sganciarti dai pensieri ansiosi.', reflection_prompt: 'Quale tecnica di defusione ti è stata più utile?' },
        { title: 'TIPP per l’ansia intensa', description: 'Usa tecniche fisiologiche per ridurre l’ansia intensa.', reflection_prompt: 'Quale abilità TIPP ha funzionato meglio per te?' },
        { title: 'Bilancia le prove', description: 'Valuta i pensieri ansiosi usando prove equilibrate.', reflection_prompt: 'In che modo esaminare le prove ha cambiato la tua prospettiva?' },
      ],
    },
    pt: {
      title: 'Desafio de 7 dias para reduzir a ansiedade',
      description: 'Desenvolva habilidades práticas para lidar com a ansiedade usando técnicas de TCC, DBT e ACT.',
      outcomes: ['Reconhecer e questionar padrões de pensamento ansioso', 'Lidar com os sintomas físicos da ansiedade', 'Reduzir comportamentos de evitação', 'Aumentar a confiança diante da incerteza'],
      steps: [
        { title: 'Identifique suas armadilhas de pensamento', description: 'Aprenda a reconhecer distorções cognitivas que alimentam a ansiedade.', reflection_prompt: 'Quais armadilhas de pensamento você percebe com mais frequência?' },
        { title: 'Questione pensamentos ansiosos', description: 'Pratique a reformulação do pensamento catastrófico.', reflection_prompt: 'Como foi questionar seus pensamentos automáticos?' },
        { title: 'Pratique a habilidade STOP', description: 'Aprenda a parar e responder com atenção plena quando a ansiedade aumentar.', reflection_prompt: 'Quando você poderia usar STOP no dia a dia?' },
        { title: 'Surfe a onda', description: 'Pratique o surfe do impulso para lidar com a ansiedade sem evitação.', reflection_prompt: 'O que você percebeu quando o impulso atingiu o pico e diminuiu?' },
        { title: 'Afaste-se da preocupação', description: 'Aprenda a se desvincular de pensamentos ansiosos.', reflection_prompt: 'Qual técnica de desfusão foi mais útil para você?' },
        { title: 'TIPP para ansiedade intensa', description: 'Use técnicas fisiológicas para reduzir a ansiedade intensa.', reflection_prompt: 'Qual habilidade TIPP funcionou melhor para você?' },
        { title: 'Equilibre as evidências', description: 'Avalie pensamentos ansiosos com evidências equilibradas.', reflection_prompt: 'Como examinar as evidências mudou sua perspectiva?' },
      ],
    },
  },
  '6982fef0720645ff50b61060': {
    he: {
      title: 'מסלול קבלה מודעת (ACT)',
      description: 'למדו לקבל את מה שאינו בשליטתכם ולפעול למען הדברים החשובים לכם.',
      outcomes: ['פיתוח גמישות פסיכולוגית', 'הפחתת המאבק במחשבות לא רצויות', 'הבהרת הערכים האישיים', 'נקיטת פעולה מחויבת'],
      steps: [
        { title: 'היכרות עם יצירת מרחק מהמחשבה', description: 'למדו להתבונן במחשבות בלי להיסחף אחריהן.', reflection_prompt: 'איך זה מרגיש לראות מחשבות כמילים בלבד?' },
        { title: 'עלים על פני הנחל', description: 'תרגלו מתן אפשרות למחשבות לחלוף.', reflection_prompt: 'איך חוויתם את ההתבוננות במחשבות החולפות?' },
        { title: 'בדיקת הערכים שלכם', description: 'התחברו למה שבאמת חשוב לכם.', reflection_prompt: 'האם הפעולות שלכם תואמות את הערכים שלכם?' },
        { title: 'תרגול הרחבה', description: 'פנו מקום לרגשות קשים.', reflection_prompt: 'מה השתנה כשפיניתם מקום לרגש?' },
        { title: 'מצפן הערכים', description: 'עשו צעדים קטנים לעבר הדברים החשובים לכם.', reflection_prompt: 'לאיזו פעולה קטנה תוכלו להתחייב?' },
        { title: 'מדיטציית ההר', description: 'גלמו יציבות בתוך תנאים משתנים.', reflection_prompt: 'כיצד תוכלו להיות היום כמו הר?' },
      ],
    },
    es: {
      title: 'Camino de aceptación consciente (ACT)',
      description: 'Aprende a aceptar lo que no puedes controlar y a actuar en favor de lo que importa.',
      outcomes: ['Desarrollar flexibilidad psicológica', 'Reducir la lucha con pensamientos no deseados', 'Aclarar los valores personales', 'Actuar con compromiso'],
      steps: [
        { title: 'Introducción a la defusión', description: 'Aprende a observar los pensamientos sin quedar atrapado en ellos.', reflection_prompt: '¿Cómo se siente ver los pensamientos solo como palabras?' },
        { title: 'Hojas en un arroyo', description: 'Practica dejar que los pensamientos pasen.', reflection_prompt: '¿Cómo fue observar tus pensamientos pasar?' },
        { title: 'Revisa tus valores', description: 'Conecta con lo que realmente te importa.', reflection_prompt: '¿Tus acciones están alineadas con tus valores?' },
        { title: 'Práctica de expansión', description: 'Haz espacio para las emociones difíciles.', reflection_prompt: '¿Qué cambió cuando hiciste espacio para la emoción?' },
        { title: 'Brújula de valores', description: 'Da pequeños pasos hacia lo que importa.', reflection_prompt: '¿Con qué pequeña acción puedes comprometerte?' },
        { title: 'Meditación de la montaña', description: 'Cultiva estabilidad en medio de condiciones cambiantes.', reflection_prompt: '¿Cómo puedes ser hoy como la montaña?' },
      ],
    },
    fr: {
      title: 'Parcours d’acceptation en pleine conscience (ACT)',
      description: 'Apprenez à accepter ce que vous ne pouvez pas contrôler et à agir pour ce qui compte.',
      outcomes: ['Développer la flexibilité psychologique', 'Réduire la lutte contre les pensées indésirables', 'Clarifier ses valeurs personnelles', 'Passer à une action engagée'],
      steps: [
        { title: 'Introduction à la défusion', description: 'Apprenez à observer vos pensées sans vous y accrocher.', reflection_prompt: 'Que ressentez-vous en voyant les pensées comme de simples mots ?' },
        { title: 'Les feuilles sur le ruisseau', description: 'Entraînez-vous à laisser passer les pensées.', reflection_prompt: 'Comment avez-vous vécu le passage de vos pensées ?' },
        { title: 'Examinez vos valeurs', description: 'Reliez-vous à ce qui compte vraiment pour vous.', reflection_prompt: 'Vos actions sont-elles alignées sur vos valeurs ?' },
        { title: 'Pratique de l’expansion', description: 'Faites de la place aux émotions difficiles.', reflection_prompt: 'Qu’est-ce qui a changé lorsque vous avez accueilli l’émotion ?' },
        { title: 'La boussole des valeurs', description: 'Faites de petits pas vers ce qui compte.', reflection_prompt: 'À quelle petite action pouvez-vous vous engager ?' },
        { title: 'Méditation de la montagne', description: 'Incarnez la stabilité au milieu de conditions changeantes.', reflection_prompt: 'Comment pouvez-vous être aujourd’hui comme la montagne ?' },
      ],
    },
    de: {
      title: 'Pfad der achtsamen Akzeptanz (ACT)',
      description: 'Lerne anzunehmen, was du nicht kontrollieren kannst, und für das zu handeln, was dir wichtig ist.',
      outcomes: ['Psychologische Flexibilität entwickeln', 'Den Kampf mit unerwünschten Gedanken verringern', 'Persönliche Werte klären', 'Engagiert handeln'],
      steps: [
        { title: 'Einführung in die Defusion', description: 'Lerne Gedanken zu beobachten, ohne dich in ihnen zu verfangen.', reflection_prompt: 'Wie ist es, Gedanken nur als Worte zu betrachten?' },
        { title: 'Blätter auf einem Bach', description: 'Übe, Gedanken vorbeiziehen zu lassen.', reflection_prompt: 'Wie war es für dich, Gedanken vorbeiziehen zu sehen?' },
        { title: 'Überprüfe deine Werte', description: 'Verbinde dich mit dem, was dir wirklich wichtig ist.', reflection_prompt: 'Passen deine Handlungen zu deinen Werten?' },
        { title: 'Expansionsübung', description: 'Schaffe Raum für schwierige Gefühle.', reflection_prompt: 'Was hat sich verändert, als du dem Gefühl Raum gegeben hast?' },
        { title: 'Wertekompass', description: 'Mache kleine Schritte in Richtung dessen, was dir wichtig ist.', reflection_prompt: 'Zu welcher kleinen Handlung kannst du dich verpflichten?' },
        { title: 'Bergmeditation', description: 'Verkörpere Stabilität unter wechselnden Bedingungen.', reflection_prompt: 'Wie kannst du heute wie ein Berg sein?' },
      ],
    },
    it: {
      title: 'Percorso di accettazione consapevole (ACT)',
      description: 'Impara ad accettare ciò che non puoi controllare e ad agire per ciò che conta.',
      outcomes: ['Sviluppare flessibilità psicologica', 'Ridurre la lotta con i pensieri indesiderati', 'Chiarire i valori personali', 'Agire con impegno'],
      steps: [
        { title: 'Introduzione alla defusione', description: 'Impara a osservare i pensieri senza rimanerne agganciato.', reflection_prompt: 'Com’è vedere i pensieri come semplici parole?' },
        { title: 'Foglie su un ruscello', description: 'Esercitati a lasciare che i pensieri scorrano via.', reflection_prompt: 'Com’è stato osservare i pensieri passare?' },
        { title: 'Verifica i tuoi valori', description: 'Connettiti con ciò che conta davvero per te.', reflection_prompt: 'Le tue azioni sono allineate ai tuoi valori?' },
        { title: 'Pratica di espansione', description: 'Fai spazio alle emozioni difficili.', reflection_prompt: 'Che cosa è cambiato quando hai fatto spazio all’emozione?' },
        { title: 'Bussola dei valori', description: 'Fai piccoli passi verso ciò che conta.', reflection_prompt: 'A quale piccola azione puoi impegnarti?' },
        { title: 'Meditazione della montagna', description: 'Incarna la stabilità in condizioni mutevoli.', reflection_prompt: 'Come puoi essere oggi come la montagna?' },
      ],
    },
    pt: {
      title: 'Caminho de aceitação consciente (ACT)',
      description: 'Aprenda a aceitar o que não pode controlar e a agir em favor do que importa.',
      outcomes: ['Desenvolver flexibilidade psicológica', 'Reduzir a luta com pensamentos indesejados', 'Esclarecer valores pessoais', 'Agir com compromisso'],
      steps: [
        { title: 'Introdução à desfusão', description: 'Aprenda a observar pensamentos sem ficar preso a eles.', reflection_prompt: 'Como é ver os pensamentos apenas como palavras?' },
        { title: 'Folhas em um riacho', description: 'Pratique deixar os pensamentos passarem.', reflection_prompt: 'Como foi observar seus pensamentos passando?' },
        { title: 'Verifique seus valores', description: 'Conecte-se com o que realmente importa para você.', reflection_prompt: 'Suas ações estão alinhadas aos seus valores?' },
        { title: 'Prática de expansão', description: 'Abra espaço para emoções difíceis.', reflection_prompt: 'O que mudou quando você abriu espaço para a emoção?' },
        { title: 'Bússola de valores', description: 'Dê pequenos passos em direção ao que importa.', reflection_prompt: 'Com qual pequena ação você pode se comprometer?' },
        { title: 'Meditação da montanha', description: 'Cultive estabilidade em meio a condições variáveis.', reflection_prompt: 'Como você pode ser hoje como a montanha?' },
      ],
    },
  },
  '6982fef0720645ff50b6105f': {
    he: {
      title: 'אימון בן 5 ימים לסבילות למצוקה',
      description: 'רכשו מיומנויות DBT להתמודדות עם רגעי משבר בלי להחמיר את המצב.',
      outcomes: ['מעבר בטוח של משבר בלי פעולות אימפולסיביות', 'בניית ערכת כלים לסבילות למצוקה', 'הפחתת הסבל הרגשי', 'קבלת החלטות טובות יותר תחת לחץ'],
      steps: [
        { title: 'TIPP: שינוי הכימיה בגוף', description: 'למדו להפחית במהירות את עוצמת הרגש.', reflection_prompt: 'מתי TIPP יוכל לעזור לכם במיוחד?' },
        { title: 'ACCEPTS: הסחת דעת מועילה', description: 'תרגלו דרכים בריאות להסחת הדעת.', reflection_prompt: 'איזו דרך להסחת הדעת עבדה עבורכם בצורה הטובה ביותר?' },
        { title: 'הרגעה עצמית בעזרת החושים', description: 'השתמשו בחוויות חושיות כדי לנחם ולהרגיע את עצמכם.', reflection_prompt: 'איזה אמצעי חושי מרגיע תוכלו לשמור בהישג יד?' },
        { title: 'IMPROVE: שיפור הרגע', description: 'הפכו רגע קשה למעט טוב יותר.', reflection_prompt: 'איזו מיומנות IMPROVE דיברה אליכם במיוחד?' },
        { title: 'חוכמת היתרונות והחסרונות', description: 'קבלו החלטות נבונות בזמן סערה רגשית.', reflection_prompt: 'כיצד שקילת היתרונות והחסרונות שינתה את נקודת המבט שלכם?' },
      ],
    },
    es: {
      title: 'Entrenamiento de 5 días en tolerancia al malestar',
      description: 'Domina habilidades de DBT para atravesar momentos de crisis sin empeorar la situación.',
      outcomes: ['Atravesar una crisis sin actuar impulsivamente', 'Crear un conjunto de herramientas de tolerancia al malestar', 'Reducir el sufrimiento emocional', 'Tomar mejores decisiones bajo presión'],
      steps: [
        { title: 'TIPP: cambia tu química corporal', description: 'Aprende a reducir rápidamente la intensidad emocional.', reflection_prompt: '¿Cuándo podría ayudarte más TIPP?' },
        { title: 'ACCEPTS: distráete con sabiduría', description: 'Practica técnicas saludables de distracción.', reflection_prompt: '¿Qué método de distracción funcionó mejor?' },
        { title: 'Autocálmate con tus sentidos', description: 'Usa experiencias sensoriales para reconfortarte.', reflection_prompt: '¿Qué recurso sensorial reconfortante puedes tener a mano?' },
        { title: 'IMPROVE: mejora el momento', description: 'Haz que un momento difícil sea un poco mejor.', reflection_prompt: '¿Qué habilidad IMPROVE conectó más contigo?' },
        { title: 'Sabiduría de pros y contras', description: 'Toma decisiones sensatas durante tormentas emocionales.', reflection_prompt: '¿Cómo cambió tu perspectiva al sopesar pros y contras?' },
      ],
    },
    fr: {
      title: 'Entraînement de 5 jours à la tolérance à la détresse',
      description: 'Maîtrisez des compétences de TCD pour traverser les moments de crise sans aggraver la situation.',
      outcomes: ['Traverser une crise sans agir impulsivement', 'Créer une boîte à outils de tolérance à la détresse', 'Réduire la souffrance émotionnelle', 'Prendre de meilleures décisions sous pression'],
      steps: [
        { title: 'TIPP : changez votre chimie corporelle', description: 'Apprenez à réduire rapidement l’intensité émotionnelle.', reflection_prompt: 'Quand TIPP pourrait-il vous aider le plus ?' },
        { title: 'ACCEPTS : distrayez-vous avec discernement', description: 'Pratiquez des techniques de distraction saines.', reflection_prompt: 'Quelle méthode de distraction a le mieux fonctionné ?' },
        { title: 'Apaisez-vous par vos sens', description: 'Utilisez des expériences sensorielles pour vous réconforter.', reflection_prompt: 'Quel réconfort sensoriel pouvez-vous garder à portée de main ?' },
        { title: 'IMPROVE : améliorez le moment', description: 'Rendez un moment difficile légèrement meilleur.', reflection_prompt: 'Quelle compétence IMPROVE vous a le plus parlé ?' },
        { title: 'La sagesse du pour et du contre', description: 'Prenez des décisions avisées pendant les tempêtes émotionnelles.', reflection_prompt: 'Comment peser le pour et le contre a-t-il changé votre point de vue ?' },
      ],
    },
    de: {
      title: '5-Tage-Training zur Stresstoleranz',
      description: 'Erlerne DBT-Fertigkeiten, um Krisen zu überstehen, ohne die Situation zu verschlimmern.',
      outcomes: ['Krisen ohne impulsives Handeln überstehen', 'Einen Werkzeugkasten für Stresstoleranz aufbauen', 'Emotionales Leiden verringern', 'Unter Druck bessere Entscheidungen treffen'],
      steps: [
        { title: 'TIPP: Verändere deine Körperchemie', description: 'Lerne, emotionale Intensität schnell zu senken.', reflection_prompt: 'Wann könnte dir TIPP am meisten helfen?' },
        { title: 'ACCEPTS: Lenke dich sinnvoll ab', description: 'Übe gesunde Ablenkungstechniken.', reflection_prompt: 'Welche Ablenkungsmethode hat am besten funktioniert?' },
        { title: 'Beruhige dich mit deinen Sinnen', description: 'Nutze Sinneserfahrungen, um dich zu trösten.', reflection_prompt: 'Welchen sinnlichen Trost kannst du griffbereit halten?' },
        { title: 'IMPROVE: Verbessere den Moment', description: 'Mache einen schwierigen Moment ein wenig besser.', reflection_prompt: 'Welche IMPROVE-Fertigkeit hat dich am meisten angesprochen?' },
        { title: 'Weisheit durch Pro und Kontra', description: 'Triff kluge Entscheidungen in emotionalen Stürmen.', reflection_prompt: 'Wie hat das Abwägen von Vor- und Nachteilen deine Sichtweise verändert?' },
      ],
    },
    it: {
      title: 'Allenamento di 5 giorni alla tolleranza del disagio',
      description: 'Padroneggia abilità DBT per superare i momenti di crisi senza peggiorare la situazione.',
      outcomes: ['Superare una crisi senza azioni impulsive', 'Creare una cassetta degli attrezzi per tollerare il disagio', 'Ridurre la sofferenza emotiva', 'Prendere decisioni migliori sotto pressione'],
      steps: [
        { title: 'TIPP: cambia la chimica del corpo', description: 'Impara a ridurre rapidamente l’intensità emotiva.', reflection_prompt: 'Quando potrebbe esserti più utile TIPP?' },
        { title: 'ACCEPTS: distraiti con saggezza', description: 'Pratica tecniche sane di distrazione.', reflection_prompt: 'Quale metodo di distrazione ha funzionato meglio?' },
        { title: 'Calmati attraverso i sensi', description: 'Usa esperienze sensoriali per confortarti.', reflection_prompt: 'Quale conforto sensoriale puoi tenere a portata di mano?' },
        { title: 'IMPROVE: migliora il momento', description: 'Rendi un momento difficile un po’ migliore.', reflection_prompt: 'Quale abilità IMPROVE ti ha colpito di più?' },
        { title: 'La saggezza dei pro e dei contro', description: 'Prendi decisioni sagge durante le tempeste emotive.', reflection_prompt: 'In che modo valutare pro e contro ha cambiato la tua prospettiva?' },
      ],
    },
    pt: {
      title: 'Treinamento de 5 dias em tolerância ao mal-estar',
      description: 'Domine habilidades de DBT para atravessar momentos de crise sem piorar a situação.',
      outcomes: ['Atravessar uma crise sem agir por impulso', 'Criar um conjunto de ferramentas de tolerância ao mal-estar', 'Reduzir o sofrimento emocional', 'Tomar decisões melhores sob pressão'],
      steps: [
        { title: 'TIPP: mude a química do corpo', description: 'Aprenda a reduzir rapidamente a intensidade emocional.', reflection_prompt: 'Quando TIPP poderia ajudar você mais?' },
        { title: 'ACCEPTS: distraia-se com sabedoria', description: 'Pratique técnicas saudáveis de distração.', reflection_prompt: 'Qual método de distração funcionou melhor?' },
        { title: 'Acalme-se com os sentidos', description: 'Use experiências sensoriais para se confortar.', reflection_prompt: 'Que conforto sensorial você pode manter por perto?' },
        { title: 'IMPROVE: melhore o momento', description: 'Torne um momento difícil um pouco melhor.', reflection_prompt: 'Qual habilidade IMPROVE mais combinou com você?' },
        { title: 'Sabedoria dos prós e contras', description: 'Tome decisões sábias durante tempestades emocionais.', reflection_prompt: 'Como avaliar prós e contras mudou sua perspectiva?' },
      ],
    },
  },
};

export function normalizeJourneyLanguage(language) {
  const normalized = String(language || 'en').toLowerCase().split('-')[0];
  return SUPPORTED_JOURNEY_LANGUAGES.includes(normalized) ? normalized : 'en';
}

function hasCompleteLocalizedContent(journey, localized) {
  if (!localized || typeof localized !== 'object') return false;
  if (!String(localized.title || '').trim() || !String(localized.description || '').trim()) return false;

  const sourceSteps = Array.isArray(journey.steps) ? journey.steps : [];
  const localizedSteps = Array.isArray(localized.steps) ? localized.steps : [];
  if (sourceSteps.length !== localizedSteps.length) return false;

  const stepsComplete = localizedSteps.every((step, index) =>
    String(step?.title || '').trim() &&
    String(step?.description || '').trim() &&
    (!sourceSteps[index]?.reflection_prompt || String(step?.reflection_prompt || '').trim())
  );
  if (!stepsComplete) return false;

  const sourceOutcomes = Array.isArray(journey.outcomes) ? journey.outcomes : [];
  const localizedOutcomes = Array.isArray(localized.outcomes) ? localized.outcomes : [];
  return sourceOutcomes.length === localizedOutcomes.length &&
    localizedOutcomes.every((outcome) => String(outcome || '').trim());
}

export function localizeJourney(journey, language) {
  if (!journey) return null;
  const locale = normalizeJourneyLanguage(language);
  const declaredLanguageValue = String(journey.language || '').toLowerCase().split('-')[0];
  const declaredLanguage = SUPPORTED_JOURNEY_LANGUAGES.includes(declaredLanguageValue)
    ? declaredLanguageValue
    : null;

  if (declaredLanguage === locale || (!declaredLanguage && locale === 'en')) {
    return { ...journey, content_language: locale };
  }

  const localized =
    journey.localizations?.[locale] ||
    legacyJourneyContent[journey.id]?.[locale];

  if (!hasCompleteLocalizedContent(journey, localized)) return null;

  return {
    ...journey,
    ...localized,
    content_language: locale,
    steps: journey.steps.map((step, index) => ({
      ...step,
      ...localized.steps[index],
    })),
  };
}

export function localizeJourneys(journeys, language) {
  return (Array.isArray(journeys) ? journeys : [])
    .map((journey) => localizeJourney(journey, language))
    .filter(Boolean);
}

export { SUPPORTED_JOURNEY_LANGUAGES };
