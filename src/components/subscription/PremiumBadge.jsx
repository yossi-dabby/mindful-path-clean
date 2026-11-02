import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock } from 'lucide-react';

export default function PremiumBadge({ locked = false, compact = false }) {
  if (locked) {
    return (
      <Badge className="bg-gray-100 text-muted-foreground border-gray-300 gap-1">
        <Lock className="w-3 h-3" />
        {!compact && 'Premium'}
      </Badge>
    );
  }

  return (
    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 gap-1">
      <Crown className="w-3 h-3" />
      {!compact && 'Premium'}
    </Badge>
  );
}