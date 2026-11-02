import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Cloud, BookOpen, Target, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const OPTIONS = [
  {
    id: 1,
    labelKey: 'chat.entry.option_1',
    icon: Heart,
    color: '#E57373'
  },
  {
    id: 2,
    labelKey: 'chat.entry.option_2',
    icon: Cloud,
    color: '#9F7AEA'
  },
  {
    id: 3,
    labelKey: 'chat.entry.option_3',
    icon: BookOpen,
    color: '#4FC3F7'
  },
  {
    id: 4,
    labelKey: 'chat.entry.option_4',
    icon: Target,
    color: '#FFB74D'
  },
  {
    id: 5,
    labelKey: 'chat.entry.option_5',
    icon: Leaf,
    color: '#81C784'
  }
];

export default function TherapyEntryOptions({ onSelectOption }) {
  const { t } = useTranslation();
  return (
    <Card className="p-6 border-0 max-w-2xl mx-auto" style={{
      borderRadius: '28px',
      background: 'hsl(var(--card) / 0.97)',
      backdropFilter: 'blur(16px)',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div className="mb-6">
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('chat.entry.welcome')}
        </p>
        <h3 className="text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          {t('chat.entry.question')}
        </h3>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                onClick={() => onSelectOption({ ...option, label: t(option.labelKey) })}
                variant="ghost"
                className="w-full h-auto min-h-[56px] justify-start text-left p-4 hover:bg-transparent"
                style={{
                  borderRadius: '20px',
                  border: '1px solid rgba(38, 166, 154, 0.15)',
                  backgroundColor: 'hsl(var(--card) / 0.97)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--card) / 0.97)';
                  e.currentTarget.style.borderColor = option.color + '40';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${option.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--card) / 0.97)';
                  e.currentTarget.style.borderColor = 'hsl(var(--secondary))';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderRadius: '14px',
                      backgroundColor: option.color + '20'
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: option.color }} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium flex-1" style={{ color: 'hsl(var(--foreground))' }}>
                    {t(option.labelKey)}
                  </span>
                </div>
              </Button>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
