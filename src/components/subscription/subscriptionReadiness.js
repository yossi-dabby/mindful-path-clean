import { DEFAULT_APP_LOCALE, normalizeAppLocale } from '../i18n/appLocale.js';
import {
  SUBSCRIPTIONS_ENABLED,
  formatMonthlyPrice
} from './subscriptionCatalog.js';

export { SUBSCRIPTIONS_ENABLED };

const COPY = Object.freeze({
  en: {
    pending: 'Not available yet',
    description: 'Mindful Path Premium will be available for $9.99 per month through secure web and app-store billing.',
    button: 'View Premium',
    modalTitle: 'Mindful Path Premium',
    modalBody: 'One monthly plan with secure billing and access across your signed-in devices.',
    perMonth: 'per month',
    purchase: 'Subscribe for {price}',
    restore: 'Restore purchases',
    processing: 'Checking your purchase…',
    success: 'Premium is now active.',
    restored: 'Your Premium purchase was restored.',
    nothingToRestore: 'No active purchase was found for this account.',
    unavailable: 'Purchases remain unavailable until the billing accounts and store products are verified.',
    error: 'We could not complete the purchase. No charge was confirmed.',
    terms: 'Cancel anytime in the store or billing service used for the purchase.',
    close: 'Close'
  },
  he: {
    pending: 'עדיין לא זמין',
    description: 'Mindful Path Premium יהיה זמין במחיר 9.99$ לחודש באמצעות חיוב מאובטח באתר ובחנויות האפליקציות.',
    button: 'הצגת Premium',
    modalTitle: 'Mindful Path Premium',
    modalBody: 'תוכנית חודשית אחת, עם חיוב מאובטח וגישה בכל המכשירים המחוברים לחשבון.',
    perMonth: 'לחודש',
    purchase: 'הרשמה במחיר {price}',
    restore: 'שחזור רכישות',
    processing: 'הרכישה נבדקת…',
    success: 'Premium פעיל כעת.',
    restored: 'רכישת Premium שוחזרה בהצלחה.',
    nothingToRestore: 'לא נמצאה רכישה פעילה עבור חשבון זה.',
    unavailable: 'הרכישות יישארו חסומות עד לאימות חשבונות החיוב ומוצרי החנויות.',
    error: 'לא הצלחנו להשלים את הרכישה. לא אושר חיוב.',
    terms: 'ניתן לבטל בכל עת בחנות או בשירות החיוב שבו בוצעה הרכישה.',
    close: 'סגירה'
  },
  es: {
    pending: 'Aún no disponible',
    description: 'Mindful Path Premium estará disponible por 9,99 US$ al mes mediante pagos seguros en la web y en las tiendas.',
    button: 'Ver Premium',
    modalTitle: 'Mindful Path Premium',
    modalBody: 'Un único plan mensual con pago seguro y acceso en todos tus dispositivos conectados.',
    perMonth: 'al mes',
    purchase: 'Suscribirse por {price}',
    restore: 'Restaurar compras',
    processing: 'Comprobando tu compra…',
    success: 'Premium ya está activo.',
    restored: 'Tu compra Premium se ha restaurado.',
    nothingToRestore: 'No se encontró ninguna compra activa para esta cuenta.',
    unavailable: 'Las compras seguirán desactivadas hasta verificar las cuentas de pago y los productos de las tiendas.',
    error: 'No se pudo completar la compra. No se confirmó ningún cargo.',
    terms: 'Puedes cancelar en cualquier momento en la tienda o servicio de pago utilizado.',
    close: 'Cerrar'
  },
  fr: {
    pending: 'Pas encore disponible',
    description: 'Mindful Path Premium sera proposé à 9,99 $US par mois avec un paiement sécurisé sur le web et dans les boutiques.',
    button: 'Voir Premium',
    modalTitle: 'Mindful Path Premium',
    modalBody: 'Une formule mensuelle unique, avec paiement sécurisé et accès sur tous vos appareils connectés.',
    perMonth: 'par mois',
    purchase: 'S’abonner pour {price}',
    restore: 'Restaurer les achats',
    processing: 'Vérification de votre achat…',
    success: 'Premium est maintenant actif.',
    restored: 'Votre achat Premium a été restauré.',
    nothingToRestore: 'Aucun achat actif n’a été trouvé pour ce compte.',
    unavailable: 'Les achats resteront désactivés jusqu’à la vérification des comptes de paiement et des produits des boutiques.',
    error: 'L’achat n’a pas pu être finalisé. Aucun paiement n’a été confirmé.',
    terms: 'Annulez à tout moment dans la boutique ou le service de paiement utilisé.',
    close: 'Fermer'
  },
  de: {
    pending: 'Noch nicht verfügbar',
    description: 'Mindful Path Premium wird für 9,99 US-Dollar pro Monat über sichere Web- und App-Store-Zahlungen angeboten.',
    button: 'Premium ansehen',
    modalTitle: 'Mindful Path Premium',
    modalBody: 'Ein monatlicher Tarif mit sicherer Abrechnung und Zugriff auf allen angemeldeten Geräten.',
    perMonth: 'pro Monat',
    purchase: 'Für {price} abonnieren',
    restore: 'Käufe wiederherstellen',
    processing: 'Kauf wird geprüft…',
    success: 'Premium ist jetzt aktiv.',
    restored: 'Dein Premium-Kauf wurde wiederhergestellt.',
    nothingToRestore: 'Für dieses Konto wurde kein aktiver Kauf gefunden.',
    unavailable: 'Käufe bleiben deaktiviert, bis Zahlungskonten und Store-Produkte geprüft sind.',
    error: 'Der Kauf konnte nicht abgeschlossen werden. Es wurde keine Belastung bestätigt.',
    terms: 'Jederzeit im verwendeten Store oder Zahlungsdienst kündbar.',
    close: 'Schließen'
  },
  it: {
    pending: 'Non ancora disponibile',
    description: 'Mindful Path Premium sarà disponibile a 9,99 USD al mese con pagamenti sicuri sul web e negli store.',
    button: 'Vedi Premium',
    modalTitle: 'Mindful Path Premium',
    modalBody: 'Un unico piano mensile con pagamento sicuro e accesso su tutti i dispositivi collegati.',
    perMonth: 'al mese',
    purchase: 'Abbonati a {price}',
    restore: 'Ripristina acquisti',
    processing: 'Verifica dell’acquisto…',
    success: 'Premium è ora attivo.',
    restored: 'Il tuo acquisto Premium è stato ripristinato.',
    nothingToRestore: 'Non è stato trovato alcun acquisto attivo per questo account.',
    unavailable: 'Gli acquisti resteranno disattivati finché gli account di pagamento e i prodotti degli store non saranno verificati.',
    error: 'Impossibile completare l’acquisto. Nessun addebito è stato confermato.',
    terms: 'Puoi annullare in qualsiasi momento nello store o nel servizio di pagamento utilizzato.',
    close: 'Chiudi'
  },
  pt: {
    pending: 'Ainda não disponível',
    description: 'O Mindful Path Premium estará disponível por US$ 9,99 por mês, com pagamentos seguros na web e nas lojas.',
    button: 'Ver Premium',
    modalTitle: 'Mindful Path Premium',
    modalBody: 'Um único plano mensal com pagamento seguro e acesso em todos os dispositivos ligados à sua conta.',
    perMonth: 'por mês',
    purchase: 'Subscrever por {price}',
    restore: 'Restaurar compras',
    processing: 'A verificar a sua compra…',
    success: 'O Premium está agora ativo.',
    restored: 'A sua compra Premium foi restaurada.',
    nothingToRestore: 'Não foi encontrada nenhuma compra ativa para esta conta.',
    unavailable: 'As compras continuarão desativadas até à verificação das contas de pagamento e dos produtos das lojas.',
    error: 'Não foi possível concluir a compra. Nenhuma cobrança foi confirmada.',
    terms: 'Cancele a qualquer momento na loja ou no serviço de pagamento utilizado.',
    close: 'Fechar'
  }
});

export function getSubscriptionReadinessCopy(locale) {
  const normalized = normalizeAppLocale(locale, DEFAULT_APP_LOCALE);
  return {
    ...(COPY[normalized] || COPY.en),
    price: formatMonthlyPrice(normalized)
  };
}

export function isPremiumSubscription(subscription) {
  if (!subscription || subscription.plan_type === 'free') return false;
  if (subscription.entitlement_active === false) return false;
  return ['active', 'trial', 'grace_period'].includes(subscription.status);
}
