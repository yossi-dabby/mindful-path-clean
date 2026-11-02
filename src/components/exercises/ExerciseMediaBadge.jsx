import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Headphones, Play, Eye, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const mediaConfig = {
  audio: { icon: Headphones, translationKey: 'exercises.detail.tabs.audio', color: 'bg-purple-100 text-purple-700' },
  video: { icon: Play, translationKey: 'exercises.detail.video_label', color: 'bg-red-100 text-red-700' },
  visualization: { icon: Eye, translationKey: 'exercises.detail.guided_visualization', color: 'bg-blue-100 text-blue-700' },
  text: { icon: FileText, translationKey: 'exercises.detail.tabs.overview', color: 'bg-gray-100 text-muted-foreground' }
};

export default function ExerciseMediaBadge({ mediaType, size = 'sm' }) {
  const { t } = useTranslation();
  const config = mediaConfig[mediaType] || mediaConfig.text;
  const Icon = config.icon;
  
  if (mediaType === 'text' || !mediaType) return null;

  return (
    <Badge 
      variant="secondary" 
      className={`${config.color} flex items-center gap-1 ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {t(config.translationKey)}
    </Badge>
  );
}