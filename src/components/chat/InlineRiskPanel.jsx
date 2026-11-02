import React, { useMemo, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { Card } from '../ui/card.jsx';
import { AlertTriangle, Globe, Phone, MessageSquare } from 'lucide-react';
import { appParams } from '../../lib/app-params.js';
import {
  SUPPORTED_EMERGENCY_REGIONS,
  clearStoredEmergencyRegion,
  getEmergencyResources,
  normalizeEmergencyRegion,
  readStoredEmergencyRegion,
  writeStoredEmergencyRegion,
} from '../../lib/emergencyResources.js';
import { useTranslation } from 'react-i18next';

const GLOBAL_HELP_URL = 'https://findahelpline.com/';

const CRISIS_UI_STRINGS = {
  en: {
    title: "We're Here to Help",
    body: "This AI cannot provide emergency support. If you're in crisis, please reach out to a professional immediately.",
    blockedNotice: 'Your message was not sent to the AI. Emergency resources are shown below.',
    button: 'Return to Chat',
    disclaimer: 'This AI is not a substitute for professional crisis care.',
    chooseRegionLabel: 'Choose country/region',
    chooseRegionPlaceholder: 'Select your country/region',
    resourcesFor: 'Resources for',
    changeCountry: 'Change country',
    localEmergencyGuidance: 'Local emergency guidance',
    genericGuidance: 'Contact local emergency services immediately or go to the nearest emergency department.',
    worldwideHelpDirectory: 'Worldwide help directory',
    hotlineLabel: 'Crisis hotline',
    textLabel: 'Text support',
    emergencyLabel: 'Emergency services',
  },
  he: {
    title: 'אנחנו כאן בשבילך',
    body: 'בינה מלאכותית זו אינה יכולה לספק סיוע חירום. אם אתה/את במשבר, פנה/י לאיש מקצוע באופן מיידי.',
    blockedNotice: 'ההודעה לא נשלחה ל-AI. משאבי חירום מוצגים להלן.',
    button: "חזרה לצ'אט",
    disclaimer: 'בינה מלאכותית זו אינה תחליף לטיפול מקצועי בעת משבר.',
    chooseRegionLabel: 'בחר/י מדינה/אזור',
    chooseRegionPlaceholder: 'בחר/י את המדינה/האזור שלך',
    resourcesFor: 'משאבים עבור',
    changeCountry: 'שינוי מדינה',
    localEmergencyGuidance: 'הנחיית חירום מקומית',
    genericGuidance: 'פנה/י מיד לשירותי החירום המקומיים או גש/י לחדר המיון הקרוב ביותר.',
    worldwideHelpDirectory: 'מדריך עזרה עולמי',
    hotlineLabel: 'קו סיוע למשבר',
    textLabel: 'סיוע בהודעה',
    emergencyLabel: 'שירותי חירום',
  },
  es: {
    title: 'Estamos aquí para ayudarte',
    body: 'Esta IA no puede proporcionar apoyo de emergencia. Si estás en crisis, comunícate con un profesional de inmediato.',
    blockedNotice: 'Tu mensaje no se envió a la IA. A continuación se muestran recursos de emergencia.',
    button: 'Volver al chat',
    disclaimer: 'Esta IA no reemplaza la atención profesional en situaciones de crisis.',
    chooseRegionLabel: 'Elige país/región',
    chooseRegionPlaceholder: 'Selecciona tu país/región',
    resourcesFor: 'Recursos para',
    changeCountry: 'Cambiar país',
    localEmergencyGuidance: 'Orientación de emergencia local',
    genericGuidance: 'Contacta inmediatamente con los servicios de emergencia locales o acude al servicio de urgencias más cercano.',
    worldwideHelpDirectory: 'Directorio mundial de ayuda',
    hotlineLabel: 'Línea de crisis',
    textLabel: 'Apoyo por texto',
    emergencyLabel: 'Servicios de emergencia',
  },
  fr: {
    title: 'Nous sommes là pour vous aider',
    body: "Cette IA ne peut pas fournir un soutien d'urgence. Si vous êtes en crise, contactez immédiatement un professionnel.",
    blockedNotice: "Votre message n’a pas été envoyé à l’IA. Les ressources d’urgence sont affichées ci-dessous.",
    button: 'Retour au chat',
    disclaimer: 'Cette IA ne remplace pas une prise en charge professionnelle en situation de crise.',
    chooseRegionLabel: 'Choisir un pays/une région',
    chooseRegionPlaceholder: 'Sélectionnez votre pays/région',
    resourcesFor: 'Ressources pour',
    changeCountry: 'Changer de pays',
    localEmergencyGuidance: "Conseils d'urgence locaux",
    genericGuidance: "Contactez immédiatement les services d'urgence locaux ou rendez-vous au service des urgences le plus proche.",
    worldwideHelpDirectory: "Annuaire mondial d'aide",
    hotlineLabel: 'Ligne de crise',
    textLabel: 'Aide par SMS',
    emergencyLabel: "Services d'urgence",
  },
  de: {
    title: 'Wir sind für dich da',
    body: 'Diese KI kann keine Notfallunterstützung bieten. Wenn du dich in einer Krise befindest, wende dich sofort an eine Fachkraft.',
    blockedNotice: 'Deine Nachricht wurde nicht an die KI gesendet. Notfallressourcen werden unten angezeigt.',
    button: 'Zurück zum Chat',
    disclaimer: 'Diese KI ersetzt keine professionelle Krisenunterstützung.',
    chooseRegionLabel: 'Land/Region auswählen',
    chooseRegionPlaceholder: 'Wähle dein Land/deine Region',
    resourcesFor: 'Ressourcen für',
    changeCountry: 'Land ändern',
    localEmergencyGuidance: 'Lokale Notfallhinweise',
    genericGuidance: 'Kontaktiere sofort die örtlichen Notdienste oder gehe in die nächstgelegene Notaufnahme.',
    worldwideHelpDirectory: 'Weltweites Hilfsverzeichnis',
    hotlineLabel: 'Krisenhotline',
    textLabel: 'Text-Hilfe',
    emergencyLabel: 'Notdienste',
  },
  it: {
    title: 'Siamo qui per aiutarti',
    body: 'Questa IA non può fornire supporto di emergenza. Se sei in crisi, contatta immediatamente un professionista.',
    blockedNotice: 'Il messaggio non è stato inviato all’IA. Le risorse di emergenza sono mostrate di seguito.',
    button: 'Torna alla chat',
    disclaimer: "Questa IA non sostituisce l'assistenza professionale in situazioni di crisi.",
    chooseRegionLabel: 'Scegli paese/regione',
    chooseRegionPlaceholder: 'Seleziona il tuo paese/la tua regione',
    resourcesFor: 'Risorse per',
    changeCountry: 'Cambia paese',
    localEmergencyGuidance: 'Indicazioni di emergenza locali',
    genericGuidance: 'Contatta immediatamente i servizi di emergenza locali oppure recati al pronto soccorso più vicino.',
    worldwideHelpDirectory: 'Directory mondiale di aiuto',
    hotlineLabel: 'Linea di crisi',
    textLabel: 'Supporto via SMS',
    emergencyLabel: 'Servizi di emergenza',
  },
  pt: {
    title: 'Estamos aqui para ajudar',
    body: 'Esta IA não pode fornecer suporte de emergência. Se estiver em crise, contacte imediatamente um profissional.',
    blockedNotice: 'A sua mensagem não foi enviada à IA. Os recursos de emergência são apresentados abaixo.',
    button: 'Voltar ao chat',
    disclaimer: 'Esta IA não substitui o apoio profissional em situações de crise.',
    chooseRegionLabel: 'Escolha país/região',
    chooseRegionPlaceholder: 'Selecione o seu país/região',
    resourcesFor: 'Recursos para',
    changeCountry: 'Alterar país',
    localEmergencyGuidance: 'Orientação de emergência local',
    genericGuidance: 'Contacte imediatamente os serviços de emergência locais ou dirija-se ao serviço de urgência mais próximo.',
    worldwideHelpDirectory: 'Diretório mundial de ajuda',
    hotlineLabel: 'Linha de crise',
    textLabel: 'Apoio por mensagem',
    emergencyLabel: 'Serviços de emergência',
  },
};

const EMERGENCY_REGION_LABELS = Object.freeze({
  US: 'United States',
  IL: 'Israel',
  ES: 'Spain',
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  PT: 'Portugal',
});

function resolveLanguageCode(language) {
  const baseLang = language?.split('-')[0];
  if (CRISIS_UI_STRINGS[language]) {
    return language;
  }
  if (CRISIS_UI_STRINGS[baseLang]) {
    return baseLang;
  }
  return 'en';
}

function getRegionDisplayName(region, language) {
  if (!region) {
    return '';
  }

  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      const displayNames = new Intl.DisplayNames([language], { type: 'region' });
      return displayNames.of(region) || EMERGENCY_REGION_LABELS[region] || region;
    }
  } catch {
    // Fall back to deterministic labels below.
  }

  return EMERGENCY_REGION_LABELS[region] || region;
}

