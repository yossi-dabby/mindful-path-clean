import React from 'react';
import { useTranslation } from 'react-i18next';

export default function MobileActionLabel({ action }) {
  const { t } = useTranslation();
  return <span className="mobile-action-label md:hidden">{t('mobile_actions.' + action)}</span>;
}
