import contentStatus from './content-status.json';

export const THERAPEUTIC_FORMS_CONTENT_STATUS = contentStatus.status;
export const THERAPEUTIC_FORMS_CONTENT_AVAILABLE = contentStatus.contentAvailable === true;

const COPY = Object.freeze({
  en: Object.freeze({
    title: 'Forms are being updated',
    message: 'The forms-library structure is still available, but the worksheet files are temporarily unavailable while they are reviewed and improved.',
    catalog: 'Planned library structure',
    metadata: 'No forms are currently installed. The AI cannot open, quote, or attach a form until approved content is published.',
    aiMessage: 'The therapeutic forms library is currently under review. I cannot attach a form or rely on its unpublished content until an approved version is released. I can still offer a general exercise that is not based on a specific form.',
  }),
  he: Object.freeze({
    title: 'הטפסים נמצאים בתהליך עדכון',
    message: 'מבנה ספריית הטפסים נשמר, אך קובצי הטפסים אינם זמינים זמנית בזמן בדיקה, תיקון ושיפור.',
    catalog: 'מבנה הספרייה המתוכנן',
    metadata: 'אין כרגע טפסים מותקנים. ה־AI אינו יכול לפתוח, לצטט או לצרף טופס עד לפרסום תוכן מאושר.',
    aiMessage: 'ספריית הטפסים הטיפוליים נמצאת כעת בתהליך בדיקה ועדכון. איני יכול לצרף טופס או להסתמך על תוכן שטרם אושר עד לפרסום גרסה מאושרת. אוכל להציע תרגיל כללי שאינו מבוסס על טופס מסוים.',
  }),
  es: Object.freeze({
    title: 'Los formularios se están actualizando',
    message: 'La estructura de la biblioteca se mantiene disponible, pero los archivos están temporalmente retirados mientras se revisan y mejoran.',
    catalog: 'Estructura prevista de la biblioteca',
    metadata: 'Actualmente no hay formularios instalados. La IA no puede abrir, citar ni adjuntar formularios hasta que se publique contenido aprobado.',
    aiMessage: 'La biblioteca de formularios terapéuticos está en revisión. No puedo adjuntar un formulario ni basarme en contenido no publicado hasta que exista una versión aprobada. Sí puedo ofrecer un ejercicio general que no dependa de un formulario específico.',
  }),
  fr: Object.freeze({
    title: 'Les formulaires sont en cours de mise à jour',
    message: 'La structure de la bibliothèque reste disponible, mais les fichiers sont temporairement retirés pendant leur révision et leur amélioration.',
    catalog: 'Structure prévue de la bibliothèque',
    metadata: 'Aucun formulaire n’est actuellement installé. L’IA ne peut ni ouvrir, ni citer, ni joindre de formulaire avant la publication de contenu approuvé.',
    aiMessage: 'La bibliothèque de formulaires thérapeutiques est en cours de révision. Je ne peux pas joindre de formulaire ni m’appuyer sur un contenu non publié avant la sortie d’une version approuvée. Je peux toutefois proposer un exercice général qui ne dépend pas d’un formulaire précis.',
  }),
  de: Object.freeze({
    title: 'Die Formulare werden aktualisiert',
    message: 'Die Struktur der Formularbibliothek bleibt erhalten, die Dateien sind jedoch während der Prüfung und Überarbeitung vorübergehend nicht verfügbar.',
    catalog: 'Geplante Bibliotheksstruktur',
    metadata: 'Derzeit sind keine Formulare installiert. Die KI kann bis zur Veröffentlichung freigegebener Inhalte keine Formulare öffnen, zitieren oder anhängen.',
    aiMessage: 'Die Bibliothek therapeutischer Formulare wird derzeit geprüft. Ich kann kein Formular anhängen oder mich auf unveröffentlichte Inhalte stützen, bis eine freigegebene Version vorliegt. Ich kann weiterhin eine allgemeine Übung anbieten, die nicht auf einem bestimmten Formular basiert.',
  }),
  it: Object.freeze({
    title: 'I moduli sono in fase di aggiornamento',
    message: 'La struttura della raccolta resta disponibile, ma i file sono temporaneamente rimossi durante la revisione e il miglioramento.',
    catalog: 'Struttura prevista della raccolta',
    metadata: 'Al momento non sono installati moduli. L’IA non può aprire, citare o allegare moduli finché non vengono pubblicati contenuti approvati.',
    aiMessage: 'La raccolta dei moduli terapeutici è attualmente in revisione. Non posso allegare un modulo né basarmi su contenuti non pubblicati finché non sarà disponibile una versione approvata. Posso comunque proporre un esercizio generale non basato su un modulo specifico.',
  }),
  pt: Object.freeze({
    title: 'Os formulários estão sendo atualizados',
    message: 'A estrutura da biblioteca continua disponível, mas os arquivos estão temporariamente indisponíveis enquanto são revisados e melhorados.',
    catalog: 'Estrutura planejada da biblioteca',
    metadata: 'Não há formulários instalados no momento. A IA não pode abrir, citar ou anexar formulários até que conteúdo aprovado seja publicado.',
    aiMessage: 'A biblioteca de formulários terapêuticos está em revisão. Não posso anexar um formulário nem me basear em conteúdo não publicado até que uma versão aprovada seja lançada. Ainda posso oferecer um exercício geral que não dependa de um formulário específico.',
  }),
});

export function normalizeTherapeuticFormsLanguage(language) {
  const normalized = String(language || 'en').trim().toLowerCase().split('-')[0];
  return COPY[normalized] ? normalized : 'en';
}

export function getTherapeuticFormsAvailabilityCopy(language) {
  return COPY[normalizeTherapeuticFormsLanguage(language)];
}
