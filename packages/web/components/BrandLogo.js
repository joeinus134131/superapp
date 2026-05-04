'use client';

import React from 'react';

export const BrandLogo = ({ size = 40, showText = true, textSize = '24px', className = '' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mainGradWeb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-purple, #8b5cf6)" />
            <stop offset="100%" stopColor="var(--accent-cyan, #06b6d4)" />
          </linearGradient>
          <linearGradient id="glassGradWeb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <g>
          {/* Background Aura */}
          <circle cx="50" cy="50" r="45" fill="url(#mainGradWeb)" fillOpacity="0.1" />
          
          {/* Main Icon Body */}
          <path
            d="M50 20 C33 20 20 33 20 50 C20 67 33 80 50 80 C67 80 80 67 80 50 C80 33 67 20 50 20 Z"
            fill="url(#mainGradWeb)"
            fillOpacity="0.2"
          />
          
          {/* Stylized Leaf/Infinity Shape */}
          <path
            d="M50 30 C40 30 32 38 32 50 C32 62 40 70 50 70 C60 70 68 62 68 50 C68 38 60 30 50 30 Z M50 38 C57 38 62 43 62 50 C62 57 57 62 50 62 C43 62 38 57 38 50 C38 43 43 38 50 38 Z"
            fill="url(#mainGradWeb)"
          />
          
          {/* Glass Overlay Element */}
          <path
            d="M35 50 Q50 30 65 50 Q50 70 35 50"
            fill="url(#glassGradWeb)"
          />
          
          {/* Accent Dot */}
          <circle cx="50" cy="50" r="4" fill="white" />
        </g>
      </svg>
      {showText && (
        <div style={{ display: 'flex', fontSize: textSize }}>
          <span style={{ fontWeight: 900 }}>Self</span>
          <span style={{ fontWeight: 300 }}>One</span>
        </div>
      )}
    </div>
  );
};
