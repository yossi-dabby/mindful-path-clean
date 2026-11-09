import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePrivateAttachmentUrl } from '@/hooks/usePrivateAttachmentUrl';
import { isPrivateAttachmentRef } from '@/lib/privateAttachments';

function MediaElement({ url, as = 'img', children, ...props }) {
  if (as === 'img') return <img {...props} src={url} />;
  return React.createElement(as, { ...props, [as === 'a' ? 'href' : 'src']: url }, children);
}

function OwnedAttachmentMedia({ reference, ...props }) {
  const url = usePrivateAttachmentUrl(reference);
  const { t } = useTranslation();
  if (!url) return <span role="status" className="text-sm">{t('pdf_ui.unavailable')}</span>;
  return <MediaElement {...props} url={url} />;
}

export default function PrivateAttachmentMedia({ reference, ...props }) {
  return isPrivateAttachmentRef(reference)
    ? <OwnedAttachmentMedia {...props} reference={reference} />
    : <MediaElement {...props} url={reference} />;
}
