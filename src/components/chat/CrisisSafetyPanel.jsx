import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, X } from 'lucide-react';

export default function CrisisSafetyPanel({ onDismiss }) {
  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-[150]"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <Card
        className="w-full md:max-w-md md:w-full border-0 shadow-2xl rounded-t-3xl md:rounded-3xl"
        style={{
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 243, 243, 0.95) 100%)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 20px 60px rgba(220, 38, 38, 0.25)',
          animation: 'slideUp 0.3s ease-out',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div className="p-6 md:p-8">
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          {/* Icon */}
          <div 
            className="w-14 h-14 flex items-center justify-center mx-auto mb-4"
            style={{
              borderRadius: '18px',
              background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
            }}
          >
            <AlertTriangle className="w-7 h-7" style={{ color: '#DC2626' }} />
          </div>

          {/* Title */}
          <h2 className="text-xl md:text-2xl font-semibold text-center mb-3" style={{ color: '#1A3A34' }}>
            We're Concerned About You
          </h2>

          {/* Content */}
          <div className="space-y-4 mb-6">
            <p className="text-sm md:text-base leading-relaxed text-center" style={{ color: '#5A7A72' }}>
              Your message suggests you may be in crisis. This AI companion is not equipped to provide emergency support.
            </p>

            {/* Resources */}
            <div className="space-y-3 p-4 rounded-2xl" style={{ backgroundColor: 'rgba(220, 38, 38, 0.08)' }}>
              <p className="text-sm font-semibold" style={{ color: '#1A3A34' }}>
                Please reach out for immediate help:
              </p>
              
              <div className="space-y-2 text-sm" style={{ color: '#5A7A72' }}>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#DC2626' }} />
                  <div>
                    <strong>Crisis Hotline:</strong> 988 (US/Canada)
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#DC2626' }} />
                  <div>
                    <strong>Crisis Text Line:</strong> Text HOME to 741741
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#DC2626' }} />
                  <div>
                    <strong>Emergency:</strong> Call 911 or go to your nearest ER
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <Button
            onClick={onDismiss}
            className="w-full py-6 text-base font-medium text-white"
            style={{
              borderRadius: '20px',
              backgroundColor: '#DC2626',
              boxShadow: '0 6px 20px rgba(220, 38, 38, 0.35)',
            }}
          >
            I Understand
          </Button>

          <p className="text-xs text-center mt-4 opacity-70" style={{ color: '#5A7A72' }}>
            Your message was not sent. Take care of yourself.
          </p>
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