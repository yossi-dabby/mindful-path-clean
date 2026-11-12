// Public business details supplied by the owner on 2026-11-12.
// Keep the registered Hebrew name and the supplied 9/1 address notation intact.
export const BUSINESS_NAME = 'דבי יוסף ודבי נצחיה';
export const BUSINESS_NUMBER = '558524088';
export const BUSINESS_ADDRESS_HE = 'רבי יוסי בן קיסמא 9/1, אלעד 4083809, ישראל';
export const BUSINESS_ADDRESS_LATIN = '9/1 Rabbi Yossi Ben Kisma, Elad 4083809, Israel';

const labels = {
  he: { title: 'פרטי העסק', name: 'שם העסק הרשום', number: 'מספר עוסק', address: 'כתובת העסק' },
  en: { title: 'Business details', name: 'Registered business name', number: 'Business number', address: 'Business address' },
  es: { title: 'Datos de la empresa', name: 'Nombre registrado de la empresa', number: 'Número de empresa', address: 'Dirección de la empresa' },
  fr: { title: 'Informations sur l’entreprise', name: 'Nom enregistré de l’entreprise', number: 'Numéro d’entreprise', address: 'Adresse de l’entreprise' },
  de: { title: 'Unternehmensangaben', name: 'Eingetragener Unternehmensname', number: 'Unternehmensnummer', address: 'Geschäftsanschrift' },
  it: { title: 'Dati dell’impresa', name: 'Nome registrato dell’impresa', number: 'Numero dell’impresa', address: 'Indirizzo dell’impresa' },
  pt: { title: 'Dados da empresa', name: 'Nome registado da empresa', number: 'Número da empresa', address: 'Endereço da empresa' },
};

export function getBusinessDetails(language) {
  const normalized = String(language || 'en').toLowerCase().split('-')[0];
  const copy = Object.hasOwn(labels, normalized) ? labels[normalized] : labels.en;
  return {
    id: 'business-details',
    title: copy.title,
    paragraphs: [
      `${copy.name}: ${BUSINESS_NAME}`,
      `${copy.number}: ${BUSINESS_NUMBER}`,
      `${copy.address}: ${normalized === 'he' ? BUSINESS_ADDRESS_HE : BUSINESS_ADDRESS_LATIN}`,
    ],
  };
}
