const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

const rows = [
['eyebrow','Verified guidance','מידע מקצועי מאומת','Orientación verificada','Conseils vérifiés','Geprüfte Informationen','Informazioni verificate','Informação verificada'],
['page_subtitle','Recent mental health guidance from official health organizations, published or updated within the last two years.','מידע עדכני לבריאות הנפש מגופי בריאות רשמיים, שפורסם או עודכן בשנתיים האחרונות.','Información reciente sobre salud mental de organismos sanitarios oficiales, publicada o actualizada en los últimos dos años.','Informations récentes sur la santé mentale provenant d’organismes officiels, publiées ou actualisées au cours des deux dernières années.','Aktuelle Informationen zur psychischen Gesundheit von offiziellen Gesundheitsstellen, veröffentlicht oder aktualisiert in den letzten zwei Jahren.','Informazioni recenti sulla salute mentale da enti sanitari ufficiali, pubblicate o aggiornate negli ultimi due anni.','Informação recente sobre saúde mental de entidades oficiais, publicada ou atualizada nos últimos dois anos.'],
['recent_badge','2024–2026','2024–2026','2024–2026','2024–2026','2024–2026','2024–2026','2024–2026'],
['resource_count','{{count}} verified resources','{{count}} משאבים מאומתים','{{count}} recursos verificados','{{count}} ressources vérifiées','{{count}} geprüfte Ressourcen','{{count}} risorse verificate','{{count}} recursos verificados'],
['search_label','Search the resource library','חיפוש בספריית המשאבים','Buscar en la biblioteca','Rechercher dans la bibliothèque','Ressourcen durchsuchen','Cerca nella raccolta','Pesquisar na biblioteca'],
['search_placeholder','Search by topic, title or source…','חיפוש לפי נושא, כותרת או מקור…','Buscar por tema, título o fuente…','Rechercher par thème, titre ou source…','Nach Thema, Titel oder Quelle suchen…','Cerca per argomento, titolo o fonte…','Pesquisar por tema, título ou fonte…'],
['filters_title','Filter resources','סינון משאבים','Filtrar recursos','Filtrer les ressources','Ressourcen filtern','Filtra risorse','Filtrar recursos'],
['sort_label','Sort by','מיון לפי','Ordenar por','Trier par','Sortieren nach','Ordina per','Ordenar por'],
['sort_newest','Newest first','החדשים ביותר','Más recientes','Plus récentes','Neueste zuerst','Più recenti','Mais recentes'],
['sort_title','Title','כותרת','Título','Titre','Titel','Titolo','Título'],
['clear_filters','Clear filters','ניקוי מסננים','Borrar filtros','Effacer les filtres','Filter zurücksetzen','Azzera filtri','Limpar filtros'],
['active_filters','Active filters: {{count}}','מסננים פעילים: {{count}}','Filtros activos: {{count}}','Filtres actifs : {{count}}','Aktive Filter: {{count}}','Filtri attivi: {{count}}','Filtros ativos: {{count}}'],
['tabs_all','All resources','כל המשאבים','Todos los recursos','Toutes les ressources','Alle Ressourcen','Tutte le risorse','Todos os recursos'],
['tabs_saved','Saved ({{count}})','נשמרו ({{count}})','Guardados ({{count}})','Enregistrées ({{count}})','Gespeichert ({{count}})','Salvate ({{count}})','Guardados ({{count}})'],
['loading','Loading verified resources…','טוען משאבים מאומתים…','Cargando recursos verificados…','Chargement des ressources vérifiées…','Geprüfte Ressourcen werden geladen…','Caricamento risorse verificate…','A carregar recursos verificados…'],
['load_error','We could not load the resource library.','לא הצלחנו לטעון את ספריית המשאבים.','No se pudo cargar la biblioteca.','Impossible de charger la bibliothèque.','Die Ressourcen konnten nicht geladen werden.','Impossibile caricare la raccolta.','Não foi possível carregar a biblioteca.'],
['retry','Try again','ניסיון נוסף','Reintentar','Réessayer','Erneut versuchen','Riprova','Tentar novamente'],
['empty_title','No matching resources','לא נמצאו משאבים מתאימים','No hay recursos coincidentes','Aucune ressource correspondante','Keine passenden Ressourcen','Nessuna risorsa corrispondente','Nenhum recurso correspondente'],
['empty_message','Try changing the search or filters.','נסו לשנות את החיפוש או המסננים.','Prueba a cambiar la búsqueda o los filtros.','Modifiez la recherche ou les filtres.','Ändern Sie die Suche oder die Filter.','Prova a modificare ricerca o filtri.','Tente alterar a pesquisa ou os filtros.'],
['saved_empty_title','Nothing saved yet','עדיין לא נשמרו משאבים','Aún no hay recursos guardados','Aucune ressource enregistrée','Noch nichts gespeichert','Nessuna risorsa salvata','Ainda não há recursos guardados'],
['saved_empty_message','Use the bookmark on any resource to keep it here.','השתמשו בסימניית השמירה בכרטיס כדי למצוא אותו כאן בהמשך.','Usa el marcador de una tarjeta para guardarla aquí.','Utilisez le marque-page d’une carte pour la retrouver ici.','Speichern Sie Ressourcen über das Lesezeichen.','Usa il segnalibro su una scheda per conservarla qui.','Use o marcador num cartão para o guardar aqui.'],
['save_error','Your saved resources could not be updated.','לא ניתן היה לעדכן את המשאבים השמורים.','No se pudieron actualizar los recursos guardados.','Impossible de mettre à jour les ressources enregistrées.','Gespeicherte Ressourcen konnten nicht aktualisiert werden.','Impossibile aggiornare le risorse salvate.','Não foi possível atualizar os recursos guardados.'],
['card.source','Source','מקור','Fuente','Source','Quelle','Fonte','Fonte'],
['card.published','Published / updated {{date}}','פורסם / עודכן {{date}}','Publicado / actualizado el {{date}}','Publié / mis à jour le {{date}}','Veröffentlicht / aktualisiert am {{date}}','Pubblicato / aggiornato il {{date}}','Publicado / atualizado em {{date}}'],
['card.verified','Link verified {{date}}','הקישור אומת {{date}}','Enlace verificado el {{date}}','Lien vérifié le {{date}}','Link geprüft am {{date}}','Link verificato il {{date}}','Ligação verificada em {{date}}'],
['card.open','Open official source','פתיחת המקור הרשמי','Abrir fuente oficial','Ouvrir la source officielle','Offizielle Quelle öffnen','Apri la fonte ufficiale','Abrir fonte oficial'],
['card.opens_new','Opens in a new tab','נפתח בכרטיסייה חדשה','Se abre en una pestaña nueva','S’ouvre dans un nouvel onglet','Öffnet in einem neuen Tab','Si apre in una nuova scheda','Abre num novo separador'],
['card.save','Save {{title}}','שמירת {{title}}','Guardar {{title}}','Enregistrer {{title}}','{{title}} speichern','Salva {{title}}','Guardar {{title}}'],
['card.remove','Remove {{title}} from saved','הסרת {{title}} מהשמורים','Quitar {{title}} de guardados','Retirer {{title}} des favoris','{{title}} aus Gespeichert entfernen','Rimuovi {{title}} dai salvati','Remover {{title}} dos guardados'],
['card.read_time','{{time}} min read','כ־{{time}} דקות קריאה','{{time}} min de lectura','{{time}} min de lecture','{{time}} Min. Lesezeit','{{time}} min di lettura','{{time}} min de leitura'],
['ai.title','AI library guide','מדריך AI לספרייה','Guía IA de la biblioteca','Guide IA de la bibliothèque','KI-Bibliotheksguide','Guida IA alla raccolta','Guia IA da biblioteca'],
['ai.subtitle','Ask AI to choose a varied starting point from this verified library. It receives only public resource titles and summaries.','אפשר לבקש מה־AI לבחור נקודת התחלה מגוונת מהספרייה המאומתת. נשלחים אליו רק כותרות ותקצירים ציבוריים של המשאבים.','Pide a la IA un punto de partida variado. Solo recibe títulos y resúmenes públicos.','Demandez à l’IA un point de départ varié. Seuls les titres et résumés publics lui sont transmis.','Lassen Sie die KI einen vielseitigen Einstieg wählen. Sie erhält nur öffentliche Titel und Zusammenfassungen.','Chiedi all’IA un punto di partenza vario. Riceve solo titoli e riepiloghi pubblici.','Peça à IA um ponto de partida variado. Recebe apenas títulos e resumos públicos.'],
['ai.privacy','Mood, journal entries and other personal data are not sent.','מצב רוח, רשומות יומן ומידע אישי אחר אינם נשלחים.','No se envían datos de ánimo, diario ni otros datos personales.','Les données d’humeur, du journal et autres données personnelles ne sont pas transmises.','Stimmungs-, Tagebuch- und andere persönliche Daten werden nicht gesendet.','Dati su umore, diario e altri dati personali non vengono inviati.','Dados de humor, diário e outros dados pessoais não são enviados.'],
['ai.generate','Get suggestions','קבלת המלצות','Obtener sugerencias','Obtenir des suggestions','Empfehlungen erhalten','Ricevi suggerimenti','Obter sugestões'],
['ai.loading_title','Selecting helpful resources…','בוחר משאבים מתאימים…','Seleccionando recursos útiles…','Sélection des ressources utiles…','Passende Ressourcen werden ausgewählt…','Selezione delle risorse utili…','A selecionar recursos úteis…'],
['ai.loading_text','This may take a few moments.','התהליך עשוי להימשך מספר רגעים.','Puede tardar unos instantes.','Cela peut prendre quelques instants.','Dies kann einen Moment dauern.','Potrebbero servire alcuni istanti.','Pode demorar alguns instantes.'],
['ai.results_title','AI-selected starting points','נקודות התחלה שנבחרו ב־AI','Puntos de partida seleccionados por IA','Points de départ sélectionnés par l’IA','KI-ausgewählte Startpunkte','Punti di partenza scelti dall’IA','Pontos de partida escolhidos pela IA'],
['ai.refresh','Refresh suggestions','רענון המלצות','Actualizar sugerencias','Actualiser les suggestions','Empfehlungen aktualisieren','Aggiorna suggerimenti','Atualizar sugestões'],
['ai.close','Hide suggestions','הסתרת ההמלצות','Ocultar sugerencias','Masquer les suggestions','Empfehlungen ausblenden','Nascondi suggerimenti','Ocultar sugestões'],
['ai.show','Show AI library guide','הצגת מדריך ה־AI','Mostrar guía IA','Afficher le guide IA','KI-Bibliotheksguide anzeigen','Mostra guida IA','Mostrar guia IA'],
['ai.why','Why this may help','למה זה עשוי לעזור','Por qué puede ayudar','Pourquoi cela peut aider','Warum dies helfen kann','Perché può aiutare','Porque pode ajudar'],
['ai.error','Suggestions are unavailable right now. Your resources remain available below.','ההמלצות אינן זמינות כרגע. המשאבים עדיין זמינים בהמשך הדף.','Las sugerencias no están disponibles ahora. Los recursos siguen disponibles abajo.','Les suggestions sont indisponibles. Les ressources restent accessibles ci-dessous.','Empfehlungen sind derzeit nicht verfügbar. Die Ressourcen finden Sie weiterhin unten.','I suggerimenti non sono disponibili. Le risorse restano accessibili qui sotto.','As sugestões não estão disponíveis. Os recursos continuam acessíveis abaixo.'],
['ai.no_results','No matching suggestions were returned. Try refreshing.','לא התקבלו המלצות מתאימות. נסו לרענן.','No se devolvieron sugerencias. Prueba a actualizar.','Aucune suggestion correspondante. Actualisez la sélection.','Keine passenden Empfehlungen. Bitte aktualisieren.','Nessun suggerimento corrispondente. Prova ad aggiornare.','Não foram devolvidas sugestões. Tente atualizar.'],
['ai.priority.high','Top match','התאמה גבוהה','Mejor coincidencia','Meilleure correspondance','Beste Übereinstimmung','Corrispondenza migliore','Melhor correspondência'],
['ai.priority.medium','Good match','התאמה טובה','Buena coincidencia','Bonne correspondance','Gute Übereinstimmung','Buona corrispondenza','Boa correspondência'],
['ai.priority.low','Additional option','אפשרות נוספת','Opción adicional','Option supplémentaire','Weitere Option','Opzione aggiuntiva','Opção adicional'],
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

export function applyResourcesUiTranslations(translations) {
  rows.forEach((row) => {
    languages.forEach((language, index) => {
      const root = translations[language]?.translation;
      if (root) setNested(root, `resources_ui.${row[0]}`, row[index + 1]);
    });
  });
}
