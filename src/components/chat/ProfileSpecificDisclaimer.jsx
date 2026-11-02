import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Profile-specific disclaimer shown periodically during conversation
 * Strict profile: Shows every 10 messages
 * Standard profile: Shows every 20 messages
 * Lenient profile: Not shown
 */

export default function ProfileSpecificDisclaimer({ messageCount }) {
  const { t } = useTranslation();
  const [safetyProfile, setSafetyProfile] = useState('standard');
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    base44.auth.me().then((user) => {
      const profile = user?.preferences?.safety_profile || 'standard';
      setSafetyProfile(profile);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Determine if disclaimer should show based on profile and message count
    if (safetyProfile === 'strict' && messageCount > 0 && messageCount % 10 === 0) {
      setShouldShow(true);
      setTimeout(() => setShouldShow(false), 8000); // Auto-hide after 8 seconds
    } else if (safetyProfile === 'standard' && messageCount > 0 && messageCount % 20 === 0) {
      setShouldShow(true);
      setTimeout(() => setShouldShow(false), 8000);
    }
  }, [messageCount, safetyProfile]);

  if (!shouldShow || safetyProfile === 'lenient') {
    return null;
  }

  return (
    <Card 
      className="border-0 mb-4 animate-in fade-in-0 slide-in-from-top-2 duration-300"
      style={{
        borderRadius: '16px',
        background: 'linear-gradient(145deg, rgba(243, 244, 246, 0.95) 0%, rgba(229, 231, 235, 0.9) 100%)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(107, 114, 128, 0.2)',
        boxShadow: '0 2px 8px rgba(107, 114, 128, 0.1)'
      }}
    >
      <div className="p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t(`chat.disclaimer.${safetyProfile}`)}
        </p>
      </div>
    </Card>
  );
}
