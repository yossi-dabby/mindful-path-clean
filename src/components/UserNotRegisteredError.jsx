import { useTranslation } from 'react-i18next';
export default function UserNotRegisteredError(){
 const {t,i18n}=useTranslation();
 return <main dir={i18n.dir()} className="garden-public-background min-h-dvh flex items-center justify-center p-4 text-foreground"><div className="garden-surface max-w-md w-full p-8 text-center space-y-5" role="alert"><h1 className="text-3xl font-bold">{t('stage6.restricted')}</h1><p>{t('stage6.restricted_body')}</p><p className="bg-secondary rounded-xl p-4 text-sm">{t('stage6.restricted_steps')}</p></div></main>;
}
