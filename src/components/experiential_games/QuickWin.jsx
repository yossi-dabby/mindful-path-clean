import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { triggerHaptic } from '../utils/hapticFeedback';

export default function QuickWin({ onClose }) {
  const { t } = useTranslation();
  const [customWin, setCustomWin] = useState('');
  const [savedWins, setSavedWins] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const quickWinPresets = t('mind_games.content.quick_win.presets', { returnObjects: true }) || [];

  useEffect(() => {
    const stored = localStorage.getItem('mindgames_quickWins');
    if (stored) {
      setSavedWins(JSON.parse(stored));
    }
  }, []);

  const handlePresetClick = (preset) => {
    triggerHaptic('light');
    saveWin(preset);
  };

  const handleCustomSubmit = () => {
    if (customWin.trim()) {
      triggerHaptic('medium');
      saveWin(customWin.trim());
      setCustomWin('');
    }
  };

  const saveWin = (win) => {
    const newWins = [
      { text: win, date: new Date().toISOString() },
      ...savedWins
    ].slice(0, 20);
    setSavedWins(newWins);
    localStorage.setItem('mindgames_quickWins', JSON.stringify(newWins));
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
        {t('mind_games.quick_win.log_prompt')}
      </p>

      <div className="flex gap-2">
        <Input
          value={customWin}
          onChange={(e) => setCustomWin(e.target.value)}
          placeholder={t('mind_games.quick_win.input_placeholder')}
          onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
          className="flex-1 min-w-0"
          style={{ borderRadius: '12px' }}
        />
        <Button
          onClick={handleCustomSubmit}
          disabled={!customWin.trim()}
          style={{
            borderRadius: '12px',
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))'
          }}
        >
          {t('mind_games.quick_win.log_button')}
        </Button>
      </div>

      <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {t('mind_games.quick_win.preset_prompt')}
      </p>
      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto overflow-x-hidden min-w-0 pb-1 pr-1">
        {quickWinPresets.map((preset, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="h-auto py-2 px-3 text-left justify-start min-w-0 w-full active:scale-95 active:opacity-80 transition-all overflow-hidden"
            style={{
              borderRadius: '10px',
              borderColor: 'rgba(38, 166, 154, 0.2)',
              whiteSpace: 'normal',
              wordBreak: 'break-word'
            }}
            onClick={() => handlePresetClick(preset)}
          >
            <span className="text-xs leading-tight" style={{ whiteSpace: 'normal', wordBreak: 'break-word', display: 'block', width: '100%' }}>{preset}</span>
          </Button>
        ))}
      </div>

      {showSuccess && (
        <Card className="p-3 border-0" style={{
          borderRadius: '12px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)'
        }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.quick_win.success_message')}
            </p>
          </div>
        </Card>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
}