function ResourceRow({ icon: Icon, label, value, serviceName }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
      <div className="min-w-0">
        <span className="font-medium" style={{ color: '#7F1D1D' }}>{label}:</span>
        <span className="ml-2 break-words" style={{ color: '#991B1B' }}>{value}</span>
        {serviceName && serviceName !== label ? (
          <p className="text-xs mt-1" style={{ color: '#991B1B', opacity: 0.85 }}>
            {serviceName}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function InlineRiskPanel({ onDismiss }) {
  const { i18n } = useTranslation();
  const [selectedRegion, setSelectedRegion] = useState(() => readStoredEmergencyRegion());
  const lang = resolveLanguageCode(i18n.language);
  const s = CRISIS_UI_STRINGS[lang];
  const resources = getEmergencyResources(selectedRegion);
  const currentRegionName = useMemo(
    () => getRegionDisplayName(selectedRegion, lang),
    [selectedRegion, lang]
  );

  const handleDismiss = () => {
    if (appParams.appId) {
      import('@/api/base44Client').then(({ base44 }) => {
        base44.analytics.track({
          eventName: 'risk_panel_dismissed',
          properties: { surface: 'chat', lang, timestamp: new Date().toISOString() }
        });
      });
    }
    onDismiss();
  };

  const handleRegionChange = (event) => {
    const nextRegion = normalizeEmergencyRegion(event.target.value);
    writeStoredEmergencyRegion(nextRegion);
    setSelectedRegion(nextRegion);
  };

  const handleClearRegion = () => {
    clearStoredEmergencyRegion();
    setSelectedRegion(null);
  };

  return (
    <Card
      data-testid="inline-risk-panel"
      className="border-0 mb-4"
      style={{
        borderRadius: '20px',
        background: 'linear-gradient(145deg, rgba(254, 242, 242, 0.98) 0%, rgba(254, 226, 226, 0.95) 100%)',
        backdropFilter: 'blur(8px)',
        border: '2px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
      }}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
              borderRadius: '14px',
              background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)'
            }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: '#DC2626' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-semibold mb-2" style={{ color: '#7F1D1D' }}>
              {s.title}
            </h3>
            <p className="text-sm md:text-base leading-relaxed mb-3" style={{ color: '#991B1B' }}>
              {s.body}
            </p>
            <p
              data-testid="risk-message-blocked-notice"
              className="text-sm font-semibold mb-4 p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.72)', color: '#7F1D1D' }}
            >
              {s.blockedNotice}
            </p>

            {resources ? (
              <div className="mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <p
                    data-testid="emergency-region-current"
                    className="text-sm font-medium"
                    style={{ color: '#7F1D1D' }}
                  >
                    {s.resourcesFor} {currentRegionName}
                  </p>
                  <button
                    type="button"
                    onClick={handleClearRegion}
                    data-testid="emergency-region-change"
                    aria-label={s.changeCountry}
                    className="text-sm underline underline-offset-2"
                    style={{ color: '#991B1B' }}
                  >
                    {s.changeCountry}
                  <span className="mobile-action-label md:hidden">{s.changeCountry}</span></button>
                </div>

                <div
                  data-testid="emergency-local-resources"
                  className="space-y-2 mb-3 text-sm"
                >
                  <p className="font-medium" style={{ color: '#7F1D1D' }}>
                    {s.localEmergencyGuidance}
                  </p>
                  <ResourceRow
                    icon={Phone}
                    label={s.hotlineLabel}
                    value={resources.hotlineNumber}
                    serviceName={resources.hotlineLabel}
                  />
                  <ResourceRow
                    icon={MessageSquare}
                    label={s.textLabel}
                    value={resources.textNumber}
                    serviceName={resources.textLabel}
                  />
                  <ResourceRow
                    icon={Phone}
                    label={s.emergencyLabel}
                    value={resources.emergencyNumber}
                    serviceName={resources.emergencyLabel}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label
                  htmlFor="emergency-region-select"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#7F1D1D' }}
                >
                  {s.chooseRegionLabel}
                </label>
                <select
                  id="emergency-region-select"
                  data-testid="emergency-region-select"
                  aria-label={s.chooseRegionLabel}
                  className="mb-3 min-h-12 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.35)', color: '#7F1D1D' }}
                  value=""
                  onChange={handleRegionChange}
                >
                  <option value="">{s.chooseRegionPlaceholder}</option>
                  {SUPPORTED_EMERGENCY_REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {getRegionDisplayName(region, lang)}
                    </option>
                  ))}
                </select>
                <div
                  data-testid="emergency-generic-guidance"
                  className="p-3 rounded-xl text-sm"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', color: '#991B1B' }}
                >
                  <p className="font-medium mb-1" style={{ color: '#7F1D1D' }}>
                    {s.localEmergencyGuidance}
                  </p>
                  <p>{s.genericGuidance}</p>
                </div>
              </div>
            )}

            <a
              href={GLOBAL_HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="emergency-global-directory"
              className="flex items-center gap-2 text-sm font-medium mb-4 underline underline-offset-2"
              style={{ color: '#991B1B' }}
            >
              <Globe className="w-4 h-4 flex-shrink-0" />
              <span>{s.worldwideHelpDirectory}</span>
            </a>

            <p className="text-xs mb-3" style={{ color: '#991B1B', opacity: 0.8 }}>
              {s.disclaimer}
            </p>

            <Button
              onClick={handleDismiss}
              data-testid="risk-panel-dismiss"
              className="w-full md:w-auto text-white font-medium"
              style={{
                borderRadius: '14px',
                backgroundColor: '#DC2626',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
              }}
            >
              {s.button}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
