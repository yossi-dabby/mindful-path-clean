import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_TITLE = 'Mindful Path | Mental Wellness Support App';
const DEFAULT_DESCRIPTION = 'Mindful Path is a mental wellness app with guided journaling, mindfulness tools, and CBT-informed support to help users build healthy emotional habits.';

const ROUTE_META = {
  '/': {
    title: 'Mindful Path | Mental Wellness Support App',
    description: 'Mindful Path helps you practice mindfulness, journaling, and CBT-informed self-reflection with a supportive, structured daily experience.'
  },
  '/about': {
    title: 'About Mindful Path',
    description: 'Learn about Mindful Path, a mental wellness support app designed to help users build coping skills through guided, non-clinical self-help tools.'
  },
  '/privacy': {
    title: 'Privacy Policy | Mindful Path',
    description: 'Read how Mindful Path handles personal information, data protection, and user privacy for mental wellness support features.'
  },
  '/terms': {
    title: 'Terms of Use | Mindful Path',
    description: 'Review the Terms of Use for Mindful Path, including responsible use, safety guidance, and service limitations.'
  },
  '/contact': {
    title: 'Contact | Mindful Path',
    description: 'Contact Mindful Path for support, feedback, or general inquiries about the app and its mental wellness features.'
  }
};

function ensureDescriptionMeta() {
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    document.head.appendChild(tag);
  }
  return tag;
}

export default function RouteMetadata() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname !== '/' && location.pathname.endsWith('/')
      ? location.pathname.slice(0, -1)
      : location.pathname;
    const meta = ROUTE_META[path] || ROUTE_META['/'];

    document.title = meta?.title || DEFAULT_TITLE;
    const descriptionMeta = ensureDescriptionMeta();
    descriptionMeta.setAttribute('content', meta?.description || DEFAULT_DESCRIPTION);
  }, [location.pathname]);

  return null;
}
