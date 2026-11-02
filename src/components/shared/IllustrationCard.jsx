import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const illustrations = {
  meditation: (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <circle cx="100" cy="100" r="80" fill="#FFB47C" opacity="0.2" />
      <circle cx="100" cy="100" r="60" fill="#F8744C" opacity="0.3" />
      <circle cx="100" cy="100" r="40" fill="#F8744C" opacity="0.5" />
      <path d="M70 110 Q100 90 130 110" stroke="#2D3748" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="85" cy="95" r="3" fill="#2D3748" />
      <circle cx="115" cy="95" r="3" fill="#2D3748" />
    </svg>
  ),
  breathing: (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <motion.circle
        cx="100"
        cy="100"
        r="50"
        fill="none"
        stroke="#4B6B8C"
        strokeWidth="2"
        animate={{ r: [40, 60, 40] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.circle
        cx="100"
        cy="100"
        r="30"
        fill="#FFB47C"
        opacity="0.3"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </svg>
  ),
  journal: (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <rect x="60" y="40" width="80" height="120" rx="5" fill="#FFB47C" opacity="0.3" />
      <rect x="70" y="50" width="60" height="100" fill="#FFF9F5" />
      <line x1="80" y1="70" x2="120" y2="70" stroke="#F8744C" strokeWidth="2" />
      <line x1="80" y1="90" x2="120" y2="90" stroke="#F8744C" strokeWidth="2" />
      <line x1="80" y1="110" x2="110" y2="110" stroke="#F8744C" strokeWidth="2" />
    </svg>
  ),
  goal: (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <circle cx="100" cy="100" r="70" fill="none" stroke="#4B6B8C" strokeWidth="3" />
      <circle cx="100" cy="100" r="50" fill="none" stroke="#FFB47C" strokeWidth="3" />
      <circle cx="100" cy="100" r="30" fill="none" stroke="#F8744C" strokeWidth="3" />
      <circle cx="100" cy="100" r="10" fill="#F8744C" />
    </svg>
  ),
  growth: (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <path d="M40 150 Q100 50 160 150" stroke="#4B6B8C" strokeWidth="3" fill="none" />
      <circle cx="40" cy="150" r="5" fill="#F8744C" />
      <circle cx="100" cy="50" r="5" fill="#FFB47C" />
      <circle cx="160" cy="150" r="5" fill="#4B6B8C" />
      <path d="M150 60 L160 50 L170 60" stroke="#F8744C" strokeWidth="2" fill="none" />
    </svg>
  ),
  community: (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <circle cx="100" cy="80" r="25" fill="#FFB47C" />
      <circle cx="60" cy="120" r="20" fill="#F8744C" opacity="0.7" />
      <circle cx="140" cy="120" r="20" fill="#4B6B8C" opacity="0.7" />
      <circle cx="100" cy="150" r="18" fill="#FFB47C" opacity="0.5" />
    </svg>
  ),
  wellness: (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <path d="M100 60 Q120 40 140 60 T160 100 Q140 120 100 140 Q60 120 40 100 T60 60 Q80 40 100 60" fill="#F8744C" opacity="0.3" />
      <circle cx="100" cy="100" r="30" fill="#FFB47C" opacity="0.5" />
    </svg>
  )
};

export default function IllustrationCard({ 
  type = 'meditation', 
  title, 
  description, 
  children,
  className,
  animate = true 
}) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : {}}
      animate={animate ? { opacity: 1, y: 0 } : {}}
      whileHover={animate ? { y: -4 } : {}}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "border-0 shadow-lg bg-gradient-to-br from-white to-orange-50 hover:shadow-xl transition-all",
        className
      )}>
        <CardContent className="p-8">
          {/* Illustration */}
          <div className="w-32 h-32 mx-auto mb-6" aria-hidden="true">
            {illustrations[type] || illustrations.meditation}
          </div>

          {/* Content */}
          {title && (
            <h3 className="text-2xl font-semibold text-gray-800 mb-3 text-center">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-gray-600 text-center mb-6 leading-relaxed">
              {description}
            </p>
          )}
          
          {/* Custom children */}
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}