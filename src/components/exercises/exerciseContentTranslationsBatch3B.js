/**
 * Wave 3 exercise content localization — batch 3B.
 * Five mindfulness-based emotion-regulation exercises in all seven supported languages.
 */

const makeContent = (title, description, tags, steps, benefits, tips) => ({
  title,
  description,
  tags,
  steps: steps.map(([stepTitle, stepDescription]) => ({ title: stepTitle, description: stepDescription })),
  benefits,
  tips
});

export const EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B = {
  'local-mindfulness-present-moment': {
    en: makeContent(
      'Present Moment Awareness',
      'Gently return attention to current sensations and experience to steady attention and create space around difficult emotions.',
      ['mindfulness', 'present moment', 'attention', 'emotion regulation'],
      [
        ['Settle', 'Sit in a stable and comfortable position, with eyes closed or your gaze softened.'],
        ['Choose an anchor', 'Bring attention to breathing, contact with the chair, or another neutral body sensation.'],
        ['Notice wandering', 'When attention moves to thoughts, memories, or feelings, acknowledge it without judging yourself.'],
        ['Return gently', 'Guide attention back to the anchor each time, as often as needed.'],
        ['Open awareness', 'Gradually include sounds, body sensations, thoughts, and emotions as passing parts of this moment.']
      ],
      ['Strengthens attention regulation', 'Reduces automatic entanglement with thoughts', 'Creates steadiness during emotional activation'],
      ['Noticing that attention wandered is part of the practice, not a mistake.', 'If focusing inward increases distress, keep your eyes open and use external sights or sounds as the anchor.']
    ),
    he: makeContent(
      'מודעות לרגע הנוכחי',
      'החזירו בעדינות את הקשב לתחושות ולחוויה הנוכחית כדי לייצב את תשומת הלב וליצור מרחב סביב רגשות קשים.',
      ['מיינדפולנס', 'הרגע הנוכחי', 'קשב', 'ויסות רגשי'],
      [
        ['התמקמות', 'שבו בתנוחה יציבה ונוחה, בעיניים עצומות או במבט רך.'],
        ['בחירת עוגן', 'הפנו את הקשב לנשימה, למגע עם הכיסא או לתחושת גוף ניטרלית אחרת.'],
        ['הבחנה בנדידת הקשב', 'כאשר הקשב עובר למחשבות, לזיכרונות או לרגשות, הכירו בכך בלי לשפוט את עצמכם.'],
        ['חזרה בעדינות', 'החזירו את הקשב אל העוגן בכל פעם, כמה פעמים שנדרש.'],
        ['הרחבת המודעות', 'כללו בהדרגה צלילים, תחושות גוף, מחשבות ורגשות כחלקים חולפים של הרגע הזה.']
      ],
      ['מחזק ויסות קשב', 'מפחית היסחפות אוטומטית אחר מחשבות', 'יוצר יציבות בזמן עוררות רגשית'],
      ['ההבחנה בכך שהקשב נדד היא חלק מהתרגול ולא טעות.', 'אם הפניית הקשב פנימה מגבירה מצוקה, השאירו עיניים פתוחות והשתמשו במראות או בצלילים חיצוניים כעוגן.']
    ),
    es: makeContent(
      'Conciencia del momento presente',
      'Devuelve suavemente la atención a las sensaciones y a la experiencia actual para estabilizarla y crear espacio alrededor de emociones difíciles.',
      ['mindfulness', 'momento presente', 'atención', 'regulación emocional'],
      [
        ['Acomodarse', 'Siéntate en una postura estable y cómoda, con los ojos cerrados o la mirada suave.'],
        ['Elegir un ancla', 'Lleva la atención a la respiración, al contacto con la silla u otra sensación corporal neutra.'],
        ['Notar la distracción', 'Cuando la atención pase a pensamientos, recuerdos o emociones, reconócelo sin juzgarte.'],
        ['Volver con suavidad', 'Guía de nuevo la atención al ancla cada vez, tantas veces como sea necesario.'],
        ['Ampliar la conciencia', 'Incluye gradualmente sonidos, sensaciones corporales, pensamientos y emociones como partes pasajeras de este momento.']
      ],
      ['Fortalece la regulación de la atención', 'Reduce el enganche automático con los pensamientos', 'Aporta estabilidad durante la activación emocional'],
      ['Notar que la atención se distrajo es parte de la práctica, no un error.', 'Si mirar hacia dentro aumenta el malestar, mantén los ojos abiertos y usa imágenes o sonidos externos como ancla.']
    ),
    fr: makeContent(
      'Conscience du moment présent',
      'Ramenez doucement l’attention aux sensations et à l’expérience actuelles afin de la stabiliser et de créer de l’espace autour des émotions difficiles.',
      ['pleine conscience', 'moment présent', 'attention', 'régulation émotionnelle'],
      [
        ['S’installer', 'Asseyez-vous dans une position stable et confortable, les yeux fermés ou le regard détendu.'],
        ['Choisir un ancrage', 'Portez attention à la respiration, au contact avec la chaise ou à une autre sensation corporelle neutre.'],
        ['Remarquer l’errance', 'Lorsque l’attention part vers des pensées, souvenirs ou émotions, constatez-le sans vous juger.'],
        ['Revenir doucement', 'Ramenez l’attention vers l’ancrage chaque fois que nécessaire.'],
        ['Élargir la conscience', 'Incluez progressivement sons, sensations corporelles, pensées et émotions comme des éléments passagers de cet instant.']
      ],
      ['Renforce la régulation de l’attention', 'Réduit l’absorption automatique dans les pensées', 'Apporte de la stabilité lors d’une activation émotionnelle'],
      ['Remarquer que l’attention s’est égarée fait partie de la pratique.', 'Si l’attention intérieure augmente la détresse, gardez les yeux ouverts et utilisez des sons ou des éléments visuels extérieurs comme ancrage.']
    ),
    de: makeContent(
      'Gewahrsein im gegenwärtigen Moment',
      'Lenke die Aufmerksamkeit sanft auf gegenwärtige Empfindungen und Erfahrungen zurück, um sie zu stabilisieren und Raum um schwierige Gefühle zu schaffen.',
      ['Achtsamkeit', 'Gegenwart', 'Aufmerksamkeit', 'Emotionsregulation'],
      [
        ['Ankommen', 'Setze dich stabil und bequem hin, mit geschlossenen Augen oder weichem Blick.'],
        ['Anker wählen', 'Richte die Aufmerksamkeit auf den Atem, den Kontakt zum Stuhl oder eine andere neutrale Körperempfindung.'],
        ['Abschweifen bemerken', 'Wenn die Aufmerksamkeit zu Gedanken, Erinnerungen oder Gefühlen wandert, nimm es ohne Selbstkritik wahr.'],
        ['Sanft zurückkehren', 'Führe die Aufmerksamkeit jedes Mal und so oft wie nötig zum Anker zurück.'],
        ['Gewahrsein öffnen', 'Beziehe nach und nach Geräusche, Körperempfindungen, Gedanken und Gefühle als vorübergehende Teile dieses Moments ein.']
      ],
      ['Stärkt die Aufmerksamkeitsregulation', 'Verringert automatisches Verstricken in Gedanken', 'Schafft Stabilität bei emotionaler Aktivierung'],
      ['Das Bemerken des Abschweifens ist Teil der Übung und kein Fehler.', 'Wenn innere Aufmerksamkeit die Belastung erhöht, öffne die Augen und nutze äußere Bilder oder Geräusche als Anker.']
    ),
    it: makeContent(
      'Consapevolezza del momento presente',
      'Riporta delicatamente l’attenzione alle sensazioni e all’esperienza attuali per stabilizzarla e creare spazio intorno alle emozioni difficili.',
      ['mindfulness', 'momento presente', 'attenzione', 'regolazione emotiva'],
      [
        ['Sistemarsi', 'Siediti in una posizione stabile e comoda, con gli occhi chiusi o lo sguardo morbido.'],
        ['Scegliere un’ancora', 'Porta l’attenzione al respiro, al contatto con la sedia o a un’altra sensazione corporea neutra.'],
        ['Notare la distrazione', 'Quando l’attenzione va a pensieri, ricordi o emozioni, riconoscilo senza giudicarti.'],
        ['Tornare con gentilezza', 'Riporta ogni volta l’attenzione all’ancora, tutte le volte necessarie.'],
        ['Ampliare la consapevolezza', 'Includi gradualmente suoni, sensazioni corporee, pensieri ed emozioni come parti passeggere di questo momento.']
      ],
      ['Rafforza la regolazione dell’attenzione', 'Riduce il coinvolgimento automatico nei pensieri', 'Crea stabilità durante l’attivazione emotiva'],
      ['Accorgersi che l’attenzione si è spostata fa parte della pratica, non è un errore.', 'Se l’attenzione interna aumenta il disagio, tieni gli occhi aperti e usa immagini o suoni esterni come ancora.']
    ),
    pt: makeContent(
      'Consciência do momento presente',
      'Traga suavemente a atenção de volta às sensações e à experiência atuais para estabilizá-la e criar espaço ao redor de emoções difíceis.',
      ['mindfulness', 'momento presente', 'atenção', 'regulação emocional'],
      [
        ['Acomodar-se', 'Sente-se em uma posição estável e confortável, com os olhos fechados ou o olhar suave.'],
        ['Escolher uma âncora', 'Leve a atenção à respiração, ao contato com a cadeira ou a outra sensação corporal neutra.'],
        ['Perceber a distração', 'Quando a atenção for para pensamentos, lembranças ou emoções, reconheça isso sem se julgar.'],
        ['Voltar com gentileza', 'Conduza a atenção de volta à âncora sempre que necessário.'],
        ['Ampliar a consciência', 'Inclua gradualmente sons, sensações corporais, pensamentos e emoções como partes passageiras deste momento.']
      ],
      ['Fortalece a regulação da atenção', 'Reduz o envolvimento automático com pensamentos', 'Cria estabilidade durante a ativação emocional'],
      ['Perceber que a atenção se desviou faz parte da prática, não é um erro.', 'Se o foco interno aumentar o sofrimento, mantenha os olhos abertos e use imagens ou sons externos como âncora.']
    )
  },

  'local-mindfulness-loving-kindness': {
    en: makeContent(
      'Loving-Kindness Meditation',
      'Practice offering wishes of safety, well-being, and ease to yourself and others to cultivate compassion and soften harsh self-criticism.',
      ['compassion', 'mindfulness', 'self-kindness', 'emotion regulation'],
      [
        ['Begin with yourself', 'Silently offer yourself simple wishes such as: May I be safe, healthy, and at ease.'],
        ['A supportive person', 'Picture someone whose care feels safe and offer them the same wishes.'],
        ['A neutral person', 'Bring to mind someone you barely know and extend the wishes to them.'],
        ['A difficult person', 'Only if it feels manageable, offer a brief wish of well-being to someone difficult.'],
        ['Widen the circle', 'Gradually extend the wishes to your community and to all living beings.']
      ],
      ['Cultivates self-compassion', 'Softens hostility and self-criticism', 'Supports connection and emotional warmth'],
      ['Use words that feel sincere rather than forcing a particular emotion.', 'Skip the difficult-person step if it feels unsafe or overwhelming.']
    ),
    he: makeContent(
      'מדיטציית אהבה וחסד',
      'תרגלו איחולים של ביטחון, רווחה ונינוחות לעצמכם ולאחרים כדי לטפח חמלה ולרכך ביקורת עצמית נוקשה.',
      ['חמלה', 'מיינדפולנס', 'טוב לב עצמי', 'ויסות רגשי'],
      [
        ['התחלה בעצמכם', 'אמרו לעצמכם בשקט איחולים פשוטים, כגון: הלוואי שאהיה בטוח, בריא ונינוח.'],
        ['אדם תומך', 'דמיינו אדם שהדאגה שלו מרגישה בטוחה והפנו אליו את אותם איחולים.'],
        ['אדם ניטרלי', 'העלו בדעתכם אדם שאתם מכירים מעט והרחיבו אליו את האיחולים.'],
        ['אדם שקשה מולו', 'רק אם הדבר מרגיש אפשרי, הפנו איחול קצר לרווחה גם לאדם שקשה לכם מולו.'],
        ['הרחבת המעגל', 'הרחיבו בהדרגה את האיחולים לקהילה שלכם ולכל היצורים החיים.']
      ],
      ['מטפח חמלה עצמית', 'מרכך עוינות וביקורת עצמית', 'תומך בחיבור ובחום רגשי'],
      ['השתמשו במילים שמרגישות כנות בלי להכריח רגש מסוים.', 'דלגו על שלב האדם שקשה מולו אם הוא מרגיש לא בטוח או מציף.']
    ),
    es: makeContent(
      'Meditación de bondad amorosa',
      'Practica deseos de seguridad, bienestar y calma para ti y otras personas a fin de cultivar compasión y suavizar la autocrítica severa.',
      ['compasión', 'mindfulness', 'bondad hacia uno mismo', 'regulación emocional'],
      [
        ['Comenzar contigo', 'Ofrécete en silencio deseos sencillos: Que esté a salvo, con salud y en calma.'],
        ['Una persona de apoyo', 'Imagina a alguien cuyo cuidado se sienta seguro y ofrécele los mismos deseos.'],
        ['Una persona neutral', 'Piensa en alguien a quien apenas conoces y extiende los deseos hacia esa persona.'],
        ['Una persona difícil', 'Solo si resulta manejable, ofrece un breve deseo de bienestar a alguien difícil.'],
        ['Ampliar el círculo', 'Extiende gradualmente los deseos a tu comunidad y a todos los seres vivos.']
      ],
      ['Cultiva la autocompasión', 'Suaviza la hostilidad y la autocrítica', 'Favorece la conexión y la calidez emocional'],
      ['Usa palabras que se sientan sinceras sin forzar una emoción concreta.', 'Omite el paso de la persona difícil si se siente inseguro o abrumador.']
    ),
    fr: makeContent(
      'Méditation de bienveillance',
      'Formulez des souhaits de sécurité, de bien-être et d’apaisement pour vous-même et pour autrui afin de cultiver la compassion et d’adoucir l’autocritique.',
      ['compassion', 'pleine conscience', 'bienveillance envers soi', 'régulation émotionnelle'],
      [
        ['Commencer par soi', 'Adressez-vous silencieusement des souhaits simples : Puissé-je être en sécurité, en bonne santé et apaisé.'],
        ['Une personne soutenante', 'Imaginez une personne dont l’attention vous paraît sûre et adressez-lui les mêmes souhaits.'],
        ['Une personne neutre', 'Pensez à une personne que vous connaissez à peine et étendez-lui ces souhaits.'],
        ['Une personne difficile', 'Seulement si cela reste supportable, adressez un bref souhait de bien-être à une personne difficile.'],
        ['Élargir le cercle', 'Étendez progressivement les souhaits à votre communauté puis à tous les êtres vivants.']
      ],
      ['Cultive l’autocompassion', 'Adoucit l’hostilité et l’autocritique', 'Favorise le lien et la chaleur émotionnelle'],
      ['Choisissez des mots sincères sans forcer une émotion particulière.', 'Sautez l’étape de la personne difficile si elle semble dangereuse ou accablante.']
    ),
    de: makeContent(
      'Meditation der liebenden Güte',
      'Übe Wünsche nach Sicherheit, Wohlergehen und Leichtigkeit für dich und andere, um Mitgefühl zu fördern und harte Selbstkritik zu mildern.',
      ['Mitgefühl', 'Achtsamkeit', 'Selbstfreundlichkeit', 'Emotionsregulation'],
      [
        ['Bei dir beginnen', 'Schenke dir still einfache Wünsche: Möge ich sicher, gesund und unbeschwert sein.'],
        ['Unterstützende Person', 'Stelle dir jemanden vor, dessen Fürsorge sich sicher anfühlt, und sende dieselben Wünsche.'],
        ['Neutrale Person', 'Denke an jemanden, den du kaum kennst, und weite die Wünsche auf diese Person aus.'],
        ['Schwierige Person', 'Nur wenn es gut auszuhalten ist, richte einen kurzen Wunsch nach Wohlergehen an eine schwierige Person.'],
        ['Kreis erweitern', 'Weite die Wünsche allmählich auf deine Gemeinschaft und alle Lebewesen aus.']
      ],
      ['Fördert Selbstmitgefühl', 'Mildert Feindseligkeit und Selbstkritik', 'Unterstützt Verbundenheit und emotionale Wärme'],
      ['Nutze Worte, die sich ehrlich anfühlen, ohne ein bestimmtes Gefühl zu erzwingen.', 'Überspringe die schwierige Person, wenn dieser Schritt unsicher oder überwältigend wirkt.']
    ),
    it: makeContent(
      'Meditazione di gentilezza amorevole',
      'Offri auguri di sicurezza, benessere e serenità a te e agli altri per coltivare compassione e attenuare una dura autocritica.',
      ['compassione', 'mindfulness', 'gentilezza verso di sé', 'regolazione emotiva'],
      [
        ['Iniziare da sé', 'Rivolgiti in silenzio auguri semplici: Che io sia al sicuro, in salute e sereno.'],
        ['Una persona di sostegno', 'Immagina qualcuno la cui cura sembra sicura e rivolgigli gli stessi auguri.'],
        ['Una persona neutrale', 'Pensa a qualcuno che conosci appena ed estendi a lui gli auguri.'],
        ['Una persona difficile', 'Solo se è gestibile, offri un breve augurio di benessere a una persona difficile.'],
        ['Ampliare il cerchio', 'Estendi gradualmente gli auguri alla tua comunità e a tutti gli esseri viventi.']
      ],
      ['Coltiva l’autocompassione', 'Attenua ostilità e autocritica', 'Favorisce connessione e calore emotivo'],
      ['Usa parole sincere senza forzare una particolare emozione.', 'Salta il passaggio della persona difficile se sembra poco sicuro o opprimente.']
    ),
    pt: makeContent(
      'Meditação de bondade amorosa',
      'Ofereça desejos de segurança, bem-estar e tranquilidade a si e aos outros para cultivar compaixão e suavizar a autocrítica severa.',
      ['compaixão', 'mindfulness', 'gentileza consigo', 'regulação emocional'],
      [
        ['Começar por si', 'Ofereça silenciosamente desejos simples: Que eu esteja seguro, saudável e em paz.'],
        ['Uma pessoa de apoio', 'Imagine alguém cujo cuidado pareça seguro e ofereça os mesmos desejos.'],
        ['Uma pessoa neutra', 'Pense em alguém que conhece pouco e estenda os desejos a essa pessoa.'],
        ['Uma pessoa difícil', 'Somente se for suportável, ofereça um breve desejo de bem-estar a alguém difícil.'],
        ['Ampliar o círculo', 'Estenda gradualmente os desejos à sua comunidade e a todos os seres vivos.']
      ],
      ['Cultiva autocompaixão', 'Suaviza hostilidade e autocrítica', 'Apoia conexão e calor emocional'],
      ['Use palavras que pareçam sinceras sem forçar uma emoção específica.', 'Pule a etapa da pessoa difícil se ela parecer insegura ou avassaladora.']
    )
  },

  'local-mindfulness-urge-surfing': {
    en: makeContent(
      'Urge Surfing',
      'Observe an urge as a changing wave of sensations so you can pause, make room for it, and choose your response instead of acting automatically.',
      ['mindfulness', 'urges', 'distress tolerance', 'impulse control'],
      [
        ['Name the urge', 'Pause and complete the sentence: I notice an urge to…'],
        ['Locate it', 'Notice where and how the urge appears in your body without trying to remove it.'],
        ['Watch the wave', 'Observe the sensations rising, shifting, and falling like a wave.'],
        ['Breathe and ride', 'Use steady breathing while allowing the wave to move at its own pace.'],
        ['Choose the next step', 'When intensity changes, choose a safe action that supports your longer-term goals.']
      ],
      ['Creates a pause between urge and action', 'Builds distress tolerance', 'Supports deliberate choices during strong impulses'],
      ['The goal is not to force the urge away, but to observe that it changes.', 'For urges involving immediate danger or harm, move to safety and seek human or emergency support rather than using this exercise alone.']
    ),
    he: makeContent(
      'גלישת דחף',
      'התבוננו בדחף כגל משתנה של תחושות כדי לעצור, לפנות לו מקום ולבחור תגובה במקום לפעול באופן אוטומטי.',
      ['מיינדפולנס', 'דחפים', 'סבילות למצוקה', 'שליטה בדחפים'],
      [
        ['מתן שם לדחף', 'עצרו והשלימו את המשפט: אני מבחין בדחף ל…'],
        ['איתור בגוף', 'שימו לב היכן וכיצד הדחף מופיע בגוף בלי לנסות לסלק אותו.'],
        ['התבוננות בגל', 'התבוננו בתחושות עולות, משתנות ויורדות כמו גל.'],
        ['נשימה וגלישה', 'נשמו בקצב יציב ואפשרו לגל לנוע בקצב שלו.'],
        ['בחירת הצעד הבא', 'כאשר העוצמה משתנה, בחרו פעולה בטוחה שתומכת במטרות שלכם לטווח ארוך.']
      ],
      ['יוצר מרווח בין דחף לפעולה', 'מחזק סבילות למצוקה', 'תומך בבחירה מכוונת בזמן דחפים חזקים'],
      ['המטרה אינה להכריח את הדחף להיעלם אלא לראות שהוא משתנה.', 'בדחף הכרוך בסכנה מיידית או בפגיעה, עברו למקום בטוח ופנו לעזרה אנושית או לשירותי חירום במקום להסתמך על התרגיל לבדו.']
    ),
    es: makeContent(
      'Surfear el impulso',
      'Observa un impulso como una ola cambiante de sensaciones para pausar, darle espacio y elegir tu respuesta en lugar de actuar automáticamente.',
      ['mindfulness', 'impulsos', 'tolerancia al malestar', 'control de impulsos'],
      [
        ['Nombrar el impulso', 'Haz una pausa y completa: Noto un impulso de…'],
        ['Localizarlo', 'Observa dónde y cómo aparece en el cuerpo sin intentar eliminarlo.'],
        ['Mirar la ola', 'Observa cómo las sensaciones suben, cambian y bajan como una ola.'],
        ['Respirar y surfear', 'Respira de forma estable mientras permites que la ola avance a su propio ritmo.'],
        ['Elegir el siguiente paso', 'Cuando cambie la intensidad, elige una acción segura que apoye tus metas a largo plazo.']
      ],
      ['Crea una pausa entre impulso y acción', 'Aumenta la tolerancia al malestar', 'Apoya elecciones deliberadas ante impulsos fuertes'],
      ['La meta no es forzar la desaparición del impulso, sino observar que cambia.', 'Ante impulsos con peligro inmediato o daño, ponte a salvo y busca apoyo humano o de emergencias en vez de usar este ejercicio solo.']
    ),
    fr: makeContent(
      'Surfer sur l’impulsion',
      'Observez une impulsion comme une vague changeante de sensations afin de faire une pause, de lui laisser de l’espace et de choisir votre réponse.',
      ['pleine conscience', 'impulsions', 'tolérance à la détresse', 'contrôle des impulsions'],
      [
        ['Nommer l’impulsion', 'Faites une pause et complétez : Je remarque une impulsion à…'],
        ['La localiser', 'Observez où et comment elle apparaît dans le corps sans chercher à la supprimer.'],
        ['Observer la vague', 'Regardez les sensations monter, changer puis redescendre comme une vague.'],
        ['Respirer et surfer', 'Respirez régulièrement tout en laissant la vague évoluer à son propre rythme.'],
        ['Choisir la suite', 'Lorsque l’intensité change, choisissez une action sûre qui soutient vos objectifs à long terme.']
      ],
      ['Crée une pause entre impulsion et action', 'Développe la tolérance à la détresse', 'Favorise des choix délibérés face aux impulsions fortes'],
      ['Le but n’est pas de forcer l’impulsion à disparaître, mais d’observer qu’elle change.', 'En cas d’impulsion impliquant un danger immédiat ou une atteinte, mettez-vous en sécurité et cherchez une aide humaine ou d’urgence.']
    ),
    de: makeContent(
      'Auf der Impulswelle surfen',
      'Beobachte einen Impuls als veränderliche Welle von Empfindungen, um innezuhalten, Raum zu schaffen und bewusst zu reagieren.',
      ['Achtsamkeit', 'Impulse', 'Stresstoleranz', 'Impulskontrolle'],
      [
        ['Impuls benennen', 'Halte inne und vervollständige: Ich bemerke einen Impuls zu…'],
        ['Im Körper finden', 'Beobachte, wo und wie der Impuls im Körper erscheint, ohne ihn beseitigen zu wollen.'],
        ['Welle beobachten', 'Nimm wahr, wie Empfindungen wie eine Welle ansteigen, sich verändern und abfallen.'],
        ['Atmen und mitgehen', 'Atme gleichmäßig und erlaube der Welle, sich in ihrem eigenen Tempo zu bewegen.'],
        ['Nächsten Schritt wählen', 'Wenn sich die Intensität verändert, wähle eine sichere Handlung für deine langfristigen Ziele.']
      ],
      ['Schafft eine Pause zwischen Impuls und Handlung', 'Stärkt Stresstoleranz', 'Unterstützt bewusste Entscheidungen bei starken Impulsen'],
      ['Das Ziel ist nicht, den Impuls wegzuzwingen, sondern seine Veränderung zu beobachten.', 'Bei Impulsen mit unmittelbarer Gefahr oder Schaden bringe dich in Sicherheit und hole menschliche oder Notfallhilfe.']
    ),
    it: makeContent(
      'Surfare l’impulso',
      'Osserva un impulso come un’onda mutevole di sensazioni per fermarti, fargli spazio e scegliere la risposta invece di agire automaticamente.',
      ['mindfulness', 'impulsi', 'tolleranza al disagio', 'controllo degli impulsi'],
      [
        ['Nominare l’impulso', 'Fermati e completa: Noto un impulso a…'],
        ['Localizzarlo', 'Osserva dove e come appare nel corpo senza cercare di eliminarlo.'],
        ['Guardare l’onda', 'Osserva le sensazioni salire, cambiare e scendere come un’onda.'],
        ['Respirare e surfare', 'Respira con regolarità lasciando che l’onda si muova al proprio ritmo.'],
        ['Scegliere il passo successivo', 'Quando l’intensità cambia, scegli un’azione sicura che sostenga i tuoi obiettivi a lungo termine.']
      ],
      ['Crea una pausa tra impulso e azione', 'Aumenta la tolleranza al disagio', 'Sostiene scelte deliberate durante impulsi forti'],
      ['Lo scopo non è costringere l’impulso a sparire, ma osservare che cambia.', 'Per impulsi che comportano pericolo immediato o danno, mettiti al sicuro e cerca aiuto umano o di emergenza.']
    ),
    pt: makeContent(
      'Surfar o impulso',
      'Observe um impulso como uma onda mutável de sensações para pausar, abrir espaço e escolher sua resposta em vez de agir automaticamente.',
      ['mindfulness', 'impulsos', 'tolerância ao sofrimento', 'controle de impulsos'],
      [
        ['Nomear o impulso', 'Faça uma pausa e complete: Percebo um impulso de…'],
        ['Localizá-lo', 'Observe onde e como ele aparece no corpo sem tentar eliminá-lo.'],
        ['Observar a onda', 'Observe as sensações subirem, mudarem e descerem como uma onda.'],
        ['Respirar e surfar', 'Respire de modo estável enquanto permite que a onda siga seu próprio ritmo.'],
        ['Escolher o próximo passo', 'Quando a intensidade mudar, escolha uma ação segura que apoie seus objetivos de longo prazo.']
      ],
      ['Cria uma pausa entre impulso e ação', 'Desenvolve tolerância ao sofrimento', 'Apoia escolhas deliberadas diante de impulsos fortes'],
      ['O objetivo não é forçar o impulso a desaparecer, mas observar que ele muda.', 'Para impulsos com perigo imediato ou dano, vá para um local seguro e procure apoio humano ou de emergência.']
    )
  },

  'local-mindfulness-leaves-stream': {
    en: makeContent(
      'Leaves on a Stream',
      'Practice seeing thoughts as passing mental events by imagining each one resting on a leaf and moving downstream.',
      ['ACT', 'cognitive defusion', 'mindfulness', 'thoughts'],
      [
        ['Picture the stream', 'Imagine a gentle stream with leaves moving slowly across the water.'],
        ['Notice a thought', 'When a thought appears, name it briefly without deciding whether it is true or false.'],
        ['Place it on a leaf', 'Imagine setting the words, image, or feeling connected with the thought on one leaf.'],
        ['Let it move', 'Watch the leaf travel downstream without pushing it away or following it.'],
        ['Continue kindly', 'If you become caught in a thought, notice that and place the next thought on another leaf.']
      ],
      ['Creates distance from difficult thoughts', 'Reduces fusion with mental content', 'Supports flexible emotional responding'],
      ['The aim is to change your relationship with thoughts, not to empty your mind.', 'If imagery is difficult, write each thought on paper and slide the paper aside.']
    ),
    he: makeContent(
      'עלים על פני נחל',
      'תרגלו ראיית מחשבות כאירועים מנטליים חולפים באמצעות דמיון של כל מחשבה מונחת על עלה ונעה במורד הנחל.',
      ['ACT', 'הפרדה קוגניטיבית', 'מיינדפולנס', 'מחשבות'],
      [
        ['דמיון הנחל', 'דמיינו נחל רגוע ועלים שנעים באיטיות על פני המים.'],
        ['הבחנה במחשבה', 'כאשר מופיעה מחשבה, תנו לה שם קצר בלי להחליט אם היא נכונה או שגויה.'],
        ['הנחה על עלה', 'דמיינו שאתם מניחים על עלה את המילים, התמונה או התחושה הקשורות למחשבה.'],
        ['מתן אפשרות לנוע', 'צפו בעלה נע במורד הנחל בלי לדחוף אותו ובלי ללכת אחריו.'],
        ['המשך באדיבות', 'אם נסחפתם בתוך מחשבה, שימו לב לכך והניחו את המחשבה הבאה על עלה אחר.']
      ],
      ['יוצר מרחק ממחשבות קשות', 'מפחית היצמדות לתוכן המחשבה', 'תומך בתגובה רגשית גמישה'],
      ['המטרה היא לשנות את היחס למחשבות ולא לרוקן את הראש.', 'אם קשה להשתמש בדמיון, כתבו כל מחשבה על פיסת נייר והזיזו אותה הצידה.']
    ),
    es: makeContent(
      'Hojas en un arroyo',
      'Practica ver los pensamientos como sucesos mentales pasajeros imaginando cada uno sobre una hoja que avanza río abajo.',
      ['ACT', 'defusión cognitiva', 'mindfulness', 'pensamientos'],
      [
        ['Imaginar el arroyo', 'Imagina un arroyo tranquilo con hojas que se desplazan lentamente sobre el agua.'],
        ['Notar un pensamiento', 'Cuando aparezca un pensamiento, nómbralo brevemente sin decidir si es verdadero o falso.'],
        ['Ponerlo en una hoja', 'Imagina que colocas en una hoja las palabras, la imagen o la sensación vinculada al pensamiento.'],
        ['Dejarlo avanzar', 'Observa cómo la hoja sigue corriente abajo sin empujarla ni perseguirla.'],
        ['Continuar con amabilidad', 'Si te atrapa un pensamiento, reconócelo y coloca el siguiente en otra hoja.']
      ],
      ['Crea distancia de pensamientos difíciles', 'Reduce la fusión con el contenido mental', 'Favorece respuestas emocionales flexibles'],
      ['La meta es cambiar tu relación con los pensamientos, no vaciar la mente.', 'Si la imaginación resulta difícil, escribe cada pensamiento en un papel y deslízalo a un lado.']
    ),
    fr: makeContent(
      'Feuilles sur un ruisseau',
      'Entraînez-vous à voir les pensées comme des événements mentaux passagers en imaginant chacune sur une feuille emportée par le courant.',
      ['ACT', 'défusion cognitive', 'pleine conscience', 'pensées'],
      [
        ['Imaginer le ruisseau', 'Imaginez un ruisseau paisible avec des feuilles qui avancent lentement sur l’eau.'],
        ['Remarquer une pensée', 'Lorsqu’une pensée apparaît, nommez-la brièvement sans décider si elle est vraie ou fausse.'],
        ['La poser sur une feuille', 'Imaginez placer sur une feuille les mots, l’image ou la sensation associés à la pensée.'],
        ['La laisser partir', 'Regardez la feuille descendre le courant sans la repousser ni la suivre.'],
        ['Continuer avec douceur', 'Si une pensée vous absorbe, remarquez-le puis posez la suivante sur une autre feuille.']
      ],
      ['Crée une distance avec les pensées difficiles', 'Réduit la fusion avec le contenu mental', 'Favorise une réponse émotionnelle plus souple'],
      ['Le but est de changer votre relation aux pensées, pas de vider l’esprit.', 'Si l’imagerie est difficile, écrivez chaque pensée sur un papier puis faites-le glisser de côté.']
    ),
    de: makeContent(
      'Blätter auf einem Bach',
      'Übe, Gedanken als vorübergehende mentale Ereignisse zu sehen, indem du jeden auf einem Blatt flussabwärts treiben lässt.',
      ['ACT', 'kognitive Defusion', 'Achtsamkeit', 'Gedanken'],
      [
        ['Bach vorstellen', 'Stelle dir einen ruhigen Bach vor, auf dem Blätter langsam über das Wasser ziehen.'],
        ['Gedanken bemerken', 'Wenn ein Gedanke auftaucht, benenne ihn kurz, ohne über wahr oder falsch zu entscheiden.'],
        ['Auf ein Blatt legen', 'Lege in deiner Vorstellung Worte, Bild oder Gefühl des Gedankens auf ein Blatt.'],
        ['Weiterziehen lassen', 'Beobachte, wie das Blatt flussabwärts zieht, ohne es wegzudrücken oder ihm zu folgen.'],
        ['Freundlich fortfahren', 'Wenn du in einem Gedanken festhängst, bemerke es und lege den nächsten auf ein neues Blatt.']
      ],
      ['Schafft Abstand zu schwierigen Gedanken', 'Verringert Verschmelzung mit mentalen Inhalten', 'Unterstützt flexible emotionale Reaktionen'],
      ['Ziel ist eine andere Beziehung zu Gedanken, nicht ein leerer Kopf.', 'Wenn innere Bilder schwerfallen, schreibe jeden Gedanken auf Papier und schiebe es beiseite.']
    ),
    it: makeContent(
      'Foglie su un ruscello',
      'Esercitati a vedere i pensieri come eventi mentali passeggeri immaginando ciascuno su una foglia che scorre via.',
      ['ACT', 'defusione cognitiva', 'mindfulness', 'pensieri'],
      [
        ['Immaginare il ruscello', 'Immagina un ruscello tranquillo con foglie che si muovono lentamente sull’acqua.'],
        ['Notare un pensiero', 'Quando appare un pensiero, nominalo brevemente senza decidere se sia vero o falso.'],
        ['Posarlo su una foglia', 'Immagina di mettere su una foglia le parole, l’immagine o la sensazione legata al pensiero.'],
        ['Lasciarlo scorrere', 'Guarda la foglia andare a valle senza spingerla via né seguirla.'],
        ['Continuare con gentilezza', 'Se resti coinvolto in un pensiero, notalo e posa il successivo su un’altra foglia.']
      ],
      ['Crea distanza dai pensieri difficili', 'Riduce la fusione con i contenuti mentali', 'Sostiene risposte emotive flessibili'],
      ['L’obiettivo è cambiare il rapporto con i pensieri, non svuotare la mente.', 'Se immaginare è difficile, scrivi ogni pensiero su un foglio e spostalo di lato.']
    ),
    pt: makeContent(
      'Folhas em um riacho',
      'Pratique ver pensamentos como eventos mentais passageiros imaginando cada um sobre uma folha que segue riacho abaixo.',
      ['ACT', 'desfusão cognitiva', 'mindfulness', 'pensamentos'],
      [
        ['Imaginar o riacho', 'Imagine um riacho tranquilo com folhas se movendo lentamente sobre a água.'],
        ['Perceber um pensamento', 'Quando surgir um pensamento, nomeie-o brevemente sem decidir se é verdadeiro ou falso.'],
        ['Colocá-lo numa folha', 'Imagine colocar numa folha as palavras, a imagem ou a sensação ligada ao pensamento.'],
        ['Deixá-lo seguir', 'Observe a folha seguir riacho abaixo sem empurrá-la nem acompanhá-la.'],
        ['Continuar com gentileza', 'Se ficar preso a um pensamento, perceba isso e coloque o próximo em outra folha.']
      ],
      ['Cria distância de pensamentos difíceis', 'Reduz a fusão com conteúdos mentais', 'Apoia respostas emocionais flexíveis'],
      ['O objetivo é mudar sua relação com os pensamentos, não esvaziar a mente.', 'Se imaginar for difícil, escreva cada pensamento num papel e deslize-o para o lado.']
    )
  },

  'local-mindfulness-mindful-eating': {
    en: makeContent(
      'Mindful Eating',
      'Bring curious, non-judgmental attention to a small amount of food to notice sensory experience, pace, and body signals.',
      ['mindfulness', 'eating', 'senses', 'self-care'],
      [
        ['Choose a small amount', 'Select one bite or a small portion of food that feels appropriate and safe for you.'],
        ['Look', 'Notice color, shape, texture, and details as if seeing the food for the first time.'],
        ['Smell', 'Bring it near and notice scent and any response in your body.'],
        ['Taste', 'Place it in your mouth and notice the first sensations before chewing.'],
        ['Chew slowly', 'Observe flavor, texture, movement, and the changing urge to swallow.'],
        ['Reflect', 'Notice how this differed from your usual pace and what body signals you observed.']
      ],
      ['Strengthens sensory awareness', 'Supports recognition of pace and body cues', 'Brings mindfulness into daily routines'],
      ['There is no correct feeling or pace; practice with curiosity rather than judgment.', 'If attention to eating is distressing or conflicts with an eating-disorder care plan, pause and follow guidance from your clinician.']
    ),
    he: makeContent(
      'אכילה מודעת',
      'הפנו קשב סקרן ולא שיפוטי לכמות קטנה של מזון כדי להבחין בחוויה החושית, בקצב ובאותות הגוף.',
      ['מיינדפולנס', 'אכילה', 'חושים', 'טיפול עצמי'],
      [
        ['בחירת כמות קטנה', 'בחרו ביס אחד או מנה קטנה שמרגישים מתאימים ובטוחים עבורכם.'],
        ['התבוננות', 'שימו לב לצבע, לצורה, למרקם ולפרטים כאילו אתם רואים את המזון בפעם הראשונה.'],
        ['הרחה', 'קרבו את המזון ושימו לב לריח ולכל תגובה שמופיעה בגוף.'],
        ['טעימה', 'הניחו את המזון בפה ושימו לב לתחושות הראשונות לפני הלעיסה.'],
        ['לעיסה איטית', 'הבחינו בטעם, במרקם, בתנועה ובשינוי בדחף לבלוע.'],
        ['התבוננות מסכמת', 'בדקו במה החוויה הייתה שונה מהקצב הרגיל ואילו אותות גוף שמתם לב אליהם.']
      ],
      ['מחזק מודעות חושית', 'תומך בזיהוי הקצב ואותות הגוף', 'משלב מיינדפולנס בשגרה היומיומית'],
      ['אין הרגשה או קצב נכונים; תרגלו בסקרנות ולא בשיפוטיות.', 'אם הקשב לאכילה מעורר מצוקה או סותר תוכנית טיפול בהפרעת אכילה, עצרו ופעלו לפי הנחיית המטפל שלכם.']
    ),
    es: makeContent(
      'Alimentación consciente',
      'Lleva una atención curiosa y sin juicio a una pequeña cantidad de comida para observar la experiencia sensorial, el ritmo y las señales corporales.',
      ['mindfulness', 'alimentación', 'sentidos', 'autocuidado'],
      [
        ['Elegir una pequeña cantidad', 'Selecciona un bocado o una porción pequeña que resulte apropiada y segura para ti.'],
        ['Mirar', 'Observa color, forma, textura y detalles como si vieras el alimento por primera vez.'],
        ['Oler', 'Acércalo y observa su olor y cualquier respuesta del cuerpo.'],
        ['Saborear', 'Colócalo en la boca y nota las primeras sensaciones antes de masticar.'],
        ['Masticar despacio', 'Observa sabor, textura, movimiento y el cambio en el impulso de tragar.'],
        ['Reflexionar', 'Nota en qué se diferenció de tu ritmo habitual y qué señales corporales observaste.']
      ],
      ['Fortalece la conciencia sensorial', 'Ayuda a reconocer el ritmo y las señales corporales', 'Incorpora mindfulness a la vida diaria'],
      ['No hay una sensación ni un ritmo correctos; practica con curiosidad y sin juicio.', 'Si prestar atención a la comida causa malestar o contradice un plan para un trastorno alimentario, detente y sigue la orientación clínica.']
    ),
    fr: makeContent(
      'Alimentation en pleine conscience',
      'Portez une attention curieuse et sans jugement à une petite quantité de nourriture pour observer l’expérience sensorielle, le rythme et les signaux corporels.',
      ['pleine conscience', 'alimentation', 'sens', 'soin de soi'],
      [
        ['Choisir une petite quantité', 'Sélectionnez une bouchée ou une petite portion qui vous semble appropriée et sûre.'],
        ['Regarder', 'Observez couleur, forme, texture et détails comme si vous découvriez cet aliment.'],
        ['Sentir', 'Approchez-le et remarquez son odeur ainsi que les réactions de votre corps.'],
        ['Goûter', 'Placez-le en bouche et notez les premières sensations avant de mâcher.'],
        ['Mâcher lentement', 'Observez saveur, texture, mouvement et évolution de l’envie d’avaler.'],
        ['Réfléchir', 'Repérez la différence avec votre rythme habituel et les signaux corporels observés.']
      ],
      ['Renforce la conscience sensorielle', 'Aide à reconnaître le rythme et les signaux du corps', 'Intègre la pleine conscience au quotidien'],
      ['Il n’existe pas de sensation ni de rythme corrects ; pratiquez avec curiosité sans jugement.', 'Si l’attention à l’alimentation provoque une détresse ou contredit un plan de soins, arrêtez et suivez l’avis de votre clinicien.']
    ),
    de: makeContent(
      'Achtsames Essen',
      'Richte neugierige, nicht wertende Aufmerksamkeit auf eine kleine Menge Nahrung, um Sinneserleben, Tempo und Körpersignale wahrzunehmen.',
      ['Achtsamkeit', 'Essen', 'Sinne', 'Selbstfürsorge'],
      [
        ['Kleine Menge wählen', 'Wähle einen Bissen oder eine kleine Portion, die sich für dich angemessen und sicher anfühlt.'],
        ['Ansehen', 'Beobachte Farbe, Form, Struktur und Details, als würdest du das Lebensmittel erstmals sehen.'],
        ['Riechen', 'Führe es näher heran und nimm Duft und Körperreaktionen wahr.'],
        ['Schmecken', 'Lege es in den Mund und bemerke erste Empfindungen vor dem Kauen.'],
        ['Langsam kauen', 'Beobachte Geschmack, Struktur, Bewegung und den wechselnden Schluckimpuls.'],
        ['Reflektieren', 'Bemerke den Unterschied zu deinem üblichen Tempo und welche Körpersignale du wahrgenommen hast.']
      ],
      ['Stärkt sensorisches Gewahrsein', 'Unterstützt das Erkennen von Tempo und Körpersignalen', 'Bringt Achtsamkeit in den Alltag'],
      ['Es gibt kein richtiges Gefühl oder Tempo; übe neugierig statt wertend.', 'Wenn Aufmerksamkeit beim Essen belastet oder einem Behandlungsplan widerspricht, pausiere und folge der klinischen Empfehlung.']
    ),
    it: makeContent(
      'Alimentazione consapevole',
      'Porta un’attenzione curiosa e non giudicante a una piccola quantità di cibo per notare esperienza sensoriale, ritmo e segnali del corpo.',
      ['mindfulness', 'alimentazione', 'sensi', 'cura di sé'],
      [
        ['Scegliere una piccola quantità', 'Seleziona un boccone o una piccola porzione che sembri adatta e sicura per te.'],
        ['Guardare', 'Nota colore, forma, consistenza e dettagli come se vedessi il cibo per la prima volta.'],
        ['Annusare', 'Avvicinalo e nota il profumo e ogni risposta del corpo.'],
        ['Assaggiare', 'Mettilo in bocca e nota le prime sensazioni prima di masticare.'],
        ['Masticare lentamente', 'Osserva sapore, consistenza, movimento e il cambiamento dell’impulso a deglutire.'],
        ['Riflettere', 'Nota la differenza dal ritmo abituale e quali segnali corporei hai osservato.']
      ],
      ['Rafforza la consapevolezza sensoriale', 'Aiuta a riconoscere ritmo e segnali corporei', 'Porta la mindfulness nelle routine quotidiane'],
      ['Non esistono sensazione o ritmo corretti; pratica con curiosità senza giudizio.', 'Se l’attenzione al cibo provoca disagio o contrasta un piano per un disturbo alimentare, fermati e segui l’indicazione clinica.']
    ),
    pt: makeContent(
      'Alimentação consciente',
      'Leve atenção curiosa e sem julgamento a uma pequena quantidade de alimento para notar experiência sensorial, ritmo e sinais do corpo.',
      ['mindfulness', 'alimentação', 'sentidos', 'autocuidado'],
      [
        ['Escolher uma pequena quantidade', 'Selecione uma mordida ou pequena porção que pareça adequada e segura para você.'],
        ['Olhar', 'Observe cor, forma, textura e detalhes como se visse o alimento pela primeira vez.'],
        ['Cheirar', 'Aproxime-o e perceba o aroma e qualquer resposta do corpo.'],
        ['Saborear', 'Coloque-o na boca e perceba as primeiras sensações antes de mastigar.'],
        ['Mastigar devagar', 'Observe sabor, textura, movimento e a mudança no impulso de engolir.'],
        ['Refletir', 'Perceba como isso diferiu do ritmo habitual e quais sinais corporais observou.']
      ],
      ['Fortalece a consciência sensorial', 'Apoia o reconhecimento do ritmo e dos sinais corporais', 'Leva mindfulness à rotina diária'],
      ['Não existe sensação ou ritmo correto; pratique com curiosidade, sem julgamento.', 'Se prestar atenção à alimentação causar sofrimento ou contrariar um plano para transtorno alimentar, pare e siga a orientação clínica.']
    )
  }
};

export const EXERCISE_CONTENT_BATCH_3B_IDS = Object.freeze(
  Object.keys(EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B)
);
