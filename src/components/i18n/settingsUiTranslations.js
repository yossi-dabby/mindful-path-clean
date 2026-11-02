const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

const rows = [
['settings_ui.eyebrow','Your personal space','המרחב האישי שלכם','Tu espacio personal','Votre espace personnel','Ihr persönlicher Bereich','Il tuo spazio personale','O seu espaço pessoal'],
['settings_ui.hero_title','Settings that work for you','הגדרות שמתאימות לכם','Ajustes a tu medida','Des réglages qui vous ressemblent','Einstellungen, die zu Ihnen passen','Impostazioni su misura per te','Definições à sua medida'],
['settings_ui.hero_subtitle','Manage your profile, appearance, notifications and privacy in one clear place.','נהלו את הפרופיל, המראה, ההתראות והפרטיות במקום אחד וברור.','Gestiona tu perfil, apariencia, notificaciones y privacidad en un solo lugar.','Gérez votre profil, l’apparence, les notifications et la confidentialité au même endroit.','Verwalten Sie Profil, Darstellung, Benachrichtigungen und Datenschutz an einem Ort.','Gestisci profilo, aspetto, notifiche e privacy in un unico spazio.','Gerencie perfil, aparência, notificações e privacidade num único local.'],
['settings_ui.protected','Account protected','החשבון מוגן','Cuenta protegida','Compte protégé','Konto geschützt','Account protetto','Conta protegida'],
['settings_ui.quick_navigation','Quick navigation','ניווט מהיר','Navegación rápida','Navigation rapide','Schnellnavigation','Navigazione rapida','Navegação rápida'],
['settings_ui.sections.profile','Profile','פרופיל','Perfil','Profil','Profil','Profilo','Perfil'],
['settings_ui.sections.language','Language','שפה','Idioma','Langue','Sprache','Lingua','Idioma'],
['settings_ui.sections.appearance','Appearance','מראה','Apariencia','Apparence','Darstellung','Aspetto','Aparência'],
['settings_ui.sections.notifications','Notifications','התראות','Notificaciones','Notifications','Benachrichtigungen','Notifiche','Notificações'],
['settings_ui.sections.privacy','Privacy','פרטיות','Privacidad','Confidentialité','Datenschutz','Privacy','Privacidade'],
['settings_ui.sections.account','Account','חשבון','Cuenta','Compte','Konto','Account','Conta'],
['settings_ui.save_error','We could not save the change. Please try again.','לא הצלחנו לשמור את השינוי. נסו שוב.','No se pudo guardar el cambio. Inténtalo de nuevo.','Impossible d’enregistrer la modification. Réessayez.','Die Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.','Impossibile salvare la modifica. Riprova.','Não foi possível guardar a alteração. Tente novamente.'],
['settings_ui.saved','Saved','נשמר','Guardado','Enregistré','Gespeichert','Salvato','Guardado'],
['settings_ui.upgrade_button','Explore Premium','להיכרות עם Premium','Explorar Premium','Découvrir Premium','Premium entdecken','Scopri Premium','Explorar Premium'],
['settings_ui.loading_profile','Preparing your personal settings…','מכינים את ההגדרות האישיות שלכם…','Preparando tus ajustes personales…','Préparation de vos réglages personnels…','Ihre persönlichen Einstellungen werden vorbereitet…','Preparazione delle impostazioni personali…','A preparar as suas definições pessoais…'],
['settings.notifications.in_app_title','In-app notifications','התראות בתוך האפליקציה','Notificaciones en la aplicación','Notifications dans l’application','Benachrichtigungen in der App','Notifiche nell’app','Notificações na aplicação'],
['settings.notifications.in_app_description','Choose what appears in your notification center.','בחרו מה יופיע במרכז ההתראות.','Elige qué aparece en tu centro de notificaciones.','Choisissez ce qui apparaît dans votre centre de notifications.','Wählen Sie, was im Benachrichtigungsbereich erscheint.','Scegli cosa appare nel centro notifiche.','Escolha o que aparece no centro de notificações.'],
['settings.notifications.email_title','Email notifications','התראות בדוא״ל','Notificaciones por correo','Notifications par e-mail','E-Mail-Benachrichtigungen','Notifiche e-mail','Notificações por e-mail'],
['settings.notifications.email_description','Control which events also send an email.','בחרו אילו אירועים יישלחו גם בדוא״ל.','Controla qué eventos también envían un correo.','Choisissez les événements qui envoient aussi un e-mail.','Legen Sie fest, welche Ereignisse auch per E-Mail gesendet werden.','Scegli quali eventi inviano anche un’e-mail.','Escolha os eventos que também enviam um e-mail.'],
['settings.notifications.always_on','Always on','פעיל תמיד','Siempre activo','Toujours actif','Immer aktiv','Sempre attivo','Sempre ativo'],
['settings.notifications.daily_title','Daily check-in reminders','תזכורות לבדיקה היומית','Recordatorios de registro diario','Rappels de suivi quotidien','Erinnerungen an den täglichen Check-in','Promemoria per il check-in quotidiano','Lembretes do registo diário'],
['settings.notifications.daily_description','A gentle reminder to record how you feel.','תזכורת עדינה לתעד כיצד אתם מרגישים.','Un recordatorio amable para registrar cómo te sientes.','Un rappel doux pour noter comment vous vous sentez.','Eine sanfte Erinnerung, Ihr Befinden festzuhalten.','Un promemoria gentile per annotare come ti senti.','Um lembrete gentil para registar como se sente.'],
['settings.notifications.progress_title','Progress and streak updates','עדכוני התקדמות ורצף','Progreso y rachas','Progression et séries','Fortschritt und Serien','Progressi e serie','Progresso e sequências'],
['settings.notifications.progress_description','Celebrate milestones and consistent practice.','חגגו אבני דרך והתמדה בתרגול.','Celebra hitos y práctica constante.','Célébrez les étapes et la régularité.','Feiern Sie Meilensteine und regelmäßiges Üben.','Celebra traguardi e pratica costante.','Celebre marcos e prática consistente.'],
['settings.notifications.goal_title','Goal reminders','תזכורות ליעדים','Recordatorios de objetivos','Rappels d’objectifs','Zielerinnerungen','Promemoria obiettivi','Lembretes de objetivos'],
['settings.notifications.goal_description','Stay on track with your active goals.','הישארו במסלול עם היעדים הפעילים.','Mantén el rumbo con tus objetivos activos.','Restez sur la bonne voie avec vos objectifs.','Bleiben Sie bei Ihren aktiven Zielen auf Kurs.','Resta in linea con i tuoi obiettivi attivi.','Mantenha o foco nos seus objetivos ativos.'],
['settings.notifications.exercise_title','Exercise reminders','תזכורות לתרגילים','Recordatorios de ejercicios','Rappels d’exercices','Übungserinnerungen','Promemoria esercizi','Lembretes de exercícios'],
['settings.notifications.exercise_description','Gentle prompts to practise CBT skills.','תזכורות עדינות לתרגול מיומנויות CBT.','Avisos amables para practicar habilidades de TCC.','Invitations douces à pratiquer les compétences TCC.','Sanfte Hinweise zum Üben von CBT-Fähigkeiten.','Inviti gentili a praticare abilità CBT.','Lembretes gentis para praticar competências de TCC.'],
['settings.notifications.critical_title','Critical system alerts','התראות מערכת חיוניות','Alertas críticas del sistema','Alertes système critiques','Kritische Systemwarnungen','Avvisi critici di sistema','Alertas críticos do sistema'],
['settings.notifications.critical_description','Important account and security notices.','הודעות חשובות על החשבון והאבטחה.','Avisos importantes de cuenta y seguridad.','Avis importants sur le compte et la sécurité.','Wichtige Konto- und Sicherheitshinweise.','Avvisi importanti su account e sicurezza.','Avisos importantes sobre conta e segurança.'],
['settings.notifications.mentions_title','Mentions and replies','אזכורים ותגובות','Menciones y respuestas','Mentions et réponses','Erwähnungen und Antworten','Menzioni e risposte','Menções e respostas'],
['settings.notifications.mentions_description','When someone replies to your community post.','כאשר מישהו מגיב לפרסום שלכם בקהילה.','Cuando alguien responde a tu publicación.','Quand quelqu’un répond à votre publication.','Wenn jemand auf Ihren Community-Beitrag antwortet.','Quando qualcuno risponde al tuo post.','Quando alguém responde à sua publicação.'],
['settings.notifications.email_daily_title','Daily reminder emails','תזכורות יומיות בדוא״ל','Correos recordatorios diarios','E-mails de rappel quotidien','Tägliche Erinnerungs-E-Mails','E-mail di promemoria giornaliero','E-mails de lembrete diário'],
['settings.notifications.email_progress_title','Progress digest','סיכום התקדמות','Resumen de progreso','Bilan de progression','Fortschrittsübersicht','Riepilogo progressi','Resumo de progresso'],
['settings.notifications.email_progress_description','A weekly progress summary by email.','סיכום שבועי של ההתקדמות בדוא״ל.','Un resumen semanal por correo.','Un bilan hebdomadaire par e-mail.','Eine wöchentliche Zusammenfassung per E-Mail.','Un riepilogo settimanale via e-mail.','Um resumo semanal por e-mail.'],
['settings.notifications.email_goal_title','Goal reminder emails','תזכורות ליעדים בדוא״ל','Correos de objetivos','E-mails de rappel d’objectifs','Zielerinnerungen per E-Mail','E-mail promemoria obiettivi','E-mails de lembrete de objetivos'],
['settings.notifications.email_exercise_title','Exercise reminder emails','תזכורות לתרגילים בדוא״ל','Correos de ejercicios','E-mails de rappel d’exercices','Übungserinnerungen per E-Mail','E-mail promemoria esercizi','E-mails de lembrete de exercícios'],
['mobile_menu.subtitle','Your wellbeing, one step at a time','הרווחה שלכם, צעד אחר צעד','Tu bienestar, paso a paso','Votre bien-être, pas à pas','Ihr Wohlbefinden, Schritt für Schritt','Il tuo benessere, un passo alla volta','O seu bem-estar, passo a passo'],
['mobile_menu.main_section','Your spaces','המרחבים שלכם','Tus espacios','Vos espaces','Ihre Bereiche','I tuoi spazi','Os seus espaços'],
['mobile_menu.more_section','More tools','כלים נוספים','Más herramientas','Plus d’outils','Weitere Werkzeuge','Altri strumenti','Mais ferramentas'],
['mobile_menu.footer_note','A calm, private space designed around you.','מרחב רגוע ופרטי שנבנה סביבכם.','Un espacio tranquilo y privado pensado para ti.','Un espace calme et privé conçu pour vous.','Ein ruhiger, privater Bereich für Sie.','Uno spazio calmo e privato pensato per te.','Um espaço calmo e privado pensado para si.'],
['premium.title','Unlock Premium','פתיחת Premium','Desbloquea Premium','Débloquez Premium','Premium freischalten','Sblocca Premium','Desbloquear Premium'],
['premium.subtitle','Enjoy unlimited access to every wellbeing tool.','קבלו גישה בלתי מוגבלת לכל כלי הרווחה הנפשית.','Disfruta acceso ilimitado a todas las herramientas.','Profitez d’un accès illimité à tous les outils.','Nutzen Sie unbegrenzten Zugriff auf alle Werkzeuge.','Ottieni accesso illimitato a tutti gli strumenti.','Tenha acesso ilimitado a todas as ferramentas.'],
['premium.plan','Premium plan','מסלול Premium','Plan Premium','Formule Premium','Premium-Tarif','Piano Premium','Plano Premium'],
['premium.month','per month','לחודש','al mes','par mois','pro Monat','al mese','por mês'],
['premium.best_value','Best value','הבחירה המשתלמת','Mejor opción','Meilleur choix','Beste Wahl','Scelta migliore','Melhor opção'],
['premium.cancel_anytime','Cancel anytime · 7-day free trial','אפשר לבטל בכל עת · 7 ימי ניסיון','Cancela cuando quieras · 7 días de prueba','Annulation à tout moment · essai de 7 jours','Jederzeit kündbar · 7 Tage gratis','Annulla quando vuoi · prova di 7 giorni','Cancele a qualquer momento · 7 dias grátis'],
['premium.start_trial','Start free trial','התחלת ניסיון חינם','Iniciar prueba gratuita','Commencer l’essai gratuit','Kostenlos testen','Inizia la prova gratuita','Iniciar teste gratuito'],
['premium.loading','Preparing…','מכינים…','Preparando…','Préparation…','Wird vorbereitet…','Preparazione…','A preparar…'],
['premium.close_aria','Close Premium offer','סגירת הצעת Premium','Cerrar oferta Premium','Fermer l’offre Premium','Premium-Angebot schließen','Chiudi offerta Premium','Fechar oferta Premium'],
['premium.checkout_error','Checkout could not be opened. Please try again.','לא ניתן לפתוח את התשלום. נסו שוב.','No se pudo abrir el pago. Inténtalo de nuevo.','Impossible d’ouvrir le paiement. Réessayez.','Die Zahlung konnte nicht geöffnet werden. Bitte erneut versuchen.','Impossibile aprire il pagamento. Riprova.','Não foi possível abrir o pagamento. Tente novamente.']
];

function setNested(target, path, value) {
  const parts = path.split('.');
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    cursor[parts[index]] = cursor[parts[index]] || {};
    cursor = cursor[parts[index]];
  }
  cursor[parts[parts.length - 1]] = value;
}

export function applySettingsUiTranslations(translations) {
  rows.forEach((row) => {
    languages.forEach((language, index) => {
      const root = translations[language]?.translation;
      if (root) setNested(root, row[0], row[index + 1]);
    });
  });
}
