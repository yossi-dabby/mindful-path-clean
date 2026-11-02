import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function InformedConsentModal({ onAccept }) {
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]"
      style={{ 
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <Card 
        className="max-w-md w-full border-0 shadow-2xl"
        style={{
          borderRadius: '24px',
          background: 'hsl(var(--card))',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-md)',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <div className="p-6 md:p-8">
          {/* Icon */}
          <div 
            className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mx-auto mb-4"
            style={{
              borderRadius: '18px',
              background: 'hsl(var(--card) / 0.97)',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <AlertCircle className="w-6 h-6 md:w-7 md:h-7" style={{ color: 'hsl(var(--primary))' }} />
          </div>

          {/* Title */}
          <h2 className="text-xl md:text-2xl font-semibold text-center mb-3" style={{ color: 'hsl(var(--foreground))' }}>
            Before We Begin
          </h2>

          {/* Content */}
          <div className="space-y-3 mb-6 text-sm md:text-base" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <p className="leading-relaxed">
              This AI companion provides wellness support and is <strong>not a substitute for professional therapy or medical advice</strong>.
            </p>
            <p className="leading-relaxed">
              If you're experiencing a crisis or severe symptoms, please contact a licensed mental health provider or emergency services immediately.
            </p>
            <p className="text-xs md:text-sm opacity-80">
              By continuing, you acknowledge these limitations and agree to use this tool as a self-help resource only.
            </p>
          </div>

          {/* Button */}
          <Button
            onClick={onAccept}
            className="w-full py-6 text-base md:text-lg text-white font-medium"
            style={{
              borderRadius: '20px',
              backgroundColor: 'hsl(var(--primary))',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            I Understand
          </Button>
        </div>
      </Card>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}