// Mind Games content translations for es, fr, de, it, pt
// (he is already translated inline in translations.js)

export const mindGamesContentByLanguage = {
  es: {
    thought_quiz: {
      items: [
        { prompt: "Si no hago esto perfectamente, soy un fracaso total.", options: ["Pensamiento todo-o-nada", "Lectura de mente", "Catastrofización", "Descalificar lo positivo"], explanation: "Esto trata el rendimiento como una etiqueta estricta de aprobar/reprobar en lugar de un espectro." },
        { prompt: "Todavía no han respondido, así que deben estar molestos conmigo.", options: ["Razonamiento emocional", "Lectura de mente", "Etiquetado", "Generalización excesiva"], explanation: "Estás asumiendo que sabes lo que piensan sin evidencia clara." },
        { prompt: "Si cometo un error, todo se vendrá abajo.", options: ["Catastrofización", "Personalización", "Declaraciones de 'debo'", "Filtro mental"], explanation: "Esto salta al peor resultado posible y lo trata como probable." },
        { prompt: "Tuve un momento incómodo hoy. Siempre arruino todo.", options: ["Generalización excesiva", "Lectura de mente", "Adivinación", "Descalificar lo positivo"], explanation: "Un momento se convierte en una regla general sobre toda tu vida." },
        { prompt: "Me siento ansioso, así que algo malo debe estar a punto de suceder.", options: ["Razonamiento emocional", "Declaraciones de 'debo'", "Etiquetado", "Pensamiento blanco-o-negro"], explanation: "Los sentimientos se tratan como hechos, incluso cuando son solo señales." },
        { prompt: "Mi amigo sonó callado. Probablemente es mi culpa.", options: ["Personalización", "Catastrofización", "Adivinación", "Magnificación"], explanation: "Estás asumiendo responsabilidad por algo que puede tener muchas causas." },
        { prompt: "Debería ser más productivo todo el tiempo.", options: ["Declaraciones de 'debo'", "Filtro mental", "Lectura de mente", "Generalización excesiva"], explanation: "Las reglas rígidas ('debo') crean presión e ignoran los límites humanos reales." },
        { prompt: "Una persona me criticó, así que probablemente no soy bueno en esto.", options: ["Etiquetado", "Descalificar lo positivo", "Magnificación", "Pensamiento todo-o-nada"], explanation: "Una sola crítica se infla y supera el panorama completo." },
        { prompt: "Lo hice bien, pero no cuenta porque era fácil.", options: ["Descalificar lo positivo", "Adivinación", "Personalización", "Catastrofización"], explanation: "Estás descartando el esfuerzo y progreso reales en lugar de reconocerlos." },
        { prompt: "Todos notaron mi error. Deben pensar que soy incompetente.", options: ["Lectura de mente", "Filtro mental", "Razonamiento emocional", "Declaraciones de 'debo'"], explanation: "Estás adivinando los juicios de otros sin verificar la evidencia." },
        { prompt: "Si lo intento y me resulta incómodo, significa que no es para mí.", options: ["Razonamiento emocional", "Generalización excesiva", "Etiquetado", "Descalificar lo positivo"], explanation: "La incomodidad puede ser parte del crecimiento; no significa automáticamente peligro." },
        { prompt: "No cumplí mi objetivo hoy, así que nunca voy a cambiar.", options: ["Adivinación", "Catastrofización", "Generalización excesiva", "Pensamiento todo-o-nada"], explanation: "Un solo día se convierte en una predicción permanente, ignorando el progreso gradual." }
      ]
    },
    reframe_pick: {
      items: [
        { situation: "Enviaste un mensaje y no has recibido respuesta.", automatic_thought: "Me están ignorando porque dije algo incorrecto.", choices: ["Están ocupados. Puedo esperar o hacer seguimiento más tarde de forma tranquila.", "Definitivamente me odian ahora y arruiné todo.", "Nunca más enviaré mensajes para no arriesgarme a sentirme así."], why: "Considera múltiples posibilidades y sugiere un siguiente paso razonable." },
        { situation: "Cometiste un pequeño error en el trabajo/escuela.", automatic_thought: "Soy terrible en esto.", choices: ["Un error es normal. Puedo corregirlo y aprender para la próxima vez.", "Soy la peor persona aquí. Debería renunciar inmediatamente.", "Fingiré que no pasó y evitaré todo lo desafiante."], why: "Es específico, realista y enfocado en el aprendizaje en lugar de etiquetas globales." },
        { situation: "Un amigo estuvo callado durante su encuentro.", automatic_thought: "Deben estar molestos conmigo.", choices: ["No sé la razón. Puedo consultar amablemente o dar espacio.", "Es mi culpa. Siempre arruino las amistades.", "Debería alejarlos antes de que me rechacen primero."], why: "Evita la lectura de mente y deja espacio para una verificación gentil." },
        { situation: "No terminaste una tarea que planeaste.", automatic_thought: "Soy tan perezoso.", choices: ["Me costó hoy. Puedo elegir un pequeño paso siguiente y reiniciar.", "Soy un caso perdido. Nunca seré consistente en nada.", "Debería castigarme hasta que finalmente me discipline."], why: "Reconoce la dificultad y avanza hacia una acción factible y compasiva." },
        { situation: "Te sientes ansioso antes de un evento.", automatic_thought: "Esta ansiedad significa que el evento irá mal.", choices: ["La ansiedad es un sentimiento, no una predicción. Puedo ir de todas formas y sobrellevarlo.", "La ansiedad significa peligro. Debo evitar esto a toda costa.", "Necesito sentir cero ansiedad antes de que se me permita aparecer."], why: "Separa los sentimientos de las predicciones y apoya la acción valorada." },
        { situation: "Alguien te dio retroalimentación.", automatic_thought: "No soy lo suficientemente bueno.", choices: ["La retroalimentación puede ayudarme a mejorar. Puedo tomar lo útil y crecer.", "Piensan que soy incompetente y todos están de acuerdo con ellos.", "Dejaré de intentarlo para que nadie pueda juzgarme de nuevo."], why: "Mantiene el valor propio intacto mientras permite la mejora." },
        { situation: "No te invitaron a algo.", automatic_thought: "A nadie le gusto.", choices: ["Podría haber muchas razones. Puedo contactarlos o planear algo más.", "Esto prueba que no soy agradable y siempre lo seré.", "Me aislaré para no tener que sentirme excluido de nuevo."], why: "Evita la generalización excesiva y ofrece opciones flexibles y constructivas." },
        { situation: "Estás aprendiendo una nueva habilidad y te sientes atrasado.", automatic_thought: "Si no soy rápido, no es para mí.", choices: ["Las habilidades crecen con la práctica. Puedo mejorar paso a paso.", "Si no soy inmediatamente excelente, es una pérdida de tiempo.", "Debería compararme constantemente para demostrar que estoy fracasando."], why: "Apoya la mentalidad de crecimiento y las curvas de aprendizaje realistas." }
      ]
    },
    value_compass: {
      values: [
        { value: "Familia", actions: ["Envía un mensaje amable a un familiar.", "Haz una pequeña cosa útil en casa.", "Planifica 10 minutos de tiempo de calidad hoy."] },
        { value: "Salud", actions: ["Bebe un vaso de agua ahora mismo.", "Toma un descanso de estiramiento de 2 minutos.", "Sal a respirar aire fresco durante 3 minutos."] },
        { value: "Crecimiento", actions: ["Aprende algo pequeño (ve/lee durante 2 minutos).", "Practica una habilidad durante 3 minutos.", "Escribe una oración sobre lo que quieres mejorar."] },
        { value: "Amistad", actions: ["Contacta a un amigo con un simple hola.", "Responde un mensaje que has estado posponiendo.", "Comparte un cumplido genuino hoy."] },
        { value: "Valentía", actions: ["Haz la versión más pequeña del paso aterrador (10%).", "Nombra lo que temes en una oración, luego procede de todas formas.", "Haz una pequeña pregunta en lugar de asumir."] },
        { value: "Calma", actions: ["Toma 5 respiraciones lentas (cuenta 4 adentro / 4 afuera).", "Relaja tus hombros y mandíbula durante 20 segundos.", "Deja tu teléfono por 2 minutos y reinicia."] },
        { value: "Creatividad", actions: ["Escribe una idea tonta de 1 línea (sin juicio).", "Toma una foto de algo interesante a tu alrededor.", "Dibuja libremente durante 60 segundos."] },
        { value: "Propósito", actions: ["Elige una tarea que importe y hazla durante 2 minutos.", "Escribe tu 'por qué' en 1 oración.", "Elimina un pequeño obstáculo de tu camino hoy."] }
      ]
    },
    quick_win: { presets: ["Bebí agua.", "Tomé un descanso de 2 minutos.", "Envié un mensaje que estaba evitando.", "Limpié un área pequeña.", "Hice una pequeña tarea durante 2 minutos.", "Tomé 5 respiraciones lentas.", "Salí al aire fresco.", "Hice una pregunta en lugar de asumir.", "Aparecí aunque era incómodo.", "Escribí una oración útil para mí mismo.", "Estiré mis hombros/cuello.", "Comí algo nutritivo.", "Pausé antes de reaccionar.", "Dije no (o ahora no) amablemente.", "Hice un pequeño plan para mañana.", "Terminé un mini-paso.", "Noté una trampa de pensamiento y la nombré.", "Elegí 'suficientemente bueno' y me detuve.", "Hice algo amable por alguien.", "Hice algo amable por mí mismo."] },
    calm_bingo: { tiles: ["Beber un vaso de agua", "5 respiraciones lentas", "Relajar hombros + mandíbula", "Mirar por una ventana 30s", "Levantarse y estirarse", "Enviar un texto amable", "Ordenar una pequeña cosa", "Salir 2 minutos", "Nombrar 3 cosas que puedes ver", "Poner una canción tranquila", "Escribir 1 oración de apoyo", "Lavarse las manos despacio", "Mover el cuerpo 60s", "Dejar el teléfono 2 minutos", "Sonreír suavemente (incluso 10%)", "Elegir un pequeño paso siguiente"] }
  },
  fr: {
    thought_quiz: {
      items: [
        { prompt: "Si je ne fais pas ça parfaitement, je suis un échec total.", options: ["Pensée tout-ou-rien", "Lecture des pensées", "Catastrophisme", "Disqualifier le positif"], explanation: "Cela traite la performance comme une étiquette stricte réussite/échec plutôt qu'un spectre." },
        { prompt: "Ils n'ont pas encore répondu, donc ils doivent être contrariés par moi.", options: ["Raisonnement émotionnel", "Lecture des pensées", "Étiquetage", "Surgénéralisation"], explanation: "Vous supposez que vous savez ce qu'ils pensent sans preuve claire." },
        { prompt: "Si je fais une erreur, tout va s'effondrer.", options: ["Catastrophisme", "Personnalisation", "Déclarations 'je devrais'", "Filtre mental"], explanation: "Cela saute au pire résultat et le traite comme probable." },
        { prompt: "J'ai eu un moment gênant aujourd'hui. Je rate toujours tout.", options: ["Surgénéralisation", "Lecture des pensées", "Prédiction", "Disqualifier le positif"], explanation: "Un moment devient une règle générale sur toute votre vie." },
        { prompt: "Je me sens anxieux, donc quelque chose de mauvais doit être sur le point de se produire.", options: ["Raisonnement émotionnel", "Déclarations 'je devrais'", "Étiquetage", "Pensée noir-ou-blanc"], explanation: "Les sentiments sont traités comme des faits, même quand ce sont juste des signaux." },
        { prompt: "Mon ami semblait silencieux. C'est probablement ma faute.", options: ["Personnalisation", "Catastrophisme", "Prédiction", "Magnification"], explanation: "Vous prenez la responsabilité de quelque chose qui peut avoir de nombreuses causes." },
        { prompt: "Je devrais être plus productif tout le temps.", options: ["Déclarations 'je devrais'", "Filtre mental", "Lecture des pensées", "Surgénéralisation"], explanation: "Les règles rigides ('je devrais') créent de la pression et ignorent les limites humaines réelles." },
        { prompt: "Une personne m'a critiqué, donc je ne suis probablement pas bon dans ça.", options: ["Étiquetage", "Disqualifier le positif", "Magnification", "Pensée tout-ou-rien"], explanation: "Une seule critique est amplifiée et dépasse le tableau d'ensemble." },
        { prompt: "J'ai bien fait, mais ça ne compte pas parce que c'était facile.", options: ["Disqualifier le positif", "Prédiction", "Personnalisation", "Catastrophisme"], explanation: "Vous rejetez l'effort et les progrès réels au lieu de les reconnaître." },
        { prompt: "Tout le monde a remarqué mon erreur. Ils doivent penser que je suis incompétent.", options: ["Lecture des pensées", "Filtre mental", "Raisonnement émotionnel", "Déclarations 'je devrais'"], explanation: "Vous devinez les jugements des autres sans vérifier les preuves." },
        { prompt: "Si j'essaie et que c'est inconfortable, cela signifie que ce n'est pas fait pour moi.", options: ["Raisonnement émotionnel", "Surgénéralisation", "Étiquetage", "Disqualifier le positif"], explanation: "L'inconfort peut faire partie de la croissance ; il ne signifie pas automatiquement danger." },
        { prompt: "Je n'ai pas atteint mon objectif aujourd'hui, donc je ne vais jamais changer.", options: ["Prédiction", "Catastrophisme", "Surgénéralisation", "Pensée tout-ou-rien"], explanation: "Un seul jour devient une prédiction permanente, ignorant les progrès graduels." }
      ]
    },
    value_compass: {
      values: [
        { value: "Famille", actions: ["Envoyez un message gentil à un membre de la famille.", "Faites une petite chose utile à la maison.", "Planifiez 10 minutes de temps de qualité aujourd'hui."] },
        { value: "Santé", actions: ["Buvez un verre d'eau maintenant.", "Prenez une pause d'étirement de 2 minutes.", "Sortez prendre l'air frais pendant 3 minutes."] },
        { value: "Croissance", actions: ["Apprenez une petite chose (regardez/lisez pendant 2 minutes).", "Pratiquez une compétence pendant 3 minutes.", "Écrivez une phrase sur ce que vous voulez améliorer."] },
        { value: "Amitié", actions: ["Contactez un ami avec un simple bonjour.", "Répondez à un message que vous avez repoussé.", "Partagez un compliment sincère aujourd'hui."] },
        { value: "Courage", actions: ["Faites la plus petite version du pas effrayant (10%).", "Nommez ce que vous craignez en une phrase, puis procédez quand même.", "Posez une petite question au lieu de supposer."] },
        { value: "Calme", actions: ["Prenez 5 respirations lentes (comptez 4 dedans / 4 dehors).", "Détendez vos épaules et mâchoire pendant 20 secondes.", "Posez votre téléphone pendant 2 minutes et réinitialisez."] },
        { value: "Créativité", actions: ["Écrivez une idée sotte en 1 ligne (sans jugement).", "Prenez une photo de quelque chose d'intéressant autour de vous.", "Griffonnez pendant 60 secondes."] },
        { value: "But", actions: ["Choisissez une tâche qui compte et faites-la pendant 2 minutes.", "Écrivez votre 'pourquoi' en 1 phrase.", "Supprimez un petit obstacle de votre chemin aujourd'hui."] }
      ]
    },
    quick_win: { presets: ["J'ai bu de l'eau.", "J'ai pris une pause de 2 minutes.", "J'ai envoyé un message que j'évitais.", "J'ai nettoyé une petite zone.", "J'ai fait une petite tâche pendant 2 minutes.", "J'ai pris 5 respirations lentes.", "Je suis sorti prendre l'air.", "J'ai posé une question au lieu de supposer.", "Je me suis présenté même si c'était inconfortable.", "J'ai écrit une phrase utile pour moi-même.", "J'ai étiré mes épaules/cou.", "J'ai mangé quelque chose de nutritif.", "J'ai fait une pause avant de réagir.", "J'ai dit non (ou pas maintenant) poliment.", "J'ai fait un petit plan pour demain.", "J'ai terminé un mini-pas.", "J'ai remarqué un piège de pensée et l'ai nommé.", "J'ai choisi 'assez bon' et me suis arrêté.", "J'ai fait quelque chose de gentil pour quelqu'un.", "J'ai fait quelque chose de gentil pour moi-même."] },
    calm_bingo: { tiles: ["Boire un verre d'eau", "5 respirations lentes", "Détendre épaules + mâchoire", "Regarder par une fenêtre 30s", "Se lever et s'étirer", "Envoyer un texto gentil", "Ranger une petite chose", "Sortir 2 minutes", "Nommer 3 choses que vous voyez", "Jouer une chanson calme", "Écrire 1 phrase de soutien", "Se laver les mains lentement", "Bouger le corps 60s", "Poser le téléphone 2 minutes", "Sourire doucement (même 10%)", "Choisir un petit pas suivant"] }
  },
  de: {
    thought_quiz: {
      items: [
        { prompt: "Wenn ich das nicht perfekt mache, bin ich ein totaler Versager.", options: ["Schwarz-Weiß-Denken", "Gedankenlesen", "Katastrophisieren", "Das Positive abwerten"], explanation: "Dies behandelt Leistung als strikte Bestehen/Nicht-Bestehen-Etikette statt als Spektrum." },
        { prompt: "Sie haben noch nicht geantwortet, also müssen sie verärgert auf mich sein.", options: ["Emotionales Schlussfolgern", "Gedankenlesen", "Etikettierung", "Übergeneralisierung"], explanation: "Sie nehmen an zu wissen, was sie denken, ohne klare Beweise." },
        { prompt: "Wenn ich einen Fehler mache, wird alles auseinanderfallen.", options: ["Katastrophisieren", "Personalisierung", "'Sollte'-Aussagen", "Mentaler Filter"], explanation: "Dies springt zum schlimmsten Ergebnis und behandelt es als wahrscheinlich." },
        { prompt: "Ich hatte heute einen peinlichen Moment. Ich verderbe immer alles.", options: ["Übergeneralisierung", "Gedankenlesen", "Wahrsagen", "Das Positive disqualifizieren"], explanation: "Ein Moment wird zu einer umfassenden Regel über Ihr gesamtes Leben." },
        { prompt: "Ich fühle mich ängstlich, also muss etwas Schlimmes bevorstehen.", options: ["Emotionales Schlussfolgern", "'Sollte'-Aussagen", "Etikettierung", "Schwarz-Weiß-Denken"], explanation: "Gefühle werden wie Fakten behandelt, auch wenn sie nur Signale sind." },
        { prompt: "Mein Freund klang still. Es ist wahrscheinlich meine Schuld.", options: ["Personalisierung", "Katastrophisieren", "Wahrsagen", "Vergrößerung"], explanation: "Sie übernehmen Verantwortung für etwas, das viele Ursachen haben kann." },
        { prompt: "Ich sollte immer produktiver sein.", options: ["'Sollte'-Aussagen", "Mentaler Filter", "Gedankenlesen", "Übergeneralisierung"], explanation: "Starre Regeln ('sollte') erzeugen Druck und ignorieren echte menschliche Grenzen." },
        { prompt: "Eine Person hat mich kritisiert, also bin ich wahrscheinlich nicht gut darin.", options: ["Etikettierung", "Das Positive disqualifizieren", "Vergrößerung", "Schwarz-Weiß-Denken"], explanation: "Eine einzelne Kritik wird aufgeblasen und überwiegt das Gesamtbild." },
        { prompt: "Ich habe es gut gemacht, aber es zählt nicht, weil es einfach war.", options: ["Das Positive abwerten", "Wahrsagen", "Personalisierung", "Katastrophisieren"], explanation: "Sie verwerfen echten Aufwand und Fortschritt, anstatt ihn anzuerkennen." },
        { prompt: "Alle haben meinen Fehler bemerkt. Sie müssen denken, dass ich inkompetent bin.", options: ["Gedankenlesen", "Mentaler Filter", "Emotionales Schlussfolgern", "'Sollte'-Aussagen"], explanation: "Sie raten die Urteile anderer, ohne die Beweise zu prüfen." },
        { prompt: "Wenn ich es versuche und es unangenehm ist, bedeutet das, dass es nicht für mich ist.", options: ["Emotionales Schlussfolgern", "Übergeneralisierung", "Etikettierung", "Das Positive disqualifizieren"], explanation: "Unbehagen kann Teil des Wachstums sein; es bedeutet nicht automatisch Gefahr." },
        { prompt: "Ich habe mein Ziel heute nicht erreicht, also werde ich mich nie ändern.", options: ["Wahrsagen", "Katastrophisieren", "Übergeneralisierung", "Schwarz-Weiß-Denken"], explanation: "Ein einzelner Tag wird zu einer dauerhaften Vorhersage, die graduellen Fortschritt ignoriert." }
      ]
    },
    value_compass: {
      values: [
        { value: "Familie", actions: ["Schicken Sie einer Familienangehörigen eine nette Nachricht.", "Tun Sie eine kleine hilfreiche Sache zu Hause.", "Planen Sie heute 10 Minuten Qualitätszeit."] },
        { value: "Gesundheit", actions: ["Trinken Sie jetzt ein Glas Wasser.", "Machen Sie eine 2-minütige Dehnpause.", "Gehen Sie 3 Minuten an die frische Luft."] },
        { value: "Wachstum", actions: ["Lernen Sie eine kleine Sache (schauen/lesen für 2 Minuten).", "Üben Sie eine Fähigkeit für 3 Minuten.", "Schreiben Sie einen Satz darüber, was Sie verbessern möchten."] },
        { value: "Freundschaft", actions: ["Melden Sie sich bei einem Freund mit einem einfachen Hallo.", "Beantworten Sie eine Nachricht, die Sie aufgeschoben haben.", "Teilen Sie heute ein aufrichtiges Kompliment."] },
        { value: "Mut", actions: ["Machen Sie die kleinste Version des beängstigenden Schritts (10%).", "Benennen Sie Ihre Angst in einem Satz, dann fahren Sie trotzdem fort.", "Stellen Sie eine kleine Frage statt anzunehmen."] },
        { value: "Ruhe", actions: ["Nehmen Sie 5 langsame Atemzüge (zählen Sie 4 ein / 4 aus).", "Entspannen Sie Schultern und Kiefer für 20 Sekunden.", "Legen Sie Ihr Telefon für 2 Minuten hin und resetten Sie sich."] },
        { value: "Kreativität", actions: ["Schreiben Sie eine alberne 1-Zeilen-Idee (ohne Urteil).", "Machen Sie ein Foto von etwas Interessantem um Sie herum.", "Kritzeln Sie 60 Sekunden lang."] },
        { value: "Zweck", actions: ["Wählen Sie eine wichtige Aufgabe und tun Sie 2 Minuten davon.", "Schreiben Sie Ihr 'Warum' in 1 Satz.", "Entfernen Sie heute ein kleines Hindernis aus Ihrem Weg."] }
      ]
    },
    quick_win: { presets: ["Ich habe Wasser getrunken.", "Ich habe eine 2-minütige Pause gemacht.", "Ich habe eine Nachricht gesendet, die ich vermied.", "Ich habe einen kleinen Bereich gereinigt.", "Ich habe eine kleine Aufgabe 2 Minuten lang erledigt.", "Ich habe 5 langsame Atemzüge genommen.", "Ich bin rausgegangen für frische Luft.", "Ich habe eine Frage gestellt statt anzunehmen.", "Ich bin erschienen, obwohl es unangenehm war.", "Ich habe mir einen hilfreichen Satz geschrieben.", "Ich habe meine Schultern/Nacken gedehnt.", "Ich habe etwas Nahrhaftes gegessen.", "Ich habe vor der Reaktion innegehalten.", "Ich habe höflich Nein (oder jetzt nicht) gesagt.", "Ich habe einen kleinen Plan für morgen gemacht.", "Ich habe einen Mini-Schritt abgeschlossen.", "Ich habe eine Denkfalle bemerkt und benannt.", "Ich habe 'gut genug' gewählt und aufgehört.", "Ich habe etwas Freundliches für jemanden getan.", "Ich habe etwas Freundliches für mich selbst getan."] },
    calm_bingo: { tiles: ["Ein Glas Wasser trinken", "5 langsame Atemzüge", "Schultern + Kiefer entspannen", "30s aus dem Fenster schauen", "Aufstehen und dehnen", "Eine nette SMS senden", "Eine kleine Sache aufräumen", "2 Minuten rausgehen", "3 Dinge benennen die Sie sehen", "Ein ruhiges Lied spielen", "1 unterstützenden Satz schreiben", "Langsam Hände waschen", "Körper 60s bewegen", "Telefon 2 Minuten weglegen", "Sanft lächeln (auch 10%)", "Einen kleinen nächsten Schritt wählen"] }
  },
  it: {
    thought_quiz: {
      items: [
        { prompt: "Se non faccio questo perfettamente, sono un totale fallimento.", options: ["Pensiero tutto-o-niente", "Lettura del pensiero", "Catastrofizzazione", "Sminuire il positivo"], explanation: "Questo tratta le prestazioni come un'etichetta rigida passato/fallito invece di uno spettro." },
        { prompt: "Non hanno ancora risposto, quindi devono essere arrabbiati con me.", options: ["Ragionamento emotivo", "Lettura del pensiero", "Etichettatura", "Sovrageneralizzazione"], explanation: "Stai assumendo di sapere cosa pensano senza prove chiare." },
        { prompt: "Se commetto un errore, tutto andrà in pezzi.", options: ["Catastrofizzazione", "Personalizzazione", "Affermazioni 'dovrei'", "Filtro mentale"], explanation: "Questo salta al risultato peggiore e lo tratta come probabile." },
        { prompt: "Ho avuto un momento imbarazzante oggi. Combino sempre tutto.", options: ["Sovrageneralizzazione", "Lettura del pensiero", "Preveggenza", "Squalificare il positivo"], explanation: "Un momento diventa una regola generale su tutta la tua vita." },
        { prompt: "Mi sento ansioso, quindi qualcosa di brutto deve essere sul punto di accadere.", options: ["Ragionamento emotivo", "Affermazioni 'dovrei'", "Etichettatura", "Pensiero bianco-o-nero"], explanation: "I sentimenti vengono trattati come fatti, anche quando sono solo segnali." },
        { prompt: "Il mio amico sembrava silenzioso. Probabilmente è colpa mia.", options: ["Personalizzazione", "Catastrofizzazione", "Preveggenza", "Magnificazione"], explanation: "Ti stai prendendo la responsabilità di qualcosa che può avere molte cause." },
        { prompt: "Dovrei essere più produttivo tutto il tempo.", options: ["Affermazioni 'dovrei'", "Filtro mentale", "Lettura del pensiero", "Sovrageneralizzazione"], explanation: "Le regole rigide ('dovrei') creano pressione e ignorano i veri limiti umani." },
        { prompt: "Una persona mi ha criticato, quindi probabilmente non sono bravo in questo.", options: ["Etichettatura", "Squalificare il positivo", "Magnificazione", "Pensiero tutto-o-niente"], explanation: "Una singola critica viene amplificata e supera il quadro completo." },
        { prompt: "Ho fatto bene, ma non conta perché era facile.", options: ["Sminuire il positivo", "Preveggenza", "Personalizzazione", "Catastrofizzazione"], explanation: "Stai respingendo l'impegno e i progressi reali invece di riconoscerli." },
        { prompt: "Tutti hanno notato il mio errore. Devono pensare che sono incompetente.", options: ["Lettura del pensiero", "Filtro mentale", "Ragionamento emotivo", "Affermazioni 'dovrei'"], explanation: "Stai indovinando i giudizi degli altri senza verificare le prove." },
        { prompt: "Se ci provo ed è scomodo, significa che non è per me.", options: ["Ragionamento emotivo", "Sovrageneralizzazione", "Etichettatura", "Squalificare il positivo"], explanation: "Il disagio può far parte della crescita; non significa automaticamente pericolo." },
        { prompt: "Non ho raggiunto il mio obiettivo oggi, quindi non cambierò mai.", options: ["Preveggenza", "Catastrofizzazione", "Sovrageneralizzazione", "Pensiero tutto-o-niente"], explanation: "Un singolo giorno diventa una previsione permanente, ignorando il progresso graduale." }
      ]
    },
    value_compass: {
      values: [
        { value: "Famiglia", actions: ["Invia un messaggio gentile a un membro della famiglia.", "Fai una piccola cosa utile a casa.", "Pianifica 10 minuti di tempo di qualità oggi."] },
        { value: "Salute", actions: ["Bevi un bicchiere d'acqua adesso.", "Prenditi una pausa di allungamento di 2 minuti.", "Esci all'aria fresca per 3 minuti."] },
        { value: "Crescita", actions: ["Impara una piccola cosa (guarda/leggi per 2 minuti).", "Pratica un'abilità per 3 minuti.", "Scrivi una frase su cosa vuoi migliorare."] },
        { value: "Amicizia", actions: ["Controlla con un amico con un semplice ciao.", "Rispondi a un messaggio che hai rimandato.", "Condividi un complimento genuino oggi."] },
        { value: "Coraggio", actions: ["Fai la versione più piccola del passo spaventoso (10%).", "Nomina ciò che temi in una frase, poi procedi comunque.", "Fai una piccola domanda invece di assumere."] },
        { value: "Calma", actions: ["Prendi 5 respiri lenti (conta 4 dentro / 4 fuori).", "Rilassa le spalle e la mascella per 20 secondi.", "Metti giù il telefono per 2 minuti e reimposta."] },
        { value: "Creatività", actions: ["Scrivi un'idea stupida di 1 riga (senza giudizio).", "Scatta una foto di qualcosa di interessante intorno a te.", "Scarabocchia per 60 secondi."] },
        { value: "Scopo", actions: ["Scegli un compito che conta e fallo per 2 minuti.", "Scrivi il tuo 'perché' in 1 frase.", "Rimuovi un piccolo ostacolo dal tuo cammino oggi."] }
      ]
    },
    quick_win: { presets: ["Ho bevuto acqua.", "Ho preso una pausa di 2 minuti.", "Ho inviato un messaggio che stavo evitando.", "Ho pulito una piccola area.", "Ho fatto un piccolo compito per 2 minuti.", "Ho preso 5 respiri lenti.", "Sono uscito all'aria fresca.", "Ho fatto una domanda invece di assumere.", "Mi sono presentato anche se era scomodo.", "Ho scritto una frase utile per me stesso.", "Ho allungato le spalle/il collo.", "Ho mangiato qualcosa di nutriente.", "Ho fatto una pausa prima di reagire.", "Ho detto no (o non ora) educatamente.", "Ho fatto un piccolo piano per domani.", "Ho completato un mini-passo.", "Ho notato una trappola di pensiero e l'ho nominata.", "Ho scelto 'abbastanza buono' e mi sono fermato.", "Ho fatto qualcosa di gentile per qualcuno.", "Ho fatto qualcosa di gentile per me stesso."] },
    calm_bingo: { tiles: ["Bere un bicchiere d'acqua", "5 respiri lenti", "Rilassare spalle + mascella", "Guardare fuori dalla finestra 30s", "Alzarsi e allungarsi", "Inviare un messaggio gentile", "Mettere in ordine una piccola cosa", "Uscire 2 minuti", "Nominare 3 cose che puoi vedere", "Mettere una canzone calma", "Scrivere 1 frase di supporto", "Lavarsi le mani lentamente", "Muovere il corpo 60s", "Mettere giù il telefono 2 minuti", "Sorridere dolcemente (anche 10%)", "Scegliere un piccolo passo successivo"] }
  },
  pt: {
    thought_quiz: {
      items: [
        { prompt: "Se eu não fizer isso perfeitamente, sou um fracasso total.", options: ["Pensamento tudo-ou-nada", "Leitura de mente", "Catastrofização", "Desqualificar o positivo"], explanation: "Isso trata o desempenho como um rótulo rígido passar/falhar em vez de um espectro." },
        { prompt: "Eles ainda não responderam, então devem estar chateados comigo.", options: ["Raciocínio emocional", "Leitura de mente", "Rotulagem", "Supergeneralização"], explanation: "Você está assumindo saber o que eles pensam sem evidências claras." },
        { prompt: "Se eu cometer um erro, tudo vai desmoronar.", options: ["Catastrofização", "Personalização", "Afirmações 'devo'", "Filtro mental"], explanation: "Isso pula para o pior resultado e o trata como provável." },
        { prompt: "Tive um momento constrangedor hoje. Eu sempre estrago tudo.", options: ["Supergeneralização", "Leitura de mente", "Adivinhação", "Desqualificar o positivo"], explanation: "Um momento se torna uma regra geral sobre toda a sua vida." },
        { prompt: "Sinto-me ansioso, então algo ruim deve estar prestes a acontecer.", options: ["Raciocínio emocional", "Afirmações 'devo'", "Rotulagem", "Pensamento preto-ou-branco"], explanation: "Os sentimentos são tratados como fatos, mesmo quando são apenas sinais." },
        { prompt: "Meu amigo parecia quieto. Provavelmente é minha culpa.", options: ["Personalização", "Catastrofização", "Adivinhação", "Magnificação"], explanation: "Você está assumindo responsabilidade por algo que pode ter muitas causas." },
        { prompt: "Eu deveria ser mais produtivo o tempo todo.", options: ["Afirmações 'devo'", "Filtro mental", "Leitura de mente", "Supergeneralização"], explanation: "Regras rígidas ('devo') criam pressão e ignoram limites humanos reais." },
        { prompt: "Uma pessoa me criticou, então provavelmente não sou bom nisso.", options: ["Rotulagem", "Desqualificar o positivo", "Magnificação", "Pensamento tudo-ou-nada"], explanation: "Uma única crítica é inflada e supera o quadro geral." },
        { prompt: "Fui bem, mas não conta porque era fácil.", options: ["Desqualificar o positivo", "Adivinhação", "Personalização", "Catastrofização"], explanation: "Você está descartando o esforço e o progresso reais em vez de reconhecê-los." },
        { prompt: "Todos notaram meu erro. Devem pensar que sou incompetente.", options: ["Leitura de mente", "Filtro mental", "Raciocínio emocional", "Afirmações 'devo'"], explanation: "Você está adivinhando os julgamentos dos outros sem verificar as evidências." },
        { prompt: "Se eu tentar e for desconfortável, isso significa que não é para mim.", options: ["Raciocínio emocional", "Supergeneralização", "Rotulagem", "Desqualificar o positivo"], explanation: "O desconforto pode ser parte do crescimento; não significa automaticamente perigo." },
        { prompt: "Não alcancei meu objetivo hoje, então nunca vou mudar.", options: ["Adivinhação", "Catastrofização", "Supergeneralização", "Pensamento tudo-ou-nada"], explanation: "Um único dia se torna uma previsão permanente, ignorando o progresso gradual." }
      ]
    },
    value_compass: {
      values: [
        { value: "Família", actions: ["Envie uma mensagem gentil para um familiar.", "Faça uma pequena coisa útil em casa.", "Planeje 10 minutos de tempo de qualidade hoje."] },
        { value: "Saúde", actions: ["Beba um copo de água agora.", "Faça uma pausa de alongamento de 2 minutos.", "Saia para respirar ar fresco por 3 minutos."] },
        { value: "Crescimento", actions: ["Aprenda uma pequena coisa (assista/leia por 2 minutos).", "Pratique uma habilidade por 3 minutos.", "Escreva uma frase sobre o que você quer melhorar."] },
        { value: "Amizade", actions: ["Verifique com um amigo com um simples olá.", "Responda a uma mensagem que você adiou.", "Compartilhe um elogio genuíno hoje."] },
        { value: "Coragem", actions: ["Faça a menor versão do passo assustador (10%).", "Nomeie o que você teme em uma frase, depois prossiga de qualquer forma.", "Faça uma pequena pergunta em vez de assumir."] },
        { value: "Calma", actions: ["Respire 5 vezes lentamente (conte 4 dentro / 4 fora).", "Relaxe os ombros e a mandíbula por 20 segundos.", "Coloque o telefone por 2 minutos e redefina."] },
        { value: "Criatividade", actions: ["Escreva uma ideia tola de 1 linha (sem julgamento).", "Tire uma foto de algo interessante ao seu redor.", "Rabisque por 60 segundos."] },
        { value: "Propósito", actions: ["Escolha uma tarefa que importa e faça-a por 2 minutos.", "Escreva seu 'porquê' em 1 frase.", "Remova um pequeno obstáculo do seu caminho hoje."] }
      ]
    },
    quick_win: { presets: ["Bebi água.", "Fiz uma pausa de 2 minutos.", "Enviei uma mensagem que estava evitando.", "Limpei uma pequena área.", "Fiz uma pequena tarefa por 2 minutos.", "Respirei 5 vezes lentamente.", "Saí para tomar ar fresco.", "Fiz uma pergunta em vez de assumir.", "Apareci mesmo sendo desconfortável.", "Escrevi uma frase útil para mim mesmo.", "Alonguei meus ombros/pescoço.", "Comi algo nutritivo.", "Pausei antes de reagir.", "Disse não (ou não agora) educadamente.", "Fiz um pequeno plano para amanhã.", "Completei um mini-passo.", "Notei uma armadilha de pensamento e a nomeei.", "Escolhi 'bom o suficiente' e parei.", "Fiz algo gentil por alguém.", "Fiz algo gentil por mim mesmo."] },
    calm_bingo: { tiles: ["Beber um copo de água", "5 respirações lentas", "Relaxar ombros + mandíbula", "Olhar pela janela por 30s", "Levantar e se alongar", "Enviar uma mensagem gentil", "Organizar uma pequena coisa", "Sair por 2 minutos", "Nomear 3 coisas que você pode ver", "Colocar uma música calma", "Escrever 1 frase de apoio", "Lavar as mãos devagar", "Mover o corpo por 60s", "Deixar o telefone por 2 minutos", "Sorrir gentilmente (mesmo 10%)", "Escolher um pequeno próximo passo"] }
  }
};